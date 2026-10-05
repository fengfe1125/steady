import {lesson, floor} from './lib/lesson.mjs';
const f = floor('frog', {rock: 0, rotation: 0, round: 0});
export default lesson({motionGuide: false, ...f,
  id: 'legs-frog-rock', title: '青蛙式前后摇', view: 'side',
  poses: {...f.poses, start: {act: .35}, peak: {act: 1, eq: {legs3D: {rock: 1}}}},
  muscles: {stretch: ['adductors'], secondary: ['abs', 'obliques']},
  labels: [{muscle: 'adductors@near', role: 'x', at: 'tr'}, {muscle: 'abs', at: 'tl'}],
  guide: {joint: 'hip', offset: [0, -23]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'adductors@near', role: 'x', at: 'tr'}, {muscle: 'abs', at: 'tl'}],
    callouts: [{n: 1, at: 'legs.near.K', text: '双膝宽跪，保持接触', dx: -8, dy: 19}, {n: 2, at: 'arms.near.E', text: '前臂和肘稳撑地垫', dx: 8, dy: 18},
      {n: 3, at: 'hip', text: '臀部后移，骨盆仍可控', dx: -25, dy: -22}]},
  mistake: {goodText: '髋部后坐，躯干稳定', text: '后坐过深，骨盆翻转', fix: '缩小后坐范围，停在内侧有拉伸感且腰背仍能稳定的位置。',
    pose: {lumbar: 24, eq: {legs3D: {round: 1}}}, muscles: {primary: ['erectors'], stretch: ['adductors']},
    marks: [{at: 'N.1', type: 'circle', r: 17}, {at: 'hip', type: 'arrow', dx: -22, dy: -16}]}
});
