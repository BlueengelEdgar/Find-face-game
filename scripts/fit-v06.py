"""Fit V0.6 independent 2D candidates using upper-head/hair masks and face features.
Reads existing artwork; never changes character pixels.
"""
import json,sys,time
from pathlib import Path
import numpy as np
from PIL import Image
tier=sys.argv[1];c=json.load(open('/tmp/v06-'+tier+'-seed.json'));pts=c['points'];n=len(pts);w=c['width'];h=c['height']
ids=np.array([p['id'] for p in pts]);a=np.stack([np.array(Image.open('public/'+p['file']).convert('RGBA'))[:,:,3] for p in pts])
ih,iw=a.shape[1:];anchors=np.array([p['face'] for p in pts]);pos=np.array([[p['x'],p['y']] for p in pts]);base=pos.copy();sizes=np.array([p['size'] for p in pts])
u,t=np.meshgrid(np.linspace(.015,.985,21),np.linspace(.015,1,27));u=u.ravel();t=t.ravel();hk=len(u)
fu,fv=np.meshgrid(np.linspace(.32,.68,13),np.linspace(-.135,.135,13));fu=fu.ravel();fv=fv.ravel()
if '--polish' in sys.argv:
 fitted=json.load(open('/tmp/v06-layout-'+tier+'.json'))
 pos=np.array([[p['x']*w,p['y']*h] for p in fitted]);sizes=np.array([p['size']*w for p in fitted]);base=pos.copy()
dx=np.tile(np.r_[u-.5,fu-.5],(n,1))
headV=.015+t[None,:]*(anchors[:,None]+.18-.015)
dy=np.c_[headV-anchors[:,None],np.tile(fv,(n,1))]
k=dx.shape[1];px=pos[:,0,None]+dx*sizes[:,None];py=pos[:,1,None]+dy*sizes[:,None]*1.25
def alpha(q,x,y,x0,y0,size):
 U=(x-x0)/size+.5;V=(y-y0)/(size*1.25)+anchors[q]
 return (U>=0)&(U<1)&(V>=0)&(V<1)&(a[q,np.clip((V*ih).astype(int),0,ih-1),np.clip((U*iw).astype(int),0,iw-1)]>=96)
own=np.array([alpha(q,px[q],py[q],*pos[q],sizes[q]) for q in range(n)])
head=np.zeros((n,k),bool);head[:,:hk]=True
hair=np.zeros((n,k),bool);hair[:,:hk]=(headV<anchors[:,None]-.12)|((u[None,:]<.25)|(u[None,:]>.75))
feature=~head
masks=np.stack([own&head,own&hair,own&feature])
den=masks.sum(axis=2)
blocks=np.zeros((n,n,k),bool)
for q in range(n):blocks[q]=alpha(q,px,py,*pos[q],sizes[q])&(pos[q,1]>pos[:,1,None])
counts=blocks.sum(axis=0).astype(np.int16)
# Initially count clipped head pixels as occluded too.
for q in range(n):counts[q]+=((px[q]<0)|(px[q]>=w)|(py[q]<0)|(py[q]>=h))*100
targets=np.array([.96,.9,.995] if '--polish' in sys.argv else [.925,.85,.995])[:,None];weights=np.array([12,.5,10] if '--polish' in sys.argv else [4,.5,6])[:,None]
def metrics(cnt):return (((cnt==0)[None,:,:]&masks).sum(axis=2))/np.maximum(1,den)
def cost(cnt):return np.sum(np.maximum(targets-metrics(cnt),0)**2*weights)
def propose(q,x,y,size):
 nx=x+dx[q]*size;ny=y+dy[q]*size*1.25
 row=alpha(q,px,py,x,y,size)&(y>pos[:,1,None]);row[q]=False
 U=(nx[None,:]-pos[:,0,None])/sizes[:,None]+.5;V=(ny[None,:]-pos[:,1,None])/(sizes[:,None]*1.25)+anchors[:,None]
 col=(U>=0)&(U<1)&(V>=0)&(V<1)&(pos[:,1,None]>y)&(a[np.arange(n)[:,None],np.clip((V*ih).astype(int),0,ih-1),np.clip((U*iw).astype(int),0,iw-1)]>=96)
 col[q]=False
 new=counts-blocks[q]+row
 new[q]=col.sum(axis=0)+((nx<0)|(nx>=w)|(ny<0)|(ny>=h))*100
 return new,row,col,nx,ny
rng=np.random.default_rng(4042026);value=cost(counts);start=time.time()
print(tier,'start',metrics(counts).min(axis=1).round(3).tolist(),flush=True)
for sweep in range(42):
 step=4 if sweep<12 else 2 if sweep<28 else 1;moves=0
 for q in rng.permutation(n):
  best=value;choice=None
  for mx,my,ms in [(step,0,0),(-step,0,0),(0,step,0),(0,-step,0),(step,step,0),(-step,step,0),(step,-step,0),(-step,-step,0),(0,0,-1),(0,0,1)]:
   x=pos[q,0]+mx;y=pos[q,1]+my;size=sizes[q]+ms
   if not(w*c['min']<=size<=w*c['max']):continue
   if abs(x-base[q,0])>w*.10 or abs(y-base[q,1])>h*.12:continue
   if x<size*.22 or x>w-size*.22 or y<size*1.25*anchors[q]*.88 or y>h-size*1.25*.14:continue
   result=propose(q,x,y,size);score=cost(result[0])
   if score<best-1e-8:best=score;choice=x,y,size,result
  if choice:
   x,y,size,(new,row,col,nx,ny)=choice;pos[q]=[x,y];sizes[q]=size;px[q]=nx;py[q]=ny
   blocks[q]=row;blocks[:,q]=col;counts=new;value=best;moves+=1
 m=metrics(counts);print(tier,sweep+1,'min',m.min(axis=1).round(3).tolist(),'moves',moves,flush=True)
 if m[0].min()>=.90 and m[2].min()>=.98:break
 if not moves and sweep>30:break
out=[dict(id=int(ids[q]),x=round(pos[q,0]/w,8),y=round(pos[q,1]/h,8),size=round(sizes[q]/w,8)) for q in range(n)]
Path('/tmp/v06-layout-'+tier+'.json').write_text(json.dumps(out,indent=2)+'\n')
Path('/tmp/v06-'+tier+'-fit.json').write_text(json.dumps(dict(count=n,width=w,height=h,minimum=m.min(axis=1).tolist(),seconds=time.time()-start),indent=2))
