import Phaser from 'phaser';
import './style.css';
import { WIDTH,HEIGHT,selectPack,supportsPack } from './levels.js';
import { Round,formatTime } from './model.js';
import { characterUrl } from './characters.js';
import { crowdLayout,allLevelIds } from './art-layout.js';
import { CrowdScene } from './scene.js';
import { pulseMatch } from './match-feedback.js';
const $=selector=>document.querySelector(selector);
let scene,round,pack,loading=false,epoch=0,timerFlash;
const activeAnimations=new Set();
function clock(){if(round)$('#timer').textContent=formatTime(round.elapsed);}
function updateProgress(){
  const ratio=round.found.size/round.queue.length;
  $('#progress').setAttribute('aria-valuenow',String(Math.round(ratio*100)));
  $('#progress i').style.width=ratio*100+'%';
}
function targets(){
  const host=$('#targets'),existing=[...host.children];
  // Keep cards alive during rapid correct picks so their match pulses can finish.
  const same=existing.length===round.targets.length&&existing.every((card,i)=>Number(card.dataset.id)===round.targets[i]);
  if(!same)host.replaceChildren(...round.targets.map((id,index)=>{
    const card=document.createElement('div');card.className='target';card.dataset.id=id;
    const img=new Image();img.src=characterUrl(id);img.alt='需要寻找的朋友';card.append(img);
    const badge=document.createElement('b');badge.className='slot-badge';badge.textContent=index+1;card.append(badge);
    return card;
  }));
  for(const card of host.children){
    if(!round.found.has(Number(card.dataset.id))){card.classList.remove('complete');card.querySelector('.completion-check')?.remove();}
    if(round.found.has(Number(card.dataset.id))&&!card.classList.contains('complete')){
      card.classList.add('complete');const check=document.createElement('span');check.className='completion-check';check.textContent='✓';card.append(check);
    }
  }
}
function cancelAnimations(){for(const a of activeAnimations)a.cancel();activeAnimations.clear();}
function motion(cards,frames,duration,stagger=0){
  if(!cards[0]?.animate)return new Promise(resolve=>setTimeout(resolve,duration+stagger*(cards.length-1)));
  const animations=cards.map((card,index)=>{
    const a=card.animate(typeof frames==='function'?frames(index):frames,{duration,delay:index*stagger,easing:'cubic-bezier(.2,.75,.25,1)',fill:'both'});
    activeAnimations.add(a);if(document.hidden)a.pause();return a;
  });
  return Promise.allSettled(animations.map(a=>a.finished)).then(()=>{for(const a of animations){activeAnimations.delete(a);a.cancel();}});
}
function sparkle(){
  const host=document.querySelector('.targets');
  for(let i=0;i<12;i++){
    const star=document.createElement('i');star.className='batch-spark';star.textContent=i%3?'✦':'★';
    star.style.left=(5+i*8)+'%';host.append(star);
    motion([star],[{opacity:1,transform:'translateY(0) scale(.5)'},{opacity:0,transform:`translateY(${-35-i%4*12}px) scale(1.3) rotate(90deg)`}],500).then(()=>star.remove());
  }
  motion([host],[{boxShadow:'0 0 0 0 #ffe09b'},{boxShadow:'0 0 24px 8px #ffe09b',offset:.3},{boxShadow:'0 2px 0 #b8c7b5'}],500);
}
async function swapBatch(owner,token){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('#targets').dataset.phase='exiting';$('#targets').setAttribute('aria-busy','true');$('#batch').textContent='MATCH COMPLETE!';sparkle();
  await motion([...$('#targets').children],i=>[
    {opacity:1,transform:'scale(1)'},
    {opacity:1,transform:'scale(1.1)',offset:.3},
    {opacity:0,transform:reduced?'scale(1)':`translate(${(i-2)*23}px,-55px) rotate(${(i-2)*9}deg) scale(.85)`}
  ],180);
  if(round!==owner||epoch!==token)return;
  owner.advanceBatch();targets();$('#targets').dataset.phase='entering';
  await motion([...$('#targets').children],i=>[
    {opacity:0,transform:reduced?'scale(1)':`translate(${(2-i)*24}px,40px) rotate(${(2-i)*7}deg) scale(.75)`},
    {opacity:1,transform:'translate(0,-5px) rotate(0) scale(1.07)',offset:.72},
    {opacity:1,transform:'translate(0,0) rotate(0) scale(1)'}
  ],280,10);
  if(round!==owner||epoch!==token)return;
  owner.finishTransition();$('#targets').dataset.phase='idle';$('#targets').setAttribute('aria-busy','false');
  $('#batch').textContent='新的朋友来了';$('#feedback').textContent='继续寻找下方的朋友';clock();
}
async function opening(owner,token){
  const overlay=$('#opening');overlay.hidden=false;
  for(const [text,detail,duration] of [
    ['FIND THE MATCHING FACES!','找到与下方相同的人物',550],['3','',800],['2','',800],['1','',800],['GO!','',350]
  ]){
    if(round!==owner||epoch!==token)return;
    overlay.dataset.step=text;overlay.querySelector('strong').textContent=text;overlay.querySelector('small').textContent=detail;
    if(text==='GO!'){owner.start();overlay.style.pointerEvents='none';clock();}
    await motion([overlay.querySelector('.opening-copy')],[{opacity:0,transform:'scale(.65)'},{opacity:1,transform:'scale(1.08)',offset:.25},{opacity:1,transform:'scale(1)',offset:.75},{opacity:0,transform:'scale(1.15)'}],duration);
  }
  if(round!==owner||epoch!==token)return;
  overlay.hidden=true;overlay.style.pointerEvents='';
}
function confetti(){
  $('#confetti').replaceChildren();
  const colors=['#d98f7d','#79a69a','#e5bb61','#95b4ce','#bb9ec0'];
  for(let i=0;i<30;i++){
    const piece=document.createElement('i');piece.style.left=(i*37%100)+'%';
    piece.style.background=colors[i%colors.length];piece.style.animationDelay=(i%7)*.07+'s';
    piece.style.setProperty('--drift',((i*29%120)-60)+'px');
    piece.addEventListener('animationend',()=>piece.remove(),{once:true});$('#confetti').append(piece);
  }
}
function finish(){
  clock();$('#result-time').textContent=formatTime(round.elapsed);
  const first=pack.levelIndex===0;$('#leaderboard').hidden=first;
  $('#ranking').replaceChildren();
  if(!first)for(const text of ['模拟玩家 A — 00:35.2','模拟玩家 B — 01:12.8','模拟玩家 C — 02:08.4']){
    const li=document.createElement('li');li.textContent=text;$('#ranking').append(li);
  }
  $('#result-action').textContent=first?'NEXT LEVEL':'重新挑战';$('#result-action').disabled=false;
  $('#result').hidden=false;confetti();$('#result-action').focus({preventScroll:true});
}
async function beginLevel(index){
  if(!scene||loading)return;
  loading=true;const token=++epoch;cancelAnimations();$('#result-action').disabled=true;
  $('#feedback').textContent='正在准备画面…';
  try{
    await scene.prepare(allLevelIds(index));
    if(token!==epoch)return;
    pack=selectPack(index,scene.scale.width,scene.scale.height);
    const ids=crowdLayout(pack,scene.scale.width,scene.scale.height).map(p=>p.id);
    round=new Round(ids);round.waitForStart();round.setPause('hidden',document.hidden);
    round.setPause('viewport',!supportsPack(pack,scene.scale.width,scene.scale.height));
    scene.show(pack);scene.setBlocked(round.pauseReasons.has('viewport'));
    $('#level-name').textContent=pack.name;
    $('#result').hidden=true;$('#confetti').replaceChildren();$('#result-action').disabled=false;
    $('#targets').dataset.phase='idle';$('#targets').setAttribute('aria-busy','false');
    $('#batch').textContent='开始寻找';$('#feedback').textContent='寻找下方的朋友';
    targets();updateProgress();clock();loading=false;opening(round,token);
  }catch(error){
    console.error('Level initialization failed',error);
    $('#feedback').textContent='画面加载失败，请刷新重试';$('#result-action').disabled=false;
  }finally{loading=false;}
}
const controller={
  attach(value){scene=value;beginLevel(0);},
  resize(){
    if(!round||!pack)return;
    const blocked=!supportsPack(pack,scene.scale.width,scene.scale.height);
    round.setPause('viewport',blocked);
    scene.show(pack);round.found.forEach(id=>scene.mark(id));scene.setBlocked(blocked);
    clock();
  },
  pick(id){
    if(!round||loading)return;
    const result=round.pick(id);
    if(result==='correct'){
      scene.mark(id);targets();updateProgress();clock();$('#feedback').textContent='找到了！';
      const owner=round,token=epoch;
      const pulse=pulseMatch(scene,id,$('#targets').querySelector(`[data-id="${id}"]`),activeAnimations);
      if(owner.done||owner.transitioning)pulse.then(()=>{
        if(round!==owner||epoch!==token)return;
        if(owner.done)finish();else swapBatch(owner,token);
      });
    }else if(result==='wrong'){
      scene.wrong(id);clock();$('#feedback').textContent='选错了，已增加时间';
      timerFlash?.cancel();
      timerFlash=$('#timer').animate?.([{color:'#d34f47',background:'#ffe0d5',transform:'scale(1.05)'},{color:'#345762',background:'#fff9e8',transform:'scale(1)'}],{duration:330});
      try{if(typeof navigator.vibrate==='function')navigator.vibrate(30);}catch{}
    }else if(result==='found')$('#feedback').textContent='这位朋友已经找到了';
  },
};
new Phaser.Game({
  type:Phaser.AUTO,parent:'game',width:WIDTH,height:HEIGHT,backgroundColor:'#efe1c2',
  scene:new CrowdScene(controller),scale:{mode:Phaser.Scale.NONE,autoCenter:Phaser.Scale.CENTER_BOTH},
  input:{activePointers:2},render:{antialias:true},audio:{noAudio:true},
});
$('#result-action').onclick=()=>beginLevel(1);
document.addEventListener('visibilitychange',()=>{for(const a of activeAnimations){if(document.hidden)a.pause();else a.play();}if(round){round.setPause('hidden',document.hidden);clock();}});
setInterval(clock,50);
// Reserve target geometry before artwork loads, preventing canvas/input jumps.
for(let i=0;i<5;i++){const slot=document.createElement('div');slot.className='target';$('#targets').append(slot);}
