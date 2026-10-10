// Frontal projection deliberately shows the outward elbows and two neutral rope grips.
// Internal rotation describes the prepared shoulder position; it is NOT animated wrist rotation.
const leg = {abd: 150, knee: 120, f: .45, fs: .676};
export default {
  id: 'arms-seated-internal-rotation-curl', title: '坐姿绳索内旋位弯举', view: 'front',
  dropManifestKeys: ['injectedRuntimeResource', 'documentLayout', 'availableViews', 'defaultView', 'supportsSideSelection'],
  poses: {
    base: {y: -30, legs: {r: leg, l: leg}, arms: {r: {abd: 80, el: 15, f: .6, ff: .25}, l: {abd: 80, el: 15, f: .6, ff: .25}}},
    start: {act: .25}, peak: {act: 1, arms: {r: {el: 120, ff: .94}, l: {el: 120, ff: .94}}}
  },
  equipment: [{type: 'arms_cableStation', x: 177, pulley: {x: 161, y: -31}, hands: ['r', 'l'], attachment: 'rope', branch: 38}],
  muscles: {primary: ['brachialis', 'brachioradialis'], secondary: ['biceps', 'forearm.flex']},
  labels: [{muscle: 'brachialis@r', at: 'tr'}, {muscle: 'brachioradialis@l', at: 'tl'}],
  guide: {joint: 'arms.r.H', pivot: 'arms.r.E', push: 15},
  detail: {pose: 'peak', ghost: 'start', legend: 'tl',
    labels: [{muscle: 'brachialis@r', at: 'tr'}, {muscle: 'brachioradialis@l', at: 'tl'}, {muscle: 'biceps@r', at: 'br', sub: '协同'}],
    callouts: [{n: 1, at: 'arms.l.E', text: '肘向外，保留肩位', dx: -16, dy: -10},
      {n: 2, at: 'arms.r.H', text: '中立握绳把，不扭手腕', dx: 12, dy: -16},
      {n: 3, at: 'pelvis', text: '骨盆坐地，屈膝支撑', dx: 0, dy: -21}]},
  mistake: {good: 'peak', goodText: '坐稳，保留肘方向', text: '抬肘耸肩，带成面拉',
    fix: '降低阻力，恢复稳定坐姿。把肘向外摆好后只动前臂，不向后拉肩肘做成面拉；内旋指肩位，保持中立握。',
    camera: {focus: 'upper', side: 26}, pose: {scapE: {r: 9, l: 9}, arms: {r: {abd: 105, el: 120, f: .85, ff: .76}, l: {abd: 105, el: 120, f: .85, ff: .76}}},
    marks: [{at: 'arms.r.E', type: 'circle', r: 15}, {at: 'arms.l.E', type: 'arrow', dx: -20, dy: 16}],
    muscles: {primary: ['trap.upper'], secondary: ['brachialis', 'brachioradialis']}},
  detailExplanation: '图中编号\n① 肘向外，保留已设置的肩内旋位。\n② 两手中立握绳把；内旋指肩位，不通过扭腕完成。\n③ 骨盆坐地，屈膝、双脚支撑，身体稳定。\n\n红色 · 主要发力：肱肌、肱桡肌\n浅红 · 协同：肱二头肌、前臂屈肌群\n虚线人形：起始姿势 · 绿色箭头：弯举方向。此图为正面投影，前臂朝向镜头的部分作透视缩短。'
};
