// Standing neutral rope grip. Elbows remain at the sides; low cable is in front.
export default {
  id: 'arms-standing-rope-hammer-curl', title: '站姿绳索锤式弯举', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {y: -188, neck: -14, legs: {near: {knee: 4}, far: {knee: 4}},
      arms: {near: {sh: 5, el: 24}, far: {sh: 9, el: 24, f: .94, ff: .9}}},
    start: {act: .25}, peak: {act: 1, arms: {near: {el: 120}, far: {el: 120}}}
  },
  equipment: [{type: 'arms_cableStation', x: 145, pulley: {x: 129, y: -31}, hands: ['near', 'far'], attachment: 'rope', branch: 32}],
  muscles: {primary: ['brachialis', 'brachioradialis'], secondary: ['biceps', 'forearm.ext']},
  labels: [{muscle: 'brachialis@near', at: 'tl'}, {muscle: 'brachioradialis@near', at: 'tr'}],
  guide: {joint: 'arms.near.H', pivot: 'arms.near.E', push: 15},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl',
    labels: [{muscle: 'brachialis@near', at: 'tl'}, {muscle: 'brachioradialis@near', at: 'tr'}, {muscle: 'biceps@near', at: 'br', sub: '协同'}],
    callouts: [{n: 1, at: 'arms.near.H', text: '双手对握，各握一端绳把', dx: 18, dy: -10},
      {n: 2, at: 'arms.near.E', text: '体侧肘位，顶端稍停', dx: -22, dy: 5},
      {n: 3, at: 'hip', text: '重心稳定，回程留张力', dx: -22, dy: -8}]},
  mistake: {good: 'peak', goodText: '体侧肘位，站稳', text: '抬肘、后仰',
    fix: '降低阻力，站稳重心，让上臂留在体侧；只做肘屈伸，回程不完全放到底。',
    camera: {focus: 'upper', side: 27}, pose: {lumbar: -14, thorax: -6, scapE: 5, arms: {near: {sh: 45}, far: {sh: 49}}},
    marks: [{at: 'arms.near.E', type: 'circle', r: 16}, {at: 'N.1', type: 'circle', r: 15}],
    muscles: {primary: ['deltoid.ant', 'erectors'], secondary: ['brachialis', 'brachioradialis']}}
};
