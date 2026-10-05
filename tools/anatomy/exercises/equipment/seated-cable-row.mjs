import {cycle, timing, hands, V, activation, pin, drops} from './_shared/library.mjs';
const base = {y: -126, pelvis: 0, legs: {near: {hip: 69, knee: 31, ankle: -26}, far: {hip: 69, knee: 31, ankle: -26}}};
const targets = p => ({near: V(112 - 82 * p, -190 + 14 * p), far: V(106 - 82 * p, -194 + 14 * p)});
const pose = p => hands({...base, ...activation(p)}, targets(p));
const bad = hands({...base, pelvis: -8, lumbar: -16, thorax: -8, ...activation(1)}, targets(1));
export default {motionGuide: false, 
  id: 'seated-cable-row', resource: 'CableRowArtwork.html', title: '坐姿划船', view: 'side', dropManifestKeys: drops,
  ...cycle(pose, timing({effortEnd: 2700, returnStart: 3200})),
  equipment: [{type: 'library_cableRow'}],
  muscles: {primary: ['lats', 'trap.mid'], secondary: ['rhomboid', 'biceps', 'deltoid.post']},
  labels: [{muscle: 'lats', at: 'tl'}, {muscle: 'trap.mid', at: 'tr'}],
  guide: {joint: 'arms.near.H', offset: [0, -22]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'lats', at: 'tl'}, {muscle: 'biceps@near', at: 'tr'}],
    callouts: [pin(1, 'arms.near.H', '掌心相对，环握两侧', 18, -20), pin(2, 'arms.near.W', '手腕不折', -22, -18), pin(3, 'legs.near.sole', '钢索居中，脚踩脚踏', 20, 6)]},
  mistake: {good: 'peak', pose: bad, goodText: '上身稳，肘向后', text: '大幅后仰借力', fix: '减轻阻力，稳住腰背；让肘向后带动握把。',
    camera: {focus: ['headTop', 'shoulder', 'hip', 'arms.near.H', 'legs.near.K'], side: 24},
    muscles: {primary: ['erectors'], secondary: ['lats', 'biceps']}, marks: [{at: 'N.1', type: 'circle', r: 19}, {at: 'N.3', type: 'arrow', dx: 28, dy: -12}]},
  machineReference: 'Precor Vitality VSL026BP',
  sourceURLs: ['https://static.precor.com/sell-sheet/all/VSL/VSL026BP-Pulldown-Seated-Row-CHS.pdf']
};
