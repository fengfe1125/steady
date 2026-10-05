// Warm-up and formal identities intentionally share the same supported cable-extension resource.
export default {motionGuide: false, 
  id: 'arms-single-cable-extension', lessons: ['arms-warmup-triceps', 'arms-single-cable-extension'],
  title: '单手绳索肩伸位臂屈伸', view: 'side', hands: {far: 'open'},
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {x: -60, y: -171, pelvis: 35, neck: -14,
      ik: {ankle: {near: {x: 0, y: -14, foot: 0}, far: {x: -24, y: -14, foot: 0}},
        hand: {far: {x: 96, y: -218}}},
      arms: {near: {sh: -24, el: 105, wr: 5}}},
    start: {act: .24},
    peak: {act: 1, arms: {near: {el: 7, wr: 5}}}
  },
  equipment: [{type: 'arms_cableStation', x: 112, pulley: {x: 96, y: -234}, hands: ['near'], attachment: 'dhandle'}],
  muscles: {primary: ['triceps@near'], secondary: ['deltoid.post@near', 'forearm.ext@near']},
  labels: [{muscle: 'triceps.long@near', at: 'tl', text: '肱三头肌', sub: '伸肘发力'}, {muscle: 'deltoid.post@near', at: 'tr', sub: '稳定上臂'}],
  guide: {joint: 'arms.near.H', pivot: 'arms.near.E', push: 17},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl',
    labels: [{muscle: 'triceps.long@near', at: 'tl', text: '肱三头肌', sub: '主要发力'}, {muscle: 'deltoid.post@near', at: 'tr', sub: '协同稳定'}],
    callouts: [{n: 1, at: 'arms.far.H', text: '扶柱站稳，轻负荷热身', dx: 17, dy: -13},
      {n: 2, at: 'arms.near.E', text: '上臂后置，只动前臂', dx: -16, dy: -12},
      {n: 3, at: 'arms.near.H', text: '握柄向小指侧微偏', dx: -8, dy: 19}]},
  mistake: {good: 'peak', goodText: '扶柱，保留上臂位置', text: '上臂向前跑',
    fix: '降低阻力，扶柱站稳，保留后置的上臂，再让前臂绕肘运动。尺偏仅作微偏握持，不强掰手腕。',
    camera: {focus: 'upper', side: 25}, pose: {arms: {near: {sh: 30, el: 22}}},
    marks: [{at: 'arms.near.E', type: 'circle', r: 14}, {at: 'arms.near.E', type: 'arrow', dx: 25, dy: -12}],
    muscles: {primary: ['deltoid.ant@near'], secondary: ['triceps@near']}}
};
