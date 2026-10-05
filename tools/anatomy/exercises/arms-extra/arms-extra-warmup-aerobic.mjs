// Supplemental marching. Keys match the original 11 native steps and four alternating foot lifts.
const stand = {act: .35};
const lift = near => ({act: .68,
  legs: {[near ? 'near' : 'far']: {hip: 30, knee: 48}, [near ? 'far' : 'near']: {hip: 0, knee: 0}},
  arms: {[near ? 'far' : 'near']: {sh: 22, el: 26}, [near ? 'near' : 'far']: {sh: -10, el: 20}}});
export default {motionGuide: false, 
  id: 'arms-extra-warmup-aerobic', title: '轻踏步有氧升温', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  hands: {near: 'open', far: 'open'},
  poses: {base: {neck: -14, arms: {near: {sh: 4, el: 18}, far: {sh: 4, el: 18}},
    legs: {near: {hip: 0, knee: 0, ankle: null}, far: {hip: 0, knee: 0, ankle: null}}}, stand, liftN: lift(true), liftF: lift(false)},
  track: {keys: [{t: 0, pose: 'stand'}, {t: 500, pose: 'stand'}, {t: 1100, pose: 'liftN'}, {t: 1700, pose: 'stand'},
    {t: 2000, pose: 'stand'}, {t: 2600, pose: 'liftF'}, {t: 3200, pose: 'stand'}, {t: 3800, pose: 'liftN'},
    {t: 4400, pose: 'stand'}, {t: 5000, pose: 'liftF'}, {t: 5600, pose: 'stand'}, {t: 5900, pose: 'stand'}]},
  camera: {b: 72}, muscles: {primary: ['iliopsoas'], secondary: ['quads.rf', 'tibialis', 'gastrocnemius']},
  labels: [{muscle: 'iliopsoas', at: 'tr', text: '轻踏步升温', sub: '髋屈肌抬腿；腿部轻度参与'}, {muscle: 'tibialis@near', at: 'tl'}],
  guides: [{joint: 'legs.near.A', a: 'stand', b: 'liftN', offset: [20, 0]}, {joint: 'legs.far.A', a: 'stand', b: 'liftF', offset: [-20, 0]}],
  detail: {pose: 'liftN', ghost: 'stand',
    arrows: [{joint: 'legs.near.A', a: 'stand', b: 'liftN', offset: [22, 0]}, {joint: 'arms.far.H', a: 'stand', b: 'liftN', offset: [16, 0]}],
    labels: [{muscle: 'iliopsoas', at: 'tr', text: '髋屈肌轻度参与', sub: '本课用于升温'}, {muscle: 'tibialis@near', at: 'tl'}],
    callouts: [{n: 1, at: 'shoulder', text: '肩放松，视线平', dx: -18, dy: -22},
      {n: 2, at: 'legs.near.K', text: '小幅抬脚，轻轻落地', dx: 22},
      {n: 3, at: 'legs.far.A', text: '换边前支撑脚踩稳', dx: -18, dy: -6}], legend: 'bl'},
  mistake: {good: 'liftN', goodText: '肩放松，自然轻摆', text: '耸肩、猛甩手臂',
    pose: {scapE: 10, arms: {near: {sh: -48, el: 8}, far: {sh: 76, el: 8}}},
    camera: {focus: 'upper', b: 32}, muscles: {primary: ['trap.upper'], secondary: ['iliopsoas']},
    marks: [{at: 'shoulder', type: 'circle', r: 14}, {at: 'arms.far.H', type: 'arrow', dx: -24, dy: 18}],
    fix: '放松肩膀，让手臂自然轻摆；保持轻松能说话的强度，脚轻抬轻落。'}
};
