import {cycle, timing, frontSeated, R, activation, pin, drops} from './_shared/library.mjs';
// Horizontal-plane projection of a 64/59-unit arm with 21° of physical elbow flexion.
// Screen elbow angles change with projection; the physical bend does not turn into a chest press.
const arm = (angle, flex = 21) => {
  const vertical = 8 / 64, horizontal = Math.sqrt(1 - vertical * vertical);
  const planeFlex = Math.acos(Math.max(-1, Math.min(1, (Math.cos(flex * R) - vertical * vertical) / (horizontal * horizontal)))) / R;
  const dx = 64 * horizontal * Math.cos(angle * R), dy = 64 * vertical;
  const fx = 59 * horizontal * Math.cos((angle + planeFlex) * R), fy = 59 * vertical;
  const abd = Math.atan2(dx, dy) / R, fore = Math.atan2(fx, fy) / R;
  let el = fore - abd; while (el < -180) el += 360; while (el > 180) el -= 360;
  return {abd, el, f: Math.hypot(dx, dy) / 64, ff: Math.hypot(fx, fy) / 59};
};
const pose = p => ({...frontSeated(), ...activation(p, {horizontalAngle: 18 + 72 * p, physicalElbow: 21}),
  arms: {r: arm(18 + 72 * p), l: arm(18 + 72 * p)}});
const bad = {...frontSeated(), ...activation(0, {horizontalAngle: -12, physicalElbow: 0}), arms: {r: arm(-12, 0), l: arm(-12, 0)}};
export default {motionGuide: false, 
  id: 'seated-pec-fly', resource: 'PecFlyArtwork.html', title: '蝴蝶机夹胸', view: 'front', dropManifestKeys: drops,
  ...cycle(pose, timing()),
  physicalProjection: {plane: 'horizontal', verticalFraction: 0.125, upperLength: 64, foreWithHandLength: 59, elbowDegrees: 21},
  equipment: [{type: 'library_pecFly'}],
  muscles: {primary: ['pec'], secondary: ['deltoid.ant']},
  labels: [{muscle: 'pec.lower@r', at: 'tr'}, {muscle: 'deltoid.ant@l', at: 'tl'}],
  guide: {joint: 'arms.r.H', offset: [0, -24]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'pec.lower@r', at: 'tr'}, {muscle: 'deltoid.ant@l', at: 'tl'}],
    callouts: [pin(1, 'pelvis', '调座高，背臀贴垫', 20, -30), pin(2, 'arms.r.H', '掌心相对，环握竖把', 30, -14), pin(3, 'arms.l.E', '肘微屈，向胸前合拢', -26, 12)]},
  mistake: {good: pose(0.5), pose: bad, goodText: '肘微屈，适度打开', text: '锁肘，打开过远', fix: '重新调起始位置，保留小幅弯肘，在舒适范围内合拢。',
    camera: {focus: ['headTop', 'arms.r.H', 'arms.l.H', 'pelvis'], side: 20},
    muscles: {primary: ['deltoid.ant'], secondary: ['pec']}, marks: [{at: 'arms.r.E', type: 'circle', r: 14}, {at: 'arms.l.E', type: 'circle', r: 14}]},
  machineReference: 'Precor Vitality VSL015BP',
  sourceURLs: ['https://static.precor.com/sell-sheet/all/VSL/VSL015BP-Rear-Delt-Pec-Fly-NA.pdf']
};
