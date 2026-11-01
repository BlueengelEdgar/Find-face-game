import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { artLayout } from '../src/art-layout.js';
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--strictPort'],{stdio:'ignore'});
let browser;
try {
  for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5173/Find-face-game/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  for(const viewport of [{width:390,height:844},{width:320,height:568},{width:768,height:1024},{width:1440,height:1000}]) {
    const page=await browser.newPage({viewport,hasTouch:true,isMobile:viewport.width<600});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/Find-face-game/');
    await page.waitForSelector('.target',{timeout:60000});await page.waitForTimeout(250);
    for(const selector of ['header','#game','canvas','.targets','.target'])for(const el of await page.locator(selector).all()){
      const b=await el.boundingBox();assert.ok(b.y>=0&&b.y+b.height<=viewport.height+1,selector+' fits screen');
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight));
    const canvas=await page.locator('canvas').boundingBox();
    const wall=await page.locator('#game').boundingBox();
    assert.ok(canvas.y+canvas.height<=wall.y+wall.height+1);
    const dims=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height}));
    const points=artLayout(dims.width,dims.height);
    const visible=await page.evaluate(async({points})=>{
      const images=await Promise.all(points.map(async p=>{
        const img=new Image();img.src='/Find-face-game/art/v03/character-'+String(p.id+1).padStart(3,'0')+'.png';await img.decode();
        const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
        const context=c.getContext('2d',{willReadFrequently:true});context.drawImage(img,0,0);
        const data=context.getImageData(0,0,c.width,c.height).data;
        return {...p,w:img.width,h:img.height,displayH:p.size*img.height/img.width,data};
      }));
      const alpha=(s,x,y)=>{
        const u=(x-s.x)/s.size+.5,v=(y-s.y)/s.displayH+.52;
        if(u<0||v<0||u>=1||v>=1)return 0;
        return s.data[(Math.floor(v*s.h)*s.w+Math.floor(u*s.w))*4+3];
      };
      const sorted=[...images].sort((a,b)=>b.depth-a.depth);
      return images.map(s=>{
        let opaque=0,shown=0,witness=null,throughTransparent=false,throughWitness=null;
        for(let yi=0;yi<=10;yi++)for(let xi=0;xi<=10;xi++){
          const x=s.x+(-.14+xi*.028)*s.size,y=s.y+(-.08+yi*.016)*s.displayH;
          if(alpha(s,x,y)<96)continue;opaque++;
          const top=sorted.find(q=>alpha(q,x,y)>=96);
          if(top?.id===s.id){
            shown++;witness??={x,y};
            if(sorted.some(q=>q.depth>s.depth&&Math.abs(x-q.x)<q.size/2&&y>q.y-.52*q.displayH&&y<q.y+.48*q.displayH))throughTransparent=true;
          }
        }
        // Also inspect hair/shoulder pixels behind transparent foreground
        // bounding boxes, because covered bodies are part of the clickable art.
        for(let yi=1;yi<19;yi++)for(let xi=1;xi<19;xi++){
          const x=s.x+(xi/20-.5)*s.size,y=s.y+(yi/20-.52)*s.displayH;
          if(x<0||y<0||x>=document.querySelector('canvas').width||y>=document.querySelector('canvas').height)continue;
          if(alpha(s,x,y)<96)continue;
          if(sorted.find(q=>alpha(q,x,y)>=96)?.id!==s.id)continue;
          // Touch coordinates are rounded by the browser. Require a 3px
          // stable interior rather than tapping a one-source-pixel hair edge.
          if(![-1.5,0,1.5].every(dx=>[-1.5,0,1.5].every(dy=>
            alpha(s,x+dx,y+dy)>=240 &&
            sorted.find(q=>alpha(q,x+dx,y+dy)>=32)?.id===s.id)))continue;
          if(sorted.some(q=>q.depth>s.depth&&Math.abs(x-q.x)<q.size/2&&y>q.y-.52*q.displayH&&y<q.y+.48*q.displayH)){
            throughTransparent=true;throughWitness??={x,y};
          }
        }
        return {id:s.id,visible:shown/opaque,witness,throughTransparent,throughWitness,size:s.size};
      });
    },{points});
    console.log('VISIBLE',viewport.width,visible.map(v=>v.visible.toFixed(2)).join(','),'sprite widths',Math.round(Math.min(...visible.map(v=>v.size))),'-',Math.round(Math.max(...visible.map(v=>v.size))));
    assert.ok(visible.every(v=>v.witness && v.visible>=.85),'protected facial regions must remain visible');
    assert.ok(visible.some(v=>v.throughTransparent),'exercise visible character through transparent foreground bounds');
    const tap=async (id,overlap=true)=>{const p=(overlap && visible[id].throughWitness) || visible[id].witness;await page.touchscreen.tap(canvas.x+p.x/dims.width*canvas.width,canvas.y+p.y/dims.height*canvas.height);};
    await page.screenshot({path:`/tmp/v03-stage1-${viewport.width}.png`});
    const ids=await page.locator('.target').evaluateAll(es=>es.map(e=>+e.dataset.id));
    const wrong=points.find(p=>!ids.includes(p.id)).id;
    await tap(wrong,false);assert.equal(await page.locator('#progress').textContent(),'已找到 0 / 10');
    await page.click('#pause');await page.waitForTimeout(100);const timer=await page.locator('#timer').textContent();
    await tap(ids[0]);await page.waitForTimeout(200);assert.equal(await page.locator('#timer').textContent(),timer);
    await page.setViewportSize({width:viewport.width,height:viewport.height-60});
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#progress').textContent(),'已找到 0 / 10');
    await page.setViewportSize(viewport);await page.waitForTimeout(200);
    await page.click('#pause');
    for(let batch=0;batch<2;batch++){
      const targets=await page.locator('.target').evaluateAll(es=>es.map(e=>+e.dataset.id));
      for(const [index,id] of targets.entries()){
        assert.ok(await page.locator('.target[data-id="'+id+'"] img').evaluate((img,id)=>img.src.endsWith('character-'+String(id+1).padStart(3,'0')+'.png'),id));
        await tap(id);
        if(index<4)assert.equal(await page.locator('.target[data-id="'+id+'"].complete').count(),1,'exact target identity');
      }
      assert.equal(await page.locator('#progress').textContent(),`已找到 ${(batch+1)*5} / 10`);
    }
    assert.ok(await page.locator('#result').evaluate(e=>e.open));
    await page.click('#again');assert.equal(await page.locator('#progress').textContent(),'已找到 0 / 10');
    await page.click('#back');assert.ok(await page.locator('#menu').evaluate(e=>e.open));await page.click('#resume');
    assert.deepEqual(errors,[]);
    console.log('PASS V0.3 stage1',viewport.width,viewport.height,'full touch completion, matching, alpha overlap, pause/restart/menu, UI bounds');
    await page.close();
  }
}finally{await browser?.close();server.kill();}
