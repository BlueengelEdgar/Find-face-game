import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {selectPack} from '../src/levels.js';
import {crowdLayout} from '../src/art-layout.js';
import {CHARACTERS} from '../src/characters.js';
const offlineOnly=process.argv.includes('--offline-only');
const cases=offlineOnly?[{width:1440,height:1000,offline:true}]:[
 {width:390,height:844},{width:320,height:568},{width:768,height:1024},{width:1366,height:768},{width:1440,height:1000,offline:true},
];
const server=offlineOnly?null:spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--strictPort'],{stdio:'ignore'});
let browser,total=0;const reports=[];
const time=s=>{const [m,sec]=s.split(':').map(Number);return m*60000+sec*1000;};
async function inspect(page,points,dims){
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
async function assertUI(page,viewport){
 for(const selector of ['header','#game','canvas','.targets','.target'])for(const el of await page.locator(selector).all()){
  const b=await el.boundingBox();assert.ok(b&&b.y>=0&&b.y+b.height<=viewport.height+1,selector+' inside viewport');
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight));
 assert.equal(await page.locator('header button').count(),0);
 assert.doesNotMatch(await page.locator('#app').innerText(),/\d+\s*(?:人|位)|\d+\s*\/\s*\d+|V0\.[34]|样板|测试/);
}
async function completeLevel(page,viewport,index,detail=false){
 await page.waitForSelector('.target[data-id]',{timeout:60000});await page.waitForTimeout(200);
 await assertUI(page,viewport);
 const dims=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height}));
 const pack=selectPack(index,dims.width,dims.height),points=crowdLayout(pack,dims.width,dims.height),measure=await inspect(page,points,dims);
 const minHead=Math.min(...measure.actors.map(a=>a.head)),minFeatures=Math.min(...measure.actors.map(a=>a.features));
 console.log('AREA',viewport.width,viewport.height,index,pack.count,'head',minHead.toFixed(4),'features',minFeatures.toFixed(4),'occupancy',measure.occupancy.toFixed(3),'gap',measure.largestGap.toFixed(3));
 reports.push({viewport,index,tier:pack.tier,count:pack.count,minHead,minFeatures,occupancy:measure.occupancy,largestGap:measure.largestGap,interiorGap:measure.interiorGap});
 if(!viewport.offline)await page.screenshot({path:`/tmp/v04-${viewport.width}-level${index+1}.png`});
 assert.ok(minHead>=.85,'full upper-head key area occlusion <=15%');
 assert.ok(minFeatures>=.95,'facial landmarks protected');
 assert.ok(measure.actors.every(a=>a.witness),'all actors have stable visible touch regions');
 if(index===1){assert.ok(measure.occupancy>.72,'dense characters fill wall');assert.ok(measure.largestGap<.055&&measure.interiorGap<.025,'no large interior gap; small outer scenic margin permitted');}
 const canvas=await page.locator('canvas').boundingBox(),byId=new Map(measure.actors.map(a=>[a.id,a]));
 const screen=p=>({x:canvas.x+p.x/dims.width*canvas.width,y:canvas.y+p.y/dims.height*canvas.height});
 const tap=async(id,proof=false)=>{const p=screen((proof&&byId.get(id).proof)||byId.get(id).witness);await page.touchscreen.tap(p.x,p.y);};
 if(!viewport.offline)await page.screenshot({path:`/tmp/v04-${viewport.width}-level${index+1}.png`});
 await page.evaluate(()=>{
  const proto=window.Phaser.GameObjects.Image.prototype;
  if(!window.__v04Hook){
   const emit=proto.emit;
   proto.emit=function(event,...args){
    if(event==='pointerdown'){
     window.__testScene=this.scene;window.__lastHit=this.texture.key;
     (window.__eventLog??=[]).push({key:this.texture.key,phase:document.querySelector('#targets').dataset.phase});
     window.__pickEvents=(window.__pickEvents??0)+1;
    }
    const result=emit.call(this,event,...args);
    if(event==='pointerdown')window.__inputFeedback={
     cross:this.scene.children.list.some(o=>o.getData?.('feedback')==='wrong'),
     label:this.scene.children.list.some(o=>o.getData?.('feedback')==='penalty'),
     timerAnimations:document.querySelector('#timer').getAnimations().map(a=>a.effect.getTiming().duration),
    };
    return result;
   };
   window.__v04Hook=true;
  }
 });
 const initial=await page.locator('.target').evaluateAll(es=>es.map(e=>+e.dataset.id));
 const wrong=points.find(p=>!initial.includes(p.id)).id;
 const penalty=async(count=1)=>{
  const before=time(await page.locator('#timer').textContent()),start=Date.now();
  for(let i=0;i<count;i++){await tap(wrong);await page.waitForTimeout(25);}
  await page.waitForTimeout(30);
  const delta=time(await page.locator('#timer').textContent())-before-(Date.now()-start);
  assert.ok(Math.abs(delta-count*3000)<220,'exact additive error penalty '+delta);
 };
 await penalty();
 const feedback=await page.evaluate(()=>window.__inputFeedback);
 assert.equal(feedback.cross,true);assert.equal(feedback.label,true);
 assert.ok(feedback.timerAnimations.includes(330),'timer emphasizes immediately on error');
 await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>window.__testScene.children.list.some(o=>o.getData?.('feedback')==='wrong')),false);
 await page.waitForTimeout(260);
 assert.equal(await page.evaluate(()=>window.__testScene.children.list.some(o=>o.getData?.('feedback')==='penalty')),false);
 if(detail){
  const vibrations=await page.evaluate(()=>window.__vibrations??[]);
  assert.deepEqual(vibrations,[30],'short haptic requested once per error');
  await penalty(3);await page.waitForTimeout(650);
  assert.equal(await page.evaluate(()=>window.__vibrations.length),4,'rapid errors each request haptic');
  const client=await page.context().newCDPSession(page),p=screen(byId.get(wrong).witness);
  const before=time(await page.locator('#timer').textContent()),start=Date.now();
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:7}]});
  for(let i=0;i<8;i++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+(i%2),y:p.y,id:7}]});await page.waitForTimeout(30);}
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const delta=time(await page.locator('#timer').textContent())-before-(Date.now()-start);
  assert.ok(Math.abs(delta-3000)<220,'long hold/drag yields exactly one error');
  assert.equal(await page.evaluate(()=>window.__vibrations.length),5,'hold/drag requests only one haptic');
  await page.waitForTimeout(650);
  await page.evaluate(()=>Object.defineProperty(navigator,'vibrate',{configurable:true,writable:true,value:()=>{throw Error('unsupported haptic');}}));
  await penalty();await page.waitForTimeout(650);
  if(measure.blank){
   const blank=screen(measure.blank),t=time(await page.locator('#timer').textContent()),s=Date.now();
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:blank.x,y:blank.y,id:8}]});
   await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x,y:p.y,id:8}]});
   await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.ok(Math.abs(time(await page.locator('#timer').textContent())-t-(Date.now()-s))<220,'blank/down then drag never selects');
  }
  await client.detach();
 }
 const found=new Set(),proofActor=measure.actors.find(a=>a.proof)?.id;let transitions=0;
 while(found.size<pack.count){
  const ids=await page.locator('.target').evaluateAll(es=>es.map(e=>+e.dataset.id));
  assert.equal(ids.length,5);
  for(const [position,id] of ids.entries()){
   assert.equal(found.has(id),false,'target identity never repeated');
   const exact=await page.locator('.target[data-id="'+id+'"] img').evaluate((img,c)=>img.src===(globalThis.__CROWD_ASSETS__?.[c.id]??new URL('/Find-face-game/'+c.file,location.href).href),CHARACTERS[id]);
   assert.equal(exact,true);
   if(position===4&&found.size+1<pack.count){
    const candidate=points.find(p=>!found.has(p.id)&&!ids.includes(p.id)).id;
    const location=screen(byId.get(candidate).witness);
    await page.evaluate(({location})=>{
     window.__phaseProbes=[];window.__phaseObserver?.disconnect();
     const canvas=document.querySelector('canvas'),targets=document.querySelector('#targets');
     const observed=new Set();
     window.__phaseObserver=new MutationObserver(()=>{
      const phase=targets.dataset.phase;if(observed.has(phase))return;
      observed.add(phase);
      const cards=[...targets.children],animations=cards.map(c=>c.getAnimations().map(a=>({duration:a.effect.getTiming().duration,delay:a.effect.getTiming().delay})));
      if(phase==='idle'){window.__phaseProbes.push({phase,clock:document.querySelector('#timer').textContent});window.__phaseObserver.disconnect();return;}
      if(!['exiting','entering'].includes(phase))return;
      const before=document.querySelector('#timer').textContent,progress=document.querySelector('#progress').getAttribute('aria-valuenow'),events=window.__pickEvents;
      const touch=new Touch({identifier:99,target:canvas,clientX:location.x,clientY:location.y,pageX:location.x,pageY:location.y,screenX:location.x,screenY:location.y,radiusX:2,radiusY:2,force:1});
      canvas.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[touch],targetTouches:[touch],changedTouches:[touch]}));
      canvas.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],targetTouches:[],changedTouches:[touch]}));
      window.__phaseProbes.push({phase,before,after:document.querySelector('#timer').textContent,progressBefore:progress,progressAfter:document.querySelector('#progress').getAttribute('aria-valuenow'),routed:window.__pickEvents>events,ids:cards.map(c=>+c.dataset.id),completed:cards.filter(c=>c.classList.contains('complete')).length,animations});
     });
     window.__phaseObserver.observe(targets,{attributes:true,attributeFilter:['data-phase']});
    },{location});
   }
   const before=time(await page.locator('#timer').textContent()),start=Date.now();
   await tap(id,id===proofActor);found.add(id);total++;
   assert.equal(await page.evaluate(()=>window.__eventLog.filter(e=>e.phase==='idle').at(-1)?.key),'face-'+id,'actual topmost visible identity');
   if(position<4)await page.locator('.target[data-id="'+id+'"].complete').waitFor({timeout:2000});
   if(position===0){
    const after=time(await page.locator('#timer').textContent());
    assert.ok(Math.abs(after-before-(Date.now()-start))<220,'correct pick adds no penalty');
    await tap(id);assert.ok(Math.abs(time(await page.locator('#timer').textContent())-after)<250,'found actor adds no penalty');
    if(found.size===1&&viewport.width===390&&!viewport.offline){
     const progress=await page.locator('#progress').getAttribute('aria-valuenow');
     await page.setViewportSize({width:viewport.width,height:viewport.height-90});await page.waitForTimeout(150);
     await page.setViewportSize({width:viewport.width,height:viewport.height});await page.waitForTimeout(200);
     assert.equal(await page.locator('#progress').getAttribute('aria-valuenow'),progress,'viewport changes preserve progress');
     assert.equal(await page.locator('.target[data-id="'+id+'"].complete').count(),1);
    }
   }
  }
  if(found.size<pack.count){
   transitions++;
   await page.waitForFunction(()=>window.__phaseProbes?.some(p=>p.phase==='idle'));
   const probes=await page.evaluate(()=>window.__phaseProbes),exit=probes.find(p=>p.phase==='exiting'),enter=probes.find(p=>p.phase==='entering');
   assert.ok(exit&&enter);
   assert.equal(exit.completed,5,'completed batch exits together');assert.deepEqual(exit.ids,ids);
   assert.equal(enter.completed,0);assert.equal(enter.ids.some(id=>ids.includes(id)),false);
   for(const probe of [exit,enter]){
    assert.equal(probe.routed,true,'phase-locked touch traverses the real Phaser input path');
    assert.equal(probe.before,probe.after,'locked input never adds penalty');
    assert.equal(probe.progressBefore,probe.progressAfter,'locked input cannot complete a target');
    assert.equal(probe.animations.filter(a=>a.length>0).length,5,'all five cards animate');
   }
   assert.equal(exit.before,enter.after,'clock held throughout exit and entry');
   assert.ok(exit.animations.every(a=>a[0].duration===180&&a[0].delay===0));
   assert.ok(enter.animations.every(a=>a[0].duration===220));
   assert.ok(180+Math.max(...enter.animations.map(a=>a[0].delay))+220<=500);
   assert.equal(await page.locator('#targets').getAttribute('aria-busy'),'false');
  }
 }
 assert.equal(transitions,pack.count/5-1);
 assert.deepEqual(new Set(points.map(p=>p.id)),found,'all rendered identities completed');
 await page.locator('#result').waitFor();
 assert.equal(await page.locator('#progress').getAttribute('aria-valuenow'),'100');
 assert.match(await page.locator('#result-title').textContent(),/CONGRATULATIONS!/);
 assert.equal(await page.locator('#result button:visible').count(),1);
 assert.ok(await page.locator('#confetti i').count()<=30);
 if(index===0){
  assert.equal(await page.locator('#result-action').textContent(),'NEXT LEVEL');
  assert.equal(await page.locator('#leaderboard').isVisible(),false);
 }else{
  assert.equal(await page.locator('#result-action').textContent(),'重新挑战');
  assert.match(await page.locator('#leaderboard').innerText(),/模拟.*非真实/);
 }
 await page.waitForTimeout(80);const frozen=await page.locator('#timer').textContent();await page.waitForTimeout(120);
 assert.equal(await page.locator('#timer').textContent(),frozen,'settlement freezes clock');
 if(!viewport.offline)await page.screenshot({path:`/tmp/v04-${viewport.width}-result${index+1}.png`});
 console.log('PASS',viewport.width,viewport.height,index,pack.count,'batches',transitions,'offline',!!viewport.offline);
 return pack;
}
try{
 if(server)for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5173/Find-face-game/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const [index,v] of cases.entries()){
  const context=await browser.newContext({viewport:{width:v.width,height:v.height},hasTouch:true,isMobile:v.width<600});
  if(v.offline)await context.setOffline(true);
  await context.addInitScript(({unsupported})=>Object.defineProperty(navigator,'vibrate',{configurable:true,writable:true,value:unsupported?undefined:(ms)=>{(window.__vibrations??=[]).push(ms);return true;}}),{unsupported:v.width===320});
  const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  if(v.offline)await page.setContent(readFileSync('dist/find-crowd-v04.html','utf8'));else await page.goto('http://127.0.0.1:5173/Find-face-game/');
  await completeLevel(page,v,0,index===0&&!v.offline);
  // Action is immediately usable; no wait for confetti/title animation.
  await page.click('#result-action');await page.locator('#result').waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.querySelector('#level-name').textContent==='第二关');
  assert.ok(time(await page.locator('#timer').textContent())<1500,'new level resets its timer');
  await completeLevel(page,v,1);
  await page.click('#result-action');await page.locator('#result').waitFor({state:'hidden'});
  assert.ok(time(await page.locator('#timer').textContent())<1500,'retry resets timer and penalties');
  assert.equal(await page.locator('.target.complete').count(),0);
  assert.deepEqual(errors,[]);
  if(v.offline)assert.equal(requests.length,0);
  await context.close();
 }
 writeFileSync('/tmp/v04-browser-report.json',JSON.stringify({correctPicks:total,cases:reports},null,2));
 console.log('TOTAL CORRECT TOUCH PICKS',total);
}finally{await browser?.close();server?.kill();}
