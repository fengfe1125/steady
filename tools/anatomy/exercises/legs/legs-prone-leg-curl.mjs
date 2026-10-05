import {lesson} from './lib/lesson.mjs';
export default lesson({
  id: 'legs-prone-leg-curl', title: '俯卧器械腿弯举', view: 'side',
  camera: {b: 94},
  poses: {base: {x: -25, y: -120, pelvis: 90, neck: -4, head: -2, arms: {near: {sh: 4, el: 8}, far: {sh: 4, el: 8}},
    ik: {hand: {near: {x: 102, y: -82, bend: 1}, far: {x: 98, y: -87, bend: 1}}}},
    start: {act: .3, eq: {curlKnee: 15}, legs: {near: {hip: 0, knee: 15, ankle: -20}, far: {hip: 0, knee: 15, ankle: -20}}},
    peak: {act: 1, eq: {curlKnee: 100}, legs: {near: {hip: 0, knee: 100, ankle: -20}, far: {hip: 0, knee: 100, ankle: -20}}}},
  equipment: [{type: 'legs_proneCurlMachine'}],
  muscles: {primary: ['hamstrings'], secondary: ['gastrocnemius', 'abs']},
  labels: [{muscle: 'hamstrings', at: 'tr'}, {muscle: 'abs', at: 'tl'}],
  guide: {joint: 'legs.near.A', pivot: 'legs.near.K', push: 29},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'hamstrings', at: 'tr'}, {muscle: 'abs', at: 'tl'}],
    callouts: [{n: 1, at: 'N.2', text: '胸腹、骨盆和大腿贴垫', dy: -22}, {n: 2, at: 'legs.near.K', text: '屈膝弯举，大腿不抬', dx: 15, dy: 17},
      {n: 3, at: 'legs.near.A', text: '勾脚，后踝抵住滚垫', dx: -12, dy: -15}]},
  mistake: {goodText: '胸腹贴稳，由膝弯举', text: '抬髋、挺腰借力', fix: '降低重量，重新贴稳胸腹、骨盆与大腿；回程保留滚垫贴合和腿后侧张力。',
    pose: {y: -143, lumbar: -20, thorax: -16}, muscles: {primary: ['erectors'], secondary: ['hamstrings']},
    marks: [{at: 'hip', type: 'circle', r: 18}, {at: 'N.1', type: 'arrow', dx: 0, dy: -24}]}
});
