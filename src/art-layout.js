import FIRST from './layout-first.json' with {type:'json'};
import FIRST_COMPACT from './layout-first-compact.json' with {type:'json'};
import REGULAR from './layout-regular.json' with {type:'json'};
import COMPACT from './layout-compact.json' with {type:'json'};
export function crowdLayout(pack,width,height){
  const data=pack.tier==='first'?(height/width>=1.50?FIRST:FIRST_COMPACT):pack.tier==='regular'?REGULAR:COMPACT;
  return data.map(p=>({id:p.id,x:p.x*width,y:p.y*height,size:p.size*width,depth:p.y*100}));
}

export function allLevelIds(levelIndex){
 return [...new Set((levelIndex===0?[...FIRST,...FIRST_COMPACT]:[...REGULAR,...COMPACT]).map(p=>p.id))];
}
