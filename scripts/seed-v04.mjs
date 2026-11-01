import { writeFileSync } from 'node:fs';
import { CHARACTERS } from '../src/characters.js';
const composition=[[.19,.20,1.04],[.51,.17,1.08],[.83,.24,1.04],[.17,.51,1.06],[.49,.51,1.1],[.83,.55,1.04],[.10,.84,.88],[.36,.88,.94],[.64,.84,.96],[.92,.90,.87]];
const configs=[
 {tier:'first',width:370,height:555,count:10,min:.34,max:.49},
 {tier:'first-compact',width:300,height:345,count:10,min:.30,max:.44},
 {tier:'regular',width:370,height:555,count:75,rows:[7,8,7,8,7,8,7,8,7,8],min:.175,max:.195},
 {tier:'compact',width:300,height:345,count:45,rows:[6,7,6,7,6,7,6],min:.18,max:.20},
];
for(const c of configs){
 const W=c.width,H=c.height;let points=[];
 if(c.count===10){
  const base=Math.min(W*.46,H*.32);
  points=composition.map(([x,y,scale],id)=>({id,x:x*W,y:Math.max(y*H,id<3?base*scale*1.25*CHARACTERS[id].face.y+3:0),size:base*scale}));
 }else{
  const size=W*(c.tier==='regular'?.185:.19);
  const top=size*1.25*.65+3,bottom=H-size*1.25*.18-3,yp=(bottom-top)/(c.rows.length-1);
  let index=0;
  c.rows.forEach((count,row)=>{
   const margin=size*.36,xp=(W-2*margin)/(count-1);
   for(let col=0;col<count;col++,index++){
    points.push({id:(index*73+17)%150,x:margin+col*xp+(col===0||col===count-1?0:Math.sin(index*17)*xp*.055),
     y:top+row*yp+Math.sin(col*1.6+row)*yp*.055,size:size*(.98+.02*Math.sin(index*5))});
   }
  });
 }
 c.points=points.map(p=>({...p,face:CHARACTERS[p.id].face.y,file:CHARACTERS[p.id].file}));
 writeFileSync('/tmp/v04-'+c.tier+'-seed.json',JSON.stringify(c));
 writeFileSync('src/layout-'+c.tier+'.json',JSON.stringify(points.map(p=>({id:p.id,x:p.x/W,y:p.y/H,size:p.size/W})),null,2)+'\n');
}
