import {lesson, floor} from './lib/lesson.mjs';
const f = floor('switch', {switch: 0, lean: 0});
export default lesson({motionGuide: false, ...f,
  id: 'legs-90-90-switch', title: '90/90 坐姿髋转换', view: 'side',
  poses: {...f.poses, start: {act: .4}, middle: {act: .75, eq: {legs3D: {switch: .5}}}, peak: {act: .9, eq: {legs3D: {switch: 1}}}},
  track: {keys: [{t: 0, pose: 'start'}, {t: 1000, pose: 'start'}, {t: 2000, pose: 'middle', p: .7}, {t: 3000, pose: 'peak', p: 1},
    {t: 3500, pose: 'peak', p: 1}, {t: 4700, pose: 'middle', p: .7}, {t: 5900, pose: 'start'}]},
  muscles: {secondary: ['glute.med', 'adductors', 'iliopsoas', 'obliques']},
  labels: [{muscle: 'glute.med', at: 'tr', text: '双髋控制换边', sub: '髋周肌群轻度参与'}, {muscle: 'adductors', at: 'tl'}],
  guide: {joint: 'legs.near.K', offset: [0, -15]},
  detail: {pose: 'middle', ghost: 'start', legend: 'bl', labels: [{muscle: 'glute.med', at: 'tr'}, {muscle: 'adductors', at: 'tl'}],
    arrows: [{joint: 'legs.near.K', offset: [0, -15]}, {joint: 'legs.far.K', offset: [0, -15]}],
    callouts: [{n: 1, at: 'hip', text: '坐稳，髋部带动换向', dx: -26, dy: -9}, {n: 2, at: 'legs.near.K', text: '双膝先抬，再落向另一侧', dx: 16, dy: -12},
      {n: 3, at: 'arms.near.H', text: '可用双手撑地辅助', dy: 17}]},
  mistake: {good: 'middle', goodText: '双膝换向，上身可控', text: '急着换边，上身抢先倒', fix: '放慢转换，使用手撑辅助，让两个膝盖在舒适范围内换向。',
    pose: {lumbar: 26, eq: {legs3D: {lean: 1}}}, muscles: {primary: ['erectors'], secondary: ['obliques']}, marks: [{at: 'N.2', type: 'circle', r: 17}]}
});
