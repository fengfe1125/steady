import {reviewed} from './geometry.js';
export default reviewed({motionGuide: false, 
  id: 'back-supported-scapula', title: '胸口支撑肩胛后缩', view: 'side',
  poses: {
    base: {y: -126, neck: -4,
      ik: {ankle: {near: {x: 99, y: -14, foot: 0}, far: {x: 94, y: -14, foot: 0}}},
      arms: {near: {sh: 45, el: 60}, far: {sh: 45, el: 60, f: .94, ff: .88}}},
    start: {act: .3, scapP: 8, scapE: 2}, peak: {act: 1, scapP: 0, scapE: 0}
  },
  equipment: [{type: 'bench', x: -34, top: -98, length: 108},
    {type: 'back_chestpad', x: 23.5, top: -274, bottom: -123},
    {type: 'back_cable', x: 199, top: -310, outlet: {x: 178, y: -200}, attachment: 'single', hands: ['far'], stackWidth: 24, depth: -10},
    {type: 'back_cable', x: 218, top: -302, outlet: {x: 198, y: -192}, attachment: 'single', hands: ['near'], stackWidth: 24}],
  camera: {side: 24, b: 28, max: .96},
  muscles: {primary: ['trap.mid', 'rhomboid'], secondary: ['trap.lower', 'deltoid.post']},
  labels: [{muscle: 'trap.mid', at: 'tl'}, {muscle: 'rhomboid', at: 'tr'}],
  guide: {joint: 'shoulder', offset: [-10, -12]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'trap.mid', at: 'tl'}, {muscle: 'rhomboid', at: 'tr'}],
    callouts: [{n: 1, at: 'N.3', text: '胸口持续贴垫', dx: 25, dy: -20},
      {n: 2, at: 'shoulder', text: '肩胛小幅后收、下沉', dx: -30, dy: -20}, {n: 3, at: 'arms.near.E', text: '肘角保持，不大拉肘', dx: 28, dy: 10}]},
  mistake: {goodText: '胸贴垫，只小幅收肩胛', text: '挺腰、胸口离垫',
    fix: '让胸口重新贴住垫面，减小肩胛行程；肘角保持，吸气时也不挺胸。',
    pose: {lumbar: -14, thorax: -12, neck: 8},
    marks: [{at: 'N.3', type: 'circle', r: 18}, {at: 'N.1', type: 'circle', r: 15}],
    camera: {focus: 'trunk', side: 28, withEquipment: false}, muscles: {primary: ['erectors'], secondary: ['trap.mid']}}
});
