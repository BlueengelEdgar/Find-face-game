export const BATCH_SIZE=5;
export const WIDTH=390;
export const HEIGHT=540;
export const LEVELS=[
  {name:'第一关',background:'garden'},
  {name:'第二关',background:'town'},
];
export function selectPack(levelIndex,width,height){
  const tier=levelIndex===0?'first':height/width>=1.55&&width>=300?'regular':'compact';
  return {...LEVELS[levelIndex],levelIndex,tier,count:tier==='first'?10:tier==='regular'?75:45};
}
export function supportsPack(pack,width,height){
  return width>=240&&height>=280&&height/width>=(pack.tier==='regular'?1.50:1.15);
}
