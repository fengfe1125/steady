import {lesson, floor} from './lib/lesson.mjs';
const f = floor('step', {rise: 0, step: 0, pitch: 0, arch: 0});
export default lesson({motionGuide: false, ...f,
  id: 'legs-90-90-leg-extension', title: '顶髋后伸腿 · 进阶', view: 'side', hands: {near: 'fist', far: 'fist'},
  poses: {...f.poses, start: {act: .3}, kneel: {act: .85, eq: {legs3D: {rise: 1}}}, moving: {act: .95, eq: {legs3D: {rise: 1, step: .55}}},
    peak: {act: 1, eq: {legs3D: {rise: 1, step: 1}}}},
  track: {keys: [{t: 0, pose: 'start'}, {t: 1000, pose: 'start'}, {t: 1600, pose: 'kneel', p: .8}, {t: 2333, pose: 'moving', p: .95},
    {t: 3000, pose: 'peak', p: 1}, {t: 3500, pose: 'peak', p: 1}, {t: 4600, pose: 'kneel', p: .8}, {t: 5900, pose: 'start'}]},
  muscles: {primary: ['glute.max', 'iliopsoas@near'], secondary: ['quads@near', 'abs']},
  labels: [{muscle: 'iliopsoas', at: 'tr', sub: '跨前时抬腿'}, {muscle: 'glute.max', at: 'tl', sub: '顶髋时发力'}],
  guide: {joint: 'legs.near.A', a: 'kneel', b: 'peak', offset: [10, -8]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'iliopsoas', at: 'tr'}, {muscle: 'glute.max', at: 'tl'}],
    callouts: [{n: 1, at: 'hip', text: '先稳定顶髋，再跨前', dx: -24}, {n: 2, at: 'legs.near.sole', text: '前脚落稳，后膝仍撑地', dx: 16, dy: 12},
      {n: 3, at: 'N.2', text: '上身收稳，能控制坐回', dx: -23, dy: -10}]},
  mistake: {goodText: '前脚落稳后轻顶髋', text: '脚未踩稳就前冲', fix: '先让前脚整掌落稳，再轻推髋部；无法平顺回坐时退回顶髋版本。',
    pose: {lumbar: 23, eq: {legs3D: {step: .55, pitch: 1}}}, muscles: {primary: ['erectors'], secondary: ['quads@near']},
    marks: [{at: 'legs.near.sole', type: 'x'}, {at: 'N.2', type: 'arrow', dx: -22, dy: -8}]}
});
