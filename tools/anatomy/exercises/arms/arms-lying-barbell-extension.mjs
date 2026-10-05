// Small incline (~15°), EZ bar lowering towards the forehead; upper arms retain a headward tilt.
export default {
  id: 'arms-lying-barbell-extension', title: '仰卧曲杆臂屈伸', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {x: -20, y: -100, pelvis: -75, neck: -14,
      ik: {ankle: {near: {x: 90, y: -14, foot: 0}, far: {x: 72, y: -14, foot: 0}}},
      arms: {near: {sh: -240, el: 108}, far: {sh: -240, el: 108, f: .92, ff: .82}}},
    start: {act: .3}, peak: {act: 1, arms: {near: {el: 22}, far: {el: 22}}}
  },
  equipment: [{type: 'arms_adjustableBench', a: {x: -33, y: -75}, b: {x: -208, y: -122}, seatEnd: {x: 53, y: -75},
    headPad: {a: {x: -161, y: -109.4}, b: {x: -197, y: -119.1}, depth: 5}}, {type: 'arms_ezBar'}],
  muscles: {primary: ['triceps'], secondary: ['forearm.ext']},
  labels: [{muscle: 'triceps.long@near', at: 'tl', text: '肱三头肌', sub: '双臂伸肘'}, {muscle: 'forearm.ext@near', at: 'tr', sub: '稳定手腕'}],
  guide: {joint: 'arms.near.H', pivot: 'arms.near.E', push: 14},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl',
    labels: [{muscle: 'triceps.long@near', at: 'tl', text: '肱三头肌', sub: '主要发力'}, {muscle: 'forearm.ext@near', at: 'tr', sub: '手腕稳定'}],
    callouts: [{n: 1, at: 'N.4', text: '头背贴约15°凳面', dx: -12, dy: 19},
      {n: 2, at: 'arms.near.E', text: '上臂保留向头侧倾角', dx: 21, dy: -12},
      {n: 3, at: 'arms.near.H', text: '屈肘朝额头，受控举回', dx: -13, dy: -15}]},
  mistake: {good: 'peak', goodText: '上臂留住倾角', text: '整臂前摆到肩上',
    fix: '头背贴凳、脚踩稳，保留上臂朝头侧的角度，靠肘屈伸控制曲杆；不要用肩摆动追求高度。',
    camera: {focus: 'upper', side: 24}, pose: {arms: {near: {sh: -280, el: 30}, far: {sh: -280, el: 30}}},
    marks: [{at: 'arms.near.E', type: 'circle', r: 14}, {at: 'arms.near.H', type: 'arrow', dx: 24, dy: -7}],
    muscles: {primary: ['deltoid.ant'], secondary: ['triceps']}}
};
