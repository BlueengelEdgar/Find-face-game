"""Exact source-pixel upper-head alpha-area audit, not just center samples."""
import json
import numpy as np
from PIL import Image
cache={}
def get(p):
 if p['file'] not in cache:cache[p['file']]=np.array(Image.open('public/'+p['file']).convert('RGBA'))[:,:,3]
 return cache[p['file']]
def at(p,x,y):
 a=get(p);ih,iw=a.shape
 u=(x-p['x'])/p['size']+.5;v=(y-p['y'])/(p['size']*1.25)+p['face']
 valid=(u>=0)&(u<1)&(v>=0)&(v<1)
 return valid&(a[np.clip((v*ih).astype(int),0,ih-1),np.clip((u*iw).astype(int),0,iw-1)]>=96)
reports=[]
for c in json.load(open('/tmp/v04-audit-input.json')):
 people=c['points'];detail=[]
 for p in people:
  a=get(p);ih,iw=a.shape
  sy,sx=np.where((a>=96)&((np.arange(ih)[:,None]+.5)/ih<=p['face']+.18))
  u=(sx+.5)/iw;v=(sy+.5)/ih
  x=p['x']+(u-.5)*p['size'];y=p['y']+(v-p['face'])*p['size']*1.25
  visible=(x>=0)&(x<c['width'])&(y>=0)&(y<c['height'])
  for q in people:
   if q['depth']<=p['depth']:continue
   if q['x']+q['size']/2<x.min() or q['x']-q['size']/2>x.max():continue
   if q['y']-q['face']*q['size']*1.25>y.max() or q['y']+(1-q['face'])*q['size']*1.25<y.min():continue
   visible &= ~at(q,x,y)
  hair=(v<p['face']-.12)|(u<.25)|(u>.75)
  feature=(u>=.32)&(u<=.68)&(v>=p['face']-.135)&(v<=p['face']+.135)
  detail.append(dict(id=p['id'],head=float(visible.mean()),hair=float(visible[hair].mean()),features=float(visible[feature].mean())))
 worst={k:min(d[k] for d in detail) for k in ['head','hair','features']}
 print(c['width'],c['height'],c['level'],c['tier'],len(people),{k:round(v,4) for k,v in worst.items()},flush=True)
 reports.append(dict(width=c['width'],height=c['height'],level=c['level'],tier=c['tier'],count=len(people),minimum=worst,detail=detail))
json.dump(reports,open('/tmp/v04-area-audit.json','w'),indent=2)
