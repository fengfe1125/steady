// Shoulder points trace a small loop, then elbows bend and wrists move gently. No forced end ranges.
export default {
  id: 'arms-extra-warmup-mobility', title: '肩、肘和手腕活动', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  hands: {near: 'open', far: 'open'},
  poses: {
    base: {neck: -14, arms: {near: {sh: 4, el: 14, wr: 0}, far: {sh: 4, el: 14, wr: 0}},
      legs: {near: {hip: 0, knee: 4, ankle: null}, far: {hip: 0, knee: 4, ankle: null}}},
    start: {act: .35}, shoulderUp: {act: .5, scapE: 2, scapP: -1}, shoulderBack: {act: .5, scapE: 0, scapP: -3},
    shoulderDown: {act: .5, scapE: -1, scapP: -1}, shoulderReady: {act: .4, scapE: 0, scapP: 0},
    elbow: {act: .65, arms: {near: {el: 72}, far: {el: 72}}},
    peak: {act: .7, arms: {near: {el: 72, wr: 20}, far: {el: 72, wr: 20}}},
    shoulderReturn: {act: .4, scapE: 2, scapP: -1}
  },
  track: {keys: [{t: 0, pose: 'start'}, {t: 600, pose: 'start'}, {t: 850, pose: 'shoulderUp'}, {t: 1100, pose: 'shoulderBack'},
    {t: 1300, pose: 'shoulderDown'}, {t: 1500, pose: 'shoulderReady'}, {t: 2000, pose: 'elbow'}, {t: 2800, pose: 'peak'},
    {t: 3300, pose: 'peak'}, {t: 4200, pose: 'elbow'}, {t: 4750, pose: 'shoulderReturn'}, {t: 5700, pose: 'start'}]},
  camera: {b: 72}, muscles: {primary: ['biceps'], secondary: ['deltoid', 'brachioradialis']},
  labels: [{muscle: 'biceps@near', at: 'tr', text: '上肢关节活动', sub: '轻柔活动，不追求疲劳'}, {muscle: 'brachioradialis@near', at: 'tl'}],
  guide: {joint: 'arms.near.H', pivot: 'arms.near.E', push: 16, a: 'start', b: 'elbow'},
  detail: {pose: 'peak', ghost: 'start',
    arrows: [{joint: 'arms.near.H', pivot: 'arms.near.E', push: 18, a: 'start', b: 'elbow'},
      {joint: 'arms.near.H', pivot: 'arms.near.W', push: 8, a: 'elbow', b: 'peak'}],
    labels: [{muscle: 'biceps@near', at: 'tr', sub: '小幅屈肘'}, {muscle: 'deltoid@near', at: 'tl', sub: '肩部轻度参与'}],
    callouts: [{n: 1, at: 'shoulder', text: '肩点小圈，保持放松', dx: -20, dy: -20},
      {n: 2, at: 'arms.near.E', text: '空手屈伸，肘位稳定', dx: -20, dy: 8},
      {n: 3, at: 'arms.near.W', text: '手腕轻柔活动', dx: 20, dy: -8}], legend: 'bl'},
  mistake: {good: 'peak', goodText: '小幅、慢速活动', text: '耸肩、手腕过度弯曲',
    pose: {scapE: 10, arms: {near: {wr: 65}, far: {wr: 65}}},
    camera: {focus: 'upper', b: 32}, muscles: {primary: ['trap.upper'], secondary: ['brachioradialis']},
    marks: [{at: 'shoulder', type: 'circle', r: 14}, {at: 'arms.near.W', type: 'circle', r: 12}],
    fix: '肩部放松，减小手腕幅度，不甩动或强压关节；若出现疼痛或麻木就停止。'}
};
