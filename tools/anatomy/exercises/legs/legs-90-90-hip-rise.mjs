import {lesson, floor} from './lib/lesson.mjs';
const f = floor('rise', {rise: 0, arch: 0});
export default lesson({motionGuide: false, ...f,
  id: 'legs-90-90-hip-rise', title: '90/90 顶髋 · 进阶', view: 'side', hands: {near: 'fist', far: 'fist'},
  poses: {...f.poses, start: {act: .3}, peak: {act: 1, eq: {legs3D: {rise: 1}}}},
  muscles: {primary: ['glute.max'], secondary: ['quads', 'abs']},
  labels: [{muscle: 'glute.max', at: 'tr'}, {muscle: 'abs', at: 'tl'}],
  guide: {joint: 'hip', offset: [-20, 0]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'glute.max', at: 'tr'}, {muscle: 'abs', at: 'tl'}],
    callouts: [{n: 1, at: 'legs.near.K', text: '双膝始终接触地垫', dx: 11, dy: 18}, {n: 2, at: 'hip', text: '髋伸带动身体升起', dx: -20, dy: -16},
      {n: 3, at: 'arms.near.H', text: '双手在胸前，不撑起', dx: 21}]},
  mistake: {goodText: '髋伸顶起，躯干收稳', text: '身体后仰，顶腰借力', fix: '减小顶髋幅度，收住胸腹；无法控制回坐时退回基础换边。',
    pose: {lumbar: -25, eq: {legs3D: {arch: 1}}}, muscles: {primary: ['erectors'], secondary: ['glute.max']}, marks: [{at: 'N.1', type: 'circle', r: 18}]}
});
