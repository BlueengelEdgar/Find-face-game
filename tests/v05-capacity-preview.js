import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {inspect} from './visual-measure.js';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort'],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5174/Find-face-game/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});await page.goto('http://127.0.0.1:5174/Find-face-game/');
 await page.waitForSelector('#opening:not([hidden])');await page.waitForSelector('#opening',{state:'hidden'});
 await page.evaluate(()=>{
  const proto=window.Phaser.GameObjects.Image.prototype,emit=proto.emit;
  proto.emit=function(event,...args){if(event==='pointerdown')window.__previewScene=this.scene;return emit.call(this,event,...args);};
 });
 const rect=await page.locator('canvas').boundingBox();await page.touchscreen.tap(rect.x+rect.width*.27,rect.y+rect.height*.29);
 const normalized=JSON.parse(readFileSync('docs/v05-150-diagnostic.json'));
 const dims=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height}));
 const points=normalized.map(p=>({...p,x:p.x*dims.width,y:p.y*dims.height,size:p.size*dims.width,depth:p.y*100}));
 await page.evaluate(async(points)=>{
  const scene=window.__previewScene;await scene.prepare(points.map(p=>p.id));
  scene.children.getAll().forEach(c=>c.destroy());
  const bg=scene.add.image(scene.scale.width/2,scene.scale.height/2,'background-town').setDepth(-100);bg.setDisplaySize(scene.scale.width,scene.scale.height);
  for(const p of points)scene.add.image(p.x,p.y,'face-'+p.id).setOrigin(.5,p.id===0?.61:.56).setDisplaySize(p.size,p.size*1.25).setDepth(p.depth);
  document.querySelector('#level-name').textContent='布局诊断';document.querySelector('#feedback').textContent='150人布局诊断 · 未通过视觉与触摸验收';
 },points);
 const measure=await inspect(page,points,dims);
 writeFileSync('docs/v05-150-measurement.json',JSON.stringify({dims,count:points.length,minimumHead:Math.min(...measure.actors.map(a=>a.head)),headBelow85:measure.actors.filter(a=>a.head<.85).length,withoutStableFaceWitness:measure.actors.filter(a=>!a.witness).length,occupancy:measure.occupancy,actors:measure.actors},null,2));
 await page.screenshot({path:'/tmp/v05-150-diagnostic.png'});
 console.log('Diagnostic',measure.actors.length,'head<85%',measure.actors.filter(a=>a.head<.85).length,'without witness',measure.actors.filter(a=>!a.witness).length);
}finally{await browser?.close();server.kill();}
