// 轻松踏步升温 · side view. Marching in place; cadence rises in step 2 and settles in step 4.
const stand = {act: 0.5};
const lift = (near, h) => ({act: 0.7,
  legs: {[near ? 'near' : 'far']: {hip: 38 * h, knee: 58 * h}, [near ? 'far' : 'near']: {hip: 0, knee: 4}},
  arms: {[near ? 'far' : 'near']: {sh: 24 * h, el: 34}, [near ? 'near' : 'far']: {sh: -16 * h, el: 24}}});
export default {motionGuide: false, 
  id: 'shoulders-light-warmup', title: '轻松踏步升温', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {arms: {near: {sh: 4, el: 14}, far: {sh: 4, el: 14}}},
    stand, liftN: lift(true, 0.8), liftF: lift(false, 0.8), liftN2: lift(true, 1), liftF2: lift(false, 1), liftNs: lift(true, 0.5)
  },
  track: {keys: [
    {t: 0, pose: 'stand'}, {t: 300, pose: 'liftN'}, {t: 600, pose: 'stand'}, {t: 950, pose: 'liftF2'}, {t: 1300, pose: 'stand'},
    {t: 1650, pose: 'liftN2'}, {t: 2000, pose: 'stand'}, {t: 2400, pose: 'liftF2'}, {t: 2800, pose: 'stand'}, {t: 3050, pose: 'liftN'},
    {t: 3300, pose: 'stand'}, {t: 3800, pose: 'liftF'}, {t: 4300, pose: 'stand'}, {t: 4900, pose: 'liftNs'}, {t: 5500, pose: 'stand'}]},
  muscles: {secondary: ['iliopsoas', 'quads.rf', 'gastrocnemius']},
  labels: [{muscle: 'quads.rf@near', at: 'tr', text: '全身升温', sub: '髋屈肌、小腿轻度参与'}],
  guide: {joint: 'legs.near.A', a: 'stand', b: 'liftN2', offset: [22, 0]},
  detail: {pose: 'liftN2', ghost: 'stand',
    callouts: [{n: 1, at: 'shoulder', text: '肩膀放松', dx: -14, dy: -26}, {n: 2, at: 'arms.far.H', text: '手臂随脚步自然摆', dy: -16},
      {n: 3, at: 'legs.near.A', text: '小步、轻落地', dx: 18, dy: 8}], legend: 'bl'},
  mistake: {fix: '放松肩部，让双臂随脚步自然轻摆。', camera: {}, text: '耸肩、猛甩手', goodText: '肩放松，自然轻摆', good: 'liftN2',
    pose: {scapE: 9, arms: {far: {sh: 80, el: 20}, near: {sh: -55, el: 10}}},
    marks: [{at: 'shoulder', type: 'circle', r: 16}, {at: 'arms.far.H', type: 'arrow', dx: -24, dy: 22}],
    muscles: {primary: ['trap.upper'], secondary: ['iliopsoas']}}
};
