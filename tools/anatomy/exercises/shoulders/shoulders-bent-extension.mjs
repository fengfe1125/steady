// 俯身哑铃肩伸 · side view. Hip hinge, one dumbbell in the near (working) hand; the upper arm travels a
// short path back toward the hip with the elbow almost straight. The far arm hangs still.
export default {motionGuide: false, 
  id: 'shoulders-bent-extension', title: '俯身哑铃肩伸', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {x: -38, y: -170, pelvis: 52, lumbar: 4, thorax: 6, neck: -16,
      ik: {ankle: {near: {x: 0, y: -14, foot: 0}, far: {x: -2, y: -14, foot: 0}}},
      arms: {far: {sh: 60, el: 12}}},
    start: {act: 0.25, arms: {near: {sh: 61, el: 8}}},
    peak: {act: 1, arms: {near: {sh: 22, el: 8}}}
  },
  equipment: [{type: 'dumbbell', hand: 'near', axis: 'x'}],
  muscles: {primary: ['deltoid.post@near'], secondary: ['lats@near', 'triceps.long@near']},
  labels: [{muscle: 'deltoid.post@near', at: 'tr'}, {muscle: 'lats', at: 'tl'}],
  guide: {joint: 'arms.near.H', pivot: 'shoulder', push: 16},
  detail: {pose: 'peak', ghost: 'start',
    callouts: [{n: 1, at: 'shoulder', text: '先稳肩胛，肩下沉', dy: -22}, {n: 2, at: 'arms.near.E', text: '上臂小幅向髋后', dx: 4, dy: 18},
      {n: 3, at: 'legs.near.K', text: '髋折叠，膝微松', dx: 22}], legend: 'tr'},
  mistake: {fix: '减轻重量，重新让肩部保持下沉。', camera: {focus: 'upper'}, text: '耸肩、翘肩', goodText: '肩下沉，上臂向髋后',
    pose: {scapE: 9, scapP: -4, thorax: -6, arms: {near: {sh: 6, el: 30}}},
    marks: [{at: 'shoulder', type: 'circle', r: 16}],
    muscles: {primary: ['trap.upper'], secondary: ['deltoid.post@near']}}
};
