import {cycle, timing, seated, hands, joints, V, activation, pin, drops} from './_shared/library.mjs';
const body = seated({x: -70, pelvis: 0, ik: {ankle: {near: {x: 12, y: -14, foot: 0}, far: {x: 2, y: -14, foot: 0}}}});
const pose = p => ({...body, ...activation(p), arms: {near: {sh: 45, el: 10 + 115 * p}, far: {sh: 45, el: 10 + 115 * p}}});
const good = joints(pose(1));
const bad = hands({...body, scapE: 12, lumbar: -6, ...activation(1)}, {near: good.arms.near.H, far: good.arms.far.H});
export default {
  id: 'preacher-biceps-curl', resource: 'BicepsCurlArtwork.html', title: '器械弯举', view: 'side', dropManifestKeys: drops,
  ...cycle(pose, timing()),
  equipment: [{type: 'library_bicepsCurl', shoulder: joints(pose(0)).shoulder, elbow: good.arms.near.E}],
  muscles: {primary: ['biceps'], secondary: ['brachialis', 'brachioradialis']},
  labels: [{muscle: 'biceps@near', at: 'tr'}, {muscle: 'brachialis@near', at: 'tl'}],
  guide: {joint: 'arms.near.H', pivot: 'arms.near.E', push: 18},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'biceps@near', at: 'tr'}, {muscle: 'brachioradialis@near', at: 'tl'}],
    callouts: [pin(1, 'arms.near.E', '上臂贴垫，肘对轴', 12, 18), pin(2, 'arms.near.H', '四指拇指都环握', 20, -16), pin(3, 'arms.near.W', '不抬肘，不折腕', -20, -16)]},
  mistake: {good: 'peak', pose: bad, goodText: '上臂贴垫，只弯肘', text: '抬肩抬肘，离开托垫', fix: '减轻阻力，把上臂放回垫面，让肘部大致对准转轴。',
    camera: {focus: ['headTop', 'shoulder', 'arms.near.E', 'arms.near.H', 'hip'], side: 24},
    muscles: {primary: ['deltoid.ant', 'trap.upper'], secondary: ['biceps']}, marks: [{at: 'arms.near.E', type: 'circle', r: 18}, {at: 'shoulder', type: 'arrow', dx: -20, dy: -24}]},
  machineReference: 'Precor Resolute RSL0204', sourceURLs: ['https://www.precor.com/en-US/products/RSL0204']
};
