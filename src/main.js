import Phaser from 'phaser';
import './style.css';
import { LEVELS, WIDTH, HEIGHT } from './levels.js';
import { Round, formatTime } from './model.js';
import { characterUrl } from './characters.js';
import { CrowdScene } from './scene.js';
const $ = selector => document.querySelector(selector);
let scene, round, levelIndex = 0;
function render() {
  $('#progress').textContent = `已找到 ${round.found.size} / ${round.queue.length}`;
  $('#batch').textContent = `第 ${Math.floor(round.offset / 5) + 1} / ${Math.ceil(round.queue.length / 5)} 组`;
  $('#targets').replaceChildren(...round.targets.map(id => {
    const card = document.createElement('div');
    card.className = 'target' + (round.found.has(id) ? ' complete' : '');
    card.dataset.id = id;
    const img = new Image(); img.src = characterUrl(id); img.alt = `目标人物 ${id + 1}`;
    card.append(img);
    if (round.found.has(id)) { const check = document.createElement('span'); check.textContent = '✓'; card.append(check); }
    return card;
  }));
}
function start() {
  if (!scene) return;
  if ($('#result').open) $('#result').close();
  round = new Round(LEVELS[levelIndex].count);
  scene.show(LEVELS[levelIndex]);
  $('#pause').textContent = 'Ⅱ';
  $('#pause').disabled = false;
  $('#feedback').textContent = '寻找下方的五位人物';
  $('#timer').textContent = formatTime(0);
  render();
}
function pause() {
  if (!round || round.done) return;
  round.togglePause();
  scene.setPaused(round.paused);
  $('#pause').textContent = round.paused ? '▶' : 'Ⅱ';
}
const controller = {
  attach(value) { scene = value; start(); },
  resize() {
    if (!round) return;
    scene.show(LEVELS[levelIndex]);
    round.found.forEach(id => scene.mark(id));
    scene.setPaused(round.paused);
  },
  pick(id) {
    const status = round.pick(id);
    if (status === 'correct') {
      scene.mark(id); render();
      $('#feedback').textContent = round.done ? '全部找到，挑战完成！' : '找到了！继续寻找本组目标';
      if (round.done) {
        $('#pause').disabled = true;
        $('#result-time').textContent = `实际用时：${formatTime(round.elapsed)}`;
        $('#ranking').replaceChildren(...['模拟玩家 A — 00:35.2', '模拟玩家 B — 01:12.8', '模拟玩家 C — 02:08.4'].map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
        $('#next').hidden = true; // Stage 2 awaits visual acceptance; keep 150-person data unchanged.
        $('#result').showModal();
      }
    } else if (status === 'wrong') {
      scene.wrong(id); $('#feedback').textContent = '这位不在本组目标中，再看看！不扣时间';
    } else if (status === 'found') $('#feedback').textContent = '这位已经找到了';
  }
};
new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: WIDTH, height: HEIGHT,
  backgroundColor: '#e1e5e4', scene: new CrowdScene(controller),
  scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true }, audio: { noAudio: true },
});
$('#pause').onclick = pause;
$('#restart').onclick = start;
$('#level').onchange = event => { if (Number(event.target.value) !== 0) return; levelIndex = 0; start(); };
$('#again').onclick = start;
$('#back').onclick = () => {
  if (!round) return;
  if (!round.paused && !round.done) pause();
  $('#menu').showModal();
};
$('#resume').onclick = () => { $('#menu').close(); };
$('#menu-restart').onclick = () => { $('#menu').close(); start(); };
document.addEventListener('visibilitychange', () => { if (document.hidden && round && !round.paused && !round.done) pause(); });
setInterval(() => { if (round) $('#timer').textContent = formatTime(round.elapsed); }, 50);
