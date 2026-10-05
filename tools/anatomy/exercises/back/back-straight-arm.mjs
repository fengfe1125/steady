import {reviewed} from './geometry.js';
const R = Math.PI / 180;
const armsAt = (sh, el = 10) => {
  const a = (sh - 12) * R, b = a + el * R;
  const dx = .88 * (64 * Math.sin(a) + 59 * Math.sin(b)) - 12;
  const dy = .88 * (64 * Math.cos(a) + 59 * Math.cos(b)) - 8;
  const bx = 59 * Math.sin(el * R), by = 64 + 59 * Math.cos(el * R);
  const f = Math.hypot(dx, dy) / Math.hypot(bx, by);
  return {near: {sh, el, f: .88, ff: .88},
    far: {sh: (Math.atan2(dx, dy) - Math.atan2(bx, by)) / R + 12, el, f, ff: f}};
};
const at = p => ({act: .3 + .7 * p, arms: armsAt(126 - 101 * p)});
const poses = {start: at(0), peak: at(1)}, keys = [{t: 0, pose: 'start'}, {t: 1500, pose: 'start'}];
for (let i = 1; i <= 20; i++) {
  const p = (1 - Math.cos(Math.PI * i / 20)) / 2, pose = 'press' + i;
  poses[pose] = at(p); keys.push({t: 1500 + 150 * i, pose, p});
}
keys.push({t: 5500, pose: 'peak', p: 1});
for (let i = 1; i <= 20; i++) {
  const p = (1 + Math.cos(Math.PI * i / 20)) / 2, pose = 'return' + i;
  poses[pose] = at(p); keys.push({t: 5500 + 200 * i, pose, p});
}
keys.push({t: 9900, pose: 'start'});
export default reviewed({
  id: 'back-straight-arm', title: '长杆直臂下压 · 适应', view: 'side',
  poses: {
    base: {x: -14, y: -183, pelvis: 12, lumbar: 0, thorax: 0, neck: -8,
      ik: {ankle: {near: {x: 0, y: -14, foot: 0}, far: {x: -22, y: -14, foot: 0}}}},
    ...poses
  },
  track: {keys},
  equipment: [{type: 'back_cable', x: 192, top: -386, outlet: {x: 172, y: -365}, attachment: 'straight', hands: ['far', 'near'], stackWidth: 28}],
  camera: {b: 20, t: 66, side: 28},
  muscles: {primary: ['lats'], secondary: ['teres', 'triceps.long', 'abs']},
  labels: [{muscle: 'lats', at: 'tl'}, {muscle: 'triceps.long@near', at: 'tr'}],
  guide: {joint: 'arms.near.H', pivot: 'shoulder', push: 18},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'lats', at: 'tl'}],
    callouts: [{n: 1, at: 'arms.near.E', text: '肘角保留小弯曲', dx: 20},
      {n: 2, at: 'arms.near.H', text: '长杆压向髋前', dx: 18, dy: 12}, {n: 3, at: 'N.1', text: '站稳，不后仰', dx: -25}]},
  mistake: {goodText: '肘角稳，向下压', text: '屈肘代替肩下压',
    fix: '减轻阻力，保留肘部小弯曲，让上臂带杆向髋前下压。', camera: {focus: 'upper', side: 30},
    pose: {arms: armsAt(25, 105)},
    marks: [{at: 'arms.near.E', type: 'circle', r: 16}],
    muscles: {primary: ['biceps'], secondary: ['lats']}}
});
