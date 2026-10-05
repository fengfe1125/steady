// TRX Y 字抬臂激活 · side view. Feet stay planted; the straight body pivots at the ankles from a lean-back
// with bent elbows to a more upright Y with nearly straight arms.
import {leanBack} from '../_lib.mjs';
import suspension from './_suspension.cjs';
const lean = deg => leanBack(deg);
const anchor = {x: 21.939861997002605, y: -415}, length = 145.9651578436764;
const at = p => suspension.closeY(Object.assign(lean(30 - 17 * p), {act: 0.3 + 0.7 * p,
  arms: {near: {sh: 74 + 84 * p, el: 92 - 84 * p}, far: {sh: 74 + 84 * p, el: 92 - 84 * p}}}), anchor, length);
const effort = t => t < 600 || t >= 5700 ? 0 : t < 2800 ? (1 - Math.cos(Math.PI * (t - 600) / 2200)) / 2 :
  t < 3300 ? 1 : (1 + Math.cos(Math.PI * (t - 3300) / 2400)) / 2;
const poses = {start: at(0), peak: at(1)}, keys = [];
for (let t = 0; t < 6000; t += 50) { const name = 'frame' + t; poses[name] = at(effort(t)); keys.push({t, pose: name}); }
export default {motionGuide: false, 
  id: 'shoulders-trx-y', title: 'TRX Y 字抬臂激活', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses, track: {keys},
  equipment: [{type: 'shoulders_trx', anchor, length}],
  muscles: {primary: ['trap.lower', 'deltoid.post'], secondary: ['rhomboid']},
  labels: [{muscle: 'trap.lower', at: 'tl'}, {muscle: 'deltoid.post', at: 'tr'}],
  guide: {joint: 'arms.near.H', offset: [0, 0]},
  detail: {pose: 'peak', ghost: 'start',
    callouts: [{n: 1, at: 'arms.near.E', text: '展开到 Y，肘接近伸直', dy: -16}, {n: 2, at: 'N.1', text: '躯干收稳，不塌腰', dx: -30},
      {n: 3, at: 'legs.near.A', text: '双脚稳定，身体随拉起变直立', dx: 26, dy: -8}], legend: 'bl'},
  mistake: {fix: '收稳躯干，先把站位调得容易一些。', camera: {withEquipment: true}, text: '塌腰后仰', goodText: '躯干收稳成一条线',
    pose: {lumbar: -12, thorax: 12,
      arms: {near: {sh: 129.96946527589833, el: 54.12258765317677, f: 0.65, ff: 0.65},
        far: {sh: 129.96946527589833, el: 54.12258765317677, f: 0.65, ff: 0.65}}},
    marks: [{at: 'N.1', type: 'circle', r: 18}],
    muscles: {primary: ['erectors'], secondary: ['trap.lower']}}
};
