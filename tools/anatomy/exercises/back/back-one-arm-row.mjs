import {reviewed, rowArm} from './geometry.js';
export default reviewed({
  id: 'back-one-arm-row', title: '坐姿单手绳索划船', view: 'back',
  poses: {
    base: {y: -126, legs: {r: {abd: 14, knee: 8, f: .28}, l: {abd: 14, knee: 8, f: .28}},
      arms: {l: {abd: 8, el: 12}}},
    start: {act: .3, arms: {r: rowArm(82, 10)}},
    peak: {act: 1, arms: {r: rowArm(-14, 110)}}
  },
  equipment: [{type: 'benchFront', top: -86, width: 80},
    {type: 'back_cable', x: 181, top: -314, outlet: {x: 162, y: -211}, attachment: 'single', hands: ['r'], stackWidth: 26}],
  camera: {side: 24, b: 28},
  muscles: {primary: ['lats@r'], secondary: ['rhomboid@r', 'trap.mid@r', 'deltoid.post@r', 'biceps@r']},
  labels: [{muscle: 'lats@r', at: 'tr'}, {muscle: 'trap.mid@r', at: 'tl'}],
  guide: {joint: 'arms.r.H', offset: [10, 0]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'lats@r', at: 'tr'}, {muscle: 'rhomboid@r', at: 'tl'}],
    callouts: [{n: 1, at: 'arms.r.H', text: '单手握柄，受控拉回', dx: 28, dy: 3},
      {n: 2, at: 'arms.r.E', text: '肘沿身侧向后带', dx: 26, dy: 24}, {n: 3, at: 'pelvis', text: '坐稳，不侧倒', dx: -24, dy: 24}]},
  mistake: {goodText: '身体居中，单臂拉', text: '身体向一侧倒',
    fix: '减轻负荷，坐回中间；保留躯干位置，单臂受控拉回和伸出。',
    camera: {focus: 'upper', side: 28}, pose: {lean: -16, scapE: {r: 8}},
    marks: [{at: 'neck', type: 'arrow', dx: 30, dy: -6}, {at: 'pelvis', type: 'circle', r: 16}],
    muscles: {primary: ['erectors@r'], secondary: ['lats@r']}}
});
