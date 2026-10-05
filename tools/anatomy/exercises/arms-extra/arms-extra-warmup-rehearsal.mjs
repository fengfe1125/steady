// Rehearsal is deliberately the same movement family as pushdown, with a smaller comfortable range.
export default {
  id: 'arms-extra-warmup-rehearsal', title: '轻阻力动作预演', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {x: -22, y: -184, pelvis: 10, lumbar: 8, thorax: 6, neck: -18,
      legs: {near: {hip: 0, knee: 0, ankle: null}, far: {hip: 0, knee: 0, ankle: null}},
      ik: {ankle: {near: {x: 0, y: -14, foot: 0}, far: {x: -18, y: -14, foot: 0}}},
      arms: {near: {sh: 26, wr: 0}, far: {sh: 20, el: 18}}},
    start: {act: .3, arms: {near: {el: 78}}},
    peak: {act: .62, arms: {near: {el: 28}}}
  },
  equipment: [{type: 'arms_extra_cable_station', x: 142, top: -382, outlet: {x: 126, y: -306}, hand: 'near', grip: 'single', restLength: 99}],
  camera: {side: 24, b: 70},
  muscles: {primary: ['triceps@near'], secondary: ['brachioradialis@near', 'obliques']},
  labels: [{muscle: 'triceps@near', at: 'tl', sub: '轻阻力预演'}, {muscle: 'brachioradialis@near', at: 'tr'}],
  guide: {joint: 'arms.near.H', pivot: 'arms.near.E', push: 14},
  detail: {pose: 'peak', ghost: 'start', labels: [{muscle: 'triceps@near', at: 'tl', sub: '轻阻力预演'}],
    callouts: [{n: 1, at: 'arms.near.H', text: '先确认附件连接', dx: 24},
      {n: 2, at: 'arms.near.E', text: '肘稳，舒适范围轻练', dx: -22, dy: -12},
      {n: 3, at: 'shoulder', text: '肩放松，停住检查', dx: -20, dy: -18}], legend: 'bl'},
  mistake: {good: 'peak', goodText: '轻练，肩膀放松', text: '耸肩硬压到头',
    pose: {scapE: 10, arms: {near: {el: 2, sh: 32}}}, camera: {focus: 'upper', b: 32},
    muscles: {primary: ['trap.upper'], secondary: ['triceps@near']},
    marks: [{at: 'shoulder', type: 'circle', r: 14}, {at: 'arms.near.E', type: 'x'}],
    fix: '把阻力调轻，回到肩肘舒适的幅度。预演只需熟悉轨迹，不练到疲劳。'}
};
