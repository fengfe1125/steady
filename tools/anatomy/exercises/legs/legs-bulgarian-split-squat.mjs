import {lesson} from './lib/lesson.mjs';
export default lesson({motionGuide: false, 
  id: 'legs-bulgarian-split-squat', title: '保加利亚分腿蹲', view: 'side',
  camera: {b: 94},
  poses: {base: {pelvis: 12, arms: {near: {sh: 12, el: 15}, far: {sh: 12, el: 15}}, legs: {near: {hip: 0, knee: 0, ankle: 0}, far: {hip: 0, knee: 0, ankle: 0}},
    ik: {ankle: {near: {x: 45, y: -14, foot: 0, bend: -1}, far: {x: -120, y: -88, foot: -90, bend: -1}}}},
    start: {x: -15, y: -175, act: .3}, peak: {x: -35, y: -125, act: 1}},
  equipment: [{type: 'legs_rollerStand', x: -125, y: -74, r: 13}],
  muscles: {primary: ['quads@near', 'glute.max@near'], secondary: ['glute.med@near', 'abs']},
  labels: [{muscle: 'quads', at: 'tr'}, {muscle: 'glute.max', at: 'tl'}],
  guide: {joint: 'hip', offset: [-26, 0]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', callouts: [
    {n: 1, at: 'legs.near.sole', text: '前脚整掌承重', dx: 21, dy: -2}, {n: 2, at: 'legs.far.A', text: '后脚踝搭住滚垫支架', dx: -14, dy: -16},
    {n: 3, at: 'legs.near.K', text: '髋膝同降，不强追深', dx: 26, dy: -5}]},
  mistake: {goodText: '前腿承重，后脚有支撑', text: '重心后移，前腿卸力', fix: '重新调整站距和重心，减小深度，由前脚整掌支撑起身。',
    pose: {x: -68, y: -137, pelvis: -2}, muscles: {primary: ['quads@far'], secondary: ['erectors']},
    marks: [{at: 'hip', type: 'arrow', dx: -24, dy: -6}, {at: 'legs.near.sole', type: 'circle', r: 13}]}
});
