// TRX 屈肘 W 字保持 · side view. A hold: upper arms open to the sides (foreshortened toward the viewer),
// elbows ~90°, forearms up beside the head. Step 4 moves the feet forward to make the hold harder.
import {leanBack} from '../_lib.mjs';
const lean = (deg, footX) => leanBack(deg, footX);
const W = {near: {sh: 88, el: 92, f: 0.3}, far: {sh: 88, el: 92, f: 0.3}};
const held = Object.assign(lean(22, 0), {act: 0.95, arms: W, eq: {suspensionDepth: 64 * Math.sqrt(1 - 0.3 ** 2)}});
export default {
  id: 'shoulders-trx-w', title: 'TRX 屈肘 W 字保持', view: 'side',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    ready: Object.assign(lean(10, 0), {act: 0.35, arms: {near: {sh: 78, el: 20}, far: {sh: 78, el: 20}}}),
    w: held,
    start: held,
    peak: held
  },
  equipment: [{type: 'shoulders_trx', anchor: {x: 21.939861997002605, y: -415}}],
  muscles: {primary: ['deltoid.post', 'trap.mid'], secondary: ['rhomboid']},
  labels: [{muscle: 'deltoid.post', at: 'tr'}, {muscle: 'trap.mid', at: 'tl'}],
  detail: {pose: 'w', ghost: 'ready',
    arrows: [{joint: 'arms.near.H', a: 'ready', b: 'w', offset: [12, 0]}],
    callouts: [{n: 1, at: 'arms.near.E', text: '上臂展开，屈肘约直角', dx: 16, dy: 6}, {n: 2, at: 'arms.near.H', text: '前臂朝上，手在头两侧', dy: -14},
      {n: 3, at: 'N.1', text: '腰背稳定', dx: -30}], legend: 'bl'},
  mistake: {fix: '先把站位调得容易一些，让腰背稳定后再保持姿势。', camera: {withEquipment: true}, good: 'w', text: '塌腰或后仰脊柱', goodText: '腰背稳定保持 W',
    pose: {lumbar: -16, thorax: 16,
      arms: {near: {sh: 95.50712001102985, el: 73.91890915163634}, far: {sh: 95.50712001102985, el: 73.91890915163634}}},
    marks: [{at: 'N.1', type: 'circle', r: 18}],
    muscles: {primary: ['erectors'], secondary: ['deltoid.post']}}
};
