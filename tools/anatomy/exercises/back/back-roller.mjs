import {reviewed, kneel} from './geometry.js';
export default reviewed({
  id: 'back-roller', title: '跪姿泡沫轴肩胛前推', view: 'side',
  hands: {near: 'open', far: 'open'},
  poses: {
    base: {...kneel, arms: {near: {sh: 83, el: 90}, far: {sh: 83, el: 90}}},
    start: {act: .3, scapP: 0}, peak: {act: 1, scapP: 10}
  },
  equipment: [{type: 'mat', x: -208, length: 340}, {type: 'back_roller', hand: 'near', r: 22, fraction: .55, clearance: 7}],
  camera: {t: 64, b: 68, max: 1},
  muscles: {primary: ['serratus'], secondary: ['trap.lower', 'abs']},
  labels: [{muscle: 'serratus', at: 'tr'}, {muscle: 'abs', at: 'tl', sub: '保持躯干位置'}],
  guide: {joint: 'arms.near.W', offset: [4, -20]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'serratus', at: 'tr'}],
    callouts: [{n: 1, at: 'legs.near.K', text: '双膝留在垫上', dx: -10, dy: 22},
      {n: 2, at: 'arms.near.W', text: '小臂带轴小幅前滚', dx: 18, dy: -18},
      {n: 3, at: 'hip', text: '髋和躯干不前后滑', dy: -30}]},
  mistake: {goodText: '肩胛动，髋部不动', text: '整个人跟轴前滑',
    fix: '缩小前推距离，把髋部留在原位；保留双膝与小臂支撑。',
    pose: {x: -75, pelvis: 83, lumbar: 4, thorax: 3, arms: {near: {sh: 90}, far: {sh: 90}},
      ik: {ankle: {near: {x: -158.2, y: -12.2, foot: -170, bend: -1}, far: {x: -158.2, y: -12.2, foot: -170, bend: -1}}}},
    marks: [{at: 'hip', type: 'arrow', dx: -30, dy: -16}],
    muscles: {primary: ['erectors'], secondary: ['serratus']}}
});
