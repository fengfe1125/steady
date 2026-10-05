// Side view on the mat, like the plain crunch, so it reads as lying down. The target side faces
// the viewer: that shoulder lifts a little further off the mat and its obliques carry the colour.
// (The earlier overhead projection looked like a person standing in a box.)
import {supine, headHands, mat} from './_shared/poses.mjs';
const start = headHands(supine({lumbar: 3, thorax: 2, act: .3}));
const peak = headHands(supine({lumbar: 18, thorax: 13, neck: -14, head: 0, scapP: 7, scapE: 3, act: 1}));
const bad = headHands(supine({lumbar: 26, thorax: 16, neck: -4, scapP: 16, scapE: 6, pelvis: -82, act: 1}));
export default {motionGuide: false, id: 'abs-side-biased-crunch', title: '单侧偏向卷腹', view: 'side', hands: {near: 'open', far: 'open'},
  poses: {start, peak}, equipment: [mat],
  muscles: {primary: ['obliques', 'abs']},
  camera: {t: 95, b: 90, side: 14, max: 1.04},
  guide: {joint: 'shoulder', offset: [0, -18]},
  detail: {pose: 'peak', ghost: 'start',
    callouts: [{n: 1, at: 'shoulder', text: '近侧肩背多抬离垫一点，轻向一侧', dx: 4, dy: -26},
      {n: 2, at: 'hip', text: '骨盆留垫，不跟着翻转', dx: 0, dy: 22},
      {n: 3, at: 'legs.near.A', text: '屈膝、双脚踩稳', dx: 16, dy: 12}]},
  mistake: {good: 'peak', goodText: '短程卷起，轻微偏向', text: '侧偏过大，靠扭身完成',
    fix: '先回到仰卧支撑，减小偏向和卷起幅度；脚和骨盆保持原位。', pose: bad,
    camera: {focus: ['headTop', 'arms.near.H', 'arms.near.E', 'N.2', 'hip', 'legs.near.K'], t: 90, b: 24},
    marks: [{at: 'shoulder', type: 'arrow', dx: -6, dy: -26}, {at: 'hip', r: 16}], muscles: {primary: ['obliques'], secondary: ['abs']}},
  detailExplanation: '图中编号\n① 近侧肩背短程抬离垫，胸廓轻向目标侧\n② 骨盆留在垫上，不跟着翻转\n③ 屈膝、双脚踩稳\n\n侧视图：靠近你的一侧为示范目标侧。抬肩时这一侧比普通卷腹多抬起一点，双脚与骨盆的位置不变。\n红色 · 主要发力：目标侧腹外斜肌、腹直肌\n虚线人形：仰卧起始姿势。换侧时镜像练习。',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection']};
