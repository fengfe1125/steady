import {cycle, timing, seated, hands, joints, V, add, rot, activation, pin, drops} from './_shared/library.mjs';
const pose = p => {
  const body = {...seated({pelvis: 0, lumbar: 35 * p, neck: -6,
    ik: {ankle: {near: {x: 88, y: -38, foot: 0}, far: {x: 80, y: -38, foot: 0}}}}), ...activation(p)};
  const S = joints(body).shoulder, grip = add(S, rot(V(20, -42), 35 * p));
  return hands(body, {near: grip, far: grip});
};
const bad = pose(0); bad.neck = 30; bad.head = 16;
export default {motionGuide: false, 
  id: 'seated-abdominal-crunch', resource: 'AbdominalCrunchArtwork.html', title: '坐姿器械卷腹', view: 'side', dropManifestKeys: drops,
  ...cycle(pose, timing()),
  equipment: [{type: 'library_crunch'}],
  muscles: {primary: ['abs'], secondary: ['obliques']},
  labels: [{muscle: 'abs', at: 'tr'}, {muscle: 'obliques', at: 'tl'}],
  guide: {joint: 'shoulder', pivot: 'N.1', push: 26},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'abs', at: 'tr'}, {muscle: 'obliques', at: 'tl'}],
    callouts: [pin(1, 'shoulder', '肩贴双垫，不压脖子', 18, -4), pin(2, 'arms.near.H', '环握，手只帮助稳定', 18, -18), pin(3, 'hip', '臀留座椅，脚踩脚踏', -28, 4)]},
  mistake: {good: 'peak', pose: bad, goodText: '胸口向骨盆卷近', text: '只低头，躯干没卷动', fix: '头颈随上身；让胸口靠近骨盆，别靠拉握把低头。',
    camera: {focus: ['headTop', 'N.4', 'shoulder', 'hip', 'arms.near.H'], side: 28},
    muscles: {primary: ['trap.upper'], secondary: ['biceps']}, marks: [{at: 'N.4', type: 'circle', r: 18}, {at: 'headPivot', type: 'arrow', dx: 25, dy: -12}]},
  machineReference: 'Precor Vitality VSL014BP',
  sourceURLs: ['https://static.precor.com/sell-sheet/all/VSL/VSL014BP-Abdominal-NA.pdf']
};
