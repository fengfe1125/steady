import {lesson, floor} from './lib/lesson.mjs';
const f = floor('lunge', {turn: 0, arch: 0});
export default lesson({motionGuide: false, ...f,
  id: 'legs-lunge-rotation', title: '伟大者伸展 · 弓步转体', view: 'side',
  poses: {...f.poses, start: {act: .3}, peak: {act: .9, eq: {legs3D: {turn: 1}}}},
  muscles: {stretch: ['iliopsoas@far', 'glute.max@near'], secondary: ['obliques', 'serratus']},
  labels: [{muscle: 'iliopsoas', role: 'x', at: 'tl', text: '后侧髋前方', sub: '舒适拉伸'}, {muscle: 'obliques', at: 'tr'}],
  guide: {joint: 'arms.near.H', pivot: 'shoulder', push: 15},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'obliques', at: 'tr'}, {muscle: 'iliopsoas', role: 'x', at: 'tl'}],
    callouts: [{n: 1, at: 'arms.far.H', text: '对侧手与前脚踩稳', dx: 10, dy: 16}, {n: 2, at: 'arms.near.H', text: '胸廓打开，视线随手', dx: 14, dy: -13},
      {n: 3, at: 'legs.far.K', text: '后腿接近伸直，不松掉', dx: -14, dy: 18}]},
  mistake: {goodText: '胸廓转动，支撑不变', text: '挺腰抬胸代替转体', fix: '保持前脚、后脚与支撑手稳定，缩小转动范围，从胸廓打开。',
    pose: {lumbar: -22, eq: {legs3D: {arch: 1}}}, muscles: {primary: ['erectors'], secondary: ['obliques']},
    marks: [{at: 'N.1', type: 'circle', r: 18}]}
});
