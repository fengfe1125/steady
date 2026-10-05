// Offline authoring helpers. The output is plain data consumed by the shared anatomy engine.
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const context = {console}; context.window = context; context.globalThis = context;
vm.createContext(context);
for (const name of ['00-core.js', '10-rig.js', '60-scene.js']) {
  vm.runInContext(fs.readFileSync(fileURLToPath(new URL(`../../../engine/${name}`, import.meta.url)), 'utf8'), context);
}
export const SA = context.SteadyAnatomy;
export const {V, add, sub, mul, rot, fromDown, fromUp, lerpV} = SA.util;
export const R = Math.PI / 180;
export const timing = overrides => ({effortStart: 600, effortEnd: 2800, returnStart: 3300, returnEnd: 5700, duration: 6000, ...overrides});
export const seated = (extra = {}) => SA.rig.merge({y: -126, pelvis: -6,
  ik: {ankle: {near: {x: 87, y: -14, foot: 0}, far: {x: 77, y: -14, foot: 0}}}}, extra);
export const frontSeated = (extra = {}) => SA.rig.merge({y: -126,
  legs: {r: {abd: 12, knee: 12, f: 0.28, fs: 0.93}, l: {abd: 12, knee: 12, f: 0.28, fs: 0.93}}}, extra);

export function joints(pose, view = 'side') {
  const p = SA.rig.merge(structuredClone(SA.rig.defaults(view)), structuredClone(pose));
  return SA.rig.joints(view, SA.rig.applyIK(view, p, p.ik));
}

// Store solved arm angles instead of running the shared side IK across the ±180° seam.
// This retains a positive elbow flexion when a forearm travels just past vertical overhead.
export function hands(pose, targets, view = 'side') {
  const p = SA.rig.merge(structuredClone(SA.rig.defaults(view)), structuredClone(pose)), j = joints(p, view);
  for (const [side, target] of Object.entries(targets)) {
    const a = p.arms[side], sign = view === 'side' ? 1 : (side === 'r' ? 1 : -1);
    const S = view === 'side' ? j.shoulder : j.arms[side].S;
    const upper = SA.rig.LEN.upper * (a.f ?? 1), fore = (SA.rig.LEN.fore + SA.rig.LEN.hand) * (a.ff ?? 1);
    const solved = SA.util.solve2(S, target, upper, fore, (target.bend ?? 1) * sign);
    if (!solved.reach) throw new Error(`Unreachable ${side} hand: ${JSON.stringify({S,target})}`);
    const sh = SA.util.angleFromDown(sub(solved.mid, S));
    const fw = SA.util.angleFromDown(sub(solved.end, solved.mid));
    let elbow = sign * (fw - sh);
    while (elbow < -180) elbow += 360;
    while (elbow > 180) elbow -= 360;
    p.arms[side] = {...a, ...(view === 'side' ? {sh: sh + j.angles.thorax, el: elbow} : {abd: sign * (sh - p.lean), el: elbow}), wr: target.wr ?? 0};
  }
  return p;
}

// Each machine supplies its own geometry. Dense keys keep rotating contact paths on their
// fixed pivots; the shared sampler blends neighbouring keys smoothly, with <0.2 world-unit error.
export function cycle(makePose, T = timing()) {
  const poses = {start: makePose(0), peak: makePose(1)}, keys = [{t: 0, pose: 'start', p: 0}];
  const append = (t, name, p) => { poses[name] = makePose(p); keys.push({t, pose: name, p}); };
  append(T.effortStart, 'effort0', 0);
  for (let i = 1; i <= 36; i++) {
    const t = T.effortStart + (T.effortEnd - T.effortStart) * i / 36;
    append(t, 'up' + i, (1 - Math.cos(Math.PI * i / 36)) / 2);
  }
  append(T.returnStart, 'return0', 1);
  for (let i = 1; i <= 36; i++) {
    const t = T.returnStart + (T.returnEnd - T.returnStart) * i / 36;
    append(t, 'down' + i, (1 + Math.cos(Math.PI * i / 36)) / 2);
  }
  append(T.duration - 1, 'settle', 0);
  return {timing: T, poses, track: {keys}};
}

export const pin = (n, at, text, dx = 0, dy = 0) => ({n, at, text, dx, dy});
export const arc = (pivot, length, degrees) => add(pivot, mul(fromDown(degrees), length));
export const activation = (p, extra) => ({act: 0.26 + 0.74 * p, eq: {phase: p, ...extra}});
export const drops = ['availableViews', 'defaultView', 'supportsSideSelection', 'injectedRuntimeResource', 'documentLayout'];
