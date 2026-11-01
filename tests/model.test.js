import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Round,shuffle,formatTime} from '../src/model.js';
import {timeView} from '../src/time-rules.js';
import {selectPack,supportsPack} from '../src/levels.js';
import {crowdLayout,allLevelIds} from '../src/art-layout.js';
import {CHARACTERS} from '../src/characters.js';
const running=(ids,now=()=>0)=>{const r=new Round(ids,now);r.start();return r;};
test('shuffle preserves unique membership without mutating input',()=>{
 const ids=[0,1,2,3,4];assert.deepEqual([...shuffle(ids)].sort(),ids);assert.deepEqual(ids,[0,1,2,3,4]);
});
test('reject duplicate, invalid and incomplete batches',()=>{
 for(const ids of [0,-1,3,5.5,'5',[0,0,1,2,3],[-1,0,1,2,3]])assert.throws(()=>new Round(ids));
});
test('opening freezes 30 seconds and rejects every pick until one idempotent start',()=>{
 let now=0;const r=new Round(5,()=>now);now=10000;assert.equal(r.remaining,30000);assert.equal(r.pick(r.targets[0]),'blocked');
 assert.equal(r.start(),true);assert.equal(r.start(),false);now+=100;assert.equal(r.remaining,29900);assert.equal(r.waitForStart(),false);
});
test('correct adds exactly three seconds without cap; repeated found and blanks have no effect',()=>{
 const r=running(10),id=r.targets[0];assert.equal(r.pick(id),'correct');assert.equal(r.remaining,33000);
 assert.equal(r.pick(id),'found');assert.equal(r.pick(-1),'ignored');assert.equal(r.remaining,33000);
 assert.equal(timeView(r.remaining).fraction,1);assert.equal(timeView(r.remaining).phase,'green');
});
test('every separate wrong pick immediately subtracts two seconds',()=>{
 const r=running(10),id=r.queue[8];for(let i=1;i<=5;i++){assert.equal(r.pick(id),'wrong');assert.equal(r.remaining,30000-i*2000);}
});
test('clock expiration is terminal and cannot be rescued by a late correct pick',()=>{
 let now=0;const r=running(5,()=>now);now=30000;assert.equal(r.tick(),true);assert.equal(r.status,'lost');
 assert.equal(r.remaining,0);assert.equal(r.pick(r.targets[0]),'blocked');now=99999;assert.equal(r.tick(),false);assert.equal(r.remaining,0);
});
test('wrong pick exhausting time loses immediately with no negative display',()=>{
 let now=0;const r=running(10,()=>now);now=29000;assert.equal(r.pick(r.queue[8]),'wrong');assert.equal(r.status,'lost');assert.equal(r.remaining,0);assert.equal(r.elapsed,29000);
});
test('late timer polling cannot admit a correct pick after timeout',()=>{
 let now=0;const r=running(5,()=>now);now=50000;assert.equal(r.pick(r.targets[0]),'blocked');assert.equal(r.status,'lost');assert.equal(r.found.size,0);
});
test('last correct pick wins before any later timeout update',()=>{
 let now=0;const r=running(5,()=>now);for(const id of r.targets)r.pick(id);
 assert.equal(r.status,'won');assert.equal(r.remaining,45000);now=999999;assert.equal(r.tick(),false);assert.equal(r.remaining,45000);
});
test('green/yellow/red boundaries and fill clamp use actual remaining time',()=>{
 for(const [ms,phase] of [[40000,'green'],[30000,'green'],[20001,'green'],[20000,'yellow'],[10001,'yellow'],[10000,'red'],[1,'red'],[0,'expired'],[-100,'expired']])assert.equal(timeView(ms).phase,phase);
 assert.equal(timeView(40000).fraction,1);assert.equal(timeView(20000).fraction,2/3);assert.equal(timeView(10000).fraction,1/3);assert.equal(timeView(-10).fraction,0);
});
test('red 8s recovers to yellow 11s, green 23s, then drops into danger again',()=>{
 let now=0;const r=running(15,()=>now);now=22000;assert.equal(timeView(r.remaining).phase,'red');
 r.pick(r.targets[0]);assert.equal(r.remaining,11000);assert.equal(timeView(r.remaining).phase,'yellow');
 for(const id of r.targets.slice(1))r.pick(id);assert.equal(r.remaining,23000);assert.equal(timeView(r.remaining).phase,'green');
 r.advanceBatch();r.finishTransition();now+=14000;assert.equal(r.remaining,9000);assert.equal(timeView(r.remaining).phase,'red');
});
test('both batch animation phases block input and exclude all animation time',()=>{
 let now=0;const r=running(10,()=>now);now=1000;const first=[...r.targets];for(const id of first)r.pick(id);
 assert.equal(r.remaining,44000);now+=200;assert.deepEqual(r.targets,first);assert.equal(r.pick(r.queue[8]),'blocked');
 assert.equal(r.finishTransition(),false);assert.equal(r.advanceBatch(),true);assert.equal(r.advanceBatch(),false);now+=500;assert.equal(r.remaining,44000);
 assert.equal(r.pick(r.targets[0]),'blocked');r.finishTransition();now+=100;assert.equal(r.remaining,43900);
});
test('nested visibility, viewport and opening pauses cannot resume the clock early',()=>{
 let now=0;const r=new Round(5,()=>now);r.setPause('hidden',true);now=3000;r.start();now=6000;assert.equal(r.remaining,30000);
 r.setPause('viewport',true);r.setPause('hidden',false);now=9000;assert.equal(r.remaining,30000);r.setPause('viewport',false);now+=100;assert.equal(r.remaining,29900);
});
test('retry uses a fresh queue with zero rewards, penalties and completed identities',()=>{
 const old=running(10);old.pick(old.targets[0]);old.pick(old.queue[8]);const fresh=new Round(10);
 assert.equal(fresh.remaining,30000);assert.equal(fresh.found.size,0);assert.equal(fresh.rewardMs,0);assert.equal(fresh.penaltyMs,0);assert.equal(fresh.status,'opening');
});
for(const [w,h] of [[370,620],[300,390]])for(const level of [0,1]){
 const pack=selectPack(level,w,h),points=crowdLayout(pack,w,h);
 test(`all configured ${pack.count} identities complete at ${w}x${h}`,()=>{
  let now=0;const r=running(points.map(p=>p.id),()=>now),seen=new Set();
  while(!r.done){for(const id of [...r.targets]){now+=100;assert.equal(r.pick(id),'correct');assert.equal(seen.has(id),false);seen.add(id);}if(!r.done){now+=700;r.advanceBatch();r.finishTransition();}}
  assert.equal(seen.size,pack.count);assert.equal(r.remaining,30000+pack.count*2900);assert.equal(r.elapsed,pack.count*100);
 });
}
test('layouts are reproducible, use unique real artwork IDs and bounded portrait sizes',()=>{
 for(const [w,h] of [[300,390],[370,620],[480,810]]){
  for(const level of [0,1]){
   const p=selectPack(level,w,h),points=crowdLayout(p,w,h);
   assert.equal(new Set(points.map(v=>v.id)).size,p.count);assert.deepEqual(points,crowdLayout(p,w,h));
   assert.ok(points.every(v=>v.id>=0&&v.id<CHARACTERS.length&&v.size>=w*.17&&v.x>0&&v.x<w&&v.y>0&&v.y<h));
  }
 }
 assert.equal(supportsPack(selectPack(1,370,620),370,200),false);
});
test('all retained character files remain unique, valid local WebP resources',async()=>{
 const hashes=[];for(const c of CHARACTERS){
  const data=await readFile(new URL('../public/'+c.file,import.meta.url));
  assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
  hashes.push(createHash('sha256').update(data).digest('hex'));
 }
 assert.equal(CHARACTERS.length,150);assert.equal(new Set(hashes).size,150);
 assert.ok(allLevelIds(1).every(id=>CHARACTERS[id]));
});
test('both local backgrounds are small raster assets and UI has no population or dev controls',async()=>{
 for(const name of ['garden','town']){const f=await readFile(new URL('../public/art/backgrounds/'+name+'.webp',import.meta.url));assert.equal(f.toString('ascii',8,12),'WEBP');assert.ok(f.length<180000);}
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/id="(?:back|pause|restart|level|menu)"/);
 assert.doesNotMatch(html,/\d+\s*(?:人|位)|样板|V0\.[34]/);
 assert.match(html,/CONGRATULATIONS!/);assert.match(html,/LEVEL COMPLETE!/);
});

test('time formatting never displays negative remaining time',()=>{
 assert.equal(formatTime(30000),'00:30.0');assert.equal(formatTime(33456),'00:33.4');assert.equal(formatTime(-1),'00:00.0');assert.equal(formatTime(1,true),'00:00.1');assert.equal(formatTime(29999,true),'00:30.0');
});
test('150-ID / 30-batch state completion is not a visual layout acceptance',()=>{
 const r=running(CHARACTERS.map(c=>c.id)),seen=new Set();let batches=0;
 while(!r.done){batches++;for(const id of [...r.targets]){assert.ok(!seen.has(id));seen.add(id);r.pick(id);}if(!r.done){r.advanceBatch();r.finishTransition();}}
 assert.equal(batches,30);assert.equal(seen.size,150);assert.equal(r.remaining,480000);
});
