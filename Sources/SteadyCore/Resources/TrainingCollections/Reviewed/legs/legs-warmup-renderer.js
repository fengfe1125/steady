/* Original offline illustrations for the leg warm-up lessons. */
(() => {
  'use strict';
  const point = (x, y) => ({x, y});
  const polar = (o, length, angle) => point(o.x + Math.cos(angle) * length, o.y + Math.sin(angle) * length);
  const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const anchorDistance = (p, anchor) => {
    if(anchor?.type==='line'){
      const dx=anchor.to.x-anchor.from.x,dy=anchor.to.y-anchor.from.y,len2=dx*dx+dy*dy;
      if(!len2)return Infinity;
      const t=((p.x-anchor.from.x)*dx+(p.y-anchor.from.y)*dy)/len2;
      if(t<0||t>1)return Infinity;
      return Math.abs(dx*(anchor.from.y-p.y)-(anchor.from.x-p.x)*dy)/Math.sqrt(len2);
    }
    if(anchor?.type==='surface'){
      const dx=Math.max(anchor.x[0]-p.x,0,p.x-anchor.x[1]);
      const dy=Math.max(anchor.y[0]-p.y,0,p.y-anchor.y[1]);
      return Math.hypot(dx,dy);
    }
    return Infinity;
  };
  const lerp = (a, b, p) => a + (b - a) * p;
  const smooth = p => { const t = Math.max(0, Math.min(1, p)); return t * t * (3 - 2 * t); };
  const ik = (a,b,upper,lower,bend=1) => {
    const dx=b.x-a.x, dy=b.y-a.y, d=Math.max(0.001,Math.hypot(dx,dy));
    const safe=Math.min(d,upper+lower-0.001), along=(upper*upper-lower*lower+safe*safe)/(2*safe);
    const h=Math.sqrt(Math.max(0,upper*upper-along*along)), ux=dx/d, uy=dy/d;
    return point(a.x+ux*along-uy*h*bend,a.y+uy*along+ux*h*bend);
  };
  const chain = (id, names, j) => ({id, points:names.map(joint => ({joint, ...j[joint]})), segments:names.slice(1).map((joint, i) => ({from:names[i], to:joint, length:dist(j[names[i]],j[joint])}))});
  const specs = {
    'general': p => {
      const t = smooth(p), hip=point(210,190), shoulder=point(208,112), head=point(207,72);
      const leftHip=point(198,190), rightHip=point(222,190);
      const kneeL=polar(leftHip,61,1.40), ankleL=polar(kneeL,55,1.48), toeL=point(ankleL.x+Math.sqrt(27*27-(308-ankleL.y)**2),308);
      const kneeR=polar(rightHip,61,lerp(1.42,0.90,t)), ankleR=polar(kneeR,55,lerp(1.49,1.05,t));
      const groundFootAngle=Math.asin(Math.max(-1,Math.min(1,(308-ankleR.y)/27))), toeR=polar(ankleR,27,lerp(groundFootAngle,0.42,t));
      const j={head,shoulder,hip,pelvis:hip,elbowL:point(177,145),handL:point(165,174),elbowR:point(239,145),handR:point(252,172),leftHip,rightHip,kneeL,ankleL,toeL,kneeR,ankleR,toeR};
      const contacts=[['toeL','floorLine',8]];
      if(p===0)contacts.push(['toeR','floorLine',8]);
      return {j, defs:[['trunk',['head','shoulder','pelvis']],['leftArm',['shoulder','elbowL','handL']],['rightArm',['shoulder','elbowR','handR']],['leftLeg',['leftHip','kneeL','ankleL','toeL']],['rightLeg',['rightHip','kneeR','ankleR','toeR']]], contacts, anchors:{floorLine:{type:'line',from:point(20,308),to:point(400,308)}}, arrow: {from:point(296,253),to:point(296,253-28*t),label:'轻抬一侧膝'}};
    },
    'frog-rock': p => {
      const t=smooth(p), kneeTop=point(142,216), kneeBottom=point(142,94);
      const hipTop=polar(kneeTop,88,lerp(-0.77,-0.96,t)), hipBottom=polar(kneeBottom,88,lerp(0.77,0.96,t));
      const pelvis=point((hipTop.x+hipBottom.x)/2,(hipTop.y+hipBottom.y)/2);
      const shoulder=point(283,132), head=point(335,126);
      const ankleTop=point(kneeTop.x-63,kneeTop.y+8), ankleBottom=point(kneeBottom.x-63,kneeBottom.y-8);
      const handTop=point(336,181), handBottom=point(308,194);
      const j={head,shoulder,pelvis,hipTop,hipBottom,kneeTop,kneeBottom,ankleTop,ankleBottom,toeTop:point(ankleTop.x-24,ankleTop.y-5),toeBottom:point(ankleBottom.x-24,ankleBottom.y+5),elbowTop:point(301,177),handTop,elbowBottom:point(267,186),handBottom};
      return {j,defs:[['trunk',['head','shoulder','pelvis']],['nearArm',['shoulder','elbowBottom','handBottom']],['farArm',['shoulder','elbowTop','handTop']],['nearLeg',['hipBottom','kneeBottom','ankleBottom','toeBottom']],['farLeg',['hipTop','kneeTop','ankleTop','toeTop']]],contacts:[['elbowTop','matSurface',12],['handTop','matSurface',12],['elbowBottom','matSurface',12],['handBottom','matSurface',12],['kneeTop','matSurface',15],['kneeBottom','matSurface',15]],anchors:{matSurface:{type:'surface',x:[26,394],y:[75,280]}},arrow:{from:point(165,161),to:point(165-13*t,161),label:'臀部向后'}};
    },
    'hip-rotation': p => {
      const t=smooth(p), pelvis=point(210,155), shoulder=point(283,132), head=point(335,126);
      const hipTop=point(205,148), hipBottom=point(205,162), kneeTop=point(153,89), kneeBottom=point(153,221);
      const aTop=lerp(-2.8,-1.73,t), aBottom=lerp(2.8,1.73,t);
      const ankleTop=polar(kneeTop,62,aTop), ankleBottom=polar(kneeBottom,62,aBottom);
      const toeTop=polar(ankleTop,23,-2.95), toeBottom=polar(ankleBottom,23,2.95);
      const j={head,shoulder,pelvis,hipTop,hipBottom,kneeTop,kneeBottom,ankleTop,ankleBottom,toeTop,toeBottom,elbowTop:point(301,177),handTop:point(336,181),elbowBottom:point(267,186),handBottom:point(308,194)};
      return {j,defs:[['trunk',['head','shoulder','pelvis']],['nearArm',['shoulder','elbowBottom','handBottom']],['farArm',['shoulder','elbowTop','handTop']],['nearLeg',['hipBottom','kneeBottom','ankleBottom','toeBottom']],['farLeg',['hipTop','kneeTop','ankleTop','toeTop']]],contacts:[['elbowTop','matSurface',12],['handTop','matSurface',12],['elbowBottom','matSurface',12],['handBottom','matSurface',12],['kneeTop','matSurface',15],['kneeBottom','matSurface',15]],anchors:{matSurface:{type:'surface',x:[26,394],y:[75,280]}},arrow:{from:point(97,85),to:point(97-24*t,85+19*t),label:'脚绕膝轻转'}};
    },
    'lunge-rotation': p => {
      const t=smooth(p), pelvis=point(214,174), frontHip=point(205,175), backHip=point(224,177);
      const frontAnkle=point(294,277), frontToe=point(326,286), backAnkle=point(89,269), backToe=point(58,286);
      const frontKnee=point(287,198);
      const backKnee=point(backHip.x+(backAnkle.x-backHip.x)*0.53,backHip.y+(backAnkle.y-backHip.y)*0.53);
      const shoulder=polar(pelvis,65,lerp(-0.314,-0.259,t)), head=polar(shoulder,38,lerp(-0.55,-1.58,t));
      const baseHand=point(276,286), baseArmElbow=ik(shoulder,baseHand,68,68,1);
      const reachAngle=lerp(1.4,-1.6,t), liftedHand=polar(shoulder,132,reachAngle), liftedElbow=ik(shoulder,liftedHand,66,66,1);
      const j={head,shoulder,pelvis,frontHip,frontKnee,frontAnkle,frontToe,backHip,backKnee,backAnkle,backToe,elbowSupport:baseArmElbow,handSupport:baseHand,elbowLift:liftedElbow,handLift:liftedHand};
      return {j,defs:[['trunk',['head','shoulder','pelvis']],['supportArm',['shoulder','elbowSupport','handSupport']],['reachArm',['shoulder','elbowLift','handLift']],['frontLeg',['frontHip','frontKnee','frontAnkle','frontToe']],['backLeg',['backHip','backKnee','backAnkle','backToe']]],contacts:[['handSupport','floorLine',15],['frontToe','floorLine',10],['backToe','floorLine',10]],anchors:{floorLine:{type:'line',from:point(20,286),to:point(400,286)}},arrow:{from:point(164,76),to:point(145-15*t,60-20*t),label:'胸廓转开，手臂上举'}};
    },
    '90-90-switch': p => {
      const t=smooth(p), pelvis=point(210,185), shoulder=point(210,104), head=point(210,65);
      const leftHip=point(199,184), rightHip=point(221,184);
      const leftA=lerp(2.35,0.80,t), rightA=leftA;
      const leftKnee=polar(leftHip,61,leftA), rightKnee=polar(rightHip,61,rightA);
      const leftShin=leftA-Math.PI/2, rightShin=rightA+Math.PI/2;
      const leftAnkle=polar(leftKnee,55,leftShin), rightAnkle=polar(rightKnee,55,rightShin);
      const leftToe=polar(leftAnkle,20,leftShin), rightToe=polar(rightAnkle,20,rightShin);
      const elbowL=point(176,143), handL=point(170,177), elbowR=point(244,143), handR=point(250,177);
      const j={head,shoulder,pelvis,leftHip,rightHip,leftKnee,rightKnee,leftAnkle,rightAnkle,leftToe,rightToe,elbowL,handL,elbowR,handR};
      return {j,defs:[['trunk',['head','shoulder','pelvis']],['leftArm',['shoulder','elbowL','handL']],['rightArm',['shoulder','elbowR','handR']],['leftLeg',['leftHip','leftKnee','leftAnkle','leftToe']],['rightLeg',['rightHip','rightKnee','rightAnkle','rightToe']]],contacts:[['handL','matSurface',10],['handR','matSurface',10]],anchors:{matSurface:{type:'surface',x:[26,394],y:[75,280]}},arrow:{from:point(319,198),to:point(105+214*t,198),label:'双膝平顺换边'}};
    },
    '90-90-hip-rise': p => {
      const t=smooth(p), pelvis=point(210,lerp(218,174,t)), shoulder=polar(pelvis,78,-Math.PI/2), head=polar(shoulder,38,-Math.PI/2);
      const leftHip=point(pelvis.x-10,pelvis.y), rightHip=point(pelvis.x+10,pelvis.y),thigh=106;
      const spread=Math.sqrt(Math.max(0,thigh*thigh-(280-pelvis.y)**2));
      const kneeAL=point(leftHip.x-spread,280), kneeBR=point(rightHip.x+spread,280);
      const ankleAL=point(kneeAL.x-71,280), toeAL=point(ankleAL.x-22,280);
      const farFootAngle=-Math.PI*t, ankleBR=polar(kneeBR,71,farFootAngle), toeBR=point(ankleBR.x+22*Math.cos(farFootAngle),ankleBR.y+22*Math.sin(farFootAngle));
      const elbowL=point(shoulder.x-22,shoulder.y+35), elbowR=point(shoulder.x+22,shoulder.y+35);
      const handL=point(shoulder.x-3,shoulder.y+45), handR=point(shoulder.x+3,shoulder.y+45);
      const j={head,shoulder,pelvis,leftHip,rightHip,kneeAL,kneeBR,ankleAL,ankleBR,toeAL,toeBR,elbowL,elbowR,handL,handR};
      const contacts=[['kneeAL','kneelingLine',3],['kneeBR','kneelingLine',3],['ankleAL','kneelingLine',3],['toeAL','kneelingLine',3],['ankleBR','kneelingLine',3],['toeBR','kneelingLine',3]];
      return {j,defs:[['trunk',['head','shoulder','pelvis']],['leftArm',['shoulder','elbowL','handL']],['rightArm',['shoulder','elbowR','handR']],['leftLeg',['leftHip','kneeAL','ankleAL','toeAL']],['rightLeg',['rightHip','kneeBR','ankleBR','toeBR']]],contacts,anchors:{kneelingLine:{type:'line',from:point(20,280),to:point(400,280)}},arrow:{from:point(286,220),to:point(286,178-30*t),label:'膝部落垫后顶髋'}};
    },
    '90-90-leg-extension': p => {
      const t=smooth(p), rise=smooth(Math.min(1,t/0.55)), step=smooth(Math.max(0,(t-0.55)/0.45)),pelvis=point(210,lerp(218,174,rise)), shoulder=polar(pelvis,78,-Math.PI/2), head=polar(shoulder,38,-Math.PI/2);
      const leftHip=point(pelvis.x-10,pelvis.y), rightHip=point(pelvis.x+10,pelvis.y),thigh=106;
      const spread=Math.sqrt(Math.max(0,thigh*thigh-(280-pelvis.y)**2));
      const kneeAL=point(leftHip.x-spread,280);
      const seatedKneeBR=point(rightHip.x+spread,280);
      const targetKneeAngle=Math.atan2(41,Math.sqrt(thigh*thigh-41*41)),stepAngle=lerp(Math.PI/2,targetKneeAngle,step),kneeBR=t<=0.55?seatedKneeBR:polar(rightHip,thigh,stepAngle);
      const ankleAL=point(kneeAL.x-71,280), toeAL=point(ankleAL.x-22,280);
      const baseFootAngle=-Math.PI*rise,baseAnkleBR=polar(seatedKneeBR,71,baseFootAngle),baseToeBR=point(baseAnkleBR.x+22*Math.cos(baseFootAngle),baseAnkleBR.y+22*Math.sin(baseFootAngle));
      const toeFlightY=280-24*Math.sin(Math.PI*step),ankleDeltaY=toeFlightY-kneeBR.y,ankleHorizontal=Math.sqrt(Math.max(0,71*71-ankleDeltaY*ankleDeltaY));
      const stepAnkle=point(kneeBR.x-ankleHorizontal,toeFlightY),stepToe=polar(stepAnkle,22,Math.PI+Math.PI*step);
      const ankleBR=t<=0.55?baseAnkleBR:stepAnkle,toeBR=t<=0.55?baseToeBR:stepToe;
      const elbowL=point(shoulder.x-22,shoulder.y+35), elbowR=point(shoulder.x+22,shoulder.y+35);
      const handL=point(shoulder.x-3,shoulder.y+45), handR=point(shoulder.x+3,shoulder.y+45);
      const j={head,shoulder,pelvis,leftHip,rightHip,kneeAL,kneeBR,ankleAL,ankleBR,toeAL,toeBR,elbowL,elbowR,handL,handR};
      const contacts=[['kneeAL','kneelingLine',3],['kneeBR','kneelingLine',3],['ankleAL','kneelingLine',3],['toeAL','kneelingLine',3],['ankleBR','kneelingLine',3],['toeBR','kneelingLine',3]];
      return {j,defs:[['trunk',['head','shoulder','pelvis']],['leftArm',['shoulder','elbowL','handL']],['rightArm',['shoulder','elbowR','handR']],['leftLeg',['leftHip','kneeAL','ankleAL','toeAL']],['rightLeg',['rightHip','kneeBR','ankleBR','toeBR']]],contacts,anchors:{kneelingLine:{type:'line',from:point(20,280),to:point(400,280)}},arrow:{from:point(243,245),to:point(300+45*step,220-12*step),label:'抬脚跨前，前脚落地'}};
    }
  };
  const labels={general:'原地轻步：轻抬一侧脚，左右交替', 'frog-rock':'青蛙式前后摇：骨盆小幅移动', 'hip-rotation':'青蛙趴髋内旋：脚围绕膝轻抬轻转', 'lunge-rotation':'弓步转体：胸廓转开，手臂向上', '90-90-switch':'90/90髋切换：双膝一起换边', '90-90-hip-rise':'90/90顶髋：由坐姿转到跪姿', '90-90-leg-extension':'顶髋后跨腿：腿跨到身体前方'};
  function draw(pose) {
    if(typeof document==='undefined') return;
    const svg=document.querySelector('[data-artwork]'); if(!svg)return;
    const figure=svg.querySelector('#figure'), j=pose.joints;
    if(!figure)return;
    const lineMarkup=pose.chains.flatMap(c=>c.segments).map(s=>`<line class="bone" data-from="${s.from}" data-to="${s.to}" x1="${j[s.from].x}" y1="${j[s.from].y}" x2="${j[s.to].x}" y2="${j[s.to].y}"/>`).join('');
    const jointMarkup=Object.entries(j).map(([name,v])=>`<circle class="joint" data-joint="${name}" cx="${v.x}" cy="${v.y}" r="${name==='head'?18:4.2}"/>`).join('');
    figure.innerHTML=lineMarkup+jointMarkup;
    const touch=svg.querySelector('#contacts'); if(touch)touch.innerHTML=pose.contacts.filter(c=>c.attached).map(c=>`<circle class="contact" cx="${c.point.x}" cy="${c.point.y}" r="${Math.max(4,c.tolerance/2)}"/>`).join('');
    const arrows=svg.querySelector('#arrows'); if(arrows){const a=pose.arrow;const labelPlacement={'frog-rock':{x:274,y:63},'hip-rotation':{x:278,y:63},'90-90-switch':{x:285,y:63},'90-90-leg-extension':{x:258,y:63}}[pose.exercise];const labelX=labelPlacement?.x??Math.min(a.from.x,a.to.x),labelY=labelPlacement?.y??Math.min(a.from.y,a.to.y)-9;arrows.innerHTML=`<path class="arrow" d="M${a.from.x} ${a.from.y} Q${(a.from.x+a.to.x)/2} ${(a.from.y+a.to.y)/2-8} ${a.to.x} ${a.to.y}" marker-end="url(#tip)"/><text class="arrow-label" x="${labelX}" y="${labelY}">${a.label}</text>`;}
    const cue=document.getElementById('motion-cue'); if(cue)cue.textContent=labels[pose.exercise]||'';
    const phase=document.getElementById('phase'); if(phase)phase.textContent=pose.progress<0.03?'准备':pose.progress>0.97?'活动终点':pose.progress>0.48?'活动中':'活动中';
  }
  function renderEquipment(progress=0){
    const p=Math.max(0,Math.min(1,Number(progress)||0));
    const id=(typeof document!=='undefined'&&document.body?.dataset?.exercise)||'general';
    const raw=(specs[id]||specs.general)(p), joints=raw.j;
    const chains=raw.defs.map(([name,names])=>chain(name,names,joints));
    const contacts=raw.contacts.map(([joint,anchor,tolerance])=>{
      const contactPoint={...joints[joint]},distance=anchorDistance(contactPoint,raw.anchors[anchor]);
      return {joint,anchor,tolerance,point:contactPoint,distance,attached:Number.isFinite(distance)&&distance<=tolerance};
    });
    const pose={exercise:id,progress:p,joints,pose:{key:id,phase:p<0.02?'prepare':p>0.98?'end':'moving'},chains,contacts,anchors:raw.anchors,arrow:raw.arrow};
    draw(pose); return pose;
  }
  window.renderEquipment=renderEquipment;
  if(typeof document!=='undefined')renderEquipment(0);
})();
