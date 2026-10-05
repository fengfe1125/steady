import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const engine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../engine');
function runtime() {
  const context = {console}; context.window = context; context.globalThis = context;
  vm.createContext(context);
  for (const file of ['00-core.js', '10-rig.js', '60-scene.js']) vm.runInContext(fs.readFileSync(path.join(engine, file), 'utf8'), context);
  return context.SteadyAnatomy;
}
const plain = value => JSON.parse(JSON.stringify(value));

test('sampling a partial IK lesson cannot change a later lesson in the same VM', () => {
  const SA = runtime(), before = plain(SA.rig.defaults('side'));
  const later = {view: 'side', poses: {base: {}, start: {}, peak: {}}};
  const expected = plain(SA.scene.sample(later, 0));
  const contact = {view: 'side', poses: {base: {ik: {ankle: {near: {x: 20, y: -20, foot: 0}}}}, start: {}, peak: {}}};
  for (const time of [0, 1000, 3000, 5000]) SA.scene.sample(contact, time);
  SA.scene.staticPose(contact, 'peak');
  assert.deepEqual(plain(SA.rig.defaults('side')), before, 'IK mutated the shared default skeleton');
  assert.deepEqual(plain(SA.scene.sample(later, 0)), expected, 'later lesson depends on previously sampled course');
});

test('applyIK and merge isolate both input poses and unchanged nested fields', () => {
  const SA = runtime(), input = SA.rig.merge(SA.rig.defaults('side'), {}), before = plain(input);
  const solved = SA.rig.applyIK('side', input, {ankle: {far: {x: -20, y: -20, foot: 0}}});
  assert.deepEqual(plain(input), before, 'IK changed its caller pose');
  assert.notStrictEqual(solved.legs, input.legs);
  const merged = SA.rig.merge(input, {x: 4});
  merged.legs.near.knee = 123;
  assert.deepEqual(plain(input), before, 'merge kept unmodified nested objects shared with its input');
});

test('blending and defaults do not hand callers mutable canonical arrays or objects', () => {
  const SA = runtime();
  const defaults = SA.rig.defaults('front'), before = plain(defaults);
  defaults.legs.r.knee = 77;
  assert.deepEqual(plain(SA.rig.defaults('front')), before);
  const a = {x: 0, contacts: [{x: 1}], keep: {nested: {value: 2}}}, b = {x: 1};
  const mixed = SA.rig.blend(a, b, .25);
  mixed.contacts[0].x = 9; mixed.keep.nested.value = 8;
  assert.equal(a.contacts[0].x, 1); assert.equal(a.keep.nested.value, 2);
});
