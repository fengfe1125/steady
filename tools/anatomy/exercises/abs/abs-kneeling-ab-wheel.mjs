import {kneel,joints,handContacts} from './_shared/poses.mjs';
const contacts=x=>({near:{x:x+8,y:-24,bend:1},far:{x:x-8,y:-24,bend:1}});
function rollout(p,fixedWheel){
 const q=kneel(p),S=joints(q).shoulder,dy=-24-S.y,reach=122;
 // Put the axle almost a full arm length from the shoulder. The far arm is
 // foreshortened by the same projected 16-unit offset as its axle grip.
 const x=fixedWheel??S.x+Math.sqrt(reach*reach-dy*dy)-8;
 const f=Math.hypot(x-8-S.x,dy)/reach;
 q.arms.far={...q.arms.far,f,ff:f};q.eq={wheel:{x,y:-24}};
 return handContacts(q,contacts(x));
}
const start=rollout({x:-90,kx:-80,pelvis:84,lumbar:0,thorax:0,neck:-14,head:0,scapP:4,act:.4});
const peak=rollout({x:-50,kx:-80,pelvis:96,lumbar:0,thorax:0,neck:-14,head:0,scapP:4,act:1});
const bad=rollout({x:-25,kx:-80,pelvis:96,lumbar:-24,thorax:9,neck:-8,head:0,scapP:-3},peak.eq.wheel.x);
export default {motionGuide: false, id:'abs-kneeling-ab-wheel',title:'跪姿健腹轮',view:'side',poses:{start,peak},equipment:[{type:'mat',x:-201,length:165},{type:'abs_wheel',radius:24,startX:start.eq.wheel.x}],
 muscles:{primary:['abs'],secondary:['obliques','lats','serratus']},labels:[{muscle:'abs',at:'tr'},{muscle:'lats',at:'tl',sub:'与肩带协同支撑'}],camera:{t:92,b:88,side:18,max:.94},
 guide:{joint:'arms.near.H',offset:[0,-24]},
 detail:{pose:'peak',ghost:'start',legend:'bl',labels:[{muscle:'abs',at:'tr'},{muscle:'lats',at:'tl'}],
 callouts:[{n:1,at:'legs.near.K',text:'双膝固定落垫',dx:-15,dy:18},{n:2,at:'arms.near.H',text:'握住轮轴，手臂接近伸直',dx:17,dy:-8},{n:3,at:'N.2',text:'撑稳躯干，只滚可控范围',dy:-25}]},
 mistake:{good:'peak',goodText:'躯干收稳，能慢收回',text:'塌腰换取更远距离',fix:'缩短前滚范围，撑稳肩带和腹部；只到自己能缓慢收回的位置。',pose:bad,camera:{focus:['hip','N.1','N.2','headTop','arms.near.H','legs.near.K'],t:92,b:27},
 marks:[{at:'N.1',r:16},{at:'N.2',type:'arrow',dx:0,dy:-24}],muscles:{primary:['erectors'],secondary:['abs','lats']}},
 dropManifestKeys:['injectedRuntimeResource','documentLayout','availableViews','defaultView','supportsSideSelection']};
