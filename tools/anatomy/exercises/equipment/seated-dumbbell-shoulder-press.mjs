import {cycle, timing, seated, hands, V, activation, pin, drops} from './_shared/library.mjs';
const target = p => ({near: V(56 - 16 * p, -226 - 100 * p), far: V(26 - 14 * p, -231 - 98 * p)});
const pose = (p, bad = false) => hands({...seated(), ...(bad ? {x: 14, lumbar: -18, thorax: 7} : {}), ...activation(p)}, target(p));
export default {
  id: 'seated-dumbbell-shoulder-press', resource: 'DumbbellShoulderPressArtwork.html', title: '坐姿哑铃推肩', view: 'side', dropManifestKeys: drops,
  ...cycle(p => pose(p), timing()),
  equipment: [{type: 'library_dumbbellBench'}, {type: 'library_dumbbell', hand: 'far', axis: 'z'}, {type: 'library_dumbbell', hand: 'near', axis: 'z'}],
  muscles: {primary: ['deltoid.ant', 'deltoid.lat'], secondary: ['triceps', 'serratus']},
  labels: [{muscle: 'deltoid.ant@near', at: 'tr'}, {muscle: 'triceps.long@near', at: 'tl'}],
  guide: {joint: 'arms.near.H', offset: [18, 0]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'deltoid.ant@near', at: 'tr'}, {muscle: 'triceps.long@near', at: 'tl'}],
    callouts: [pin(1, 'arms.near.H', '环握中间手柄', 12, -20), pin(2, 'arms.near.W', '手腕顺直，前臂承托', -25, 2), pin(3, 'N.1', '背臀贴靠，双脚踩稳', -28, -4)]},
  mistake: {good: 'peak', pose: pose(1, true), goodText: '背臀贴靠，平稳上推', text: '拱腰离开靠背', fix: '减轻重量，背臀贴靠，在能稳住腰背的范围推举。',
    camera: {focus: ['headTop', 'shoulder', 'hip', 'N.1', 'arms.near.H'], side: 26},
    muscles: {primary: ['erectors'], secondary: ['deltoid.ant', 'triceps']}, marks: [{at: 'N.1', type: 'circle', r: 18}]},
  sourceURLs: ['https://www.acefitness.org/resources/everyone/exercise-library/45/seated-overhead-press/']
};
