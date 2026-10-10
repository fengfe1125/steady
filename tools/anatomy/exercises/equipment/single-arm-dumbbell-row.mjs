import {cycle, timing, hands, joints, V, add, activation, pin, drops} from './_shared/library.mjs';
const body = {x: -50, y: -165, pelvis: 84, lumbar: 2, neck: -10,
  legs: {far: {hip: 84, knee: 90, ankle: 30}}, ik: {ankle: {near: {x: -25, y: -14, foot: 0}}}};
const S = joints(body).shoulder;
const pose = (p, bad = false) => hands({...body, ...(bad ? {scapE: 8, lumbar: -8, thorax: 3} : {}), ...activation(p)},
  {near: add(S, V(14 - 60 * p, 119 - 71 * p)), far: V(S.x, -73)});
export default {motionGuide: false, 
  id: 'single-arm-dumbbell-row', resource: 'DumbbellRowArtwork.html', title: '单臂哑铃划船', view: 'side', hands: {far: 'open'}, dropManifestKeys: drops,
  ...cycle(p => pose(p), timing()),
  equipment: [{type: 'library_rowBench', x: -152, top: -64, length: 245}, {type: 'library_dumbbell', hand: 'near', axis: 'x'}],
  muscles: {primary: ['lats@near'], secondary: ['rhomboid', 'trap.mid', 'biceps@near', 'deltoid.post@near']},
  labels: [{muscle: 'lats', at: 'tl'}, {muscle: 'biceps@near', at: 'tr'}],
  guide: {joint: 'arms.near.H', offset: [14, 0]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'lats', at: 'tl'}, {muscle: 'biceps@near', at: 'tr'}],
    callouts: [pin(1, 'arms.near.H', '环握中柄，掌心向身体', 18, 12), pin(2, 'arms.near.W', '手腕顺直，肘向髋后', 16, -18), pin(3, 'arms.far.H', '同侧手膝撑凳，右脚踩地', 18, 8)]},
  mistake: {good: 'peak', pose: pose(1, true), goodText: '背髋稳，肘靠近身体', text: '耸肩，挺腰甩起来', fix: '减轻重量，稳住支撑手和膝，让肘向后，背髋不跟着晃。',
    camera: {focus: ['headTop', 'shoulder', 'hip', 'arms.near.H', 'arms.far.H', 'legs.far.K'], side: 26},
    muscles: {primary: ['trap.upper', 'erectors'], secondary: ['lats@near']}, marks: [{at: 'shoulder', type: 'circle', r: 18}, {at: 'N.1', type: 'circle', r: 18}]},
  sourceURLs: ['https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/']
};
