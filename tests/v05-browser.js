import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {inspect} from './visual-measure.js';
import {selectPack} from '../src/levels.js';
import {crowdLayout} from '../src/art-layout.js';
import {CHARACTERS} from '../src/characters.js';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--strictPort'],{stdio:'ignore'});
let browser;const reports=[];
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5173/Find-face-game/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const viewport of [{width:390,height:844},{width:320,height:568},{width:768,height:1024},{width:1366,height:768}]){
  const context=await browser.newContext({viewport,hasTouch:true,isMobile:viewport.width<600});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/Find-face-game/');
  await page.waitForSelector('#opening:not([hidden])');
  await page.evaluate(()=>{window.__steps=[];new MutationObserver(()=>window.__steps.push(document.querySelector('#opening').dataset.step)).observe(document.querySelector('#opening'),{attributes:true,attributeFilter:['data-step']});});
  if(viewport.width===390){
   const step=await page.locator('#opening').getAttribute('data-step');
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
   await page.waitForTimeout(250);assert.equal(await page.locator('#opening').getAttribute('data-step'),step);assert.equal(await page.locator('#timer').textContent(),'00:00.0');
   await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  }
  const dims=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height}));
  const points=crowdLayout(selectPack(0,dims.width,dims.height),dims.width,dims.height);assert.equal(points.length,5);
  const measurement=await inspect(page,points,dims);
  const box=await page.locator('canvas').boundingBox();
  const tap=async id=>{const p=measurement.actors.find(a=>a.id===id).witness;assert.ok(p,'visible touch witness '+id);await page.touchscreen.tap(box.x+p.x,box.y+p.y);};
  assert.equal(await page.locator('#timer').textContent(),'00:00.0');await tap(points[0].id);assert.equal(await page.locator('.target.complete').count(),0);
  await page.waitForFunction(()=>document.querySelector('#opening').dataset.step==='GO!');
  assert.ok((await page.evaluate(()=>window.__steps)).includes('3'));
  assert.ok((await page.evaluate(()=>window.__steps)).includes('2'));
  assert.ok((await page.evaluate(()=>window.__steps)).includes('1'));
  await page.waitForSelector('#opening',{state:'hidden'});
  assert.deepEqual(await page.locator('.slot-badge').allTextContents(),['1','2','3','4','5']);
  for(const el of await page.locator('header,canvas,.target').all()){const b=await el.boundingBox();assert.ok(b.y>=0&&b.y+b.height<=viewport.height+1);}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight));
  await page.screenshot({path:`/tmp/v05-${viewport.width}-level1.png`});
  await page.evaluate(()=>{
   const proto=window.Phaser.GameObjects.Image.prototype,emit=proto.emit;
   proto.emit=function(event,...args){if(event==='pointerdown')window.__pulseScene=this.scene;return emit.call(this,event,...args);};
  });
  const first=Number(await page.locator('.target').first().getAttribute('data-id'));await tap(first);
  const pulse=await page.evaluate(async id=>{
   const scene=window.__pulseScene,face=scene.faces.get(id),card=document.querySelector(`.target[data-id="${id}"]`);
   const animation=card.getAnimations().find(a=>a.effect.getTiming().duration===200);
   if(!animation)throw Error('Matching card pulse missing');
   animation.pause();animation.currentTime=100;
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const visual=scene.children.list.find(o=>o.getData?.('feedback')==='match'&&o.getData('identity')===id);
   const result={wallScale:visual.scaleX/face.scaleX,cardScale:new DOMMatrix(getComputedStyle(card).transform).a,interactive:!!visual.input,badge:card.querySelector('.slot-badge').textContent};
   window.__pulseAnimation=animation;return result;
  },first);
  assert.ok(Math.abs(pulse.wallScale-1.12)<.001);assert.ok(Math.abs(pulse.cardScale-pulse.wallScale)<.001);assert.equal(pulse.interactive,false);assert.ok(pulse.badge);
  if(viewport.width===390)await page.screenshot({path:'/tmp/v05-match-pulse.png'});
  await page.evaluate(()=>window.__pulseAnimation.play());await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.__pulseScene.children.list.filter(o=>o.getData?.('feedback')==='match').length),0);
  assert.equal(await page.locator(`.target[data-id="${first}"]`).evaluate(c=>getComputedStyle(c).transform),'none');
  reports.push({viewport,...measurement,minimumHead:Math.min(...measurement.actors.map(a=>a.head))});
  assert.ok(reports.at(-1).minimumHead>=.85,'tutorial head visibility');
  for(const id of await page.locator('.target').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.id))))await tap(id);
  await page.locator('#result').waitFor();assert.equal(await page.locator('#result button:visible').count(),1);assert.equal(await page.locator('#result-action').textContent(),'NEXT LEVEL');
  assert.equal(await page.locator('#targets').getAttribute('data-phase'),'idle');
  if(viewport.width===390)await page.screenshot({path:'/tmp/v05-celebration.png'});
  await page.click('#result-action');await page.waitForSelector('#opening:not([hidden])');assert.equal(await page.locator('#timer').textContent(),'00:00.0');
  await page.waitForSelector('#opening',{state:'hidden'});assert.equal(await page.locator('#level-name').textContent(),'第二关');
  assert.deepEqual(errors,[]);console.log('PASS',viewport,'head',reports.at(-1).minimumHead);
  await context.close();
 }
}finally{writeFileSync('/tmp/v05-browser.json',JSON.stringify(reports,null,2));await browser?.close();server.kill();}
