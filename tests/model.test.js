import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Round,shuffle,formatTime} from '../src/model.js';
import {selectPack,supportsPack} from '../src/levels.js';
import {crowdLayout,allLevelIds} from '../src/art-layout.js';
import {CHARACTERS} from '../src/characters.js';
test('shuffle preserves unique identity membership without mutating input',()=>{
 const ids=[2,7,13,48,90],copy=[...ids],mixed=shuffle(ids,()=>.37);
 assert.deepEqual(ids,copy);assert.deepEqual([...mixed].sort((a,b)=>a-b),copy);
});
test('reject invalid or duplicate identities and non-batched populations',()=>{
 for(const invalid of [0,-1,3,5.5,'5',[0,0,1,2,3],[-1,0,1,2,3]])assert.throws(()=>new Round(invalid));
});
test('wrong selections add exactly three seconds each including rapid repeated picks',()=>{
 let now=0;const r=new Round(10,()=>now,()=>.5),wrong=r.queue[7];
 for(let i=1;i<=5;i++){assert.equal(r.pick(wrong),'wrong');assert.equal(r.penaltyMs,i*3000);assert.equal(r.elapsed,i*3000);}
});
test('correct, already found and unknown/blank identities never add penalty',()=>{
 const r=new Round(10,()=>0),id=r.targets[0];assert.equal(r.pick(id),'correct');
 assert.equal(r.pick(id),'found');assert.equal(r.pick(-1),'ignored');assert.equal(r.pick(1500),'ignored');assert.equal(r.penaltyMs,0);
});
test('completed batch stays displayed until explicit animation midpoint',()=>{
 const r=new Round(10,()=>0);const old=[...r.targets];old.forEach(id=>r.pick(id));
 assert.equal(r.transitioning,true);assert.deepEqual(r.targets,old);assert.equal(r.paused,true);
 assert.equal(r.finishTransition(),false);assert.equal(r.advanceBatch(),true);assert.equal(r.advanceBatch(),false);
 assert.equal(r.targets.some(id=>old.includes(id)),false);assert.equal(r.finishTransition(),true);assert.equal(r.finishTransition(),false);
});
test('all input is blocked during both exit and entry animation phases',()=>{
 const r=new Round(10,()=>0),group=[...r.targets];group.forEach(id=>r.pick(id));
 assert.equal(r.pick(r.queue[8]),'blocked');r.advanceBatch();
 assert.equal(r.pick(r.targets[0]),'blocked');assert.equal(r.penaltyMs,0);assert.equal(r.found.size,5);
});
test('batch animation interval is excluded from elapsed time',()=>{
 let now=100;const r=new Round(10,()=>now);now=1100;[...r.targets].forEach(id=>r.pick(id));
 assert.equal(r.elapsed,1000);now+=180;r.advanceBatch();assert.equal(r.elapsed,1000);
 now+=280;r.finishTransition();assert.equal(r.elapsed,1000);now+=100;assert.equal(r.elapsed,1100);
});
test('nested background and batch pauses never resume clock early',()=>{
 let now=0;const r=new Round(10,()=>now);now=100;[...r.targets].forEach(id=>r.pick(id));
 now=200;r.setPause('hidden',true);now=300;r.advanceBatch();now=560;r.finishTransition();
 assert.equal(r.paused,true);assert.equal(r.elapsed,100);now=1000;r.setPause('hidden',false);now=1100;assert.equal(r.elapsed,200);
});
test('penalties coexist with real elapsed time and viewport pauses',()=>{
 let now=0;const r=new Round(10,()=>now);now=1000;r.pick(r.queue[8]);assert.equal(r.elapsed,4000);
 r.setPause('viewport',true);now=9000;assert.equal(r.elapsed,4000);
 assert.equal(r.pick(r.queue[8]),'blocked');r.setPause('viewport',false);now=10000;assert.equal(r.elapsed,5000);
});
for(const [w,h] of [[370,620],[300,390]]){
 for(const level of [0,1]){
  const pack=selectPack(level,w,h),points=crowdLayout(pack,w,h);
  test('full completion for '+pack.tier+' at '+w+'×'+h,()=>{
   let now=0;const r=new Round(points.map(p=>p.id),()=>now);const seen=new Set();
   while(!r.done){
    const group=[...r.targets];assert.equal(group.length,5);
    for(const id of group){now+=100;assert.equal(r.pick(id),'correct');assert.equal(seen.has(id),false);seen.add(id);}
    if(!r.done){now+=180;assert.equal(r.advanceBatch(),true);now+=280;r.finishTransition();}
   }
   assert.equal(seen.size,pack.count);assert.equal(r.elapsed,pack.count*100);
   const finished=r.elapsed;now+=5000;assert.equal(r.elapsed,finished);assert.equal(r.pick(points[0].id),'blocked');
  });
 }
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
test('formatted time includes penalties without negative output',()=>{
 assert.equal(formatTime(72567),'01:12.5');assert.equal(formatTime(-20),'00:00.0');
});
test('opening blocks every pick and freezes clock until GO, start is idempotent',()=>{
 let now=0;const r=new Round(5,()=>now);r.waitForStart();now=2000;
 assert.equal(r.elapsed,0);assert.equal(r.pick(r.targets[0]),'blocked');assert.equal(r.penaltyMs,0);
 assert.equal(r.start(),true);now=2100;assert.equal(r.elapsed,100);assert.equal(r.start(),false);
 now=2200;assert.equal(r.elapsed,200);assert.equal(r.pick(r.targets[0]),'correct');
});
test('GO respects a nested visibility pause and tutorial has only one batch',()=>{
 let now=0;const r=new Round(5,()=>now);r.waitForStart();r.setPause('hidden',true);now=3000;r.start();
 assert.equal(r.elapsed,0);assert.equal(r.pick(r.targets[0]),'blocked');now=5000;r.setPause('hidden',false);
 now=5100;for(const id of r.targets)assert.equal(r.pick(id),'correct');assert.equal(r.done,true);assert.equal(r.elapsed,100);assert.equal(r.transitioning,false);
 for(const dims of [[370,594],[300,382]]){const p=selectPack(0,...dims);assert.equal(p.count,5);assert.equal(crowdLayout(p,...dims).length,5);}
});
test('all 150 existing identities complete 30 unique model batches (not layout acceptance)',()=>{
 const ids=CHARACTERS.map(c=>c.id),r=new Round(ids,()=>0),seen=new Set();let batches=0;
 while(!r.done){batches++;for(const id of [...r.targets]){assert.equal(seen.has(id),false);seen.add(id);assert.equal(r.pick(id),'correct');}if(!r.done){r.advanceBatch();r.finishTransition();}}
 assert.equal(batches,30);assert.equal(seen.size,150);assert.equal(r.penaltyMs,0);
});
