import { BATCH_SIZE } from './levels.js';
export function shuffle(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export class Round {
  constructor(count, now = () => performance.now(), random = Math.random) {
    this.now = now;
    this.queue = shuffle(Array.from({ length: count }, (_, i) => i), random);
    this.found = new Set();
    this.offset = 0;
    this.started = now();
    this.pausedAt = null;
    this.pauseTotal = 0;
    this.finishedAt = null;
  }
  get targets() { return this.queue.slice(this.offset, this.offset + BATCH_SIZE); }
  get done() { return this.found.size === this.queue.length; }
  get paused() { return this.pausedAt !== null; }
  get elapsed() { return (this.finishedAt ?? this.pausedAt ?? this.now()) - this.started - this.pauseTotal; }
  togglePause() {
    if (this.done) return;
    if (this.paused) { this.pauseTotal += this.now() - this.pausedAt; this.pausedAt = null; }
    else this.pausedAt = this.now();
  }
  pick(id) {
    if (this.paused || this.done) return 'blocked';
    if (this.found.has(id)) return 'found';
    if (!this.targets.includes(id)) return 'wrong';
    this.found.add(id);
    if (this.done) this.finishedAt = this.now();
    else if (this.targets.every(target => this.found.has(target))) this.offset += BATCH_SIZE;
    return 'correct';
  }
}
export function formatTime(ms) {
  const tenths = Math.floor(ms / 100);
  return `${String(Math.floor(tenths / 600)).padStart(2, '0')}:${String(Math.floor(tenths / 10) % 60).padStart(2, '0')}.${tenths % 10}`;
}
