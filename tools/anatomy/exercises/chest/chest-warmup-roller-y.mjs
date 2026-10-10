// Prone on a cross-wise roller, seen from above (back view turned flat): the arm shape reads
// directly and the arm shadows on the mat slide out as the arms lift. This replaces a side
// view that needed a floating top-view inset to show the T/Y/W shape.
const both = a => ({r: {...a}, l: {...a}});
const pose = (arm, lift, act, eq = {}) => ({arms: both(arm), act, eq: {lift, ...eq}});
const start = pose({abd: 146, el: -4, f: 1, ff: 1}, 0, 0.3), peak = pose({abd: 148, el: -4, f: 0.95, ff: 0.95}, 1, 1);
export default {motionGuide: false,
  id: 'chest-warmup-roller-y', title: '滚轴俯卧Y位抬臂', view: 'back', rotate: 90, ground: false,
  poses: {start, peak},
  equipment: [{type: 'chest_proneTop'}],
  muscles: {primary: ['trap.lower', 'deltoid.post'], secondary: ['rhomboid', 'trap.mid']},
  detail: {pose: 'peak', ghost: null, callouts: [
    {n: 1, at: 'neck', text: '胸骨压在横放滚轴上', dx: -26, dy: 30},
    {n: 2, at: 'arms.r.H', text: 'Y位近伸直，肩部抬臂', dx: 16, dy: 16},
    {n: 3, at: 'pelvis', text: '脊柱和骨盆保持稳定', dx: 0, dy: 30}]},
  mistake: {good: 'peak', pose: {eq: {rollerAt: 'belly'}}, goodText: '滚轴横放在胸骨下', text: '滚轴压在腹部',
    fix: '把滚轴移回胸骨下方，胸骨接触轴后再抬臂；压迫不舒服时跳过这项。',
    marks: [{at: 'pelvis', off: [0, -28], r: 24}]},
  detailExplanation: '图中编号\n① 胸骨压在横放滚轴上\n② Y位近伸直，肩部抬臂\n③ 脊柱和骨盆保持稳定\n\n俯视图：头在右侧，人趴在垫上，滚轴横放在胸骨下。手臂抬起时，垫上的影子会向外移开。\n红色 · 主要发力：斜方肌下束、三角肌后束\n浅红 · 协同：菱形肌、斜方肌中束',
  dropManifestKeys: ["injectedRuntimeResource", "documentLayout", "availableViews", "defaultView", "supportsSideSelection"]
};
