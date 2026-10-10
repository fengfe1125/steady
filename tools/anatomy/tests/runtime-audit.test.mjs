import assert from 'node:assert/strict';
import test from 'node:test';
import {compareGeometry, checkBoundary, checkPause} from './runtime-audit.mjs';

const snapshot = (time = 0) => ({state: {time, playing: false}, joints: {hand: [1, 2, 3]}, svg: {arm: [10, 20, 30, 40]}});
test('a wrapping time cannot hide a discontinuous body or equipment endpoint', () => {
  const before = snapshot(5999.999), after = snapshot(0);
  assert.equal(checkBoundary(before, after).passed, true);
  after.joints.hand[0] += 3;
  assert.equal(checkBoundary(before, after).passed, false);
  after.joints.hand[0] -= 3; after.svg.arm[0] += 2;
  assert.equal(checkBoundary(before, after).passed, false);
});
test('disappearing SVG pieces and invalid geometry fail continuity', () => {
  assert.match(compareGeometry({arm: [1]}, {}).problem, /topology/);
  assert.match(compareGeometry({arm: [1]}, {arm: [NaN]}).problem, /invalid/);
  assert.match(compareGeometry({arm: [1]}, {arm: [1, 2]}).problem, /invalid/);
});
test('pause acceptance requires unchanged time and actual painted geometry', () => {
  const before = snapshot(2400), after = snapshot(2400);
  assert.equal(checkPause(before, after).passed, true);
  after.state.time += 1; assert.equal(checkPause(before, after).passed, false);
  after.state.time -= 1; after.svg.arm[1] += .1; assert.equal(checkPause(before, after).passed, false);
});
