// Build-time geometry uses the shared rig; no runtime or native protocol is replaced.
import fs from 'node:fs';
import vm from 'node:vm';
const context={};context.globalThis=context;
vm.createContext(context);
for(const file of ['00-core.js','10-rig.js']) vm.runInContext(fs.readFileSync(new URL('../../../engine/'+file,import.meta.url),'utf8'),context);
const {rig:R,util:U}=context.SteadyAnatomy;
export const side=p=>R.merge(structuredClone(R.SIDE_DEFAULT),structuredClone(p));
export const front=p=>R.merge(structuredClone(R.FRONT_DEFAULT),structuredClone(p));
export const joints=p=>R.sideJoints(side(p));
export function shoulderLocked(p,S={x:0,y:-335}){
  const q=side(p),s=joints(q).shoulder;q.x+=S.x-s.x;q.y+=S.y-s.y;return q;
}
export function handContacts(p,targets,flat=false){
  const q=side(p);
  if(flat){
    const j=R.sideJoints(q);
    for(const [k,t] of Object.entries(targets)){
      const arm=q.arms[k],f=arm.f??1,ff=arm.ff??1;
      const W={x:t.x-9*ff,y:t.y};
      const sol=U.solve2(j.shoulder,W,64*f,50*ff,t.bend??1);
      const a=U.angleFromDown(U.sub(sol.mid,j.shoulder)),b=U.angleFromDown(U.sub(sol.end,sol.mid));
      let e=b-a;while(e>180)e-=360;while(e<-180)e+=360;
      q.arms[k]=Object.assign({},arm,{sh:a+j.angles.thorax,el:e,wr:90-b});
    }
    if(q.ik) delete q.ik.hand;
    return q;
  }
  q.ik=R.merge(q.ik||{},{hand:targets});
  const solved=R.applyIK('side',q,q.ik);
  const wrap=Object.keys(targets).some(k=>solved.arms[k].el < -8 || solved.arms[k].el > 156);
  if(wrap){
    for(const k of Object.keys(targets)){
      let a=solved.arms[k].el;while(a>180)a-=360;while(a<-180)a+=360;
      q.arms[k]=Object.assign({},solved.arms[k],{el:a});
    }
    delete q.ik.hand;
  }
  return q;
}
export const feet={near:{x:115,y:-19,foot:0,bend:-1},far:{x:102,y:-19,foot:0,bend:-1}};
export function supine(p={}){
  return side(R.merge({x:0,y:-36,pelvis:-90,neck:-14,head:0,
    ik:{ankle:feet},arms:{near:{sh:10,el:12},far:{sh:10,el:12}}},p));
}
export function headHands(p,spread=0){
  const j=joints(p),h=j.headPivot;
  const q=handContacts(p,{near:{x:h.x-5,y:h.y-12,bend:1},far:{x:h.x-5+spread,y:h.y-14,bend:1}});
  // Store the solved angles: a hand IK target kept only on the start pose survives blending
  // and pinned the hands to the start head position while the head lifted.
  if(q.ik&&q.ik.hand){q.arms=R.applyIK('side',q,q.ik).arms;delete q.ik.hand;}
  // One angle range for every pose (-250° and 110° are the same arm) so blends never sweep a full turn.
  for(const arm of Object.values(q.arms)){while(arm.sh>180)arm.sh-=360;while(arm.sh<=-180)arm.sh+=360;}
  return q;
}
export function kneel(p={}){
  const {x=-60,kx=-60,ky=-17,...rest}=p;
  const a=Math.asin((kx-x)/87)/U.RAD,y=ky-87*Math.cos(a*U.RAD);
  const q=side({...rest,x,y});
  q.legs={near:{hip:a+q.pelvis,knee:a+90,ankle:80},far:{hip:a+q.pelvis,knee:a+90,ankle:80}};
  q.ik=R.merge(q.ik||{},{ankle:{near:{x:kx-88,y:ky,foot:-170,bend:-1},far:{x:kx-88,y:ky,foot:-170,bend:-1}}});
  return q;
}
export function raisedLegs(p={}){
  return {near:{hip:p.hip??80,knee:p.knee??12,ankle:p.ankle??25},far:{hip:p.hip??80,knee:p.knee??12,ankle:p.ankle??25}};
}
export function frontHeadArms(p){
  const q=front(p),j=R.frontJoints(q);
  for(const s of ['r','l']){
    const sign=s==='r'?1:-1,T=U.add(j.headPivot,{x:sign*17,y:9});
    const S=j.arms[s].S,sol=U.solve2(S,T,64,59,sign);
    const a=U.angleFromDown(U.sub(sol.mid,S)),b=U.angleFromDown(U.sub(sol.end,sol.mid));
    let el=sign*(b-a);while(el>180)el-=360;while(el<-180)el+=360;
    q.arms[s]={abd:sign*(a-(q.lean||0)),el};
  }
  return q;
}
export const mat={type:'mat',x:-210,length:430};
