import FITTED_150 from './crowd-150-layout.json' with { type: 'json' };
// Art-directed face centers, not grid cells. Bodies can be clipped/covered;
// eyes, nose and mouth occupy a protected foreground-aware region.
const COMPOSITION = [
  [.19,.20,1.04], [.51,.17,1.08], [.83,.24,1.04],
  [.17,.51,1.06], [.49,.51,1.10], [.83,.55,1.04],
  [.10,.84,.88], [.36,.88,.94], [.64,.84,.96], [.92,.90,.87],
];
export function artLayout(width, height) {
  // The height bound reserves space for three exposed face bands on short
  // phones. This is only the 10-person stage, not a 150-person shrink strategy.
  const base = Math.min(width * .46, height * .32);
  return COMPOSITION.map(([x,y,scale],id)=>({
    id, x:x*width,
    y:Math.max(y*height,id<3 ? base*scale*1.25*.52+3 : 0),
    size:base*scale, depth:y*100,
  }));
}

const ROWS_150 = [9,11,10,9,11,10,11,9,10,11,9,10,9,11,10];
const ROWS_35 = [5,6,5,7,6,6];
export function supportsLevel(level, width, height) {
  if (level.count !== 150) return true;
  return width >= 340 && height >= 470 && height / width >= 1.48;
}
export function crowdLayout(level, width, height) {
  if (level.count === 10) return artLayout(width, height);
  if (level.count === 150) return FITTED_150.map(p=>({
    id:p.id,x:p.x*width,y:p.y*height,size:p.size*width,depth:p.y*100,
  }));
  const rows = ROWS_35;
  const dense = level.count === 150;
  const pitch = width / (dense ? 10.8 : 6.6);
  const size = dense ? width*.135 : Math.min(width*.22,height/5.4);
  const top = size * 1.25 * .61 + 3;
  const bottom = height - size * 1.25 * .17 - 3;
  const rowPitch = (bottom-top) / (rows.length-1);
  const result=[];
  let index=0;
  rows.forEach((count,row)=>{
    for(let col=0;col<count;col++,index++){
      const id=dense ? (index*73)%150 : index;
      const margin=size*.29;
      const rowXPitch=Math.min(pitch,(width-2*margin)/(count-1));
      const slack=width-2*margin-(count-1)*rowXPitch;
      const shift=(row%2 ? 1 : -1)*Math.min(pitch*.18,slack/2);
      const jitter=(col===0||col===count-1)?0:Math.sin(index*17+11)*rowXPitch*.04;
      const x=(width-(count-1)*rowXPitch)/2+col*rowXPitch+shift+jitter;
      const y=top+row*rowPitch+Math.sin(col*1.7+row*.8)*rowPitch*.055;
      result.push({id,x:Math.max(size*.24,Math.min(width-size*.24,x)),y,
        size:size*(.97+.03*Math.sin(index*5)),depth:y/height*100});
    }
  });
  return result;
}
