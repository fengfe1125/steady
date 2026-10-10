// Floor seated, knees bent and feet planted. No rowing seat and no invented footplate.
export default {
  id: 'arms-extra-seated-cable-curl', title: '坐地低位绳索弯举', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {x: -74, y: -23, pelvis: 8, neck: -14,
      legs: {near: {hip: 0, knee: 0, ankle: null}, far: {hip: 0, knee: 0, ankle: null}},
      ik: {ankle: {near: {x: 55, y: -14, foot: 0}, far: {x: 44, y: -14, foot: 0}}},
      arms: {near: {sh: 60, wr: 0}, far: {sh: 60, wr: 0}}},
    start: {act: .35, arms: {near: {el: 22}, far: {el: 22}}},
    peak: {act: 1, arms: {near: {el: 110}, far: {el: 110}}}
  },
  equipment: [{type: 'arms_extra_cable_station', x: 170, top: -382, outlet: {x: 154, y: -24}, hand: 'near', restLength: 105},
    {type: 'arms_extra_straight_cable_bar'}],
  camera: {side: 18, b: 70},
  muscles: {primary: ['biceps'], secondary: ['brachialis', 'brachioradialis']},
  labels: [{muscle: 'biceps@near', at: 'tl'}, {muscle: 'brachioradialis@near', at: 'tr'}],
  guide: {joint: 'arms.near.H', pivot: 'arms.near.E', push: 14},
  detail: {pose: 'peak', ghost: 'start', labels: [{muscle: 'biceps@near', at: 'tl'}, {muscle: 'brachialis@near', at: 'tr'}],
    callouts: [{n: 1, at: 'hip', text: '坐地屈膝，脚掌踩稳', dx: -16, dy: -14},
      {n: 2, at: 'arms.near.E', text: '安排肘位后保持稳定', dx: -18, dy: 8},
      {n: 3, at: 'arms.near.W', text: '反握横杆，回程不塌腕', dx: 22, dy: -12}], legend: 'bl'},
  mistake: {good: 'start', goodText: '保持勾握和腕控制', text: '回程突然塌腕',
    pose: {arms: {near: {wr: -60}, far: {wr: -60}}},
    camera: {focus: ['arms.near.E', 'arms.near.W', 'arms.near.H'], side: 22, head: 12, t: 86, b: 60, max: 2.8},
    muscles: {primary: ['forearm.ext'], secondary: ['biceps']},
    marks: [{at: 'arms.near.W', type: 'circle', r: 14}, {at: 'arms.near.H', type: 'arrow', dx: 22, dy: 12}],
    fix: '保持原来的勾握和手腕控制，慢慢伸肘回放；不要突然松腕或用卷腕代替弯举。'}
};
