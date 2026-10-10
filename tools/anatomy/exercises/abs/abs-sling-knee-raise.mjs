import {handContacts,shoulderLocked,raisedLegs,joints} from './_shared/poses.mjs';
const grips={near:{x:40,y:-408,bend:1},far:{x:29,y:-408,bend:1}},S={x:0,y:-335};
const base=handContacts(shoulderLocked({},S),grips);
// Solve the same fixed hand contacts used at runtime, so pockets match the real elbows.
import vm from 'node:vm';import fs from 'node:fs';
const c={};c.globalThis=c;vm.createContext(c);for(const f of ['00-core.js','10-rig.js'])vm.runInContext(fs.readFileSync(new URL('../../engine/'+f,import.meta.url),'utf8'),c);
const j=c.SteadyAnatomy.rig.joints('side',c.SteadyAnatomy.rig.applyIK('side',base,base.ik));
const supports={near:j.arms.near.E,far:j.arms.far.E};
const start=handContacts(shoulderLocked({legs:raisedLegs({hip:12,knee:12}),act:.3},S),grips);
const peak=handContacts(shoulderLocked({pelvis:-8,lumbar:8,legs:raisedLegs({hip:83,knee:12}),act:1},S),grips);
const bad=handContacts(shoulderLocked({pelvis:-24,lumbar:10,thorax:-4,legs:raisedLegs({hip:96,knee:12})},S),grips);
export default {id:'abs-sling-knee-raise',title:'吊带支撑举腿',view:'side',poses:{start,peak},
 equipment:[{type:'abs_arm_slings',top:-438,grips,supports}],muscles:{primary:['abs'],secondary:['obliques','iliopsoas','lats']},
 labels:[{muscle:'abs',at:'tr'},{muscle:'iliopsoas',at:'tl'}],camera:{t:70,b:22,side:15,max:.82},
 guide:{joint:'legs.near.A',pivot:'hip',push:16},detail:{pose:'peak',ghost:'start',legend:'bl',labels:[{muscle:'abs',at:'tr'},{muscle:'iliopsoas',at:'tl'}],
 callouts:[{n:1,at:'arms.near.E',text:'两侧吊带承托肘附近',dx:28,dy:15},{n:2,at:'arms.near.H',text:'双手仍握高位握把',dx:23,dy:-12},{n:3,at:'legs.near.K',text:'近伸膝上举，不甩腿',dy:24}]},
 mistake:{good:'peak',goodText:'双侧承托，躯干稳定',text:'后仰把身体甩出去',fix:'先稳住两侧吊带和握把，减小举腿幅度；吊带不代替握稳。',pose:bad,camera:{focus:'trunk',t:85,b:25},
 marks:[{at:'hip',r:16},{at:'N.2',type:'arrow',dx:23,dy:5}],muscles:{primary:['iliopsoas'],secondary:['abs','erectors']}},
 dropManifestKeys:['injectedRuntimeResource','documentLayout','availableViews','defaultView','supportsSideSelection']};
