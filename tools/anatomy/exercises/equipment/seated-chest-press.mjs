import {cycle, timing, seated, hands, arc, V, activation, pin, drops} from './_shared/library.mjs';
const pivot = V(-2, -33), radius = 179;
const target = p => arc(pivot, radius, 165 - 19.5 * p);
const pose = p => hands({...seated(), ...activation(p)}, {near: target(p), far: target(p)});
const bad = hands({...seated(), ...activation(1)}, {near: {...target(1), wr: -28}, far: {...target(1), wr: -28}});
export default {motionGuide: false, 
  id: 'seated-chest-press', resource: 'ChestPressArtwork.html', title: '坐姿推胸', view: 'side', dropManifestKeys: drops,
  ...cycle(pose, timing()),
  equipment: [{type: 'library_chestPress', pivot, radius, seat: -108, back: -6}],
  muscles: {primary: ['pec'], secondary: ['deltoid.ant', 'triceps']},
  labels: [{muscle: 'pec.lower', at: 'tr'}, {muscle: 'triceps.long@near', at: 'tl'}],
  guide: {joint: 'arms.near.H', offset: [15, 0]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'pec.lower', at: 'tr'}, {muscle: 'deltoid.ant@near', at: 'tl'}],
    callouts: [pin(1, 'arms.near.H', '四指绕握把', 20, -10), pin(2, 'arms.far.H', '拇指也环抱', 20, 14), pin(3, 'arms.near.W', '手腕顺直', -10, -24)]},
  mistake: {good: 'peak', pose: bad, goodText: '手腕与前臂顺直', text: '折腕推，握把压手腕', fix: '重新环握，手腕顺直；减轻阻力再推。',
    camera: {focus: ['headTop', 'shoulder', 'arms.near.E', 'arms.near.H', 'hip'], side: 26},
    muscles: {primary: ['forearm.ext'], secondary: ['pec', 'deltoid.ant']}, marks: [{at: 'arms.near.W', type: 'circle', r: 17}]},
  machineReference: 'Precor Vitality VSL001BP',
  sourceURLs: ['https://static.precor.com/sell-sheet/all/VSL/VSL001BP-Chest-Press-NA.pdf']
};
