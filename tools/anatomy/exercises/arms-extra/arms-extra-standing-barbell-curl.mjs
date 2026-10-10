// EZ curl bar, palms up. Upper arms remain alongside the torso through the entire curl.
export default {
  id: 'arms-extra-standing-barbell-curl', title: '站姿 EZ 曲杆弯举', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {neck: -14, arms: {near: {sh: 4, wr: 0}, far: {sh: 4, wr: 0}},
      legs: {near: {hip: 0, knee: 4, ankle: null}, far: {hip: 0, knee: 4, ankle: null}}},
    start: {act: .3, arms: {near: {el: 14}, far: {el: 14}}},
    peak: {act: 1, arms: {near: {el: 112}, far: {el: 112}}}
  },
  equipment: [{type: 'arms_extra_ez_bar'}], camera: {b: 72},
  muscles: {primary: ['biceps'], secondary: ['brachialis', 'brachioradialis']},
  labels: [{muscle: 'biceps@near', at: 'tr'}, {muscle: 'brachioradialis@near', at: 'tl'}],
  guide: {joint: 'arms.near.H', pivot: 'arms.near.E', push: 15},
  detail: {pose: 'peak', ghost: 'start', labels: [{muscle: 'biceps@near', at: 'tr'}, {muscle: 'brachialis@near', at: 'tl'}],
    callouts: [{n: 1, at: 'arms.near.H', text: '反握曲杆，手腕自然', dx: 26},
      {n: 2, at: 'arms.near.E', text: '大臂留在身侧', dx: -22, dy: 4},
      {n: 3, at: 'N.1', text: '躯干直立，不后摆', dx: -22}], legend: 'bl'},
  mistake: {good: 'peak', goodText: '躯干稳，控制弯举', text: '后仰甩杆、肘后跑',
    pose: {lumbar: -20, thorax: -6, arms: {near: {sh: -12, el: 102}, far: {sh: -12, el: 102}}},
    camera: {focus: 'upper', side: 28, b: 32},
    muscles: {primary: ['erectors'], secondary: ['biceps', 'deltoid.ant']},
    marks: [{at: 'N.1', type: 'circle', r: 14}, {at: 'arms.near.E', type: 'arrow', dx: 24, dy: 8}],
    fix: '减轻重量，让躯干直立。大臂留在原位，控制弯举和下放，不靠腰部后摆甩起杠铃。'}
};
