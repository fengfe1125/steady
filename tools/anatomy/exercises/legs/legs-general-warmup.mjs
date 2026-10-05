import {lesson} from './lib/lesson.mjs';
const lift = near => ({act: .62, legs: {[near ? 'near' : 'far']: {hip: 23, knee: 50, ankle: -27}, [near ? 'far' : 'near']: {hip: 0, knee: 0, ankle: 0}},
  arms: {[near ? 'far' : 'near']: {sh: 18, el: 24}, [near ? 'near' : 'far']: {sh: -10, el: 18}}});
export default lesson({motionGuide: false, 
  id: 'legs-general-warmup', title: '轻松走动 · 补充热身', view: 'side',
  poses: {base: {arms: {near: {sh: 4, el: 14}, far: {sh: 4, el: 14}}, legs: {near: {hip: 0, knee: 0, ankle: 0}, far: {hip: 0, knee: 0, ankle: 0}}}, start: {act: .3}, liftN: lift(true), peak: lift(true), liftF: lift(false)},
  track: {keys: [{t: 0, pose: 'start'}, {t: 1000, pose: 'start'}, {t: 2100, pose: 'liftN', p: .65}, {t: 3000, pose: 'liftN', p: .65},
    {t: 3500, pose: 'start'}, {t: 4600, pose: 'liftF', p: .65}, {t: 5900, pose: 'start'}]},
  muscles: {secondary: ['iliopsoas', 'quads.rf', 'gastrocnemius']},
  labels: [{muscle: 'quads.rf', at: 'tr', text: '轻松升温', sub: '髋屈肌与小腿轻度参与'}],
  guide: {joint: 'legs.near.A', offset: [16, 0]},
  detail: {pose: 'liftN', ghost: 'start', legend: 'bl', callouts: [
    {n: 1, at: 'shoulder', text: '肩颈放松，正常呼吸', dx: -18, dy: -18},
    {n: 2, at: 'arms.far.H', text: '手臂随步伐轻摆', dx: 12},
    {n: 3, at: 'legs.near.A', text: '小步轻抬，平稳落地', dx: 20, dy: 4}]},
  mistake: {good: 'liftN', goodText: '小步轻摆，肩颈放松', text: '耸肩、甩臂幅度过大', fix: '放慢到能轻松说话的速度，松开肩颈，缩小摆臂幅度。',
    pose: {scapE: 10, arms: {far: {sh: 70, el: 25}, near: {sh: -50, el: 12}}}, camera: {focus: 'upper'},
    muscles: {primary: ['trap.upper'], secondary: ['iliopsoas']}, marks: [{at: 'shoulder', type: 'circle'}, {at: 'arms.far.H', type: 'arrow', dx: -18, dy: 22}]}
});
