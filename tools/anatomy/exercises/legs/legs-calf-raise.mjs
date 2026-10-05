import {lesson} from './lib/lesson.mjs';
const R = Math.PI / 180, angle = -25;
// Forefoot remains at x=40,y=0 while the heel lifts; the body rises with the ankle.
const ankleX = 40 - 40 * Math.cos(angle * R) - 14 * Math.sin(angle * R);
const ankleY = 40 * Math.sin(angle * R) - 14 * Math.cos(angle * R);
export default lesson({
  id: 'legs-calf-raise', title: '站姿自重提踵', view: 'side',
  camera: {b: 94},
  poses: {base: {arms: {near: {sh: 2, el: 12}, far: {sh: 2, el: 12}}}, start: {x: 0, y: -189, eq: {legsCalf: 0}},
    peak: {x: ankleX, y: ankleY - 175, eq: {legsCalf: 1}, legs: {near: {hip: 0, knee: 0, ankle: 25}, far: {hip: 0, knee: 0, ankle: 25}}}},
  muscles: {primary: ['gastrocnemius'], secondary: ['soleus']},
  labels: [{muscle: 'gastrocnemius', at: 'tr'}, {muscle: 'soleus', at: 'tl'}],
  guide: {joint: 'legs.near.heel', offset: [-20, 0]},
  detail: {pose: 'peak', ghost: 'start', legend: 'bl', callouts: [
    {n: 1, at: 'legs.near.toe', text: '脚趾与前掌始终踩稳', dx: 18, dy: -4}, {n: 2, at: 'legs.near.heel', text: '脚跟升降，身体同步', dx: -25, dy: -8},
    {n: 3, at: 'N.2', text: '躯干直立，不向前冲', dx: -30}]},
  mistake: {goodText: '前掌踩稳，身体直立', text: '躯干前倾，用腰借力', fix: '放慢提踵，保持脚趾和前脚掌承重，让身体随踝部平稳升降。',
    pose: {lumbar: 18, thorax: 10}, muscles: {primary: ['gastrocnemius'], secondary: ['erectors']},
    marks: [{at: 'N.2', type: 'arrow', dx: -24, dy: 0}, {at: 'legs.near.toe', type: 'circle', r: 12}]}
});
