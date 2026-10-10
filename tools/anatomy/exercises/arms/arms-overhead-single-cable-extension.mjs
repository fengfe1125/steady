// Low pulley BEHIND user, one overhead hand; free palm rests on abdomen, no wrist twisting.
export default {
  id: 'arms-overhead-single-cable-extension', title: '单手绳索肩屈位臂屈伸', view: 'side', hands: {far: 'open'},
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {x: 0, y: -187, neck: -14,
      ik: {ankle: {near: {x: 12, y: -14, foot: 0}, far: {x: -12, y: -14, foot: 0}},
        hand: {far: {x: 14, y: -230}}}, arms: {near: {sh: 192, el: 115}, far: {f: 0.62, ff: 0.5}}},
    start: {act: .3}, peak: {act: 1, arms: {near: {el: 18}}}
  },
  equipment: [{type: 'arms_cableStation', x: -163, facing: 1, pulley: {x: -147, y: -30}, hands: ['near'], attachment: 'dhandle'}],
  muscles: {primary: ['triceps@near'], secondary: ['abs', 'forearm.ext@near']},
  labels: [{muscle: 'triceps.long@near', at: 'tr', text: '肱三头肌', sub: '头上伸肘'}, {muscle: 'abs', at: 'tl', sub: '稳定躯干'}],
  guide: {joint: 'arms.near.H', pivot: 'arms.near.E', push: 19},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl',
    labels: [{muscle: 'triceps.long@near', at: 'tr', text: '肱三头肌', sub: '主要发力'}, {muscle: 'abs', at: 'tl', sub: '协同稳定'}],
    callouts: [{n: 1, at: 'arms.near.E', text: '上臂举高，保留肩位', dx: 20, dy: 7},
      {n: 2, at: 'arms.near.H', text: '向上伸肘，末端留弯', dx: 17, dy: -9},
      {n: 3, at: 'arms.far.H', text: '另一手放腹部，不挺腰', dx: 20, dy: 11}]},
  mistake: {good: 'peak', goodText: '腹部收稳，上臂举高', text: '挺腰借力',
    fix: '减轻阻力，重新站稳并收住肋骨；另一手留在腹部，上臂保持头侧，再做屈伸肘。',
    camera: {focus: 'upper', side: 28}, pose: {lumbar: -20, thorax: -8},
    marks: [{at: 'N.1', type: 'circle', r: 17}, {at: 'N.3', type: 'arrow', dx: -28, dy: 7}],
    muscles: {primary: ['erectors'], secondary: ['triceps@near']}}
};
