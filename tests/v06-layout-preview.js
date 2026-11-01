import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {inspect} from './visual-measure.js';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5175','--strictPort'],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5175/Find-face-game/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const reports=[];
 for(const [tier,width,height] of [['regular',390,844],['compact',320,568]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true});await page.goto('http://127.0.0.1:5175/Find-face-game/');await page.waitForSelector('#opening:not([hidden])');await page.waitForSelector('#opening',{state:'hidden'});
  await page.evaluate(()=>{const p=window.Phaser.GameObjects.Image.prototype,e=p.emit;p.emit=function(event,...args){if(event==='pointerdown')window.__previewScene=this.scene;return e.call(this,event,...args);};});
  const rect=await page.locator('canvas').boundingBox();await page.touchscreen.tap(rect.x+rect.width*.27,rect.y+rect.height*.29);
  const dims=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height}));
  const normalized=JSON.parse(readFileSync('/tmp/v06-layout-'+tier+'.json'));
  const points=normalized.map(p=>({...p,x:p.x*dims.width,y:p.y*dims.height,size:p.size*dims.width,depth:p.y*100}));
  await page.evaluate(async points=>{const scene=window.__previewScene;await scene.prepare(points.map(p=>p.id));scene.children.getAll().forEach(c=>c.destroy());scene.add.image(scene.scale.width/2,scene.scale.height/2,'background-town').setDisplaySize(scene.scale.width,scene.scale.height).setDepth(-100);for(const p of points)scene.add.image(p.x,p.y,'face-'+p.id).setOrigin(.5,p.id===0?.61:.56).setDisplaySize(p.size,p.size*1.25).setDepth(p.depth);document.querySelector('#level-name').textContent='布局候选';document.querySelector('#feedback').textContent='布局诊断 · 非正式可玩关卡';},points);
  const measure=await inspect(page,points,dims);const report={tier,dims,count:points.length,minimumHead:Math.min(...measure.actors.map(a=>a.head)),minimumFeatures:Math.min(...measure.actors.map(a=>a.features)),withoutWitness:measure.actors.filter(a=>!a.witness).length,occupancy:measure.occupancy,actors:measure.actors};reports.push(report);console.log(JSON.stringify({...report,actors:undefined}));
  writeFileSync('/tmp/v06-'+tier+'-measure.json',JSON.stringify(report,null,2));await page.screenshot({path:'/tmp/v06-'+tier+'-candidate.png'});await page.close();
 }
}finally{await browser?.close();server.kill();}
