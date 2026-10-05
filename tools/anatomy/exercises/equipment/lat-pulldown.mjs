import {cycle, timing, seated, hands, V, activation, pin, drops} from './_shared/library.mjs';
const targets = p => ({near: V(40 - 7 * p, -332 + 109 * p), far: V(29 - 7 * p, -335 + 109 * p)});
const pose = p => hands({...seated(), ...activation(p)}, targets(p));
const bad = hands({...seated(), ...activation(1), eq: {phase: 1, behindNeck: 1}}, {near: V(-34, -251), far: V(-40, -255)});
export default {
  id: 'lat-pulldown', resource: 'LatPulldownArtwork.html', title: '高位下拉', view: 'side', dropManifestKeys: drops,
  ...cycle(pose, timing({effortEnd: 2600, returnStart: 3100})),
  equipment: [{type: 'library_pulldown'}],
  muscles: {primary: ['lats'], secondary: ['biceps', 'trap.lower']},
  labels: [{muscle: 'lats', at: 'tl'}, {muscle: 'biceps@near', at: 'tr'}],
  guide: {joint: 'arms.near.H', offset: [20, 0]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'lats', at: 'tl'}, {muscle: 'biceps@near', at: 'tr'}],
    callouts: [pin(1, 'arms.near.H', '正握，四指包住', 20, -16), pin(2, 'arms.far.H', '拇指绕另一侧', -22, -16), pin(3, 'legs.near.K', '压腿垫贴大腿', 18, -18)]},
  mistake: {good: 'peak', pose: bad, goodText: '横杆下拉到前胸', text: '横杆拉到颈后', fix: '横杆保持在头前；下拉到前胸，肩膀远离耳朵。',
    camera: {focus: ['headTop', 'headPivot', 'shoulder', 'arms.near.H', 'arms.near.E', 'hip'], side: 24},
    muscles: {primary: ['trap.upper'], secondary: ['lats', 'biceps']}, marks: [{at: 'N.4', type: 'circle', r: 19}, {at: 'arms.near.H', type: 'x'}]},
  machineReference: 'Precor Vitality VSL026BP',
  sourceURLs: ['https://static.precor.com/sell-sheet/all/VSL/VSL026BP-Pulldown-Seated-Row-CHS.pdf']
};
