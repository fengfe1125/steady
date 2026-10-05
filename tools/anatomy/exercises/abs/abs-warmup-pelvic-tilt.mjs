import {supine,mat,handContacts,joints} from './_shared/poses.mjs';
const rest=p=>{p.arms={near:{sh:-16,el:32,wr:0},far:{sh:-16,el:32,wr:0}};return p;};
const start=rest(supine({pelvis:-82,lumbar:-18,thorax:10,neck:-14,act:.3}));
const peak=rest(supine({pelvis:-96,lumbar:6,thorax:0,neck:-14,act:1}));
const bad=rest(supine({x:0,y:-65,pelvis:-90,lumbar:-15,thorax:-5,neck:-14}));
export default {motionGuide: false, id:'abs-warmup-pelvic-tilt',title:'仰卧骨盆控制',view:'side',hands:{near:'open',far:'open'},poses:{start,peak},equipment:[mat],
 muscles:{primary:['abs'],secondary:['obliques']},labels:[{muscle:'abs',at:'tr'},{muscle:'obliques',at:'tl'}],camera:{t:90,b:88,side:14,max:1.05},guide:{joint:'N.1',offset:[0,-14]},
 detail:{pose:'peak',ghost:'start',legend:'bl',labels:[{muscle:'abs',at:'tr'},{muscle:'obliques',at:'tl'}],callouts:[{n:1,at:'N.2',text:'呼气收腹，腰弧变小',dy:-22},{n:2,at:'hip',text:'臀部一直留在垫上',dx:15,dy:18},{n:3,at:'legs.near.A',text:'屈膝，双脚平放',dx:17,dy:-9}]},
 mistake:{good:'peak',goodText:'小幅收腹，臀不抬',text:'抬臀做成臀桥',fix:'把臀部放回垫面，轻收腹，只改变腰部与垫面的间隙。',pose:bad,camera:{focus:['headTop','N.2','hip','legs.near.K','legs.near.A'],t:90,b:25},
 marks:[{at:'hip',type:'arrow',dx:0,dy:26},{at:'N.1',r:15}],muscles:{primary:['glute.max'],secondary:['hamstrings','abs']}},
 dropManifestKeys:['injectedRuntimeResource','documentLayout','availableViews','defaultView','supportsSideSelection']};
