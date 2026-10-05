import {cycle, timing, seated, hands, arc, V, activation, pin, drops} from './_shared/library.mjs';
const pivot = V(-48, -272), radius = 100;
const target = p => arc(pivot, radius, 66 + 62 * p);
const pose = p => hands({...seated(), ...activation(p)}, {near: target(p), far: target(p)});
const bad = hands({...seated({x: 20, lumbar: -18, thorax: 7}), ...activation(1)}, {near: target(1), far: target(1)});
export default {
  id: 'seated-shoulder-press', resource: 'ShoulderPressArtwork.html', title: '坐姿器械推肩', view: 'side', dropManifestKeys: drops,
  ...cycle(pose, timing()),
  equipment: [{type: 'library_shoulderPress', pivot, radius}],
  muscles: {primary: ['deltoid.ant', 'deltoid.lat'], secondary: ['triceps', 'serratus']},
  labels: [{muscle: 'deltoid.ant@near', at: 'tr'}, {muscle: 'triceps.long@near', at: 'tl'}],
  guide: {joint: 'arms.near.H', offset: [18, 0]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'deltoid.ant@near', at: 'tr'}, {muscle: 'triceps.long@near', at: 'tl'}],
    callouts: [pin(1, 'arms.near.H', '四指与拇指环抱', 10, -18), pin(2, 'arms.near.W', '手腕顺直，前臂承托', -24, 0), pin(3, 'N.1', '调座高，背脚稳住', -24, -8)]},
  mistake: {good: 'peak', pose: bad, goodText: '腰背自然，背臀贴靠', text: '拱腰离开靠背', fix: '减轻阻力，背臀贴靠；在能稳住腰背的范围推举。',
    camera: {focus: ['headTop', 'shoulder', 'N.1', 'hip', 'arms.near.H'], side: 25},
    muscles: {primary: ['erectors'], secondary: ['deltoid.ant', 'triceps']}, marks: [{at: 'N.1', type: 'circle', r: 18}]},
  machineReference: 'Precor Vitality VSL012BP',
  sourceURLs: ['https://static.precor.com/sell-sheet/all/VSL/VSL012BP-Shoulder-Press-NA.pdf']
};
