// Build-time geometry only. Returned specs contain plain, offline data.
const RAD = Math.PI / 180;
const up = a => ({x: Math.sin(a * RAD), y: -Math.cos(a * RAD)});
const down = a => ({x: Math.sin(a * RAD), y: Math.cos(a * RAD)});
const add = (a,b) => ({x:a.x+b.x,y:a.y+b.y});
const mul = (a,k) => ({x:a.x*k,y:a.y*k});
function shoulder(p) {
  const a0=p.pelvis||0,a1=a0+(p.lumbar||0),a2=a1+(p.thorax||0);
  let q={x:p.x||0,y:p.y};
  q=add(q,add(mul(up(a0),28),mul(up(a0+90),-4)));
  q=add(q,mul(up(a1),39));
  return add(q,add(mul(up(a2),29.12+(p.scapE||0)),mul(up(a2+90),4+(p.scapP||0))));
}
function solve(A,C,l1,l2,bend=1) {
  const dx=C.x-A.x,dy=C.y-A.y,d0=Math.hypot(dx,dy);
  const d=Math.min(l1+l2-0.001,Math.max(Math.abs(l1-l2)+0.001,d0)),ux=dx/d0,uy=dy/d0;
  const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a));
  return {x:A.x+ux*a-uy*bend*h,y:A.y+uy*a+ux*bend*h};
}
// Unlike hand IK in the shared rig, this also solves a bent wrist accurately.
function arm(p,H,handAngle,opts={}) {
  const f=opts.f||1,ff=opts.ff||1,S=shoulder(p);
  const W=handAngle==null?H:add(H,mul(down(handAngle),-9*ff));
  const E=solve(S,W,64*f,(handAngle==null?59:50)*ff,opts.bend==null?1:opts.bend);
  const ua=Math.atan2(E.x-S.x,E.y-S.y)/RAD;
  const fa=Math.atan2(W.x-E.x,W.y-E.y)/RAD;
  return {sh:ua+(p.pelvis||0)+(p.lumbar||0)+(p.thorax||0),el:((fa-ua+540)%360)-180,wr:handAngle==null?0:handAngle-fa,f,ff};
}
const feet = (near,far=near) => ({ankle:{near:{...near,foot:near.foot||0},far:{...far,foot:far.foot||0}}});
// Dense keys preserve rigid machine arcs and wrist contacts under the shared numeric interpolator.
function cycle(make) {
  const poses={},keys=[];
  for(let t=0;t<=5950;t+=50) {
    const p=t<600||t>=5700?0:t<2800?(1-Math.cos(Math.PI*(t-600)/2200))/2:t<3300?1:(1+Math.cos(Math.PI*(t-3300)/2400))/2;
    const name='k'+t;poses[name]=make(p);keys.push({t,pose:name,p});
  }
  poses.start=make(0);poses.peak=make(1);
  return {poses,track:{keys}};
}
const CONTACT={x:-58.35,y:-30};
function prone(pelvis=80,thorax=0,lumbar=0) {
  const a1=pelvis+lumbar,a2=a1+thorax;
  const off=add(add(mul(up(pelvis),28),mul(up(pelvis+90),-4)),add(mul(up(a1),39),add(mul(up(a2),27),mul(up(a2+90),27.5))));
  return {x:CONTACT.x-off.x,y:CONTACT.y-off.y,pelvis,lumbar,thorax,neck:0,head:4,
    ik:feet({x:-325,y:2,foot:-163.5})};
}
const MACHINE={flat:{pivot:{x:73,y:-69},radius:145,a0:-34,a1:-8,body:{x:-65,y:-115,pelvis:0,lumbar:0,thorax:0}},
  incline:{pivot:{x:-78,y:-336},radius:132,a0:148,a1:121,body:{x:-36,y:-116,pelvis:-19,lumbar:0,thorax:0,neck:0,head:-3}}};
function pressPose(kind,p) {
  const m=MACHINE[kind],a=m.a0+(m.a1-m.a0)*p;
  const H=add(m.pivot,mul(up(a),m.radius)),body={...m.body,act:0.24+0.76*p,
    ik:feet({x:24,y:-14},{x:10,y:-14})};
  body.arms={near:arm(body,H),far:arm(body,H,null,{f:0.99,ff:0.99})};
  // Use exact H for both independent levers; near/far overlap is a side projection.
  body.arms.far={...body.arms.near};
  body.eq={pressAngle:a};return body;
}
module.exports={RAD,up,down,add,mul,shoulder,arm,feet,cycle,CONTACT,prone,MACHINE,pressPose};
