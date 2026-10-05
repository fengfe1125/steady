import {cycle, timing, seated, hands, V, arc, activation, pin, drops} from './_shared/library.mjs';
const pivot = V(180, -10), radius = 130;
const pose = p => {
  const plate = arc(pivot, radius, 209 - 29 * p), ankle = {...plate, x: plate.x - 14, foot: 90};
  return hands({...seated({y: -87, pelvis: -22, ik: {ankle: {near: ankle, far: ankle}}}), ...activation(p)}, {near: V(16, -77), far: V(10, -81)});
};
const good = pose(1), bad = structuredClone(good);
bad.ik.ankle.near.foot = 75; bad.ik.ankle.far.foot = 75;
bad.ik.ankle.near.x -= 9.875723; bad.ik.ankle.far.x -= 9.875723;
bad.eq.heelLift = 1;
export default {
  id: 'seated-leg-press', resource: 'LegPressArtwork.html', title: '坐姿腿举', view: 'side', dropManifestKeys: drops,
  ...cycle(pose, timing({effortStart: 700})),
  equipment: [{type: 'library_legPress', pivot, radius}],
  muscles: {primary: ['quads', 'glute.max'], secondary: ['hamstrings']},
  labels: [{muscle: 'quads.rf@near', at: 'tr'}, {muscle: 'glute.max', at: 'tl'}],
  guide: {joint: 'legs.near.sole', offset: [0, -52]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'quads.rf@near', at: 'tr'}, {muscle: 'glute.max', at: 'tl'}],
    callouts: [pin(1, 'legs.near.heel', '整脚贴板，脚跟不抬', -22, 18), pin(2, 'legs.near.K', '膝盖随脚尖，不锁死', 10, -24), pin(3, 'hip', '背臀贴靠，手轻握', -26, -18)]},
  mistake: {good: 'peak', pose: bad, goodText: '脚跟与前脚掌贴板', text: '脚跟抬起，只蹬前掌', fix: '减小幅度，整个脚底重新贴稳踏板。',
    camera: {focus: ['hip', 'legs.near.K', 'legs.near.sole', 'legs.near.heel', 'legs.near.toe'], side: 22},
    muscles: {primary: ['gastrocnemius'], secondary: ['quads']}, marks: [{at: 'legs.near.heel', type: 'circle', r: 17}]},
  machineReference: 'Precor Vitality VSL010BP',
  sourceURLs: ['https://static.precor.com/sell-sheet/all/VSL/VSL010BP-Leg-Press-Calf-Extension-NA.pdf']
};
