import test from 'node:test';
import assert from 'node:assert/strict';
import { Round, formatTime } from '../src/model.js';
import { LEVELS, layout, WIDTH, HEIGHT } from '../src/levels.js';
import { avatarSvg } from '../src/avatars.js';
for (const level of LEVELS) {
  test(`${level.count} people: unique queue, groups of five, finish exactly once`, () => {
    let now = 0;
    const round = new Round(level.count, () => now);
    assert.equal(new Set(round.queue).size, level.count);
    const seen = [];
    while (!round.done) {
      const group = [...round.targets];
      assert.equal(group.length, 5);
      for (const id of group) {
        seen.push(id); now += 100;
        assert.equal(round.pick(id), 'correct');
        assert.equal(round.pick(id), round.done ? 'blocked' : 'found');
      }
    }
    assert.equal(new Set(seen).size, level.count);
    const elapsed = round.elapsed; now += 500;
    assert.equal(round.elapsed, elapsed);
  });
  test(`${level.count} layout remains in fixed viewport`, () => {
    const points = layout(level);
    assert.equal(points.length, level.count);
    for (const p of points) {
      assert.ok(p.x - p.size / 2 >= 0 && p.x + p.size / 2 <= WIDTH);
      assert.ok(p.y - p.size * 72 / 128 >= 0 && p.y + p.size * 72 / 128 <= HEIGHT);
    }
  });
}
test('wrong clicks do not penalize, paused input blocked and pause time excluded', () => {
  let now = 0;
  const r = new Round(10, () => now, () => .5);
  const wrong = r.queue.find(id => !r.targets.includes(id));
  now = 1000; assert.equal(r.pick(wrong), 'wrong'); assert.equal(r.elapsed, 1000);
  r.togglePause(); now = 9000;
  assert.equal(r.elapsed, 1000); assert.equal(r.pick(r.targets[0]), 'blocked');
  r.togglePause(); now = 10000; assert.equal(r.elapsed, 2000);
  assert.equal(r.found.size, 0);
});
test('restart constructs fresh progress and clock', () => {
  const old = new Round(10); old.pick(old.targets[0]); old.togglePause();
  const fresh = new Round(10, () => 500);
  assert.equal(fresh.found.size, 0); assert.equal(fresh.elapsed, 0); assert.equal(fresh.paused, false);
});
test('all 150 placeholder identities have distinct visuals', () => {
  const visuals = Array.from({length:150}, (_, id) => avatarSvg(id).replace(/>\d{3}<\/text>/, '></text>'));
  assert.equal(new Set(visuals).size, 150);
});
test('time format includes minutes, seconds, tenths', () => assert.equal(formatTime(72567), '01:12.5'));
