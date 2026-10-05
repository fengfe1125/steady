// 俯卧肩胛抬臂 · side view. Prone with a foam roller under the chest; arms open to the sides with bent
// elbows, forearms along the mat. Only the arms and shoulder blades lift a little — the trunk stays put.
const R = Math.PI / 180, tilt = 13, hipY = -37, hipX = -150;
const rollerX = hipX + 94 * Math.cos(tilt * R) + 38.5 * Math.sin(tilt * R);
export default {motionGuide: false, 
  id: 'shoulders-prone-scapular-lift', title: '俯卧肩胛抬臂', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  hands: {near: 'open', far: 'open'},
  poses: {
    base: {x: hipX, y: hipY, pelvis: 90 - tilt, neck: 4, head: 6,
      ik: {ankle: {near: {x: hipX - 172, y: -16, foot: -147}, far: {x: hipX - 172, y: -16, foot: -147}}}},
    start: {act: 0.25, arms: {near: {sh: 77, el: 90, f: 0.7}, far: {sh: 77, el: 90, f: 0.7}}},
    peak: {act: 1, arms: {near: {sh: 77, el: 84, f: 0.42}, far: {sh: 77, el: 84, f: 0.42}}}
  },
  equipment: [{type: 'mat', x: hipX - 225, length: 435}, {type: 'shoulders_roller', x: rollerX, y: -20, r: 15}],
  muscles: {primary: ['trap.mid', 'trap.lower'], secondary: ['rhomboid', 'deltoid.post']},
  labels: [{muscle: 'trap.mid', at: 'tl'}, {muscle: 'deltoid.post@near', at: 'tr'}],
  guide: {joint: 'arms.near.E', offset: [0, -14]},
  detail: {pose: 'peak', ghost: 'start',
    callouts: [{n: 1, at: 'arms.near.E', text: '肘和手小幅离地', dy: -18}, {n: 2, at: 'N.2', text: '胸腹有支撑，躯干不动', dy: -22},
      {n: 3, at: 'N.4', text: '头颈自然', dx: 10, dy: -20}], legend: 'tl'},
  mistake: {fix: '减少抬臂幅度，让胸腹继续有支撑。', camera: {focus: 'trunk'}, text: '抬手时大幅挺腰', goodText: '只动肩部，躯干不动',
    pose: {lumbar: -16, thorax: -12, neck: -14},
    marks: [{at: 'N.1', type: 'circle', r: 16}, {at: 'N.4', type: 'arrow', dx: -6, dy: -26}],
    muscles: {primary: ['erectors'], secondary: ['trap.mid']}}
};
