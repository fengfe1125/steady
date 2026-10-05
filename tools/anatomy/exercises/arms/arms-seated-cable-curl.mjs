// Floor seated, knees bent; supinated short bar curls in FRONT of the neck, not behind it.
export default {
  id: 'arms-seated-cable-curl', title: '坐姿绳索弯举', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {x: -80, y: -28, neck: -10,
      ik: {ankle: {near: {x: 53, y: -14, foot: 0}, far: {x: 42, y: -14, foot: 0}}},
      arms: {near: {sh: 72, el: 28}, far: {sh: 76, el: 28, f: .94, ff: .94}}},
    start: {act: .24}, peak: {act: 1, arms: {near: {el: 120}, far: {el: 120}}}
  },
  equipment: [{type: 'arms_cableStation', x: 161, pulley: {x: 145, y: -33}, hands: ['near', 'far'], attachment: 'shortbar'}],
  muscles: {primary: ['biceps'], secondary: ['brachialis', 'brachioradialis']},
  labels: [{muscle: 'biceps@near', at: 'tl'}, {muscle: 'brachialis@near', at: 'tr'}],
  guide: {joint: 'arms.near.H', pivot: 'arms.near.E', push: 15},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl',
    labels: [{muscle: 'biceps@near', at: 'tl'}, {muscle: 'brachialis@near', at: 'tr'}],
    callouts: [{n: 1, at: 'arms.near.H', text: '反握短杆，只做颈前', dx: -10, dy: -20},
      {n: 2, at: 'arms.near.E', text: '膝附近先摆好上臂', dx: 17, dy: -8},
      {n: 3, at: 'hip', text: '骨盆坐地，脚踩稳', dx: -15, dy: 9}]},
  mistake: {good: 'peak', goodText: '坐稳，只做屈肘', text: '后仰拉成划船',
    fix: '降低阻力，恢复坐地屈膝支撑，摆好上臂后用前臂弯举到颈前，不把肩肘向后拉。',
    camera: {focus: 'upper', side: 28}, pose: {pelvis: -6, lumbar: -16, thorax: -6, arms: {near: {sh: 35, el: 110}, far: {sh: 39, el: 110}}},
    marks: [{at: 'N.1', type: 'circle', r: 16}, {at: 'shoulder', type: 'arrow', dx: -26, dy: -7}],
    muscles: {primary: ['lats', 'erectors'], secondary: ['biceps']}}
};
