import {cycle, timing, hands, joints, V, add, activation, pin, drops} from './_shared/library.mjs';
const pose = (p, bad = false) => {
  const body = {x: -52 * p + (bad ? 18 : 0), y: -187 + 62 * p, pelvis: 6 + 14 * p + (bad ? 8 : 0), lumbar: 2, neck: -10,
    ik: {ankle: bad ? {near: {x: 12, y: -26, foot: -18}, far: {x: -2, y: -26, foot: -18}} : {near: {x: 0, y: -14, foot: 0}, far: {x: -14, y: -14, foot: 0}}}, ...activation(p)};
  const S = joints(body).shoulder;
  return hands(body, {near: add(S, V(38, 19)), far: add(S, V(44, 19))});
};
export default {motionGuide: false, 
  id: 'dumbbell-goblet-squat', resource: 'GobletSquatArtwork.html', title: '哑铃高脚杯深蹲', view: 'side', dropManifestKeys: drops,
  ...cycle(p => pose(p), timing()),
  equipment: [{type: 'library_goblet'}],
  muscles: {primary: ['quads', 'glute.max'], secondary: ['abs', 'erectors']},
  labels: [{muscle: 'quads.rf@near', at: 'tr'}, {muscle: 'glute.max', at: 'tl'}],
  guide: {joint: 'hip', offset: [-24, 0]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'quads.rf@near', at: 'tr'}, {muscle: 'glute.max', at: 'tl'}],
    callouts: [pin(1, 'arms.near.H', '两手托上端铃头下方', 20, -20), pin(2, 'arms.far.H', '手指包稳，铃靠胸前', 22, 10), pin(3, 'legs.near.heel', '整脚踩稳，膝随脚尖', -14, -18)]},
  mistake: {good: 'peak', pose: pose(1, true), goodText: '整脚踩稳，铃靠胸前', text: '脚跟抬起，重心前冲', fix: '减小下蹲幅度，重新踩稳整个脚底，铃靠近胸前。',
    camera: {side: 22}, muscles: {primary: ['gastrocnemius'], secondary: ['quads', 'erectors']},
    marks: [{at: 'legs.near.heel', type: 'circle', r: 16}, {at: 'N.3', type: 'arrow', dx: 24, dy: -10}]},
  sourceURLs: ['https://www.acefitness.org/resources/everyone/exercise-library/362/goblet-squat/']
};
