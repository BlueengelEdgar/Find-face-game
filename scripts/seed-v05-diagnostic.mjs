// Diagnostic only: deterministic 2D best-candidate sampling, never imported by game.
import {writeFileSync} from 'node:fs';
let seed=5001;
const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const points=[];
for(let id=0;id<150;id++){
 let best,score=-1;
 for(let attempt=0;attempt<600;attempt++){
  const p={id,x:.07+random()*.86,y:.085+random()*.86,size:.175+random()*.01};
  const d=points.length?Math.min(...points.map(q=>(p.x-q.x)**2+((p.y-q.y)*594/370)**2)):1;
  if(d>score){score=d;best=p;}
 }
 points.push(best);
}
writeFileSync('docs/v05-150-diagnostic.json',JSON.stringify(points,null,2)+'\n');
