// Viewport-level cosmetic effects: never take input or modify round time.
export class FeedbackEffects{
  constructor(layer,animations){this.layer=layer;this.animations=animations;this.owned=new Set();this.generation=0;}
  animate(node,frames,duration,onFinish){
    this.layer.append(node);
    if(!node.animate){node.remove();onFinish?.();return null;}
    const generation=this.generation;
    const animation=node.animate(frames,{duration,easing:'linear',fill:'both'});
    this.owned.add(animation);this.animations.add(animation);
    if(document.hidden)animation.pause();
    animation.finished.then(()=>{if(generation===this.generation)onFinish?.();}).catch(()=>{}).finally(()=>{
      this.owned.delete(animation);this.animations.delete(animation);animation.cancel();node.remove();
    });
    return animation;
  }
  clear(){this.generation++;for(const a of this.owned){this.animations.delete(a);a.cancel();}this.owned.clear();this.layer.replaceChildren();}
  impact(positive,recovery=false){
    const r=document.querySelector('#progress').getBoundingClientRect(),node=document.createElement('i');
    node.className='time-impact '+(positive?'positive':'negative');node.dataset.recovery=String(recovery);
    Object.assign(node.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});
    this.animate(node,[{opacity:.9,transform:'scale(1)'},{opacity:0,transform:positive?'scale(1.18,2.4)':'translateX(-4px) scale(1.08,1.8)'}],220);
  }
  fly(point,positive){
    const r=document.querySelector('#progress').getBoundingClientRect(),node=document.createElement('b');
    node.className='time-flight '+(positive?'positive':'negative');node.textContent=positive?'+3s':'−2s';
    Object.assign(node.style,{left:point.x+'px',top:point.y+'px'});
    const dx=r.x+r.width/2-point.x,dy=r.y+r.height/2-point.y;
    const frames=Array.from({length:11},(_,i)=>{const t=i/10;return {offset:t,opacity:t<.8?1:1-(t-.8)*5,transform:`translate(-50%,-50%) translate(${dx*t+Math.sin(Math.PI*t)*48}px,${dy*t-Math.sin(Math.PI*t)*35}px) scale(${1-.25*t})`};});
    this.animate(node,frames,440,()=>this.impact(positive));
  }
  stars(card,strong=false){
    const r=card.getBoundingClientRect(),count=strong?20:16;
    for(let i=0;i<count;i++){
      const star=document.createElement('i');star.className='target-star';star.textContent=i%4?'★':'✦';
      star.dataset.target=card.dataset.id;
      const angle=Math.PI*(.12+i/(count-1)*.76),distance=60+(i*29%60)+(strong?12:0);
      const dx=Math.cos(angle)*distance,dy=-Math.sin(angle)*distance;
      Object.assign(star.style,{left:(r.x+r.width/2)+'px',top:(r.y+r.height*.45)+'px',color:['#edbb53','#fffbe3','#e9cf78','#a8c8bc'][i%4],fontSize:(10+i%4*3)+'px'});
      this.animate(star,[{opacity:1,transform:'translate(-50%,-50%) scale(.35) rotate(0deg)'},{opacity:1,transform:`translate(calc(-50% + ${dx*.65}px),calc(-50% + ${dy*.8}px)) scale(1.2) rotate(${i*37}deg)`,offset:.55},{opacity:0,transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.45) rotate(${i*73}deg)`}],520+i%3*35);
    }
  }
}
