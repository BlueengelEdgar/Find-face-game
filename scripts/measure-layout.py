"""Read-only alpha/occlusion analysis; never generates or changes artwork."""
import json
import numpy as np
from PIL import Image
from pathlib import Path
cases=json.load(open('/tmp/crowd-layout-measure.json'))
cache={}
def alpha(sprite,x,y):
    path='public/'+sprite['file']
    if path not in cache:
        cache[path]=np.array(Image.open(path).convert('RGBA'))[:,:,3]
    a=cache[path]; ih,iw=a.shape
    u=(x-sprite['x'])/sprite['size']+.5
    v=(y-sprite['y'])/(sprite['size']*1.25)+sprite['face']
    mask=(u>=0)&(u<1)&(v>=0)&(v<1)
    vals=np.zeros(np.shape(u))
    vals[mask]=a[np.floor(v[mask]*ih).astype(int),np.floor(u[mask]*iw).astype(int)]
    return vals
reports=[]
for case in cases:
    points=case['points']
    if any(not Path('public/'+p['file']).exists() for p in points):
        print('PENDING',case['width'],case['count']);continue
    detail=[]
    for p in points:
        dx,dy=np.meshgrid(np.linspace(-.18,.18,11),np.linspace(-.12,.12,11))
        x=(p['x']+dx*p['size']).flatten()
        y=(p['y']+dy*p['size']*1.25).flatten()
        own=alpha(p,x,y)>=96
        visible=own & (x>=0)&(x<case['width'])&(y>=0)&(y<case['height'])
        for q in points:
            if q['depth']>p['depth']:
                visible &= alpha(q,x,y)<96
        fraction=float(visible.sum()/max(1,own.sum()))
        candidates=np.where(visible)[0]
        witness=None if not len(candidates) else dict(x=float(x[candidates[len(candidates)//2]]),y=float(y[candidates[len(candidates)//2]]))
        detail.append(dict(id=p['id'],visible=round(fraction,3),witness=witness))
    worst=sorted(detail,key=lambda d:d['visible'])[:12]
    print(case['width'],case['height'],case['count'],'min',min(d['visible'] for d in detail),'mean',round(np.mean([d['visible'] for d in detail]),3),'worst',[(d['id'],d['visible']) for d in worst])
    reports.append(dict(width=case['width'],height=case['height'],count=case['count'],detail=detail))
json.dump(reports,open('/tmp/crowd-layout-report.json','w'),indent=2)
