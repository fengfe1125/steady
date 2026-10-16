import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const draws = [], scheduled = new Map();
let serial = 0;
const document = {
  hidden: false, documentElement: {dataset: {}},
  getElementById: () => ({}), addEventListener() {},
};
const window = {
  renderEquipment: (...values) => draws.push(values),
  webkit: {messageHandlers: {lesson: {postMessage() {}}}},
};
vm.runInNewContext(fs.readFileSync(new URL('../../Steady/EquipmentArtworkRuntime.js', import.meta.url), 'utf8'), {
  window, document,
  requestAnimationFrame: fn => { scheduled.set(++serial, fn); return serial; },
  cancelAnimationFrame: id => scheduled.delete(id),
});
const timing = {effortStart: 600, effortEnd: 2800, returnStart: 3300, returnEnd: 5700, duration: 8000};
let revision = 0;
const seek = time => window.setLessonState({timing, playing: false, speed: 1, mode: 'motion', dark: false, seekTime: time, seekRevision: ++revision});
for (const time of [0, 640, 1920, 4960, 5760, 6880, 8000]) {
  seek(time);
  assert.equal(draws.at(-1)[1], time / 8000);
  assert.equal(scheduled.size, 0, 'paused step seeking must not start playback');
}
seek(2800); assert.equal(draws.at(-1)[0], 1, 'existing effort peak preserved');
seek(5700); assert.equal(draws.at(-1)[0], 0, 'existing return preserved');
seek(0);
window.setLessonState({timing, playing: true, speed: 0.5, mode: 'motion', dark: false, seekTime: 0, seekRevision: revision});
const tick = time => { const [id, fn] = scheduled.entries().next().value; scheduled.delete(id); fn(time); };
tick(0); tick(100);
assert.equal(draws.at(-1)[1], 50 / 8000, 'half speed applies to cycle progress');
window.stopLesson(); assert.equal(scheduled.size, 0);
console.log('Cycle step seeking, legacy effort, half speed and stop passed.');
