import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
const run=(args)=>execFileSync('magick',args,{encoding:'utf8',maxBuffer:1024*1024});
mkdirSync('public/art/v03',{recursive:true});
mkdirSync('/tmp/crowd-art-extract',{recursive:true});
const report=[];
for(let group=0;group<10;group++){
  const sheet=`art-source/v03/sheet-${String(group+1).padStart(2,'0')}.png`;
  if(!existsSync(sheet))throw new Error('Missing required source sheet: '+sheet);
  const [width,height]=run(['identify','-format','%w %h',sheet]).split(' ').map(Number);
  for(let slot=0;slot<15;slot++){
    const id=group*15+slot;
    const col=slot%5,row=Math.floor(slot/5);
    const x=Math.round(col*width/5),y=Math.round(row*height/3);
    const w=Math.round((col+1)*width/5)-x,h=Math.round((row+1)*height/3)-y;
    const cell='/tmp/crowd-art-extract/cell.png';
    run([sheet,'-crop',`${w}x${h}+${x}+${y}`,'+repage',cell]);
    const components=run([cell,'-alpha','extract','-threshold','20%','-define','connected-components:verbose=true','-connected-components','4','null:']);
    const white=components.split('\n').filter(l=>l.includes('srgb(255,255,255)')).map(l=>{
      const match=l.match(/^\s*(\d+):\s+(\S+)\s+\S+\s+(\d+)/);
      return match?{id:+match[1],box:match[2],area:+match[3]}:null;
    }).filter(Boolean).sort((a,b)=>b.area-a.area);
    if(!white.length||white[0].area<w*h*.16)throw Error('Invalid empty portrait '+id);
    const output=`public/art/v03/character-${String(id+1).padStart(3,'0')}.webp`;
    // Remove disconnected packing remnants outside the dominant character's
    // bounds without changing the original character's antialiased pixels.
    const [bw,bh,bx,by]=white[0].box.match(/\d+/g).map(Number);
    const left=Math.max(0,bx-2),top=Math.max(0,by-2);
    const right=Math.min(w,bx+bw+2),bottom=Math.min(h,by+bh+2);
    run(['-size',w+'x'+h,'canvas:none','(',cell,'-crop',
      (right-left)+'x'+(bottom-top)+'+'+left+'+'+top,'+repage',')',
      '-geometry','+'+left+'+'+top,'-compose','Over','-composite',
      '-resize','288x360','-background','none','-gravity','center','-extent','288x360','-strip','-quality','90',output]);
    report.push({id,sheet,slot,output,sourceCell:{x,y,w,h},mainComponent:white[0]});
  }
}
writeFileSync('art-source/v03/extraction.json',JSON.stringify(report,null,2)+'\n');
console.log('Extracted',report.length,'independent portraits');
