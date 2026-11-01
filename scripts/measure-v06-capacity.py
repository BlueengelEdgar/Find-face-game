"""Reproducible necessary-area bound; not an occlusion/click acceptance test.
Needs Pillow/numpy. Reads existing art; never modifies resources/layouts.
"""
from PIL import Image
import numpy as np
import json
from pathlib import Path
masks=[]
for i in range(150):
 a=np.array(Image.open(f'public/art/v03/character-{i+1:03}.webp').convert('RGBA'))[:,:,3]
 anchor=.61 if i==0 else .56
 masks.append({str(offset):int((a[:int((anchor+offset)*a.shape[0])]>=96).sum()) for offset in [0,.06,.10,.18]})
report=[]
for w,h in [(370,592),(300,373),(460,742)]:
 minimum=w*.175
 for count in [150,180,200]:
  # Missing new art is NOT simulated as new identities. This is an optimistic
  # area estimate only, using the smallest existing mask for missing subjects.
  sums={offset:sum(m[offset] for m in masks)+max(0,count-150)*min(m[offset] for m in masks) for offset in masks[0]}
  measures={offset:sums[offset]*(minimum/288)**2*.85/(w*h) for offset in masks[0]}
  report.append(dict(wall=[w,h],requestedPopulation=count,availableUniqueArt=150,missingUniqueArt=max(0,count-150),minPortraitWidth=minimum,estimateOnly=count>150,requiredVisibleAreaRatio=measures))
Path('docs/v06-capacity.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
