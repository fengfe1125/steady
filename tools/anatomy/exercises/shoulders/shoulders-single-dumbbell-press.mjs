// 单侧起铃与推肩 · front view, 8 s. The bell rests on the thigh near the knee, the same-side leg helps
// bring it to the shoulder, one controlled press, then back to the shoulder and down onto the thigh.
import {frontArm} from '../_lib.mjs';
const pelvis = {x: 0, y: -126};
// Keep the elbow bend on the same branch as the lift/press so the return does not pass
// through a straight lateral raise. The hand still lands on the same thigh point.
const onThigh = frontArm('r', {x: 34, y: -112}, pelvis, {bend: 1});
const restL = frontArm('l', {x: -32, y: -114}, pelvis, {bend: -1});
export default {
  id: 'shoulders-single-dumbbell-press', title: '单侧起铃与推肩', view: 'front',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  hands: {l: 'open'},
  poses: {
    base: {y: pelvis.y, legs: {r: {abd: 14, f: 0.28, knee: 14}, l: {abd: 14, f: 0.28, knee: 14}}, arms: {l: restL}},
    thigh: {act: 0.2, arms: {r: onThigh}},
    lift: {act: 0.45, legs: {r: {abd: 12, f: 0.12, knee: 12}}, arms: {r: {abd: 60, el: 104}}},
    shoulder: {act: 0.5, arms: {r: {abd: 82, el: 100}}},
    top: {act: 1, scapE: {r: 3}, arms: {r: {abd: 156, el: 22}}},
    start: {act: 0.5, arms: {r: {abd: 82, el: 100}}},
    peak: {act: 1, scapE: {r: 3}, arms: {r: {abd: 156, el: 22}}}
  },
  track: {keys: [{t: 0, pose: 'thigh'}, {t: 640, pose: 'thigh'}, {t: 1300, pose: 'lift'}, {t: 1920, pose: 'shoulder'},
    {t: 2500, pose: 'shoulder'}, {t: 3700, pose: 'top'}, {t: 4400, pose: 'top'}, {t: 5760, pose: 'shoulder'},
    {t: 6900, pose: 'thigh'}, {t: 7700, pose: 'thigh'}]},
  equipment: [{type: 'benchFront', top: -104, back: {top: -242, width: 58}}, {type: 'dumbbell', hand: 'r', axis: 'x'}],
  muscles: {primary: ['deltoid.ant@r', 'deltoid.lat@r'], secondary: ['triceps@r', 'obliques@l']},
  labels: [{muscle: 'deltoid.lat@r', at: 'tr'}, {muscle: 'obliques@l', at: 'tl'}],
  guide: {joint: 'arms.r.H', a: 'shoulder', b: 'top', offset: [18, 0]},
  detail: {pose: 'top', ghost: 'shoulder',
    callouts: [{n: 1, at: 'legs.r.K', text: '铃放同侧大腿近膝', dx: 18, dy: 8}, {n: 2, at: 'arms.r.E', text: '到肩旁先稳住再推', dx: 16},
      {n: 3, at: 'pelvis', text: '躯干不扭转、不侧倒', dy: -40}], legend: 'bl'},
  mistake: {fix: '铃到肩旁后先稳住身体，再控制推举；必要时减轻重量。', camera: {focus: 'upper'}, good: 'top', text: '身体随重量侧倒', goodText: '躯干稳定，只推这一侧',
    pose: {lean: -9},
    marks: [{at: 'neck', type: 'arrow', dx: 34, dy: -6}, {at: 'pelvis', type: 'circle', r: 18}],
    muscles: {primary: ['deltoid.lat@r'], secondary: ['obliques@r']}}
};
