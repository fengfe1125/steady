// 坐姿双铃推肩 · front view. Seated against a backrest; dumbbells start beside the shoulders and press
// up with a soft elbow at the top, the bells kept apart.
export default {
  id: 'shoulders-dumbbell-press', title: '坐姿双铃推肩', view: 'front',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {y: -126, legs: {r: {abd: 14, f: 0.28, knee: 14, fs: 1}, l: {abd: 14, f: 0.28, knee: 14, fs: 1}}},
    start: {act: 0.3, arms: {r: {abd: 82, el: 100}, l: {abd: 82, el: 100}}},
    peak: {act: 1, scapE: {r: 3, l: 3}, arms: {r: {abd: 156, el: 22}, l: {abd: 156, el: 22}}}
  },
  equipment: [{type: 'benchFront', top: -104, back: {top: -242, width: 58}},
    {type: 'dumbbell', hand: 'r', axis: 'x'}, {type: 'dumbbell', hand: 'l', axis: 'x'}],
  muscles: {primary: ['deltoid.ant', 'deltoid.lat'], secondary: ['triceps', 'trap.upper']},
  labels: [{muscle: 'deltoid.lat@r', at: 'tr'}, {muscle: 'deltoid.ant@l', at: 'tl'}],
  guides: [{joint: 'arms.r.H', offset: [16, 0]}, {joint: 'arms.l.H', offset: [-16, 0]}],
  guide: {joint: 'arms.r.H', offset: [16, 0]},
  detail: {pose: 'peak', ghost: 'start',
    callouts: [{n: 1, at: 'arms.l.E', text: '保留肘弯，不硬推直', dx: -6, dy: 14}, {n: 2, at: 'arms.r.H', text: '两铃留出间距', dy: -18},
      {n: 3, at: 'pelvis', text: '背和臀贴靠，双脚踩稳', dy: -40}], legend: 'bl'},
  mistake: {fix: '保留肘弯、让肩部自然运动，把幅度收回到能维持张力的位置。', camera: {focus: 'upper'}, text: '硬推直肘、肩部上提', goodText: '保留肘弯，两铃有间距',
    pose: {scapE: {r: 10, l: 10}, arms: {r: {abd: 174, el: 0}, l: {abd: 174, el: 0}}},
    marks: [{at: 'arms.r.H', type: 'x'}, {at: 'arms.r.E', type: 'circle', r: 12}, {at: 'arms.l.E', type: 'circle', r: 12}],
    muscles: {primary: ['deltoid.ant', 'deltoid.lat'], secondary: ['trap.upper']}}
};
