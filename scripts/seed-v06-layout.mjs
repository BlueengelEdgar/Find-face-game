// Candidate 2D layout; writes /tmp seeds only. No rows or source-grid jitter.
import {readFileSync,writeFileSync} from 'node:fs';
import {CHARACTERS} from '../src/characters.js';
let seed=6006;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
for(const [tier,width,height] of [['regular',370,587],['compact',300,382]]){
 const ids=JSON.parse(readFileSync('src/layout-'+tier+'.json')).map(p=>p.id),points=[];
 for(const id of ids){
  let best,score=-1;
  for(let attempt=0;attempt<800;attempt++){
   const x=width*(.075+random()*.85),y=height*(.10+random()*.85),size=width*((tier==='compact'?.18:.175)+random()*.01);
   const distance=points.length?Math.min(...points.map(p=>(p.x-x)**2+(p.y-y)**2)):1;
   if(distance>score){score=distance;best={id,x,y,size,face:CHARACTERS[id].face.y,file:CHARACTERS[id].file};}
  }
  points.push(best);
 }
 writeFileSync('/tmp/v06-'+tier+'-seed.json',JSON.stringify({width,height,min:tier==='compact'?.18:.175,max:tier==='compact'?.20:.195,points}));
}
