import {CHARACTERS} from "../src/characters.js";
export async function inspect(page,points,dims){
 return page.evaluate(async({points,dims,characters})=>{
  const sprites=await Promise.all(points.map(async p=>{
   const c=characters[p.id],img=new Image();img.src=globalThis.__CROWD_ASSETS__?.[p.id]??'/Find-face-game/'+c.file;await img.decode();
   const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
   return {...p,face:c.face.y,w:img.width,h:img.height,dh:p.size*img.height/img.width,data:ctx.getImageData(0,0,img.width,img.height).data};
  }));
  const rect=document.querySelector('canvas').getBoundingClientRect();
  const quantize=(x,y)=>({x:(Math.round(rect.x+x/dims.width*rect.width)-rect.x)*dims.width/rect.width,y:(Math.round(rect.y+y/dims.height*rect.height)-rect.y)*dims.height/rect.height});
  const alpha=(s,x,y)=>{
   const u=(x-s.x)/s.size+.5,v=(y-s.y)/s.dh+s.face;if(u<0||u>=1||v<0||v>=1)return 0;
   return s.data[(Math.floor(v*s.h)*s.w+Math.floor(u*s.w))*4+3];
  };
  const sorted=[...sprites].sort((a,b)=>b.depth-a.depth);
  const top=(x,y,t=96)=>sorted.find(s=>alpha(s,x,y)>=t)?.id;
  const stable=(s,x,y)=>x>=7&&y>=7&&x<dims.width-7&&y<dims.height-7&&[-1,-.5,0,.5,1].every(dx=>[-1,-.5,0,.5,1].every(dy=>alpha(s,x+dx,y+dy)>=240&&top(x+dx,y+dy,32)===s.id));
  const actors=sprites.map(s=>{
   const fronts=sorted.filter(q=>q.depth>s.depth&&q.x+q.size/2>s.x-s.size/2&&q.x-q.size/2<s.x+s.size/2&&q.y-q.face*q.dh<s.y+.18*s.dh&&q.y+(1-q.face)*q.dh>s.y-s.face*s.dh);
   let head=0,headShown=0,features=0,featuresShown=0,hair=0,hairShown=0,witness=null,proof=null,distance=Infinity;
   // Every opaque source pixel of the upper-head silhouette is measured.
   for(let iy=0;iy<Math.min(s.h,Math.ceil((s.face+.18)*s.h));iy++)for(let ix=0;ix<s.w;ix++){
    if(s.data[(iy*s.w+ix)*4+3]<96)continue;
    const u=(ix+.5)/s.w,v=(iy+.5)/s.h,x=s.x+(u-.5)*s.size,y=s.y+(v-s.face)*s.dh;
    const visible=x>=0&&y>=0&&x<dims.width&&y<dims.height&&!fronts.some(q=>alpha(q,x,y)>=96);
    head++;if(visible)headShown++;
    if(v<s.face-.12||u<.25||u>.75){hair++;if(visible)hairShown++;}
    if(u>=.32&&u<=.68&&Math.abs(v-s.face)<=.135){features++;if(visible)featuresShown++;}
   }
   for(let iy=0;iy<13;iy++)for(let ix=0;ix<13;ix++){
    const x=s.x+(-.18+ix*.03)*s.size,y=s.y+(-.135+iy*.0225)*s.dh,p=quantize(x,y),d=(p.x-s.x)**2+(p.y-s.y)**2;
    if(d<distance&&stable(s,p.x,p.y)){witness=p;distance=d;}
   }
   for(let iy=2;iy<19&&!proof;iy++)for(let ix=2;ix<19;ix++){
    const p=quantize(s.x+(ix/20-.5)*s.size,s.y+(iy/20-s.face)*s.dh);
    if(stable(s,p.x,p.y)&&fronts.some(q=>Math.abs(p.x-q.x)<q.size/2&&p.y>q.y-q.face*q.dh&&p.y<q.y+(1-q.face)*q.dh)){proof=p;break;}
   }
   return {id:s.id,head:headShown/head,hair:hairShown/Math.max(1,hair),features:featuresShown/Math.max(1,features),witness,proof,size:s.size};
  });
  // Foreground occupancy and largest rectangular background gap on a small grid.
  const step=5,cols=Math.floor(dims.width/step),rows=Math.floor(dims.height/step),heights=new Array(cols).fill(0);
  let covered=0,maxGap=0,innerGap=0,blank=null;const innerHeights=new Array(cols).fill(0);
  for(let row=0;row<rows;row++){
   for(let col=0;col<cols;col++){
    const x=(col+.5)*step,y=(row+.5)*step,hit=top(x,y);
    if(hit!==undefined){covered++;heights[col]=0;}else{heights[col]++;if(x>=16&&y>=16&&x<dims.width-16&&y<dims.height-16)blank??=quantize(x,y);}
    const inner=col>=Math.ceil(cols*.05)&&col<Math.floor(cols*.95)&&row>=Math.ceil(rows*.05)&&row<Math.floor(rows*.95);
    innerHeights[col]=inner&&hit===undefined?innerHeights[col]+1:0;
   }
   const stack=[];
   for(let col=0;col<=cols;col++){
    const value=col===cols?0:heights[col];let start=col;
    while(stack.length&&stack.at(-1).h>value){const p=stack.pop();maxGap=Math.max(maxGap,p.h*(col-p.start));start=p.start;}
    stack.push({h:value,start});
   }
   const innerStack=[];
   for(let col=0;col<=cols;col++){
    const value=col===cols?0:innerHeights[col];let start=col;
    while(innerStack.length&&innerStack.at(-1).h>value){const p=innerStack.pop();innerGap=Math.max(innerGap,p.h*(col-p.start));start=p.start;}
    innerStack.push({h:value,start});
   }
  }
  return {actors,occupancy:covered/(rows*cols),largestGap:maxGap/(rows*cols),interiorGap:innerGap/(rows*cols),blank};
 },{points,dims,characters:CHARACTERS});
}
