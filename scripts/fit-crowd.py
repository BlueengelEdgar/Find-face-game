"""Deterministic alpha-aware layout fitting; writes coordinates, never artwork."""
import json, math, time
import numpy as np
from PIL import Image
case=next(c for c in json.load(open('/tmp/crowd-layout-measure.json')) if c['width']==370 and c['count']==150)
pts=case['points']; n=len(pts); w=case['width']; h=case['height']
ids=np.array([p['id'] for p in pts])
alpha=np.stack([np.array(Image.open('public/'+p['file']).convert('RGBA'))[:,:,3] for p in pts])
ih,iw=alpha.shape[1:]; anchors=np.array([p['face'] for p in pts])
pos=np.array([[p['x'],p['y']] for p in pts]); base=pos.copy()
sizes=np.array([p['size'] for p in pts])
dx,dy=np.meshgrid(np.linspace(-.18,.18,11),np.linspace(-.12,.12,11)); dx=dx.ravel();dy=dy.ravel(); k=len(dx)
px=pos[:,0,None]+dx*sizes[:,None]; py=pos[:,1,None]+dy*sizes[:,None]*1.25
def image_mask(q,x,y,x0,y0,size):
 u=(x-x0)/size+.5;v=(y-y0)/(size*1.25)+anchors[q]
 inside=(u>=0)&(u<1)&(v>=0)&(v<1)
 return inside & (alpha[q,np.clip((v*ih).astype(int),0,ih-1),np.clip((u*iw).astype(int),0,iw-1)]>=96)
own=np.array([image_mask(q,px[q],py[q],*pos[q],sizes[q]) for q in range(n)])
den=own.sum(axis=1)
blocks=np.zeros((n,n,k),bool)
for q in range(n):blocks[q]=image_mask(q,px,py,*pos[q],sizes[q]) & (pos[q,1]>pos[:,1,None])
counts=blocks.sum(axis=0).astype(np.int16)
def ratios(cnt):return ((cnt==0)&own).sum(axis=1)/den
def score(cnt):
 r=ratios(cnt)
 return np.sum(np.maximum(.985-r,0)**2)
def proposal(q,x,y,size):
 nx=x+dx*size;ny=y+dy*size*1.25
 row=image_mask(q,px,py,x,y,size) & (y>pos[:,1,None]);row[q]=False
 u=(nx[None,:]-pos[:,0,None])/sizes[:,None]+.5
 v=(ny[None,:]-pos[:,1,None])/(sizes[:,None]*1.25)+anchors[:,None]
 col=((u>=0)&(u<1)&(v>=0)&(v<1)&(pos[:,1,None]>y)&
      (alpha[np.arange(n)[:,None],np.clip((v*ih).astype(int),0,ih-1),np.clip((u*iw).astype(int),0,iw-1)]>=96))
 col[q]=False
 new=counts-blocks[q]+row
 new[q]=col.sum(axis=0)+((nx<0)|(nx>=w)|(ny<0)|(ny>=h))*100
 return new,row,col,nx,ny
rng=np.random.default_rng(20261101); current=score(counts)
print('Initial',round(current,4),'min',round(ratios(counts).min(),3),flush=True)
start=time.time()
for sweep in range(35):
 step=4 if sweep<10 else 2 if sweep<24 else 1
 order=rng.permutation(n)
 improved=0
 for q in order:
  best=current; chosen=None
  # Translate to expose facial landmarks; bounded size adjustments never go below 0.125W.
  for mx,my,ms in [(step,0,0),(-step,0,0),(0,step,0),(0,-step,0),(step,step,0),(-step,step,0),(step,-step,0),(-step,-step,0),(0,0,-1),(0,0,1)]:
   x=pos[q,0]+mx;y=pos[q,1]+my;size=sizes[q]+ms
   if not(w*.125<=size<=w*.145):continue
   if abs(x-base[q,0])>w*.05 or abs(y-base[q,1])>h*.05:continue
   if x<size*.20 or x>w-size*.20 or y<size*1.25*anchors[q]+2 or y>h-size*1.25*.12-2:continue
   candidate=proposal(q,x,y,size)
   value=score(candidate[0])
   if value<best-1e-8:
    best=value;chosen=(x,y,size,candidate)
  if chosen:
   x,y,size,(new,row,col,nx,ny)=chosen
   pos[q]=[x,y];sizes[q]=size;px[q]=nx;py[q]=ny
   blocks[q]=row;blocks[:,q]=col;counts=new;current=best;improved+=1
 r=ratios(counts)
 print('Sweep',sweep+1,'cost',round(current,5),'min',round(r.min(),3),'under .95',int((r<.95).sum()),'moves',improved,flush=True)
 if r.min()>=.97:break
 if not improved and sweep>25:break
out=[dict(id=int(ids[q]),x=round(pos[q,0]/w,7),y=round(pos[q,1]/h,7),size=round(sizes[q]/w,7)) for q in range(n)]
json.dump(out,open('src/crowd-150-layout.json','w'),indent=2)
json.dump(dict(seconds=time.time()-start,minVisible=float(r.min()),meanVisible=float(r.mean()),below95=int((r<.95).sum())),open('/tmp/crowd-fit-result.json','w'),indent=2)
print('Saved fit',round(time.time()-start,1),'seconds',flush=True)
