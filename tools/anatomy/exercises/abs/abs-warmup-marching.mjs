// Sagittal view keeps true hip flexion visible; the six-second track includes both landing phases.
import {side} from './_shared/poses.mjs';
const planted={hip:0,knee:0,ankle:0},raised={hip:35,knee:46,ankle:-11};
const base=side({act:.35,legs:{near:planted,far:planted}});
const left=side({act:.9,legs:{near:raised,far:planted},arms:{near:{sh:-19,el:32},far:{sh:32,el:34}}});
const right=side({act:.9,legs:{near:planted,far:raised},arms:{near:{sh:32,el:34},far:{sh:-19,el:32}}});
export default {motionGuide: false, id:'abs-warmup-marching',title:'原地踏步',view:'side',hands:{near:'open',far:'open'},
 poses:{start:base,peak:left,left,right,land:base},
 track:{keys:[{t:0,pose:'start',p:0},{t:600,pose:'start',p:0},{t:1700,pose:'left',p:1},{t:2800,pose:'land',p:0},{t:3300,pose:'land',p:0},{t:4650,pose:'right',p:1},{t:5900,pose:'land',p:0}]},
 muscles:{primary:['iliopsoas'],secondary:['quads','glute.med','abs']},labels:[{muscle:'iliopsoas',at:'tr'},{muscle:'abs',at:'tl',sub:'稳定躯干'}],
 camera:{t:72,b:26,side:35},
 guides:[{joint:'legs.near.K',a:'start',b:'left',offset:[18,0]},{joint:'legs.far.K',a:'land',b:'right',offset:[-20,0]}],
 detail:{pose:'left',ghost:'start',legend:'bl',labels:[{muscle:'iliopsoas',at:'tr'},{muscle:'abs',at:'tl',sub:'稳定躯干'}],
 arrows:[{joint:'legs.near.K',a:'start',b:'left',offset:[18,0]}],callouts:[{n:1,at:'N.3',text:'站直，肩颈放松',dx:-29},{n:2,at:'legs.near.K',text:'轻抬膝，落稳后换侧',dx:21,dy:-10},{n:3,at:'legs.far.A',text:'另一脚持续踩地',dx:-26,dy:-9}]},
 mistake:{good:'left',goodText:'站直轻抬膝',text:'仰身晃动，抬得过高',fix:'减小抬膝幅度，站直，先落稳一脚再换侧。',
 pose:{pelvis:-10,lumbar:-15,thorax:-6,legs:{near:{hip:60,knee:76,ankle:5}}},camera:{t:82,b:25,side:12},marks:[{at:'N.1',r:17},{at:'legs.near.K',type:'arrow',dx:25,dy:0}],muscles:{primary:['erectors'],secondary:['iliopsoas','abs']}},
 detailExplanation:'图中编号\n① 站直，肩颈放松\n② 轻抬膝，落稳后换侧\n③ 另一脚持续踩地\n\n红色 · 主要发力：髂腰肌\n浅红 · 协同：股四头肌、臀中肌、腹直肌（稳定躯干）\n虚线人形：双脚落地起始姿势 · 绿色箭头：抬膝方向\n图示左侧抬步后落地，右侧抬步后落地，循环衔接时双脚已站稳。',
 dropManifestKeys:['injectedRuntimeResource','documentLayout','availableViews','defaultView','supportsSideSelection']};
