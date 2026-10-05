// Small incline, head end high. Shoulder and feet are supported; the bar lowers toward the forehead.
// The EZ shape is the retained original schematic choice; the video's lying bar type is unconfirmed.
export default {
  id: 'arms-extra-lying-barbell-extension', title: '小上斜仰卧杠铃臂屈伸', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {x: 45, y: -88, pelvis: -75, neck: -14,
      legs: {near: {hip: 0, knee: 0, ankle: null}, far: {hip: 0, knee: 0, ankle: null}},
      ik: {ankle: {near: {x: 158, y: -14, foot: 0}, far: {x: 146, y: -14, foot: 0}}},
      arms: {near: {sh: 125, wr: 0}, far: {sh: 125, wr: 0}}},
    start: {act: .75, arms: {near: {el: 22}, far: {el: 22}}},
    peak: {act: 1, arms: {near: {el: 86}, far: {el: 86}}}
  },
  equipment: [{type: 'arms_extra_incline_bench'}, {type: 'arms_extra_ez_bar', gripLabel: '曲杆示意 · 握法可调整'}], camera: {side: 16, b: 72},
  muscles: {primary: ['triceps'], secondary: ['deltoid.ant', 'brachioradialis']},
  labels: [{muscle: 'triceps@near', at: 'tl'}, {muscle: 'deltoid.ant@near', at: 'tr'}],
  guide: {joint: 'arms.near.H', pivot: 'arms.near.E', push: 12},
  detail: {pose: 'peak', ghost: 'start', labels: [{muscle: 'triceps@near', at: 'tl'}, {muscle: 'deltoid.ant@near', at: 'tr'}],
    callouts: [{n: 1, at: 'N.4', text: '头颈肩背有凳面支撑', dx: -8, dy: 24},
      {n: 2, at: 'arms.near.E', text: '肘位稳定，杆近额头', dx: 16, dy: -18},
      {n: 3, at: 'legs.near.A', text: '双脚踩地，不强行锁肘', dx: -18, dy: -10}], legend: 'bl'},
  mistake: {good: 'start', goodText: '留肘弯，维持张力', text: '大臂抬直、硬锁肘',
    pose: {arms: {near: {sh: 105, el: 0}, far: {sh: 105, el: 0}}},
    camera: {focus: ['headTop', 'N.4', 'shoulder', 'arms.near.E', 'arms.near.H', 'hip'], side: 18, b: 36},
    muscles: {primary: ['deltoid.ant'], secondary: ['triceps']},
    marks: [{at: 'arms.near.E', type: 'circle', r: 13}, {at: 'arms.near.H', type: 'arrow', dx: -20, dy: -18}],
    fix: '重新安排大臂和上举终点，在仍能保持三头肌张力的位置停住，保留舒适肘弯，不硬顶到完全伸直。'}
};
