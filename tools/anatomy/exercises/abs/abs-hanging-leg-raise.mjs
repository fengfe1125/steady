import {handContacts,shoulderLocked,raisedLegs} from './_shared/poses.mjs';
const grips={near:{x:18,y:-469,bend:1},far:{x:6,y:-469,bend:1}},S={x:0,y:-350};
const start=handContacts(shoulderLocked({legs:raisedLegs({hip:8,knee:16,ankle:15}),act:.28},S),grips);
const peak=handContacts(shoulderLocked({pelvis:-12,lumbar:16,thorax:4,legs:raisedLegs({hip:95,knee:92,ankle:15}),act:1},S),grips);
const bad=handContacts(shoulderLocked({pelvis:-26,lumbar:12,thorax:0,legs:raisedLegs({hip:113,knee:55,ankle:15})},S),grips);
export default {motionGuide: false, id:'abs-hanging-leg-raise',title:'悬垂举腿',view:'side',poses:{start,peak},
 equipment:[{type:'abs_hanging_station',top:-469,grips}],muscles:{primary:['abs'],secondary:['obliques','iliopsoas','lats']},
 labels:[{muscle:'abs',at:'tr'},{muscle:'iliopsoas',at:'tl'}],camera:{t:68,b:18,side:20,max:.78},
 guide:{joint:'legs.near.K',pivot:'hip',push:20},
 detail:{pose:'peak',ghost:'start',legend:'bl',labels:[{muscle:'abs',at:'tr'},{muscle:'iliopsoas',at:'tl'}],
 callouts:[{n:1,at:'arms.near.H',text:'双手握稳固定横杠',dx:26,dy:12},{n:2,at:'hip',text:'收腹带动骨盆轻卷',dx:-22,dy:5},{n:3,at:'legs.near.K',text:'屈膝上收，慢放回',dx:18,dy:-9}]},
 mistake:{good:'peak',goodText:'稳住悬垂，屈膝上收',text:'后仰摆腿借力',fix:'先让身体停稳，缩小抬膝范围，再慢慢回落。',pose:bad,camera:{focus:['headTop','arms.near.H','hip','shoulder','legs.near.K'],t:85,b:25},
 marks:[{at:'N.1',r:16},{at:'legs.near.K',type:'arrow',dx:22,dy:-10}],muscles:{primary:['iliopsoas'],secondary:['abs','erectors']}},
 dropManifestKeys:['injectedRuntimeResource','documentLayout','availableViews','defaultView','supportsSideSelection']};
