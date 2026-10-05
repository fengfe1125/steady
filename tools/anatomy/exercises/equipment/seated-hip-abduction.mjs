import {cycle, timing, hands, R, activation, pin, drops} from './_shared/library.mjs';
const leg = angle => {
  const x = 87 * Math.sin(angle * R), y = 23, abd = Math.atan2(x, y) / R;
  return {abd, knee: abd, f: Math.hypot(x, y) / 87, fs: 1};
};
const pose = p => hands({y: -142, ...activation(p, {horizontalAngle: 10 + 25 * p}), legs: {r: leg(10 + 25 * p), l: leg(10 + 25 * p)}},
  {r: {x: 56, y: -152, bend: -1}, l: {x: -56, y: -152, bend: -1}}, 'front');
const bad = hands({...pose(1), lean: 4}, {r: {x: 56, y: -152, bend: -1}, l: {x: -56, y: -152, bend: -1}}, 'front'); bad.eq.padSide = -1;
export default {motionGuide: false, 
  id: 'seated-hip-abduction', resource: 'HipAbductionArtwork.html', title: '坐姿髋外展', view: 'front', dropManifestKeys: drops,
  ...cycle(pose, timing()),
  equipment: [{type: 'library_hipAbduction'}],
  muscles: {primary: ['glute.med'], secondary: ['tfl']},
  labels: [{muscle: 'glute.med@r', at: 'tr'}, {muscle: 'tfl@l', at: 'tl'}],
  guide: {joint: 'legs.r.K', offset: [0, -18]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'glute.med@r', at: 'tr'}, {muscle: 'tfl@l', at: 'tl'}],
    callouts: [pin(1, 'pelvis', '先确认外展模式与起点', 0, -34), pin(2, 'legs.r.K', '垫贴外侧，脚踩脚杆', 26, -12), pin(3, 'neck', '背臀贴靠，平稳向外', -30, -8)]},
  mistake: {good: 'peak', pose: bad, goodText: '垫在大腿外侧', text: '垫放内侧，模式用错', fix: '先按机身说明确认外展模式；垫贴大腿外侧。',
    camera: {focus: ['headTop', 'pelvis', 'arms.r.E', 'arms.l.E', 'legs.r.K', 'legs.l.K', 'legs.r.sole', 'legs.l.sole'], side: 32},
    muscles: {primary: ['adductors'], secondary: ['tfl']}, marks: [{at: 'legs.r.K', type: 'x'}, {at: 'legs.l.K', type: 'x'}]},
  machineReference: 'Precor Vitality VSL008BP',
  sourceURLs: ['https://static.precor.com/sell-sheet/all/VSL/VSL008BP-Inner-Outer-Thigh-NA.pdf']
};
