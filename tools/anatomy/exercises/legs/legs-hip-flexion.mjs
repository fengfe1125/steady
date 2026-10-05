import {lesson} from './lib/lesson.mjs';
export default lesson({motionGuide: false, 
  id: 'legs-hip-flexion', title: '坐姿屈髋抬腿', view: 'side',
  camera: {b: 94},
  poses: {base: {x: -40, y: -133, arms: {near: {sh: 4, el: 8}, far: {sh: 4, el: 8}}, ik: {hand: {near: {x: -1, y: -125, bend: 1}, far: {x: -9, y: -130, bend: 1}}}},
    start: {act: .3, legs: {near: {hip: 72, knee: 82}, far: {hip: 72, knee: 82}}},
    peak: {act: 1, legs: {near: {hip: 110, knee: 35}, far: {hip: 110, knee: 35}}}},
  equipment: [{type: 'legs_hipFlexionMachine', pivot: {x: 43, y: -135}, radius: 90}],
  muscles: {primary: ['quads.rf', 'iliopsoas'], secondary: ['quads.vl', 'quads.vm', 'abs']},
  labels: [{muscle: 'quads.rf', at: 'tr'}, {muscle: 'iliopsoas', at: 'tl'}],
  guide: {joint: 'legs.near.K', pivot: 'hip', push: 22},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'quads.rf', at: 'tr'}, {muscle: 'iliopsoas', at: 'tl'}],
    arrows: [{joint: 'legs.near.K', pivot: 'hip', push: 22}, {joint: 'legs.near.A', offset: [14, -10]}],
    callouts: [{n: 1, at: 'arms.near.H', text: '坐稳抓柄，上身固定', dx: -18, dy: 16}, {n: 2, at: 'legs.near.K', text: '大腿由髋部抬高', dx: 12, dy: -17},
      {n: 3, at: 'legs.near.A', text: '膝同时伸展，滚垫上移', dx: 18, dy: 16}]},
  mistake: {goodText: '大腿抬高，膝伴随伸展', text: '只伸小腿，大腿未抬', fix: '减轻负重，握稳把手，把重点放回髋部抬大腿；允许膝随动作逐步伸展。',
    pose: {legs: {near: {hip: 72, knee: 35}, far: {hip: 72, knee: 35}}}, muscles: {primary: ['quads.vl', 'quads.vm'], secondary: ['quads.rf']},
    marks: [{at: 'legs.near.K', type: 'circle', r: 15}, {at: 'legs.near.A', type: 'arrow', dx: 18, dy: 16}]}
});
