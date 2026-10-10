import {cycle, timing, hands, V, activation, pin, drops} from './_shared/library.mjs';
const pose = p => hands({y: -132, pelvis: -6, legs: {near: {hip: 84, knee: 90 - 76 * p, ankle: 8}, far: {hip: 84, knee: 90 - 76 * p, ankle: 8}}, ...activation(p)},
  {near: V(20, -125), far: V(14, -129)});
const bad = pose(1); bad.legs.near.ankle = -12; bad.legs.far.ankle = -12; bad.eq.rollerT = 1.13;
export default {
  id: 'seated-leg-extension', resource: 'LegExtensionArtwork.html', title: '坐姿腿屈伸', view: 'side', dropManifestKeys: drops,
  ...cycle(pose, timing()),
  equipment: [{type: 'library_legExtension'}],
  muscles: {primary: ['quads'], secondary: []},
  labels: [{muscle: 'quads.rf@near', at: 'tr'}, {muscle: 'quads.vl@near', at: 'tl'}],
  guide: {joint: 'legs.near.A', pivot: 'legs.near.K', push: 21},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'quads.rf@near', at: 'tr'}],
    callouts: [pin(1, 'legs.near.K', '膝盖对准转轴', 4, -28), pin(2, 'legs.near.A', '滚垫在脚踝上方前侧', 16, -18), pin(3, 'hip', '背臀贴靠，手轻握', -28, -8)]},
  mistake: {good: 'peak', pose: bad, goodText: '滚垫贴小腿前侧', text: '滚垫压到脚背', fix: '重调滚垫，让它贴脚踝上方的小腿前侧。',
    camera: {focus: ['hip', 'legs.near.K', 'legs.near.A', 'legs.near.toe'], side: 26},
    marks: [{at: 'legs.near.A', type: 'circle', r: 21}]},
  machineReference: 'Precor Vitality VSL005BP',
  sourceURLs: ['https://static.precor.com/sell-sheet/all/VSL/VSL005BP-Leg-Extension-NA.pdf']
};
