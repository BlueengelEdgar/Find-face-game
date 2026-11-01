import Phaser from 'phaser';
import { CHARACTERS,characterUrl } from './characters.js';
import { BACKGROUNDS,backgroundUrl } from './backgrounds.js';
import { crowdLayout } from './art-layout.js';
export class CrowdScene extends Phaser.Scene {
  constructor(controller){super('crowd');this.controller=controller;this.gestures=new Set();this.effects=new Map();}
  preload(){
    for(let id=0;id<5;id++)this.load.image('face-'+id,characterUrl(id));
    for(const name of BACKGROUNDS)this.load.image('background-'+name,backgroundUrl(name));
    this.load.on('progress',()=>{document.querySelector('#feedback').textContent='正在准备画面…';});
    this.load.on('loaderror',file=>{if(file.key.startsWith('face-'))this.artLoadFailed=true;});
  }
  create(){
    if(this.artLoadFailed){document.querySelector('#feedback').textContent='人物加载失败，请刷新重试';return;}
    this.input.setTopOnly(true);
    const release=pointer=>this.gestures.delete(pointer.id);
    this.input.on('pointerup',release);this.input.on('pointerupoutside',release);
    this.game.canvas.addEventListener('contextmenu',event=>event.preventDefault());
    this.observer=new ResizeObserver(([entry])=>{
      const width=Math.floor(entry.contentRect.width),height=Math.floor(entry.contentRect.height);
      if(width>0&&height>0&&(this.scale.width!==width||this.scale.height!==height))this.scale.resize(width,height);
    });
    this.observer.observe(document.querySelector('#game'));
    this.events.once('shutdown',()=>this.observer.disconnect());
    this.scale.on('resize',()=>this.controller.resize());
    this.controller.attach(this);
  }
  prepare(ids){
    const missing=ids.filter(id=>!this.textures.exists('face-'+id));
    if(!missing.length)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      let failed=false;
      const onError=file=>{if(file.key.startsWith('face-'))failed=true;};
      this.load.on('loaderror',onError);
      this.load.once('complete',()=>{this.load.off('loaderror',onError);failed?reject(new Error('Artwork load failed')):resolve();});
      for(const id of missing)this.load.image('face-'+id,characterUrl(id));
      this.load.start();
    });
  }
  show(pack){
    this.tweens.killAll();this.children.getAll().forEach(child=>child.destroy());this.effects.clear();
    const {width,height}=this.scale.gameSize;
    this.cameras.main.setBackgroundColor('#efe1c2');
    const background='background-'+pack.background;
    if(this.textures.exists(background)){
      const source=this.textures.get(background).getSourceImage();
      this.add.image(width/2,height/2,background).setScale(Math.max(width/source.width,height/source.height)).setDepth(-100);
      this.add.rectangle(width/2,height/2,width,height,0xfff3d8,.10).setDepth(-99);
    }
    this.faces=new Map();
    for(const p of crowdLayout(pack,width,height)){
      const source=this.textures.get('face-'+p.id).getSourceImage();
      const face=this.add.image(p.x,p.y,'face-'+p.id).setOrigin(.5,CHARACTERS[p.id].face.y)
        .setDisplaySize(p.size,p.size*source.height/source.width).setDepth(p.depth)
        .setInteractive({useHandCursor:true,pixelPerfect:true,alphaTolerance:96});
      face.baseX=p.x;face.baseY=p.y;
      face.on('pointerdown',pointer=>{
        if(this.gestures.has(pointer.id))return;
        this.gestures.add(pointer.id);this.controller.pick(p.id);
      });
      this.faces.set(p.id,face);
    }
    this.veil=this.add.rectangle(width/2,height/2,width,height,0x294b46,.9).setDepth(1000).setVisible(false);
    this.pauseLabel=this.add.text(width/2,height/2,'请恢复竖屏继续',{fontSize:'21px',color:'#fff7e5',align:'center',wordWrap:{width:width-40}}).setOrigin(.5).setDepth(1001).setVisible(false);
  }
  mark(id){
    const face=this.faces.get(id);face.setTint(0x69716a);
    this.add.text(face.x,face.y,'✓',{fontSize:Math.max(20,face.displayWidth*.43)+'px',color:'#ffffff',stroke:'#356c51',strokeThickness:3}).setOrigin(.5).setDepth(500);
  }
  setBlocked(value){this.veil?.setVisible(value);this.pauseLabel?.setVisible(value);}
  wrong(id){
    const face=this.faces.get(id);
    const old=this.effects.get(id);
    if(old){this.tweens.killTweensOf([old.cross,old.label]);old.cross.destroy();old.label.destroy();}
    this.tweens.killTweensOf(face);face.x=face.baseX;face.y=face.baseY;
    const shake=Math.min(4,face.displayWidth*.045);
    this.tweens.add({targets:face,x:{from:face.baseX-shake,to:face.baseX+shake},duration:35,yoyo:true,repeat:2,onComplete:()=>{face.x=face.baseX;}});
    const cross=this.add.text(face.baseX,face.baseY,'×',{fontFamily:'sans-serif',fontSize:Math.max(29,face.displayWidth*.48)+'px',fontStyle:'bold',color:'#d84d49',stroke:'#fff3e7',strokeThickness:3}).setOrigin(.5).setDepth(900);
    const label=this.add.text(face.baseX,face.baseY-16,'+3s',{fontSize:'17px',fontStyle:'bold',color:'#cf413d',stroke:'#fff7e9',strokeThickness:3}).setOrigin(.5).setDepth(901);
    cross.setData('feedback','wrong');label.setData('feedback','penalty');
    this.tweens.add({targets:cross,alpha:0,delay:200,duration:150,onComplete:()=>cross.destroy()});
    this.tweens.add({targets:label,y:label.y-24,alpha:0,duration:600,onComplete:()=>{label.destroy();if(this.effects.get(id)?.label===label)this.effects.delete(id);}});
    this.effects.set(id,{cross,label});
  }
}
