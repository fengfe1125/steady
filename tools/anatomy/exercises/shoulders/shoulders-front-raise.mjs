// 对握哑铃前平举 · side view. Neutral grip, so the dumbbell handle lies across the palm in the drawing plane.
export default {
  id: 'shoulders-front-raise', title: '对握哑铃前平举', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {arms: {near: {sh: 14, el: 10}, far: {sh: 14, el: 10}}, legs: {near: {knee: 4}, far: {knee: 4}}},
    start: {act: 0.24},
    peak: {act: 1, scapE: 2, arms: {near: {sh: 84, el: 10}, far: {sh: 84, el: 10}}}
  },
  equipment: [{type: 'dumbbell', hand: 'far', axis: 'x'}, {type: 'dumbbell', hand: 'near', axis: 'x'}],
  muscles: {primary: ['deltoid.ant'], secondary: ['pec.upper', 'deltoid.lat']},
  labels: [{muscle: 'deltoid.ant', at: 'tr'}, {muscle: 'pec.upper', at: 'tl'}],
  guide: {joint: 'arms.near.H', pivot: 'shoulder', push: 18},
  detail: {pose: 'peak', ghost: 'start',
    callouts: [{n: 1, at: 'arms.near.E', text: '肘微屈', dy: -16}, {n: 2, at: 'shoulder', text: '肩下沉，不耸肩', dx: -10, dy: -34},
      {n: 3, at: 'N.1', text: '躯干不后仰', dx: -40}], legend: 'br'},
  mistake: {fix: '稳定躯干，保持身体前方的路径。', camera: {focus: 'upper'}, text: '身体后仰借力', goodText: '躯干稳定，向前抬',
    pose: {pelvis: -6, lumbar: -14, thorax: -6, scapE: 6, arms: {near: {sh: 96}, far: {sh: 96}}},
    marks: [{at: 'N.1', type: 'circle', r: 18}, {at: 'N.3', type: 'arrow', dx: 30, dy: 6}],
    muscles: {primary: ['deltoid.ant'], secondary: ['erectors', 'trap.upper']}}
};
