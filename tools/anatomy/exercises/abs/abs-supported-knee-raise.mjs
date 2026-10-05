import {handContacts,shoulderLocked,raisedLegs} from './_shared/poses.mjs';
const grips={near:{x:42,y:-317,bend:1},far:{x:34,y:-319,bend:1}},S={x:0,y:-340};
const base=handContacts(shoulderLocked({},S),grips);
import vm from 'node:vm';import fs from 'node:fs';
const c={};c.globalThis=c;vm.createContext(c);for(const f of ['00-core.js','10-rig.js'])vm.runInContext(fs.readFileSync(new URL('../../engine/'+f,import.meta.url),'utf8'),c);
const j=c.SteadyAnatomy.rig.joints('side',c.SteadyAnatomy.rig.applyIK('side',base,base.ik));
const supports={near:j.arms.near.E,far:j.arms.far.E};
const start=handContacts(shoulderLocked({legs:raisedLegs({hip:14,knee:12}),act:.3},S),grips);
const peak=handContacts(shoulderLocked({pelvis:-8,lumbar:8,legs:raisedLegs({hip:82,knee:12}),act:1},S),grips);
export default {id:'abs-supported-knee-raise',title:'罗马椅支撑举腿',view:'side',poses:{start,peak},
 equipment:[{type:'abs_captains_chair',grips,supports,elbowY:supports.near.y}],muscles:{primary:['abs'],secondary:['obliques','iliopsoas']},
 labels:[{muscle:'abs',at:'tr'},{muscle:'iliopsoas',at:'tl'}],camera:{t:70,b:22,side:14,max:.88},
 guide:{joint:'legs.near.A',pivot:'hip',push:18},detail:{pose:'peak',ghost:'start',legend:'bl',labels:[{muscle:'abs',at:'tr'},{muscle:'iliopsoas',at:'tl'}],
 callouts:[{n:1,at:'arms.near.E',text:'肘与近端前臂压稳垫',dx:-25,dy:12},{n:2,at:'arms.near.H',text:'前臂向上，握住竖把',dx:20,dy:-9},{n:3,at:'hip',text:'背靠垫，保留轻卷骨盆',dx:-23,dy:18}]},
 mistake:{good:'peak',goodText:'肩下沉，肘部压稳垫',text:'耸肩，肘部失去承托',fix:'调整前臂垫和握把，肩离耳朵；先缩小举腿幅度。',pose:{scapE:12,neck:-8},camera:{focus:'upper',t:88,b:25},
 marks:[{at:'shoulder',r:16},{at:'arms.near.E',type:'arrow',dx:10,dy:26}],muscles:{primary:['trap.upper'],secondary:['abs','iliopsoas']}},
 dropManifestKeys:['injectedRuntimeResource','documentLayout','availableViews','defaultView','supportsSideSelection']};
