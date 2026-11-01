import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { layout, LEVELS } from '../src/levels.js';
const server = spawn('node', ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  for (let i=0;i<60;i++) {
    try { const r = await fetch('http://127.0.0.1:5173'); if(r.ok) break; } catch {}
    await new Promise(r=>setTimeout(r,100));
  }
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args:['--no-sandbox'] });
  for (const viewport of [{width:390,height:844},{width:320,height:568},{width:375,height:667},{width:768,height:1024},{width:1440,height:1000}]) {
    const page = await browser.newPage({ viewport, hasTouch: true, isMobile: viewport.width < 600 });
    const errors=[];page.on('pageerror', e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5173');
    await page.waitForSelector('#targets .target');
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#targets .target').count(),5);
    async function visibleUI() {
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight));
      for(const selector of ['.toolbar','#game','canvas','#targets','.target']) {
        for(const element of await page.locator(selector).all()) {
          const b=await element.boundingBox();
          assert.ok(b && b.y >= 0 && b.y+b.height <= viewport.height+1, selector+' inside viewport');
        }
      }
    }
    await visibleUI();
    const frame=await page.locator('#game').boundingBox();
    const canvasFrame=await page.locator('canvas').boundingBox();
    assert.ok(canvasFrame.y+canvasFrame.height<=frame.y+frame.height+1,'canvas fits wall');
    await page.screenshot({path:`/tmp/v02-start-${viewport.width}.png`});
    async function clickFace(id, level) {
      const box=await page.locator('canvas').boundingBox();
      const dims=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height}));
      const p=layout(LEVELS[level],dims.width,dims.height)[id];
      await page.touchscreen.tap(box.x+p.x/dims.width*box.width,box.y+p.y/dims.height*box.height);
    }
    console.log('Loaded viewport',viewport.width);
    const targets=await page.locator('.target').evaluateAll(cards=>cards.map(c=>Number(c.dataset.id)));
    await clickFace(Array.from({length:10},(_,i)=>i).find(i=>!targets.includes(i)),0);
    await page.getByRole('status').filter({hasText:'不扣时间'}).waitFor();
    assert.equal(await page.locator('#progress').textContent(),'已找到 0 / 10');
    await page.click('#pause'); await page.waitForTimeout(100);
    const paused=await page.locator('#timer').textContent();
    await clickFace(targets[0],0);await page.waitForTimeout(250);
    assert.equal(await page.locator('#timer').textContent(),paused);
    assert.equal(await page.locator('#progress').textContent(),'已找到 0 / 10');
    await page.click('#pause');
    await clickFace(targets[0],0);
    assert.equal(await page.locator('.target.complete').count(),1);
    await page.click('#pause');
    await page.setViewportSize({width:viewport.width,height:viewport.height-80});
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.target.complete').count(),1);
    assert.equal(await page.locator('#pause').textContent(),'继续');
    await page.setViewportSize(viewport);
    await page.waitForTimeout(150);
    await page.click('#pause');
    await page.click('#restart');
    assert.equal(await page.locator('#progress').textContent(),'已找到 0 / 10');
    for (let level=0;level<2;level++) {
      await visibleUI();
      const matched=await page.locator('.target img').evaluateAll(images=>images.map(i=>i.src));
      const { avatarUrl }=await import('../src/avatars.js');
      const identity=await page.locator('.target').evaluateAll(cards=>cards.map(c=>Number(c.dataset.id)));
      assert.deepEqual(matched,identity.map(avatarUrl));
      let count=0;
      while(count<LEVELS[level].count) {
        const ids=await page.locator('.target').evaluateAll(cards=>cards.map(c=>Number(c.dataset.id)));
        for(const id of ids) { await clickFace(id,level);count++; }
        assert.equal(await page.locator('#progress').textContent(),`已找到 ${count} / ${LEVELS[level].count}`);
      }
      assert.ok(await page.locator('#result').evaluate(d=>d.open));
      assert.match(await page.locator('#result-time').textContent(),/实际用时/);
      assert.match(await page.locator('#result h3').textContent(),/模拟/);
      const finalTime=await page.locator('#timer').textContent();
      await page.waitForTimeout(150);
      // The next timer tick may update the final tenth once.
      assert.match(finalTime,/\d\d:\d\d\.\d/);
      console.log('Completed level',level+1, 'viewport',viewport.width);
      if(level===0) { await page.click('#next'); await page.screenshot({path:`/tmp/v02-dense-${viewport.width}.png`}); }
    }
    assert.deepEqual(errors,[]);
    await page.screenshot({path:`/tmp/find-face-${viewport.width}.png`,fullPage:true});
    console.log(`PASS Chromium ${viewport.width}×${viewport.height}: wrong/pause/restart + both levels (160 faces), result, no JS errors`);
    await page.close();
  }
} finally { await browser?.close();server.kill(); }
