// Actual 45° backrest, two supinated dumbbells; fixed shoulder extension with elbow flexion.
export default {motionGuide: false, 
  id: 'arms-incline-dumbbell-curl', title: '仰卧哑铃肩伸位弯举', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {x: 30, y: -112, pelvis: -45, neck: -14,
      ik: {ankle: {near: {x: 90, y: -14, foot: 0}, far: {x: 70, y: -14, foot: 0}}},
      // Far arm is foreshortened in this fixed side projection so both held bells remain visible.
      arms: {near: {sh: -68, el: 22}, far: {sh: -62, el: 22, f: .76, ff: .86}}},
    start: {act: .25}, peak: {act: 1, arms: {near: {el: 126}, far: {el: 126}}}
  },
  equipment: [{type: 'arms_adjustableBench', a: {x: 7, y: -98}, b: {x: -119, y: -224}, seatEnd: {x: 78, y: -90},
    headPad: {a: {x: -90, y: -195}, b: {x: -115, y: -220}, depth: 6}},
    {type: 'dumbbell', hand: 'far', axis: 'z'}, {type: 'dumbbell', hand: 'near', axis: 'z'}],
  muscles: {primary: ['biceps'], secondary: ['brachialis', 'brachioradialis']},
  labels: [{muscle: 'biceps@near', at: 'tl'}, {muscle: 'brachialis@near', at: 'tr'}],
  guide: {joint: 'arms.near.H', pivot: 'arms.near.E', push: 17},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl',
    labels: [{muscle: 'biceps@near', at: 'tl'}, {muscle: 'brachialis@near', at: 'tr'}],
    callouts: [{n: 1, at: 'N.4', text: '约45°靠背，头背贴稳', dx: -13, dy: -11},
      {n: 2, at: 'arms.near.E', text: '上臂后置，掌心向上', dx: -17, dy: 5},
      {n: 3, at: 'arms.near.H', text: '前臂弯举，不放到底', dx: 15, dy: -10}]},
  mistake: {good: 'peak', goodText: '头背贴住靠背', text: '抬头追着哑铃',
    fix: '减轻重量，把头背贴回已锁定的靠背；需要时用垫稳的毛巾辅助头部支撑。上臂继续留在身体后侧。',
    camera: {focus: 'upper', side: 25}, pose: {neck: 14, head: 14, thorax: 9},
    marks: [{at: 'headPivot', type: 'circle', r: 18}, {at: 'headTop', type: 'arrow', dx: 22, dy: -10}],
    muscles: {primary: ['biceps'], secondary: ['deltoid.ant', 'brachialis']}}
};
