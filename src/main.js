import Phaser from 'phaser';
import './style.css';
import { LEVELS, WIDTH, HEIGHT } from './levels.js';
import { Round, formatTime } from './model.js';
import { characterUrl } from './characters.js';
import { supportsLevel } from './art-layout.js';
import { CrowdScene } from './scene.js';
const $ = selector => document.querySelector(selector);
let scene, round, levelIndex = 0, viewportBlocked = false;
function available(index) {
  return scene && supportsLevel(LEVELS[index], scene.scale.width, scene.scale.height);
}
function updateAvailability() {
  if (!scene) return;
  const supported = available(1);
  $('#level').options[1].disabled = !supported;
  $('#level').options[1].textContent = supported ? '第 2 关 · 150 人' : '第 2 关 · 150 人（需更高视野）';
  $('#density-info').textContent = supported
    ? '150 人关可在当前视野试玩。密集关仍建议人工评估辨识与误触。'
    : '当前视野不足以清晰容纳 150 人。请使用更高的竖屏或平板；可以先试玩 10 人关与独立的 35 人样板。正式第二关仍是 150 人。';
}
function render() {
  $('#progress').textContent = `已找到 ${round.found.size} / ${round.queue.length}`;
  $('#batch').textContent = `第 ${Math.floor(round.offset / 5) + 1} / ${Math.ceil(round.queue.length / 5)} 组`;
  $('#level-caption').textContent = `找齐所有人物 · ${round.queue.length} 位`;
  $('#menu-title').textContent = LEVELS[levelIndex].name + ' · ' + round.queue.length + ' 人';
  $('#targets').replaceChildren(...round.targets.map(id => {
    const card = document.createElement('div');
    card.className = 'target' + (round.found.has(id) ? ' complete' : '');
    card.dataset.id = id;
    const img = new Image(); img.src = characterUrl(id); img.alt = '需要寻找的人物';
    card.append(img);
    if (round.found.has(id)) { const check = document.createElement('span'); check.textContent = '✓'; card.append(check); }
    return card;
  }));
}
function start() {
  if (!scene) return;
  if (!available(levelIndex)) { $('#feedback').textContent = '视野不足，请选择 10 人关或 35 人样板'; return; }
  if ($('#result').open) $('#result').close();
  viewportBlocked = false;
  round = new Round(LEVELS[levelIndex].count);
  scene.show(LEVELS[levelIndex]);
  $('#pause').textContent = 'Ⅱ'; $('#pause').disabled = false;
  $('#feedback').textContent = '寻找下方的五位人物';
  $('#timer').textContent = formatTime(0);
  render(); updateAvailability();
}
function pause() {
  if (!round || round.done || viewportBlocked) return;
  round.togglePause(); scene.setPaused(round.paused);
  $('#pause').textContent = round.paused ? '▶' : 'Ⅱ';
}
const controller = {
  attach(value) { scene = value; start(); },
  resize() {
    if (!round) return;
    updateAvailability();
    viewportBlocked = !available(levelIndex);
    if (viewportBlocked && !round.paused && !round.done) round.togglePause();
    scene.show(LEVELS[levelIndex]);
    round.found.forEach(id => scene.mark(id));
    scene.setPaused(round.paused || viewportBlocked);
    if (viewportBlocked) scene.pauseLabel.setText('视野不足\n请恢复更高窗口继续');
    $('#pause').textContent = round.paused ? '▶' : 'Ⅱ';
  },
  pick(id) {
    if (viewportBlocked) return;
    const status = round.pick(id);
    if (status === 'correct') {
      scene.mark(id); render();
      $('#feedback').textContent = round.done ? '全部找到，挑战完成！' : '找到了！继续寻找本组目标';
      if (round.done) {
        $('#pause').disabled = true;
        $('#result-time').textContent = `实际用时：${formatTime(round.elapsed)}`;
        $('#ranking').replaceChildren(...['模拟玩家 A — 00:35.2', '模拟玩家 B — 01:12.8', '模拟玩家 C — 02:08.4'].map(text => {
          const li = document.createElement('li'); li.textContent = text; return li;
        }));
        $('#next').hidden = levelIndex !== 0;
        $('#next').textContent = available(1) ? '试玩第二关 · 150 人' : '试玩密集样板 · 35 人';
        $('#result').showModal();
      }
    } else if (status === 'wrong') {
      scene.wrong(id); $('#feedback').textContent = '这位不在本组目标中，再看看！不扣时间';
    } else if (status === 'found') $('#feedback').textContent = '这位已经找到了';
  }
};
new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: WIDTH, height: HEIGHT,
  backgroundColor: '#e7dbc5', scene: new CrowdScene(controller),
  scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true }, audio: { noAudio: true },
});
$('#pause').onclick = pause; $('#restart').onclick = start;
$('#level').onchange = event => {
  const next=Number(event.target.value);
  if (!available(next)) { $('#level').value=String(levelIndex); return; }
  levelIndex=next; start();
};
$('#again').onclick = start;
$('#next').onclick = () => { levelIndex=available(1)?1:2; $('#level').value=String(levelIndex); start(); };
$('#back').onclick = () => {
  if (!round) return;
  if (!round.paused && !round.done) pause();
  $('#menu').showModal();
};
$('#resume').onclick = () => $('#menu').close();
$('#menu-restart').onclick = () => { $('#menu').close(); start(); };
document.addEventListener('visibilitychange', () => { if (document.hidden && round && !round.paused && !round.done) pause(); });
setInterval(() => { if (round) $('#timer').textContent = formatTime(round.elapsed); }, 50);
