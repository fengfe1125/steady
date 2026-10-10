import {side,handContacts,mat} from './_shared/poses.mjs';
const base={x:-55,y:-30,pelvis:90,neck:-14,head:0,arms:{near:{f:.65},far:{f:.65}},legs:{near:{hip:10,knee:10,ankle:60},far:{hip:10,knee:10,ankle:60}}};
const contacts={near:{x:60,y:-12,bend:1},far:{x:50,y:-12,bend:1}};
const start=handContacts(side({...base,lumbar:-3,thorax:-3,act:.3}),contacts,true);
const peak=handContacts(side({...base,lumbar:-28,thorax:-15,act:1}),contacts,true);
const bad=handContacts(side({...base,x:-68,y:-55,lumbar:-33,thorax:-19,neck:-20}),contacts,true);
export default {motionGuide: false, id:'abs-prone-abdominal-stretch',title:'俯卧抬胸拉伸',view:'side',hands:{near:'open',far:'open'},poses:{start,peak},equipment:[{...mat,x:-275,length:450}],
 muscles:{stretch:['abs','obliques'],secondary:['triceps']},labels:[{muscle:'abs',at:'tr',role:'x'},{muscle:'triceps',at:'tl',role:'s'}],camera:{t:94,b:90,side:12,max:.94},guide:{joint:'N.3',offset:[0,-16]},
 detail:{pose:'peak',ghost:'start',legend:'bl',labels:[{muscle:'abs',at:'tr',role:'x'},{muscle:'triceps',at:'tl',role:'s'}],
 callouts:[{n:1,at:'arms.near.H',text:'双掌撑稳，肘逐渐展开',dx:15,dy:10},{n:2,at:'hip',text:'骨盆和腿留在垫面',dx:-15,dy:18},{n:3,at:'N.3',text:'舒适抬胸，腹部轻牵拉',dy:-25}]},
 mistake:{good:'peak',goodText:'轻柔抬胸，骨盆留垫',text:'顶起骨盆，腰部挤压',fix:'把骨盆放回垫面，减小抬胸幅度；有腰部不适就停止。',pose:bad,camera:{focus:['headTop','N.1','N.2','hip','arms.near.H'],t:94,b:26},
 marks:[{at:'hip',type:'arrow',dx:0,dy:26},{at:'N.1',r:17}],muscles:{primary:['erectors'],secondary:['triceps']}},
 dropManifestKeys:['injectedRuntimeResource','documentLayout','availableViews','defaultView','supportsSideSelection']};
