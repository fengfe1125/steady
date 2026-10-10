import {reviewed} from './geometry.js';
export default reviewed({motionGuide: false, 
  id: 'back-bent-arm-pulldown', title: '坐地单手高位钢索下压（屈肘）', view: 'side',
  poses: {
    base: {y: -34, legs: {near: {hip: 130, knee: 100}, far: {hip: 130, knee: 100}},
      ik: {hand: {far: {x: 116, y: -108, bend: 1}}}},
    start: {act: .3, arms: {near: {sh: 100, el: 90}}},
    peak: {act: 1, arms: {near: {sh: 50, el: 90}}}
  },
  equipment: [{type: 'mat', x: -40, length: 230},
    {type: 'back_cable', x: 116, top: -303, outlet: {x: 99, y: -282}, attachment: 'single', hands: ['near'], supportHand: 'far', stackWidth: 24}],
  camera: {side: 32, b: 30, t: 62},
  muscles: {primary: ['lats@near'], secondary: ['teres', 'trap.lower', 'biceps@near', 'abs']},
  labels: [{muscle: 'lats', at: 'tl'}, {muscle: 'biceps@near', at: 'tr', sub: '屈肘姿态保持'}],
  guide: {joint: 'arms.near.E', offset: [-18, 0]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'lats', at: 'tl'}],
    callouts: [{n: 1, at: 'arms.near.H', text: '屈肘握把，肩带上臂下压', dx: -20, dy: -26},
      {n: 2, at: 'arms.far.H', text: '另一手扶出线滑轮同柱', dx: 30, dy: 6}, {n: 3, at: 'hip', text: '坐地屈膝，身体摆正', dx: -24, dy: 22}]},
  mistake: {goodText: '扶同柱，身体稳定', text: '后倒追求压深',
    fix: '先坐直并扶稳同一立柱；缩小下压幅度，保持屈肘与手腕姿态，再受控回高。',
    pose: {x: 25, pelvis: -6, lumbar: -12, thorax: -6, neck: 8,
      ik: {ankle: {near: {x: 110.6, y: -14, foot: 0, bend: -1}, far: {x: 110.6, y: -14, foot: 0, bend: -1}}}},
    marks: [{at: 'N.1', type: 'circle', r: 17}, {at: 'N.3', type: 'arrow', dx: 30, dy: -6}],
    camera: {focus: 'trunk', side: 24}, muscles: {primary: ['erectors'], secondary: ['lats', 'biceps@near']}}
});
