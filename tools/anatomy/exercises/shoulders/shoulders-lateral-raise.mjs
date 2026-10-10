// 哑铃侧平举 · front view. Arms travel in the scapular plane (~20° forward), so the projected arm shortens slightly.
const f = (abd) => Math.hypot(Math.sin(abd * Math.PI / 180) * Math.cos(20 * Math.PI / 180), Math.cos(abd * Math.PI / 180));
export default {
  id: 'shoulders-lateral-raise', title: '哑铃侧平举', view: 'front',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {arms: {r: {abd: 10, el: 0}, l: {abd: 10, el: 0}}},
    start: {act: 0.24},
    peak: {act: 1, scapE: {r: 4, l: 4}, arms: {r: {abd: 86, el: -6, f: f(86), ff: f(86)}, l: {abd: 86, el: -6, f: f(86), ff: f(86)}}}
  },
  equipment: [{type: 'dumbbell', hand: 'r', axis: 'z'}, {type: 'dumbbell', hand: 'l', axis: 'z'}],
  muscles: {primary: ['deltoid.lat'], secondary: ['deltoid.ant']},
  labels: [{muscle: 'deltoid.lat@r', at: 'tr'}, {muscle: 'deltoid.ant@l', at: 'tl'}],
  guide: {joint: 'arms.r.H', pivot: 'arms.r.S', push: 17},
  detail: {pose: 'peak', ghost: 'start',
    arrows: [{joint: 'arms.r.H', pivot: 'arms.r.S', push: 14, from: 0.04, to: 0.97}],
    callouts: [{n: 1, at: 'arms.l.E', text: '肘微屈、略高于手腕', dy: -16}, {n: 2, at: 'arms.r.S', text: '肩下沉，不耸肩', dx: 6, dy: -30},
      {n: 3, at: 'pelvis', text: '躯干稳定不摇摆', dy: -30}], legend: 'bl'},
  mistake: {fix: '手腕保持自然，肩肘手协调，必要时降低幅度。', camera: {focus: 'upper', withEquipment: true, side: 10}, text: '猛抬肩、耸肩', goodText: '肩下沉，抬到肩高附近',
    pose: {scapE: {r: 14, l: 14}, arms: {r: {abd: 94, el: 6}, l: {abd: 94, el: 6}}},
    marks: [{at: 'arms.r.S', type: 'circle', r: 18}, {at: 'arms.l.S', type: 'circle', r: 18}],
    muscles: {primary: ['trap.upper'], secondary: ['deltoid.lat']}}
};
