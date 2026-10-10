// 坐姿器械反飞鸟 · back view. Arms open in the horizontal plane, so their projected length grows as they reach the side.
import {frontArm} from '../_lib.mjs';
const proj = deg => Math.max(0.22, Math.sin(deg * Math.PI / 180));
// A six-degree soft bend with the hand centre at shoulder height. The projected arm
// shortens in depth, without changing the elbow bend or the machine downpost length.
const armAngle = 90 + Math.atan2(59 * Math.sin(6 * Math.PI / 180), 64 + 59 * Math.cos(6 * Math.PI / 180)) * 180 / Math.PI;
const gripX = 40 + (64 * Math.sin(armAngle * Math.PI / 180) + 59 * Math.sin((armAngle - 6) * Math.PI / 180)) * proj(86);
// The fixed machine handles stay at their authored peak position even in the shrug example.
const shrugged = side => frontArm(side, {x: side === 'r' ? gripX : -gripX, y: -222}, {x: 0, y: -126}, {bend: -1, scapE: 8, f: 1, ff: 1});
export default {motionGuide: false, 
  id: 'shoulders-machine-reverse-fly', title: '坐姿器械反飞鸟', view: 'back',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  behind: ['fore', 'hand'],
  poses: {
    base: {y: -126, legs: {r: {abd: 6, knee: 0, f: 0.28, fs: 1}, l: {abd: 6, knee: 0, f: 0.28, fs: 1}}},
    start: {act: 0.24, arms: {r: {abd: armAngle, el: -6, f: 0.08, ff: 0.08}, l: {abd: armAngle, el: -6, f: 0.08, ff: 0.08}}},
    peak: {act: 1, arms: {r: {abd: armAngle, el: -6, f: proj(86), ff: proj(86)}, l: {abd: armAngle, el: -6, f: proj(86), ff: proj(86)}}}
  },
  equipment: [{type: 'shoulders_reverseFly', seat: -96}],
  camera: {},
  muscles: {primary: ['deltoid.post'], secondary: ['trap.mid', 'rhomboid']},
  labels: [{muscle: 'deltoid.post@r', at: 'tr'}, {muscle: 'trap.mid@l', at: 'tl'}],
  guide: {joint: 'arms.l.H', pivot: 'arms.l.S', push: 16},
  detail: {pose: 'peak', ghost: 'start',
    callouts: [{n: 1, at: 'arms.l.E', text: '肘微屈，手臂向两侧打开', dy: -16}, {n: 2, at: 'arms.r.S', text: '肩下沉，不耸肩', dx: 6, dy: -30},
      {n: 3, at: 'pelvis', text: '胸贴垫，臀坐稳', dy: -40}], legend: 'bl'},
  mistake: {fix: '调好座高，握住固定路径的把手；肩部放松下沉，必要时减轻阻力。', camera: {focus: 'upper', withEquipment: true, side: 10}, text: '耸肩、颈肩紧张', goodText: '肩下沉，握柄位置固定',
    pose: {scapE: {r: 8, l: 8}, arms: {r: shrugged('r'), l: shrugged('l')}},
    marks: [{at: 'arms.r.S', type: 'circle', r: 18}, {at: 'arms.l.S', type: 'circle', r: 18}],
    muscles: {primary: ['trap.upper'], secondary: ['deltoid.post']}}
};
