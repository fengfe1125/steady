import {lesson} from './lib/lesson.mjs';
export default lesson({motionGuide: false, 
  id: 'legs-dumbbell-deadlift', title: '哑铃直腿硬拉', view: 'side',
  camera: {b: 94},
  poses: {base: {arms: {near: {}, far: {wr: 4}}, legs: {near: {hip: 0, knee: 0, ankle: 0}, far: {hip: 0, knee: 0, ankle: 0}}, ik: {ankle: {near: {x: 0, y: -14, foot: 0}, far: {x: -8, y: -14, foot: 0}}}},
    start: {x: -7, y: -186, pelvis: 8, arms: {near: {sh: 8, el: 6}, far: {sh: 4, el: 6}}, act: .3},
    peak: {x: -56, y: -164, pelvis: 62, neck: -14, arms: {near: {sh: 62, el: 6}, far: {sh: 58, el: 6}}, act: 1}},
  equipment: [{type: 'dumbbell', hand: 'far', axis: 'x'}, {type: 'dumbbell', hand: 'near', axis: 'x'}],
  muscles: {primary: ['hamstrings', 'glute.max'], secondary: ['erectors', 'abs', 'forearm.ext']},
  labels: [{muscle: 'hamstrings', at: 'tr'}, {muscle: 'glute.max', at: 'tl'}],
  guide: {joint: 'hip', offset: [-22, -12]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'hamstrings', at: 'tr'}, {muscle: 'glute.max', at: 'tl'}],
    callouts: [{n: 1, at: 'hip', text: '臀部向后，髋部折叠', dx: -18, dy: -20}, {n: 2, at: 'arms.near.H', text: '两铃靠腿，手臂自然垂', dx: 23, dy: -4},
      {n: 3, at: 'N.2', text: '腰背可控，膝微屈', dy: -23}]},
  mistake: {goodText: '髋铰链，哑铃靠腿', text: '弯腰追深，哑铃远离腿', fix: '减轻负重，缩小下降范围，保持膝微屈与躯干稳定，让髋部向后折叠。',
    pose: {lumbar: 24, thorax: 20, arms: {near: {sh: 125}, far: {sh: 121}}}, muscles: {primary: ['erectors'], secondary: ['hamstrings']},
    marks: [{at: 'N.1', type: 'circle', r: 18}, {at: 'arms.near.H', type: 'arrow', dx: 24, dy: 0}]}
});
