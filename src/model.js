import { BATCH_SIZE } from './levels.js';
import {INITIAL_TIME_MS,CORRECT_REWARD_MS,WRONG_PENALTY_MS} from './time-rules.js';
export {WRONG_PENALTY_MS} from './time-rules.js';
export function shuffle(values, random = Math.random) {
  const result=[...values];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export class Round {
  constructor(identities, now=()=>performance.now(), random=Math.random) {
    if(!Array.isArray(identities)&&(!Number.isInteger(identities)||identities<1))throw new Error('Invalid population');
    const ids=Array.isArray(identities)?[...identities]:Array.from({length:identities},(_,i)=>i);
    if(!ids.length||ids.length%BATCH_SIZE||new Set(ids).size!==ids.length||ids.some(id=>!Number.isInteger(id)||id<0))throw new Error('Invalid unique identity list');
    this.now=now;this.queue=shuffle(ids,random);this.identities=new Set(ids);
    this.found=new Set();this.offset=0;this.started=now();this.pausedAt=null;this.pauseTotal=0;
    this.pauseReasons=new Set();this.penaltyMs=0;this.rewardMs=0;this.finishedAt=null;this.status='opening';
    this.opening=true;this.pauseReasons.add('opening');this.pausedAt=this.started;
    this.transitioning=false;this.batchAdvanced=false;
  }
  waitForStart(){
    if(this.status!=='opening')return false;
    this.opening=true;this.setPause('opening',true);return true;
  }
  start(){
    if(!this.opening||this.over)return false;
    this.status='running';this.opening=false;this.setPause('opening',false);return true;
  }
  get targets(){return this.queue.slice(this.offset,this.offset+BATCH_SIZE);}
  get done(){return this.status==='won';}
  get over(){return this.status==='won'||this.status==='lost';}
  get remaining(){return Math.max(0,INITIAL_TIME_MS+this.rewardMs-this.penaltyMs-this.elapsed);}
  tick(){
    if(this.status!=='running'||this.remaining>0)return false;
    this.finishedAt=this.pausedAt??this.now();this.status='lost';return true;
  }
  get paused(){return this.pauseReasons.size>0;}
  get elapsed(){return (this.finishedAt??this.pausedAt??this.now())-this.started-this.pauseTotal;}
  setPause(reason,value) {
    if(this.over)return;
    const was=this.paused;
    if(value)this.pauseReasons.add(reason);else this.pauseReasons.delete(reason);
    if(!was&&this.paused)this.pausedAt=this.now();
    else if(was&&!this.paused){this.pauseTotal+=this.now()-this.pausedAt;this.pausedAt=null;}
  }
  pick(id) {
    this.tick();
    if(this.paused||this.transitioning||this.over)return 'blocked';
    if(!this.identities.has(id))return 'ignored';
    if(this.found.has(id))return 'found';
    if(!this.targets.includes(id)){this.penaltyMs+=WRONG_PENALTY_MS;this.tick();return 'wrong';}
    this.found.add(id);this.rewardMs+=CORRECT_REWARD_MS;
    if(this.found.size===this.queue.length){this.status='won';this.finishedAt=this.now();}
    else if(this.targets.every(target=>this.found.has(target))){
      this.transitioning=true;this.batchAdvanced=false;this.setPause('batch',true);
    }
    return 'correct';
  }
  advanceBatch() {
    if(!this.transitioning||this.batchAdvanced||this.done)return false;
    this.offset+=BATCH_SIZE;this.batchAdvanced=true;return true;
  }
  finishTransition() {
    if(!this.transitioning||!this.batchAdvanced)return false;
    this.transitioning=false;this.batchAdvanced=false;this.setPause('batch',false);return true;
  }
}
export function formatTime(ms,roundUp=false) {
  const tenths=Math[roundUp?'ceil':'floor'](Math.max(0,ms)/100);
  return `${String(Math.floor(tenths/600)).padStart(2,'0')}:${String(Math.floor(tenths/10)%60).padStart(2,'0')}.${tenths%10}`;
}
