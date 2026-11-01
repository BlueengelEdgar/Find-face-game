import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crowdLayout } from '../src/art-layout.js';
import { LEVELS } from '../src/levels.js';
import { CHARACTERS } from '../src/characters.js';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--strictPort'],{stdio:'ignore'});
let browser;
let correctPicks=0;
async function inspect(page,points,dims){
  return page.evaluate(async({points,dims,characters})=>{
    const images=await Promise.all(points.map(async p=>{
      const character=characters[p.id],img=new Image();
      img.src=globalThis.__CROWD_ASSETS__?.[p.id] ?? '/Find-face-game/'+character.file;await img.decode();
      const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
      const context=c.getContext('2d',{willReadFrequently:true});context.drawImage(img,0,0);
      return {...p,face:character.face.y,w:img.width,h:img.height,
        displayH:p.size*img.height/img.width,data:context.getImageData(0,0,c.width,c.height).data};
    }));
    const alpha=(s,x,y)=>{
      const u=(x-s.x)/s.size+.5,v=(y-s.y)/s.displayH+s.face;
      if(u<0||v<0||u>=1||v>=1)return 0;
      return s.data[(Math.floor(v*s.h)*s.w+Math.floor(u*s.w))*4+3];
    };
    const sorted=[...images].sort((a,b)=>b.depth-a.depth);
    const rect=document.querySelector('canvas').getBoundingClientRect();
    const quantize=(x,y)=>({
      x:(Math.round(rect.x+x/dims.width*rect.width)-rect.x)*dims.width/rect.width,
      y:(Math.round(rect.y+y/dims.height*rect.height)-rect.y)*dims.height/rect.height,
    });
    const topAt=(x,y,tolerance=96)=>sorted.find(q=>alpha(q,x,y)>=tolerance)?.id;
    const stable=(s,x,y)=>x>=8&&y>=8&&x<dims.width-8&&y<dims.height-8&&
      [-1.5,-1,-.5,0,.5,1,1.5].every(dx=>[-1.5,-1,-.5,0,.5,1,1.5].every(dy=>alpha(s,x+dx,y+dy)>=240&&topAt(x+dx,y+dy,32)===s.id));
    return images.map(s=>{
      let opaque=0,shown=0,witness=null,throughWitness=null,bestDistance=Infinity;
      for(let yi=0;yi<=10;yi++)for(let xi=0;xi<=10;xi++){
        const x=s.x+(-.18+xi*.036)*s.size,y=s.y+(-.12+yi*.024)*s.displayH;
        if(alpha(s,x,y)<96)continue;opaque++;
        if(x>=0&&y>=0&&x<dims.width&&y<dims.height&&topAt(x,y)===s.id){
          shown++;
          const distance=(x-s.x)**2+(y-s.y)**2;
          if(distance<bestDistance){const p=quantize(x,y);if(stable(s,p.x,p.y)){witness=p;bestDistance=distance;}}
        }
      }
      for(let yi=2;yi<19&&!throughWitness;yi++)for(let xi=2;xi<19;xi++){
        const x=s.x+(xi/20-.5)*s.size,y=s.y+(yi/20-s.face)*s.displayH;
        const p=quantize(x,y);if(!stable(s,p.x,p.y))continue;
        if(sorted.some(q=>q.depth>s.depth&&Math.abs(x-q.x)<q.size/2&&y>q.y-q.face*q.displayH&&y<q.y+(1-q.face)*q.displayH)){
          throughWitness=p;break;
        }
      }
      return {id:s.id,visible:shown/Math.max(1,opaque),witness,throughWitness,size:s.size};
    });
  },{points,dims,characters:CHARACTERS});
}
try{
  for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5173/Find-face-game/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const cases=[
    {width:390,height:844},{width:320,height:568},{width:768,height:1024},{width:1440,height:1000},{width:1366,height:768},
    {width:1440,height:1000,offline:true},
  ].filter(c=>!process.argv.includes('--offline-only')||c.offline);
  for(const viewport of cases){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},hasTouch:true,isMobile:viewport.width<600});
    if(viewport.offline)await context.setOffline(true);
    const page=await context.newPage(),errors=[],network=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
    if(viewport.offline)await page.setContent(readFileSync('dist/find-crowd-v03.html','utf8'),{waitUntil:'load'});
    else await page.goto('http://127.0.0.1:5173/Find-face-game/');
    await page.waitForSelector('.target',{timeout:60000});await page.waitForTimeout(200);
    const has150=await page.locator('#level option[value="1"]').evaluate(o=>!o.disabled);
    console.log('VIEWPORT',viewport.width,viewport.height,'offline',!!viewport.offline,'150 enabled',has150);
    if(viewport.width===320)assert.equal(has150,false,'short screen explicitly gated, not silently shrunk');
    else assert.equal(has150,true,'normal phone, tablet and landscape desktop must offer full 150-person level');
    for(const levelIndex of has150?[0,2,1]:[0,2]){
      await page.selectOption('#level',String(levelIndex));await page.waitForTimeout(200);
      const level=LEVELS[levelIndex];
      for(const selector of ['header','#game','canvas','.targets','.target'])for(const el of await page.locator(selector).all()){
        const b=await el.boundingBox();assert.ok(b.y>=0&&b.y+b.height<=viewport.height+1,selector+' visible');
      }
      assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight));
      const canvas=await page.locator('canvas').boundingBox(),wall=await page.locator('#game').boundingBox();
      assert.ok(canvas.y+canvas.height<=wall.y+wall.height+1,'canvas fits wall');
      const dims=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height}));
      const points=crowdLayout(level,dims.width,dims.height);
      const visible=await inspect(page,points,dims);
      const minimum=Math.min(...visible.map(v=>v.visible));
      console.log('MEASURE',viewport.width,level.count,'min facial sample',minimum.toFixed(3),'portrait widths',Math.round(Math.min(...points.map(p=>p.size))),'-',Math.round(Math.max(...points.map(p=>p.size))));
      assert.ok(visible.every(v=>v.witness&&v.visible>=.94),'every face has visible stable hit region and protected features');
      assert.ok(visible.some(v=>v.throughWitness),'visible actor through transparent foreground bounds exists');
      const byId=new Map(visible.map(v=>[v.id,v]));
      const proofId=visible.find(v=>v.throughWitness).id;
      const tap=async(id,overlap=false)=>{
        const v=byId.get(id),p=(overlap&&v.throughWitness)||v.witness;
        await page.touchscreen.tap(canvas.x+p.x/dims.width*canvas.width,canvas.y+p.y/dims.height*canvas.height);
      };
      if(!viewport.offline)await page.screenshot({path:`/tmp/v03-play-${viewport.width}-${level.count}.png`});
      const initial=await page.locator('.target').evaluateAll(es=>es.map(e=>+e.dataset.id));
      const wrong=points.find(p=>!initial.includes(p.id)).id;
      await tap(wrong,false);
      await page.locator('#feedback').filter({hasText:'不扣时间'}).waitFor();
      assert.equal(await page.locator('#progress').textContent(),`已找到 0 / ${level.count}`);
      await page.click('#pause');await page.waitForTimeout(100);
      const frozen=await page.locator('#timer').textContent();
      await tap(initial[0],false);await page.waitForTimeout(200);
      assert.equal(await page.locator('#timer').textContent(),frozen);
      if(levelIndex===0){
        await page.setViewportSize({width:viewport.width,height:viewport.height-60});await page.waitForTimeout(100);
        await page.setViewportSize({width:viewport.width,height:viewport.height});await page.waitForTimeout(150);
      }
      await page.click('#pause');
      let count=0;
      while(count<level.count){
        const ids=await page.locator('.target').evaluateAll(es=>es.map(e=>+e.dataset.id));
        for(const [index,id] of ids.entries()){
          const matches=await page.locator('.target[data-id="'+id+'"] img').evaluate((img,c)=>
            img.src===(globalThis.__CROWD_ASSETS__?.[c.id]??new URL('/Find-face-game/'+c.file,location.href).href),CHARACTERS[id]);
          assert.equal(matches,true,'wall and target use identical art');
          await tap(id,id===proofId);count++;correctPicks++;
          try {
            await page.waitForFunction(expected=>document.querySelector('#progress').textContent===expected,`已找到 ${count} / ${level.count}`,{timeout:2000});
          } catch(error) {
            await page.screenshot({path:'/tmp/v03-touch-failure.png'});
            throw Error('Failed ID '+id+' expected '+count+' feedback '+await page.locator('#feedback').textContent(),{cause:error});
          }
          const actual=await page.locator('#progress').textContent();
          assert.equal(actual,`已找到 ${count} / ${level.count}`, 'exact touch '+id+' feedback '+await page.locator('#feedback').textContent());
          if(index<4)assert.equal(await page.locator('.target[data-id="'+id+'"].complete').count(),1,'exact ID completed');
        }
        assert.equal(await page.locator('#progress').textContent(),`已找到 ${count} / ${level.count}`);
      }
      assert.ok(await page.locator('#result').evaluate(e=>e.open));
      assert.match(await page.locator('#result h3').textContent(),/模拟/);
      await page.waitForTimeout(100);const final=await page.locator('#timer').textContent();await page.waitForTimeout(150);
      assert.equal(await page.locator('#timer').textContent(),final);
      await page.click('#again');assert.equal(await page.locator('#progress').textContent(),`已找到 0 / ${level.count}`);
      console.log('PASS',viewport.width,viewport.height,level.count,'offline',!!viewport.offline);
    }
    await page.click('#back');assert.ok(await page.locator('#menu').evaluate(e=>e.open));await page.click('#resume');
    assert.deepEqual(errors,[]);
    if(viewport.offline)assert.equal(network.length,0,'portable file makes no network requests');
    await context.close();
  }
  console.log('TOTAL CORRECT TOUCH PICKS',correctPicks);
}finally{await browser?.close();server.kill();}
