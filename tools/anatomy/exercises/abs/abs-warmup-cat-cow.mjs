import {kneel,handContacts} from './_shared/poses.mjs';
const targets={near:{x:38,y:-12,bend:1},far:{x:30,y:-12,bend:1}};
const start=handContacts(kneel({pelvis:72,lumbar:5,thorax:0,neck:-15,head:-8,act:.3}),targets,true);
const peak=handContacts(kneel({pelvis:50,lumbar:28,thorax:12,neck:8,head:12,act:1}),targets,true);
const bad=handContacts(kneel({pelvis:92,lumbar:-20,thorax:-5,neck:-23,head:-10}),targets,true);
export default {motionGuide: false, id:'abs-warmup-cat-cow',title:'猫牛式活动',view:'side',hands:{near:'open',far:'open'},poses:{start,peak},
 equipment:[{type:'mat',x:-185,length:320}],muscles:{primary:['abs'],secondary:['erectors']},labels:[{muscle:'abs',at:'tr'},{muscle:'erectors',at:'tl',sub:'轻柔脊柱活动'}],
 camera:{t:92,b:85,side:20,max:1.04},guide:{joint:'N.2',offset:[0,-24]},
 detail:{pose:'peak',ghost:'start',legend:'bl',labels:[{muscle:'abs',at:'tr'},{muscle:'erectors',at:'tl',sub:'轻柔脊柱活动'}],callouts:[{n:1,at:'arms.near.H',text:'手掌撑地，肩下附近',dx:23,dy:10},{n:2,at:'legs.near.K',text:'双膝落垫，髋下附近',dx:-18,dy:15},{n:3,at:'N.2',text:'呼气轻弓背，头随脊柱',dy:-22}]},
 mistake:{good:'start',goodText:'背部轻柔展开',text:'塌腰并猛抬头',fix:'减少展开幅度，手膝保持原位，头颈随脊柱自然移动。',pose:bad,camera:{focus:['hip','N.2','N.4','headTop','arms.near.H','legs.near.K'],t:95,b:35},
 marks:[{at:'N.2',r:17},{at:'N.4',type:'arrow',dx:20,dy:-20}],muscles:{primary:['erectors'],secondary:['abs']}},
 dropManifestKeys:['injectedRuntimeResource','documentLayout','availableViews','defaultView','supportsSideSelection']};
