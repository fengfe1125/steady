import {reviewed, pairHands} from './geometry.js';
export default reviewed({
  id: 'back-seated-row', title: '坐姿低位钢索划船', view: 'side',
  poses: {
    base: {y: -124.5, neck: -6,
      ik: {ankle: {near: {x: 99, y: -14, foot: 0}, far: {x: 94, y: -14, foot: 0}}}},
    start: {act: .3, scapP: 3, ik: {hand: pairHands(108, -173)}},
    peak: {act: 1, scapP: 0, ik: {hand: pairHands(40, -168)}}
  },
  equipment: [{type: 'bench', x: -38, top: -97, length: 98},
    {type: 'back_footplate', toe: {x: 134, y: 0}, height: 44, depth: -7, layer: 'back'},
    {type: 'back_footplate', toe: {x: 139, y: 0}, height: 44, layer: 'front'},
    {type: 'back_cable', x: 222, top: -278, outlet: {x: 202, y: -106}, attachment: 'v', hands: ['far', 'near'], stackWidth: 27}],
  camera: {side: 24, b: 24, max: .96},
  muscles: {primary: ['lats'], secondary: ['teres', 'biceps', 'trap.mid', 'rhomboid']},
  labels: [{muscle: 'lats', at: 'tl'}, {muscle: 'biceps@near', at: 'tr'}],
  guide: {joint: 'arms.near.H', offset: [0, -18]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'lats', at: 'tl'}],
    callouts: [{n: 1, at: 'arms.near.H', text: '并握中立 V 把手', dx: 30, dy: -8},
      {n: 2, at: 'N.1', text: '身体角度不变', dx: -22}, {n: 3, at: 'legs.near.toe', text: '双脚蹬住踏板', dx: 24, dy: -18}]},
  mistake: {goodText: '身体稳，适度回拉', text: '大幅后仰借力',
    fix: '坐回原来的角度并减轻负荷；肘向后带，不靠后倒或夸张夹背增加距离。',
    pose: {lumbar: -20, thorax: -12, neck: 8},
    marks: [{at: 'N.1', type: 'circle', r: 17}, {at: 'N.3', type: 'arrow', dx: 28, dy: -6}],
    camera: {focus: 'trunk', side: 28}, muscles: {primary: ['erectors'], secondary: ['lats', 'biceps']}}
});
