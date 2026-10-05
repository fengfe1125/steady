import {lesson} from './lib/lesson.mjs';
import {hands, R, pin} from '../equipment/_shared/library.mjs';
// Front view of the inner/outer-thigh machine in adduction mode: the pads sit inside the
// knees, so the knees visibly travel to the midline. The earlier oblique side view of a
// near-flat recline hid the whole movement and read as lying on a bench.
// Seen slightly from above so the inner thigh (the working muscle) stays visible.
const leg = angle => {
  const x = 87 * Math.sin(angle * R), y = 62, abd = Math.atan2(x, y) / R;
  return {abd, knee: abd, f: Math.hypot(x, y) / 87, fs: 0.58};
};
const grips = {r: {x: 56, y: -152, bend: -1}, l: {x: -56, y: -152, bend: -1}};
const pose = (p, extra = {}) => hands({y: -142, act: 0.3 + 0.7 * p, eq: {phase: p, padSide: -1},
  legs: {r: leg(34 - 22 * p), l: leg(34 - 22 * p)}, ...extra}, grips, 'front');
export default lesson({motionGuide: false,
  id: 'legs-hip-adduction', title: '可调靠背髋内收', view: 'front',
  poses: {start: pose(0), peak: pose(1)},
  equipment: [{type: 'library_hipAbduction'}],
  muscles: {primary: ['adductors']},
  detail: {pose: 'peak', ghost: 'start',
    arrows: [{joint: 'legs.r.K', offset: [0, -18]}, {joint: 'legs.l.K', offset: [0, -18]}],
    callouts: [pin(1, 'neck', '背臀贴靠，腰背不离垫', -30, -8), pin(2, 'legs.r.K', '腿垫贴大腿内侧', 26, -12),
      pin(3, 'legs.r.sole', '双脚踩稳脚杆', 24, -6)]},
  mistake: {good: 'peak', pose: pose(1, {lean: 9}), goodText: '背臀贴靠，大腿内夹', text: '上身摆动借力',
    fix: '降低重量，背臀重新贴住靠垫，只让大腿带动腿垫合拢。',
    camera: {focus: ['headTop', 'pelvis', 'arms.r.E', 'arms.l.E', 'legs.r.K', 'legs.l.K', 'legs.r.sole', 'legs.l.sole'], side: 32},
    muscles: {primary: ['obliques'], secondary: ['adductors']}, marks: [{at: 'neck', type: 'arrow', dx: -26, dy: -4}]}
});
