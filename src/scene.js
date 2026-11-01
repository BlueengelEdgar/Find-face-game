import Phaser from 'phaser';
import { CHARACTERS, characterUrl } from './characters.js';
import { crowdLayout } from './art-layout.js';
export class CrowdScene extends Phaser.Scene {
  constructor(controller) { super('crowd'); this.controller = controller; }
  preload() {
    for (const character of CHARACTERS) this.load.image('face-' + character.id, characterUrl(character.id));
    this.load.on('progress', value => { document.querySelector('#feedback').textContent = '正在准备人物 '+Math.round(value*100)+'%'; });
    this.load.on('loaderror', () => {
      this.artLoadFailed = true;
      document.querySelector('#feedback').textContent = '人物资源加载失败，请刷新重试';
    });
  }
  create() {
    if (this.artLoadFailed) {
      document.querySelector('#pause').disabled = true;
      document.querySelector('#restart').disabled = true;
      return;
    }
    this.input.setTopOnly(true);
    this.controller.attach(this);
    const parent = document.querySelector('#game');
    this.observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      if (width > 0 && height > 0 &&
          (this.scale.width !== width || this.scale.height !== height)) this.scale.resize(width, height);
    });
    this.observer.observe(parent);
    this.events.once('shutdown', () => this.observer.disconnect());
    this.scale.on('resize', () => this.controller.resize());
  }
  show(level) {
    this.tweens.killAll();
    // DisplayList.removeAll(true) only detaches children and leaves input alive.
    // Destroy each object so old portraits cannot intercept taps after relayout.
    this.children.getAll().forEach(child => child.destroy());
    const { width: WIDTH, height: HEIGHT } = this.scale.gameSize;
    this.cameras.main.setBackgroundColor('#f1dfbf');
    this.faces = new Map();
    for (const point of crowdLayout(level, WIDTH, HEIGHT)) {
      const texture = this.textures.get('face-' + point.id).getSourceImage();
      const face = this.add.image(point.x, point.y, 'face-' + point.id)
        .setOrigin(0.5, CHARACTERS[point.id].face.y)
        .setDisplaySize(point.size, point.size * texture.height / texture.width)
        .setDepth(point.depth)
        .setInteractive({ useHandCursor: true, pixelPerfect: true, alphaTolerance: 96 });
      face.on('pointerdown', () => this.controller.pick(point.id));
      this.faces.set(point.id, face);
    }
    this.veil = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x182c32, 0.96).setDepth(1000).setVisible(false);
    this.pauseLabel = this.add.text(WIDTH / 2, HEIGHT / 2, '已暂停\n点击上方「继续」', { fontSize: '24px', color: '#ffffff', align: 'center', lineSpacing: 14 }).setOrigin(0.5).setDepth(1001).setVisible(false);
  }
  mark(id) {
    const face = this.faces.get(id);
    face.setTint(0x555b60);
    this.add.text(face.x, face.y, '✓', { fontSize: Math.max(18, face.displayWidth * 0.55) + 'px', color: '#ffffff', stroke: '#28483e', strokeThickness: 3 }).setOrigin(0.5).setDepth(500);
  }
  setPaused(value) { this.veil.setVisible(value); this.pauseLabel.setVisible(value); }
  wrong(id) {
    const face = this.faces.get(id);
    this.tweens.add({ targets: face, angle: { from: -9, to: 9 }, duration: 70, yoyo: true, repeat: 1, onComplete: () => face.setAngle(0) });
  }
}
