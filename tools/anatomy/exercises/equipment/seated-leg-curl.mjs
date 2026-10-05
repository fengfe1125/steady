import {cycle, timing, hands, V, activation, pin, drops} from './_shared/library.mjs';
const pose = p => hands({y: -132, pelvis: -6, legs: {near: {hip: 84, knee: 15 + 92 * p, ankle: 8}, far: {hip: 84, knee: 15 + 92 * p, ankle: 8}}, ...activation(p)},
  {near: V(58, -166), far: V(52, -170)});
const bad = pose(1); bad.y = -137; bad.eq.restraintLift = 25; bad.eq.rollerSide = 1;
export default {
  id: 'seated-leg-curl', resource: 'LegCurlArtwork.html', title: '坐姿腿弯举', view: 'side', dropManifestKeys: drops,
  ...cycle(pose, timing()),
  equipment: [{type: 'library_legCurl'}],
  muscles: {primary: ['hamstrings'], secondary: ['gastrocnemius']},
  labels: [{muscle: 'hamstrings@near', at: 'tl'}, {muscle: 'gastrocnemius@near', at: 'tr'}],
  guide: {joint: 'legs.near.A', pivot: 'legs.near.K', push: 24},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'hamstrings@near', at: 'tl'}, {muscle: 'gastrocnemius@near', at: 'tr'}],
    callouts: [pin(1, 'legs.near.K', '膝盖对准转轴', 18, -14), pin(2, 'legs.near.A', '上垫固定，下垫托后侧', 24, 4), pin(3, 'arms.near.H', '握上方竖把，背臀贴靠', 10, -24)]},
  mistake: {good: 'peak', pose: bad, goodText: '上垫贴腿，下垫托后侧', text: '上垫悬空，下垫在前侧', fix: '重调两块垫的位置；大腿固定，后侧小腿贴下滚垫。',
    camera: {focus: ['headTop', 'hip', 'legs.near.K', 'legs.near.A', 'arms.near.H'], side: 30},
    muscles: {primary: ['quads'], secondary: ['hamstrings']}, marks: [{at: 'legs.near.K', type: 'circle', r: 20}, {at: 'legs.near.A', type: 'circle', r: 18}]},
  machineReference: 'Precor Resolute RSL0619',
  sourceURLs: ['https://static.precor.com/sell-sheet/all/RSL/RSL0619-Seated-Leg-Curl-NA.pdf']
};
