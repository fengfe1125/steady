import {supine,headHands,mat} from './_shared/poses.mjs';
const start=headHands(supine({lumbar:3,thorax:2,act:.32}));
const peak=headHands(supine({lumbar:18,thorax:12,neck:-14,head:0,act:1}));
const bad=headHands(supine({lumbar:3,thorax:2,neck:20,head:20}));
export default {motionGuide: false, id:'abs-supine-crunch',title:'仰卧卷腹',view:'side',hands:{near:'open',far:'open'},poses:{start,peak},equipment:[mat],
 muscles:{primary:['abs'],secondary:['obliques']},labels:[{muscle:'abs',at:'tr'},{muscle:'obliques',at:'tl'}],camera:{t:95,b:90,side:14,max:1.04},guide:{joint:'shoulder',offset:[0,-18]},
 detail:{pose:'peak',ghost:'start',legend:'bl',labels:[{muscle:'abs',at:'tr'},{muscle:'obliques',at:'tl'}],callouts:[{n:1,at:'N.2',text:'腹部带动上背短程卷起',dy:-21},{n:2,at:'arms.near.H',text:'手轻托头侧，不拉颈',dx:-10,dy:-22},{n:3,at:'legs.near.A',text:'双脚和臀部保持支撑',dx:16,dy:12}]},
 mistake:{good:'peak',goodText:'上背卷起，颈部自然',text:'只卷头颈，拉头抢动作',fix:'手轻放头侧，先从腹部收缩开始，减小幅度并让肩背一起卷起。',pose:bad,camera:{focus:['headTop','arms.near.H','arms.near.E','N.2','hip'],t:90,b:24},
 marks:[{at:'N.4',r:16},{at:'arms.near.H',type:'arrow',dx:10,dy:-22}],muscles:{primary:['trap.upper'],secondary:['abs']}},
 dropManifestKeys:['injectedRuntimeResource','documentLayout','availableViews','defaultView','supportsSideSelection']};
