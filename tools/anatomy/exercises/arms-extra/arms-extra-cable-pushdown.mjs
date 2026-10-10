// Single working arm. The outlet stays ahead of the chest; the elbow is fixed while the forearm extends.
export default {
  id: 'arms-extra-cable-pushdown', title: '单手绳索臂屈伸', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {x: -22, y: -184, pelvis: 10, lumbar: 8, thorax: 6, neck: -18,
      legs: {near: {hip: 0, knee: 0, ankle: null}, far: {hip: 0, knee: 0, ankle: null}},
      ik: {ankle: {near: {x: 0, y: -14, foot: 0}, far: {x: -18, y: -14, foot: 0}}},
      arms: {near: {sh: 26, wr: 0}, far: {sh: 20, el: 18}}},
    start: {act: .35, arms: {near: {el: 86}}},
    peak: {act: 1, arms: {near: {el: 16}}}
  },
  equipment: [{type: 'arms_extra_cable_station', x: 142, top: -382, outlet: {x: 126, y: -306}, hand: 'near', grip: 'single', restLength: 91}],
  camera: {side: 24, b: 70},
  muscles: {primary: ['triceps@near'], secondary: ['brachioradialis@near', 'obliques']},
  labels: [{muscle: 'triceps@near', at: 'tl'}, {muscle: 'brachioradialis@near', at: 'tr'}],
  guide: {joint: 'arms.near.H', pivot: 'arms.near.E', push: 14},
  detail: {pose: 'peak', ghost: 'start', labels: [{muscle: 'triceps@near', at: 'tl'}, {muscle: 'brachioradialis@near', at: 'tr'}],
    callouts: [{n: 1, at: 'arms.near.E', text: '肘留在身侧', dx: -24, dy: -12},
      {n: 2, at: 'arms.near.W', text: '手腕顺直，握住柄', dx: 24, dy: 3},
      {n: 3, at: 'legs.near.A', text: '双脚踩稳，微前倾', dx: -16, dy: -8}], legend: 'bl'},
  mistake: {good: 'peak', goodText: '固定肘位伸肘', text: '肩肘前摆借力',
    pose: {lumbar: 18, thorax: 12, scapE: 6, arms: {near: {sh: 68, el: 25}}},
    camera: {focus: 'upper', b: 32, side: 26},
    muscles: {primary: ['deltoid.ant@near', 'trap.upper'], secondary: ['triceps@near']},
    marks: [{at: 'arms.near.E', type: 'arrow', dx: -22, dy: -18}, {at: 'shoulder', type: 'circle', r: 14}],
    fix: '减轻阻力，肩膀放松，让肘留在身侧；只用前臂完成伸肘和还原。'}
};
