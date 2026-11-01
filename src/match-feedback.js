// A single Web Animation clock drives both DOM and Phaser visuals.
export const MATCH_PULSE_MS=200;
export const MATCH_PULSE_PEAK=1.12;
export function pulseMatch(scene,id,card,animations){
  if(!card?.animate)return Promise.resolve();
  const face=scene.faces.get(id);
  if(!face?.active)return Promise.resolve();
  const visual=scene.add.image(face.x,face.y,face.texture.key)
    .setOrigin(face.originX,face.originY).setScale(face.scaleX,face.scaleY).setDepth(face.depth+.01);
  visual.setData('feedback','match');visual.setData('identity',id);
  const baseX=face.scaleX,baseY=face.scaleY;
  const samples=Array.from({length:9},(_,i)=>1+(MATCH_PULSE_PEAK-1)*Math.sin(Math.PI*i/8));
  const animation=card.animate(samples.map((scale,i)=>({offset:i/8,transform:`scale(${scale})`})),{duration:MATCH_PULSE_MS,easing:'linear',fill:'both'});
  const previousZ=card.style.zIndex;card.style.zIndex='4';
  animations.add(animation);if(document.hidden)animation.pause();
  let frame;
  const render=()=>{
    if(!visual.active)return;
    const progress=animation.effect.getComputedTiming().progress??0;
    const position=Math.min(8,Math.max(0,progress*8)),index=Math.min(7,Math.floor(position));
    const scale=samples[index]+(samples[index+1]-samples[index])*(position-index);
    visual.setScale(baseX*scale,baseY*scale);
    frame=requestAnimationFrame(render);
  };
  render();
  return animation.finished.catch(()=>{}).finally(()=>{
    cancelAnimationFrame(frame);animations.delete(animation);animation.cancel();
    card.style.zIndex=previousZ;visual.destroy();
  });
}
