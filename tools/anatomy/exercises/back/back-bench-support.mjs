import {reviewed, kneel, sideShoulder} from './geometry.js';
const S = sideShoulder(kneel), elbow = {x: S.x + 64, y: S.y};
export default reviewed({
  id: 'back-bench-support', title: '凳支撑跪姿肘屈伸', view: 'side',
  hands: {near: 'open', far: 'open'},
  poses: {
    base: {...kneel, arms: {near: {sh: 173}, far: {sh: 173}}},
    start: {act: .4, arms: {near: {el: 18}, far: {el: 18}}},
    peak: {act: .8, arms: {near: {el: 105}, far: {el: 105}}}
  },
  equipment: [{type: 'mat', x: -208, length: 245}, {type: 'bench', x: elbow.x - 32, length: 116, top: elbow.y + 9}],
  camera: {b: 74, max: .95},
  muscles: {primary: ['serratus'], secondary: ['triceps.long', 'biceps']},
  labels: [{muscle: 'serratus', at: 'tl', text: '肩胛支撑控制', sub: '前锯肌'},
    {muscle: 'triceps.long', at: 'tr', sub: '肘屈伸时轻度参与'}],
  guide: {joint: 'arms.near.H', pivot: 'arms.near.E', push: 14},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', labels: [{muscle: 'serratus', at: 'tl'}],
    callouts: [{n: 1, at: 'arms.near.E', text: '肘支点留在凳垫', dx: 24, dy: 14},
      {n: 2, at: 'arms.near.H', text: '前臂向头部转动', dy: -18}, {n: 3, at: 'legs.near.K', text: '双膝着地，躯干稳', dx: -12, dy: 22}]},
  mistake: {goodText: '肘固定，只转前臂', text: '肘部抬离凳垫',
    fix: '把肘放回垫面，缩小前臂屈伸范围；不舒服时改为小幅或静态支撑。',
    pose: {arms: {near: {sh: 201}, far: {sh: 201}}, scapE: 4},
    marks: [{at: 'arms.near.E', type: 'circle', r: 14}, {at: 'arms.near.E', type: 'arrow', dx: 12, dy: 30}],
    muscles: {primary: ['trap.upper'], secondary: ['deltoid.ant']}}
});
