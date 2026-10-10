import {reviewed} from './geometry.js';
import {frontArm} from '../_lib.mjs';
const gripPose = p => {
  const y = -332 + 70 * p, scapE = 3 * (1 - p), arms = {};
  for (const side of ['r', 'l']) {
    const a = frontArm(side, {x: side === 'r' ? 74 : -74, y}, {x: 0, y: -126}, {scapE, bend: 1});
    a.el = ((a.el % 360) + 360) % 360;
    arms[side] = a;
  }
  return {act: .3 + .7 * p, scapE: {r: scapE, l: scapE}, arms};
};
const overPull = {scapE: {r: 12, l: 12}, arms: {}};
for (const side of ['r', 'l']) {
  const a = frontArm(side, {x: side === 'r' ? 74 : -74, y: -213}, {x: 0, y: -126}, {scapE: 12, bend: 1});
  a.el = ((a.el % 360) + 360) % 360; overPull.arms[side] = a;
}
const poses = {start: gripPose(0), peak: gripPose(1)}, keys = [{t: 0, pose: 'start'}, {t: 1500, pose: 'start'}];
// Dense analytically solved keys keep the one rigid frame's projected width
// fixed while avoiding the common frontal IK solver's ±360° elbow wrap.
for (let i = 1; i <= 20; i++) {
  const p = (1 - Math.cos(Math.PI * i / 20)) / 2, pose = 'pull' + i;
  poses[pose] = gripPose(p); keys.push({t: 1500 + 150 * i, pose, p});
}
keys.push({t: 5500, pose: 'peak', p: 1});
for (let i = 1; i <= 20; i++) {
  const p = (1 + Math.cos(Math.PI * i / 20)) / 2, pose = 'return' + i;
  poses[pose] = gripPose(p); keys.push({t: 5500 + 200 * i, pose, p});
}
keys.push({t: 9900, pose: 'start'});
export default reviewed({
  id: 'back-neutral-pulldown', title: '共同对握附件高位下拉', view: 'back',
  poses: {
    base: {y: -126, legs: {r: {abd: 14, knee: 8, f: .28}, l: {abd: 14, knee: 8, f: .28}}},
    ...poses
  },
  track: {keys},
  equipment: [{type: 'back_lat_seat', top: -86, width: 96},
    {type: 'back_cable', x: 141, top: -404, outlet: {x: 0, y: -383}, attachment: 'neutral', hands: ['l', 'r'], stackWidth: 27, boom: true}],
  camera: {t: 64, b: 20, side: 28},
  muscles: {primary: ['lats'], secondary: ['teres', 'trap.lower', 'biceps', 'brachialis']},
  labels: [{muscle: 'lats@r', at: 'tr'}, {muscle: 'trap.lower@l', at: 'tl'}],
  guide: {joint: 'arms.r.E', offset: [18, 0]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'lats@r', at: 'tr'}, {muscle: 'trap.lower@l', at: 'tl'}],
    arrows: [{joint: 'arms.r.E', offset: [18, 0]}, {joint: 'arms.l.E', offset: [-18, 0]}],
    callouts: [{n: 1, at: 'arms.r.H', text: '同一框架，中央单钢索', dx: 24, dy: -24},
      {n: 2, at: 'arms.l.E', text: '肘向下，终点不过低', dx: -26, dy: 12}, {n: 3, at: 'pelvis', text: '坐稳、双脚支撑', dx: 20, dy: 28}]},
  mistake: {goodText: '停在可控位置', text: '压低附件、顶肩',
    fix: '减轻重量，先把下拉行程收回到肩部可控制的位置，双手自然对握。',
    pose: overPull,
    marks: [{at: 'arms.r.S', type: 'circle', r: 16}, {at: 'arms.l.S', type: 'circle', r: 16}, {at: 'arms.r.H', type: 'arrow', dx: 0, dy: -24}],
    camera: {focus: 'upper', side: 35}, muscles: {primary: ['trap.upper'], secondary: ['lats', 'teres']}}
});
