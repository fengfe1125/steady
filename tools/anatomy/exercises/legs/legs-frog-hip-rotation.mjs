import {lesson, floor} from './lib/lesson.mjs';
const f = floor('frog', {rock: 0, rotation: 0, round: 0});
export default lesson({motionGuide: false, ...f,
  id: 'legs-frog-hip-rotation', title: '青蛙趴双侧髋内旋', view: 'side',
  poses: {...f.poses, start: {act: .3}, peak: {act: 1, eq: {legs3D: {rotation: 24}}}},
  muscles: {primary: ['tfl'], secondary: ['glute.med', 'obliques']},
  labels: [{muscle: 'tfl', at: 'tr', sub: '髋内旋参与'}, {muscle: 'glute.med', at: 'tl', sub: '前部纤维协同'}],
  guides: [{joint: 'legs.near.A', offset: [-12, -4]}, {joint: 'legs.far.A', offset: [-12, -4]}],
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'tfl', at: 'tr'}, {muscle: 'obliques', at: 'tl'}],
    arrows: [{joint: 'legs.near.A', offset: [-12, -4]}, {joint: 'legs.far.A', offset: [-12, -4]}],
    callouts: [{n: 1, at: 'legs.near.K', text: '双膝位置固定，不滑走', dy: 19}, {n: 2, at: 'legs.near.A', text: '两脚同时抬转，再慢落', dx: -8, dy: -17},
      {n: 3, at: 'N.2', text: '胸腹收稳，腰背不塌', dy: -24}]},
  mistake: {goodText: '膝稳住，只旋转髋部', text: '抬脚时腰背跟着变形', fix: '减小抬脚高度，先收稳腰背，再让双脚同时轻抬轻转。',
    pose: {lumbar: 22, eq: {legs3D: {round: 1.2, rotation: 34}}}, muscles: {primary: ['erectors'], secondary: ['tfl']},
    marks: [{at: 'N.2', type: 'circle', r: 19}, {at: 'legs.near.A', type: 'arrow', dx: -12, dy: -24}]}
});
