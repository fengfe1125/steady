// 弹力带过顶绕环 · side view. Straight arms travel from shoulder height in front, over the head, to behind the shoulders.
export default {
  id: 'shoulders-band-pass-through', title: '弹力带过顶绕环', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  hands: {near: 'fist', far: 'fist'},
  poses: {
    base: {legs: {near: {knee: 3}, far: {knee: 3}}},
    start: {act: 0.4, arms: {near: {sh: 82, el: 4}, far: {sh: 82, el: 4}}},
    over: {act: 0.7, arms: {near: {sh: 172, el: 4}, far: {sh: 172, el: 4}}},
    peak: {act: 0.8, scapE: 2, arms: {near: {sh: 232, el: 4}, far: {sh: 232, el: 4}}}
  },
  equipment: [{type: 'band', depth: [-10, -7]}],
  muscles: {secondary: ['deltoid', 'trap.mid', 'trap.lower']},
  labels: [{muscle: 'deltoid.lat@near', at: 'tr', text: '肩关节活动', sub: '三角肌、斜方肌中下束轻度参与'}],
  guide: {joint: 'arms.near.H', pivot: 'shoulder', push: 16},
  detail: {pose: 'over', ghost: 'start',
    callouts: [{n: 1, at: 'arms.near.H', text: '宽握，手臂接近伸直', dx: 10, dy: -14}, {n: 2, at: 'N.1', text: '不挺腰', dx: -30},
      {n: 3, at: 'N.4', text: '不伸脖子', dx: 16, dy: -10}], legend: 'bl'},
  mistake: {fix: '回到肩前和肩后附近的可控范围，稳定腰背，保持轻微张力。', camera: {focus: 'upper'}, text: '放得太低、挺腰借幅度', goodText: '肩后可控范围', good: 'peak',
    pose: {lumbar: -12, arms: {near: {sh: 292}, far: {sh: 292}}},
    marks: [{at: 'arms.near.H', type: 'arrow', dx: -20, dy: -26}, {at: 'N.1', type: 'circle', r: 16}]}
};
