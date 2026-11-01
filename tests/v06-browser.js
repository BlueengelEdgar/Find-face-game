import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {selectPack} from '../src/levels.js';
import {crowdLayout} from '../src/art-layout.js';
import {inspect} from './visual-measure.js';
const offlineOnly=process.argv.includes('--offline-only');
const cases=offlineOnly?[{width:1440,height:1000,offline:true}]:[{width:390,height:844,detail:true},{width:320,height:568},{width:768,height:1024},{width:1366,height:768},{width:1440,height:1000,offline:true}];
const server=offlineOnly?null:spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--strictPort'],{stdio:'ignore'});
const value=s=>{const [m,sec]=s.split(':').map(Number);return m*60000+sec*1000;};
async function advanceClock(page,ms){await page.evaluate(ms=>{window.__testShift+=ms;},ms);}
let browser,total=0;const reports=[];
async function opening(page){
 await page.locator('#opening:not([hidden])').waitFor();
 assert.equal(await page.locator('#timer').textContent(),'00:30.0');
 await page.waitForFunction(()=>document.querySelector('#opening').dataset.step==='GO!');
 assert.equal(await page.locator('#timer').textContent(),'00:30.0','GO animation still freezes time');
 await page.locator('#opening').waitFor({state:'hidden'});
}
async function geometry(page,index,viewport){
 const dims=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height}));
 const pack=selectPack(index,dims.width,dims.height),points=crowdLayout(pack,dims.width,dims.height);
 const measure=await inspect(page,points,dims),rect=await page.locator('canvas').boundingBox();
 const head=Math.min(...measure.actors.map(a=>a.head)),features=Math.min(...measure.actors.map(a=>a.features));
 assert.ok(head>=.85,'key head mask visible');assert.ok(features>=.95,'central features visible');assert.ok(measure.actors.every(a=>a.witness));
 for(const el of await page.locator('header,canvas,.target').all()){const b=await el.boundingBox();assert.ok(b.y>=0&&b.y+b.height<=viewport.height+1);}
 assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight));
 assert.deepEqual(await page.locator('.slot-badge').allTextContents(),['1','2','3','4','5']);
 assert.ok(await page.locator('#progress').evaluate(e=>e.getBoundingClientRect().height>=12));
 assert.equal(await page.locator('#effects').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
 assert.ok(await page.locator('#effects').evaluate(e=>e.parentElement===document.body),'effect layer escapes every card/panel ancestor');
 const screen=p=>({x:rect.x+p.x,y:rect.y+p.y});
 const tap=async id=>{const p=screen(measure.actors.find(a=>a.id===id).witness);await page.touchscreen.tap(p.x,p.y);};
 return {pack,measure,tap,screen,head,features,dims};
}
async function complete(page,index,v){
 const g=await geometry(page,index,v);let seen=new Set(),transitions=0;
 if(index===1&&v.width===320){
  const targets=await page.locator('.target').evaluateAll(es=>es.map(e=>+e.dataset.id));
  const wrong=g.measure.actors.find(a=>!targets.includes(a.id)),point=g.screen(wrong.witness),client=await page.context().newCDPSession(page);
  const delta=async(action,expected)=>{const before=value(await page.locator('#timer').textContent()),start=Date.now();await action();await page.waitForTimeout(60);const actual=value(await page.locator('#timer').textContent())-before+(Date.now()-start);assert.ok(Math.abs(actual-expected)<300,`touch time delta ${actual}, expected ${expected}`);};
  await delta(async()=>{await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y,id:7}]});for(let i=0;i<5;i++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+(i%2),y:point.y,id:7}]});await page.waitForTimeout(35);}await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});},-2000);
  if(g.measure.blank){const blank=g.screen(g.measure.blank);await delta(async()=>{await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:blank.x,y:blank.y,id:8}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x,y:point.y,id:8}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});},0);}
  await delta(async()=>{await g.tap(wrong.id);await g.tap(wrong.id);},-4000);
  await page.evaluate(()=>Object.defineProperty(navigator,'vibrate',{configurable:true,writable:true,value:()=>{throw Error('haptics unsupported');}}));
  await delta(()=>g.tap(wrong.id),-2000);await client.detach();
 }

 if(v.width===390||v.width===320)await page.screenshot({path:`/tmp/v06-${v.width}-level${index+1}.png`});
 while(seen.size<g.pack.count){
  const ids=await page.locator('.target').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.id)));
  assert.deepEqual(await page.locator('.slot-badge').allTextContents(),['1','2','3','4','5']);
  for(const id of ids){
   assert.ok(!seen.has(id));const before=value(await page.locator('#timer').textContent()),start=Date.now();
   await g.tap(id);seen.add(id);total++;
   const after=value(await page.locator('#timer').textContent());
   assert.ok(Math.abs(after-before+(Date.now()-start)-3000)<300,'correct immediately adds three seconds');
   if(seen.size===1){
    const hud=await page.evaluate(()=>({text:document.querySelector('#timer').textContent,width:parseFloat(document.querySelector('#progress i').style.width)}));
    if(value(hud.text)>=30000)assert.equal(hud.width,100,'over thirty seconds stays full');else assert.ok(Math.abs(hud.width-value(hud.text)/300)<.34,'atomic HUD snapshot follows actual remaining time');
    const t=value(await page.locator('#timer').textContent()),s=Date.now();await g.tap(id);
    assert.ok(Math.abs(value(await page.locator('#timer').textContent())-t+(Date.now()-s))<250,'found identity no further award or penalty');
   }
  }
  if(seen.size<g.pack.count){
   transitions++;
   const t=value(await page.locator('#timer').textContent());
   await page.waitForTimeout(80);
   assert.equal(value(await page.locator('#timer').textContent()),t,'batch pulse pauses time');
   await page.waitForFunction(previous=>document.querySelector('#targets').dataset.phase==='idle'&&![...document.querySelectorAll('.target')].some(c=>previous.includes(Number(c.dataset.id))),ids);
  }
 }
 await page.locator('#result').waitFor();assert.equal(await page.locator('#result-title').textContent(),'CONGRATULATIONS!');
 assert.equal(await page.locator('#result button:visible').count(),1);
 if(index===0){assert.equal(g.pack.count,5);assert.equal(transitions,0);assert.equal(await page.locator('#result-action').textContent(),'NEXT LEVEL');}
 else{assert.match(await page.locator('#leaderboard').innerText(),/模拟.*非真实/);}
 const frozen=await page.locator('#timer').textContent();await page.waitForTimeout(200);assert.equal(await page.locator('#timer').textContent(),frozen);
 if(v.width===390)await page.screenshot({path:`/tmp/v06-win${index+1}.png`});
 reports.push({viewport:v,index,count:g.pack.count,head:g.head,features:g.features,dims:g.dims,transitions,occupancy:g.measure.occupancy});
 console.log('PASS',v.width,index,g.pack.count,transitions);
}
try{
 if(server)for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5173/Find-face-game/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const v of (process.argv.includes('--detail-only')?cases.slice(0,1):process.argv.includes('--input-only')?cases.filter(v=>v.width===320):cases)){
  const context=await browser.newContext({viewport:{width:v.width,height:v.height},hasTouch:true,isMobile:v.width<600});
  await context.addInitScript(({unsupported})=>Object.defineProperty(navigator,'vibrate',{configurable:true,writable:true,value:unsupported?undefined:ms=>{(window.__vibrations??=[]).push(ms);return true;}}),{unsupported:v.width===320});
  if(v.offline)await context.setOffline(true);
  const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  if(v.detail)await page.addInitScript(()=>{const nativeNow=performance.now.bind(performance);window.__testShift=0;performance.now=()=>nativeNow()+window.__testShift;});
  if(v.offline)await page.setContent(readFileSync('dist/find-crowd-v06.html','utf8'));else await page.goto('http://127.0.0.1:5173/Find-face-game/');
  await opening(page);
  if(v.detail){
   // A monotonic performance offset tests deadlines without changing native
   // requestAnimationFrame / Web Animation clocks or adding production APIs.
   const g=await geometry(page,0,v),ids=await page.locator('.target').evaluateAll(es=>es.map(e=>+e.dataset.id));
   await advanceClock(page,Math.max(0,value(await page.locator('#timer').textContent())-8500));await page.waitForTimeout(70);
   assert.equal(await page.locator('header').getAttribute('data-time-phase'),'red');
   const before=value(await page.locator('#timer').textContent());await g.tap(ids[0]);
   assert.ok(value(await page.locator('#timer').textContent())>before+2700);
   assert.equal(await page.locator('header').getAttribute('data-time-phase'),'yellow');
   assert.equal(await page.locator('#progress').evaluate(e=>getComputedStyle(e).animationName),'none');
   const effects=await page.evaluate(()=>({stars:document.querySelectorAll('#effects .target-star').length,flights:[...document.querySelectorAll('.time-flight')].map(e=>e.textContent),layer:getComputedStyle(document.querySelector('#effects')).position,frames:document.querySelector('.time-flight')?.getAnimations()[0]?.effect.getKeyframes()}));
   assert.ok(effects.stars>=12&&effects.stars<=20);assert.ok(effects.flights.includes('+3s'));assert.equal(effects.layer,'fixed');assert.ok(effects.frames.length>3,'curved flight keyframes');
   await page.screenshot({path:'/tmp/v06-reward-stars.png'});
   await page.waitForTimeout(130);assert.ok(await page.evaluate(()=>{const r=document.querySelector('.target').getBoundingClientRect();return [...document.querySelectorAll('.target-star')].some(s=>s.getBoundingClientRect().top<r.top);}), 'stars visibly escape the card');
   for(const id of ids.slice(1))await g.tap(id);
   await page.locator('#result').waitFor();assert.equal(await page.locator('header').getAttribute('data-time-phase'),'green');
   await page.click('#result-action');await opening(page);
   const second=await geometry(page,1,v),targets=await page.locator('.target').evaluateAll(es=>es.map(e=>+e.dataset.id));
   const wrong=second.measure.actors.find(a=>!targets.includes(a.id)).id;
   for(let i=0;i<3;i++){const before=value(await page.locator('#timer').textContent()),s=Date.now();await second.tap(wrong);assert.ok(Math.abs(before-value(await page.locator('#timer').textContent())-(Date.now()-s)-2000)<300);}
   assert.ok(await page.locator('.time-flight.negative').count()>0);
   assert.deepEqual(await page.evaluate(()=>window.__vibrations),[30,30,30]);
   await page.screenshot({path:'/tmp/v06-penalty.png'});
   await advanceClock(page,Math.max(0,value(await page.locator('#timer').textContent())-8500));await page.waitForTimeout(60);
   assert.equal(await page.locator('header').getAttribute('data-time-phase'),'red');
   assert.match(await page.locator('#progress').evaluate(e=>getComputedStyle(e).animationName),/time-warning/);
   for(const id of targets)await second.tap(id);
   await page.waitForFunction(()=>document.querySelector('#targets').dataset.phase==='idle'&&!document.querySelector('.target.complete'));
   assert.equal(await page.locator('header').getAttribute('data-time-phase'),'green');
   await advanceClock(page,Math.max(0,value(await page.locator('#timer').textContent())-8500));await page.waitForTimeout(150);assert.equal(await page.locator('header').getAttribute('data-time-phase'),'red');
   await advanceClock(page,15000);await page.locator('#result').waitFor();
   assert.equal(await page.locator('#result-title').textContent(),'TIME’S UP!');assert.equal(await page.locator('.result-subtitle').textContent(),'TRY AGAIN!');assert.equal(await page.locator('#result-action').textContent(),'RETRY');
   assert.equal(await page.locator('#timer').textContent(),'00:00.0');assert.match(await page.locator('.time-caption').textContent(),/5 \/ 75/);assert.equal(await page.locator('#effects>*').count(),0);
   await page.screenshot({path:'/tmp/v06-failure.png'});
   await page.click('#result-action');await opening(page);assert.equal(await page.locator('#level-name').textContent(),'第二关');assert.equal(await page.locator('.target.complete').count(),0);
   const retry=await geometry(page,1,v),retryTargets=await page.locator('.target').evaluateAll(es=>es.map(e=>+e.dataset.id));
   const retryWrong=retry.measure.actors.find(a=>!retryTargets.includes(a.id)).id;
   await advanceClock(page,Math.max(0,value(await page.locator('#timer').textContent())-1300));await page.waitForTimeout(50);
   await retry.tap(retryTargets[0]);assert.ok(await page.locator('.target-star').count()>=12);
   for(let i=0;i<3;i++)await retry.tap(retryWrong);
   await page.locator('#result').waitFor();assert.equal(await page.locator('#timer').textContent(),'00:00.0');assert.equal(await page.locator('#effects>*').count(),0);
   // Then reload for an independent fully completable level pair.
   await page.reload();await opening(page);
  }
  await complete(page,0,v);await page.click('#result-action');await opening(page);await complete(page,1,v);
  assert.deepEqual(errors,[]);if(v.offline)assert.equal(requests.length,0);
  await context.close();
 }
 writeFileSync(process.argv.includes('--input-only')?'/tmp/v06-input-report.json':'/tmp/v06-browser-report.json',JSON.stringify({correctPicks:total,cases:reports},null,2));console.log('TOTAL',total);
}finally{await browser?.close();server?.kill();}
