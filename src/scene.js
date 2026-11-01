import Phaser from 'phaser';
import { avatarUrl } from './avatars.js';
import { layout, WIDTH, HEIGHT } from './levels.js';
export class CrowdScene extends Phaser.Scene {
  constructor(controller) { super('crowd'); this.controller = controller; }
  preload() {
    for (let id = 0; id < 150; id++) this.load.svg('face-' + id, avatarUrl(id), { width: 128, height: 144 });
  }
  create() { this.controller.attach(this); }
  show(level) {
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor('#e1e5e4');
    this.faces = new Map();
    for (const point of layout(level)) {
      const face = this.add.image(point.x, point.y, 'face-' + point.id)
        .setDisplaySize(point.size, point.size * 72 / 64)
        .setInteractive({ useHandCursor: true });
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
