/* Original, self-contained leg-exercise illustrations for the Steady lesson preview. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const L = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const mix = (a, b, p) => a + (b - a) * p;
  const pt = (x, y) => ({ x, y });
  const polar = (o, len, angle) => pt(o.x + Math.cos(angle) * len, o.y + Math.sin(angle) * len);
  const distanceTo = (point, anchor) => {
    if(anchor?.from&&anchor?.to){const dx=anchor.to.x-anchor.from.x,dy=anchor.to.y-anchor.from.y,den=dx*dx+dy*dy;const t=Math.max(0,Math.min(1,((point.x-anchor.from.x)*dx+(point.y-anchor.from.y)*dy)/den));return L(point,pt(anchor.from.x+t*dx,anchor.from.y+t*dy));}
    return L(point,anchor);
  };
  const chainsFrom = (joints, definitions) => definitions.map(([id, names]) => ({
    id, points: names.map(name => ({ joint: name, ...joints[name] })),
    segments: names.slice(1).map((name, i) => ({ from: names[i], to: name, length: L(joints[names[i]], joints[name]) }))
  }));
  const IK = (a, b, upper, lower, bend = 1) => {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.max(0.001, Math.hypot(dx, dy));
    const safeD = Math.min(d, upper + lower - 0.001);
    const along = (upper * upper - lower * lower + safeD * safeD) / (2 * safeD);
    const h = Math.sqrt(Math.max(0, upper * upper - along * along));
    const ux = dx / d, uy = dy / d;
    return pt(a.x + ux * along - uy * h * bend, a.y + uy * along + ux * h * bend);
  };
  const definitions = {
    'calf-raise': (p) => {
      const toe=pt(226,278), ankle=polar(toe,36,mix(-2.95,-2.45,p));
      const knee=pt(ankle.x-3,ankle.y-48), hip=pt(knee.x-2,knee.y-49);
      const rise=174-hip.y;
      const shoulder=pt(hip.x+6,91-rise), elbow=pt(shoulder.x+17,132-rise), hand=pt(elbow.x,169-rise);
      const j = {head:pt(shoulder.x-7,52-rise),shoulder,elbow,hand,hip,knee,ankle,toe};
      return { j, chains: [['trunk',['head','shoulder','hip']],['arm',['shoulder','elbow','hand']],['leg',['hip','knee','ankle','toe']]], contacts: [['toe','floor',8]], anchors: {floor:pt(226,278)} };
    },
    'hip-adduction': (p) => {
      // Drawing-only 3D rig: lateral x, height y, machine-forward z. Angles are illustrative, not measured from the cropped source frames.
      const v3=(x,y,z)=>({x,y,z}), add3=(a,b)=>v3(a.x+b.x,a.y+b.y,a.z+b.z), sub3=(a,b)=>v3(a.x-b.x,a.y-b.y,a.z-b.z), mul3=(a,s)=>v3(a.x*s,a.y*s,a.z*s);
      const len3=a=>Math.hypot(a.x,a.y,a.z), unit3=a=>mul3(a,1/len3(a)), dist3=(a,b)=>len3(sub3(a,b));
      const project=a=>pt(170+a.x*50+a.z*120,175-a.y*90+a.z*18);
      const sideProject=a=>pt(110+a.z*70+a.x*14,333-a.y*70);
      const hipL3=v3(-0.18,1.00,0), hipR3=v3(0.18,1.00,0), pelvis3=v3(0,0.99,0);
      const shoulder3=v3(0,1.20,-0.88), head3=v3(0,1.32,-1.16);
      const elbowL3=v3(-0.29,1.01,-0.43), handL3=v3(-0.43,1.00,-0.02);
      const elbowR3=v3(0.29,1.01,-0.43), handR3=v3(0.43,1.00,-0.02);
      const opening=mix(40,18,p)*Math.PI/180, thighLength=0.68, verticalDrop=0.16;
      const radial=Math.sqrt(thighLength*thighLength-verticalDrop*verticalDrop);
      const kneeL3=v3(hipL3.x-radial*Math.sin(opening),hipL3.y-verticalDrop,radial*Math.cos(opening));
      const kneeR3=v3(hipR3.x+radial*Math.sin(opening),hipR3.y-verticalDrop,radial*Math.cos(opening));
      const flex=Math.PI*113/180, shinLength=0.52;
      const shinFrom=(hip,knee)=>{
        const towardHip=unit3(sub3(hip,knee)), yz=Math.hypot(towardHip.y,towardHip.z);
        const q=Math.cos(flex)/yz, side=Math.sqrt(Math.max(0,1-q*q));
        const vy=towardHip.y/yz, vz=towardHip.z/yz;
        const direction=v3(0,q*vy+side*vz,q*vz-side*vy);
        return add3(knee,mul3(direction,shinLength));
      };
      const ankleL3=shinFrom(hipL3,kneeL3), ankleR3=shinFrom(hipR3,kneeR3);
      const toeL3=add3(ankleL3,v3(0,0,0.23)), toeR3=add3(ankleR3,v3(0,0,0.23));
      const footSupportL3=mul3(add3(ankleL3,toeL3),0.5), footSupportR3=mul3(add3(ankleR3,toeR3),0.5);
      const medialPadL3=v3(kneeL3.x+0.055,kneeL3.y+0.02,kneeL3.z), medialPadR3=v3(kneeR3.x-0.055,kneeR3.y+0.02,kneeR3.z);
      const pivot3=v3(0,0.65,0.20);
      const joints3D={head:head3,shoulder:shoulder3,elbowL:elbowL3,handL:handL3,elbowR:elbowR3,handR:handR3,pelvis:pelvis3,hipL:hipL3,hipR:hipR3,kneeL:kneeL3,kneeR:kneeR3,ankleL:ankleL3,ankleR:ankleR3,toeL:toeL3,toeR:toeR3,padL:medialPadL3,padR:medialPadR3,pivot:pivot3,footSupportL:footSupportL3,footSupportR:footSupportR3};
      const j=Object.fromEntries(Object.entries(joints3D).map(([name,point])=>[name,project(point)]));
      const sideJoints=Object.fromEntries(Object.entries(joints3D).map(([name,point])=>[name,sideProject(point)]));
      const chains=[['trunk',['head','shoulder','pelvis']],['pelvis',['hipL','pelvis','hipR']],['leftArm',['shoulder','elbowL','handL']],['rightArm',['shoulder','elbowR','handR']],['leftLeg',['hipL','kneeL','ankleL','toeL']],['rightLeg',['hipR','kneeR','ankleR','toeR']]];
      const sideChainsDef=[['sideTrunk',['head','shoulder','pelvis']],['sideArm',['shoulder','elbowR','handR']],['sideLeg',['hipR','kneeR','ankleR','toeR']]];
      const make3DChains=points=>chains.map(([id,names])=>({id,segments:names.slice(1).map((name,i)=>({from:names[i],to:name,length:dist3(points[names[i]],points[name])}))}));
      const chains3D=make3DChains(joints3D), sideChains=chainsFrom(sideJoints,sideChainsDef);
      const padContactL=v3(kneeL3.x+0.035,kneeL3.y+0.02,kneeL3.z), padContactR=v3(kneeR3.x-0.035,kneeR3.y+0.02,kneeR3.z);
      const anchors3D={seat:pelvis3,leftHandle:handL3,rightHandle:handR3,leftPad:padContactL,rightPad:padContactR,footSupportL:footSupportL3,footSupportR:footSupportR3,pivot:pivot3};
      const contacts3D=[['pelvis','seat',0,true],['handL','leftHandle',0,true],['handR','rightHandle',0,true],['kneeL','leftPad',0.05,false],['kneeR','rightPad',0.05,false],['toeL','footSupportL',0.13,true],['toeR','footSupportR',0.13,true]].map(([joint,anchor,tolerance,sourceVisible])=>({joint,anchor,point:joints3D[joint],distance:dist3(joints3D[joint],anchors3D[anchor]),tolerance,attached:dist3(joints3D[joint],anchors3D[anchor])<=tolerance+1e-8,sourceVisible}));
      const padScreenL=project(padContactL), padScreenR=project(padContactR), seatScreen=project(pelvis3), leftHandle=project(handL3), rightHandle=project(handR3);
      const anchors={seat:seatScreen,leftHandle,rightHandle,leftPad:padScreenL,rightPad:padScreenR,footSupportL:project(footSupportL3),footSupportR:project(footSupportR3),pivot:project(pivot3)};
      const contacts=[['pelvis','seat',0],['handL','leftHandle',0],['handR','rightHandle',0],['kneeL','leftPad',5],['kneeR','rightPad',5],['toeL','footSupportL',15],['toeR','footSupportR',15]];
      return {j,chains,contacts,anchors,joints3D,chains3D,sideJoints,sideChains,contacts3D,anchors3D,sourceEvidence:{posture:'visually observed',kneeAngleExact:false,padContactExact:false,fullCycleBoundary:false},drawingParameters:{thighLength,kneeFlexDegrees:113,openingDegrees:{start:40,end:18},projection:{lateral:50,forward:120},sideProjection:{forward:70,vertical:70},footSupportCenter:"ankle-toe midpoint"}};
    },
    'bulgarian-split-squat': (p) => {
      const frontAnkle = pt(149,272), frontKnee = pt(149,202);
      const hip = polar(frontKnee,70,mix(-Math.PI/2,0,p));
      const backAnkle = pt(302,186);
      const rearHip=pt(hip.x+9,hip.y+3), rearKnee = IK(rearHip,backAnkle,78,78,1);
      const shoulder = pt(hip.x-4,hip.y-72), elbow = pt(shoulder.x-17,shoulder.y+37), hand=pt(elbow.x+5,elbow.y+26);
      const j={head:pt(shoulder.x-4,shoulder.y-28),shoulder,elbow,hand,hip,knee:frontKnee,ankle:frontAnkle,toe:pt(113,279),
        rearHip,rearKnee, rearAnkle:backAnkle,rearToe:pt(backAnkle.x+12,backAnkle.y+8)};
      return {j,chains:[['trunk',['head','shoulder','hip']],['frontArm',['shoulder','elbow','hand']],['frontLeg',['hip','knee','ankle','toe']],['rearLeg',['rearHip','rearKnee','rearAnkle','rearToe']]],contacts:[['toe','floor',5],['rearAnkle','rearFootRoller',0]],anchors:{floor:{from:pt(0,284),to:pt(420,284)},rearFootRoller:pt(302,186),seat:pt(302,186)}};
    },
    'dumbbell-rdl': (p) => {
      const knee=pt(230,200), ankle=pt(232,269), toe=pt(256,278);
      const hip=polar(knee,70,mix(-2.0,-2.45,p));
      const angle=mix(-Math.PI/2,-0.65,p);
      const shoulder=polar(hip,76,angle), head=polar(shoulder,30,angle-0.08);
      const elbow=pt(shoulder.x,shoulder.y+52), hand=pt(shoulder.x,shoulder.y+105);
      const farShoulder=pt(shoulder.x+16,shoulder.y+2), farElbow=pt(farShoulder.x,farShoulder.y+52), farHand=pt(farShoulder.x,farShoulder.y+105);
      const farHip=pt(hip.x+18,hip.y+1), farKnee=pt(knee.x+18,knee.y+1), farAnkle=pt(ankle.x+18,ankle.y), farToe=pt(toe.x+18,toe.y+1);
      const dumbbell=pt(hand.x,hand.y+13), farDumbbell=pt(farHand.x,farHand.y+13);
      const j={head,shoulder,elbow,hand,farShoulder,farElbow,farHand,hip,knee,ankle,toe,otherHip:farHip,otherKnee:farKnee,otherAnkle:farAnkle,otherToe:farToe,dumbbell,farDumbbell};
      return {j,chains:[['trunk',['head','shoulder','hip']],['arm',['shoulder','elbow','hand']],['farArm',['farShoulder','farElbow','farHand']],['leg',['hip','knee','ankle','toe']],['farLeg',['otherHip','otherKnee','otherAnkle','otherToe']],['weight',['hand','dumbbell']],['farWeight',['farHand','farDumbbell']]],contacts:[['toe','floor',1.5],['otherToe','floor',1.5]],anchors:{floor:{from:pt(0,279),to:pt(420,279)},weight:pt(j.dumbbell.x,j.dumbbell.y),farWeight:pt(j.farDumbbell.x,j.farDumbbell.y)}};
    },
    'hip-flexion': (p) => {
      // Illustrative sagittal rig: hip flexion raises the femur while the knee opens; all segment lengths stay fixed.
      const hip=pt(171,186), hipFlexionDegrees=mix(0,41,p), kneeInteriorDegrees=mix(108,146,p);
      const hipAngle=-hipFlexionDegrees*Math.PI/180, knee=polar(hip,65,hipAngle);
      const shinAngle=hipAngle+Math.PI-kneeInteriorDegrees*Math.PI/180;
      const ankle=polar(knee,69,shinAngle), toe=polar(ankle,37,0.18);
      const shoulder=pt(142,106), head=pt(132,72), elbow=pt(151,146), hand=pt(152,179);
      const farHip=pt(hip.x+12,hip.y+2), farKnee=polar(farHip,65,hipAngle), farAnkle=polar(farKnee,69,shinAngle), farToe=polar(farAnkle,37,0.18);
      const sourceEvidence={sourceWindow:'45:52-46:08 sampled at mean 4 fps',sampledLiftAndReturnVisible:true,kneeExtensionVisible:true,kneeAngleExact:false,hipAngleExact:false,rangeOfMotionExact:false,continuousContactExact:false,fullLessonCycleEstablished:false};
      const drawingParameters={illustrative:true,femurLength:65,lowerLegLength:69,footLength:37,hipFlexionDegrees:{start:0,end:41},kneeInteriorAngleDegrees:{start:108,end:146}};
      return {j:{head,shoulder,elbow,hand,hip,knee,ankle,toe,otherHip:farHip,otherKnee:farKnee,otherAnkle:farAnkle,otherToe:farToe},chains:[['trunk',['head','shoulder','hip']],['arm',['shoulder','elbow','hand']],['leg',['hip','knee','ankle','toe']],['farLeg',['otherHip','otherKnee','otherAnkle','otherToe']]],contacts:[['hip','seat',6],['hand','handle',7]],anchors:{seat:{from:pt(145,191),to:pt(247,191)},handle:pt(152,179),ankleRoller:pt((ankle.x+farAnkle.x)/2,(ankle.y+farAnkle.y)/2),pivot:pt(230,214),floor:{from:pt(0,311),to:pt(420,311)}},sourceEvidence,drawingParameters};
    },
    'prone-leg-curl': (p) => {
      const shoulder=pt(154,210), head=pt(120,202), hip=pt(226,221), knee=pt(291,228);
      const shinAngle=mix(0.31,-1.12,p), ankle=polar(knee,59,shinAngle), toe=polar(ankle,27,shinAngle+0.60);
      const elbow=pt(179,260), hand=pt(206,266), farKnee=pt(291,238), farShinAngle=shinAngle,farAnkle=polar(farKnee,59,farShinAngle),farToe=polar(farAnkle,27,farShinAngle+0.60);
      return {j:{head,shoulder,elbow,hand,hip,knee,ankle,toe,otherHip:pt(226,232),otherKnee:farKnee,otherAnkle:farAnkle,otherToe:farToe},chains:[['trunk',['head','shoulder','hip']],['arm',['shoulder','elbow','hand']],['leg',['hip','knee','ankle','toe']],['farLeg',['otherHip','otherKnee','otherAnkle','otherToe']]],contacts:[['shoulder','pad',6],['hip','hipPad',6],['ankle','ankleRoller',8],['otherAnkle','ankleRoller',17],['hand','handle',7]],anchors:{bench:pt(206,252),pad:{from:pt(104,215),to:pt(159,215)},hipPad:pt(226,226),ankleRoller:pt(ankle.x,ankle.y),pivot:pt(282,232),handle:pt(206,266),floor:pt(318,300)}};
    }
  };
  const labels={
    'calf-raise':'踝关节跖屈｜脚掌前缘稳定', 'hip-adduction':'髋关节内收｜膝向中线合拢',
    'bulgarian-split-squat':'髋、膝屈伸｜后脚由滚垫承托', 'dumbbell-rdl':'髋铰链｜膝角度小幅保持',
    'hip-flexion':'髋屈主导抬腿｜膝随动逐步伸展' , 'prone-leg-curl':'膝屈曲｜大腿贴稳长凳'
  };
  let lastProgress=0,hasProgress=false;
  function drawHipAdduction(svg,pose){
    const j=pose.joints, side=pose.sideJoints;
    const paint=(group,points,chains)=>{if(!group)return;const lines=chains.flatMap(c=>c.segments.map(({from,to})=>`<line class="bone chain-${c.id}" x1="${points[from].x}" y1="${points[from].y}" x2="${points[to].x}" y2="${points[to].y}"/>`)).join('');const pelvis=points.pelvis?`<ellipse class="pelvis-shape" cx="${points.pelvis.x}" cy="${points.pelvis.y}" rx="16" ry="8"/>`:'';const circles=Object.entries(points).filter(([name])=>!name.startsWith('pad')&&!name.startsWith('footSupport')&&name!=='pivot').map(([name,v])=>`<circle class="joint" data-joint="${name}" cx="${v.x}" cy="${v.y}" r="${name==='head'?14:3.5}"/>`).join('');group.innerHTML=lines+pelvis+circles;};
    paint(svg.querySelector('#figure'),j,pose.chains);
    const sideNames=new Set(['head','shoulder','pelvis','hipR','elbowR','handR','kneeR','ankleR','toeR','padR','footSupportR','pivot']);
    const singleSide=Object.fromEntries(Object.entries(side).filter(([name])=>sideNames.has(name)));
    paint(svg.querySelector('#side-figure'),singleSide,pose.sideChains);
    for(const [selector,key] of [['#moving-pad-left','padL'],['#moving-pad-right','padR'],['#moving-foot-support-left','footSupportL'],['#moving-foot-support-right','footSupportR']]){const el=svg.querySelector(selector),v=j[key];if(el&&v)el.setAttribute('transform',`translate(${v.x} ${v.y})`);}
    for(const [selector,key] of [['#side-moving-pad','padR'],['#side-moving-foot-support','footSupportR']]){const el=svg.querySelector(selector),v=side[key];if(el&&v)el.setAttribute('transform',`translate(${v.x} ${v.y})`);}
    const pivot=j.pivot,sidePivot=pose.sideJoints.pivot;
    for(const [selector,target] of [['#moving-lever-left',j.footSupportL],['#moving-lever-right',j.footSupportR]]){const el=svg.querySelector(selector);if(el&&pivot&&target){el.setAttribute('x1',pivot.x);el.setAttribute('y1',pivot.y);el.setAttribute('x2',target.x);el.setAttribute('y2',target.y);}}
    const sideLever=svg.querySelector('#side-moving-lever');if(sideLever&&sidePivot&&side.footSupportR){sideLever.setAttribute('x1',sidePivot.x);sideLever.setAttribute('y1',sidePivot.y);sideLever.setAttribute('x2',side.footSupportR.x);sideLever.setAttribute('y2',side.footSupportR.y);}
    const padLeader=svg.querySelector('#adduction-pad-leader');if(padLeader)padLeader.setAttribute('d',`M310 59L${j.padR.x+11} ${j.padR.y-18}`);
    const footLeader=svg.querySelector('#adduction-foot-leader');if(footLeader)footLeader.setAttribute('d',`M326 177L${j.footSupportR.x+16} ${j.footSupportR.y+7}`);
    const cue=svg.querySelector('#motion-cue');if(cue)cue.textContent=labels['hip-adduction'];
    const returning=hasProgress&&pose.progress<lastProgress-0.001;lastProgress=pose.progress;hasProgress=true;
    const phase=svg.querySelector('#phase');if(phase)phase.textContent=pose.progress<0.03?'准备':pose.progress>0.97?'动作终点':returning?'控制回程':'活动中';
    const activeStep=pose.progress>0.97?2:(returning?3:(pose.progress>0.03?1:0));document.querySelectorAll?.('[data-step]').forEach((step,index)=>step.setAttribute('data-active',String(index===activeStep)));
    const startL=pose.openPose?.kneeL||j.kneeL,endL=pose.closedPose?.kneeL||j.kneeL,startR=pose.openPose?.kneeR||j.kneeR,endR=pose.closedPose?.kneeR||j.kneeR;
    const arrows=svg.querySelector('#arrows');if(arrows)arrows.innerHTML=`<path d="M${startL.x} ${startL.y}L${endL.x} ${endL.y}" class="arrow" marker-end="url(#tip)"/><path d="M${startR.x} ${startR.y}L${endR.x} ${endR.y}" class="arrow" marker-end="url(#tip)"/><text x="278" y="214" class="arrow-label">大腿向中线合拢</text>`;
  }
  function draw(pose, id) {
    const p=pose.progress;
    const svg=document.querySelector('[data-artwork]'); if(!svg) return;
    if(id==='hip-adduction'){drawHipAdduction(svg,pose);return;}
    const group=svg.querySelector('#figure'); if(!group) return;
    const j=pose.joints;
    const lines=pose.chains.flatMap(chain=>chain.segments.map(({from,to})=>`<line class="bone chain-${chain.id}" x1="${j[from].x}" y1="${j[from].y}" x2="${j[to].x}" y2="${j[to].y}" />`)).join('');
    const pelvis=j.pelvis||j.hip||((j.hipL&&j.hipR)?pt((j.hipL.x+j.hipR.x)/2,(j.hipL.y+j.hipR.y)/2):null);
    const pelvisShape=pelvis?`<ellipse class="pelvis-shape" cx="${pelvis.x}" cy="${pelvis.y}" rx="15" ry="8"/>`:'';
    const circles=Object.entries(j).map(([name,v])=>`<circle class="joint" data-joint="${name}" cx="${v.x}" cy="${v.y}" r="${name==='head'?16:4.1}" />`).join('');
    group.innerHTML=lines+pelvisShape+circles;
    const padL=svg.querySelector('#moving-pad-left'), padR=svg.querySelector('#moving-pad-right');
    if(padL&&j.kneeL)padL.setAttribute('transform',`translate(${j.kneeL.x} ${j.kneeL.y})`);
    if(padR&&j.kneeR)padR.setAttribute('transform',`translate(${j.kneeR.x} ${j.kneeR.y})`);
    const roller=svg.querySelector('#moving-roller');
    if(roller&&j.ankle){roller.setAttribute('transform',`translate(${j.ankle.x} ${j.ankle.y})`);}
    if(roller&&j.otherAnkle){roller.setAttribute('transform',`translate(${(j.ankle.x+j.otherAnkle.x)/2} ${(j.ankle.y+j.otherAnkle.y)/2})`);}
    const lever=svg.querySelector('#moving-lever');
    if(lever&&j.ankle&&j.otherAnkle){lever.setAttribute('x2',(j.ankle.x+j.otherAnkle.x)/2);lever.setAttribute('y2',(j.ankle.y+j.otherAnkle.y)/2);}
    const weight=svg.querySelector('#moving-weight');
    if(weight&&j.dumbbell)weight.setAttribute('transform',`translate(${j.dumbbell.x} ${j.dumbbell.y})`);
    const farWeight=svg.querySelector('#moving-weight-far');
    if(farWeight&&j.farDumbbell)farWeight.setAttribute('transform',`translate(${j.farDumbbell.x} ${j.farDumbbell.y})`);
    const cue=svg.querySelector('#motion-cue'); if(cue) cue.textContent=labels[id];
    const returning=hasProgress&&p<lastProgress-0.001;
    lastProgress=p;hasProgress=true;
    const phase=svg.querySelector('#phase'); if(phase) phase.textContent=p<0.03?'准备':p>0.97?'动作终点':returning?'控制回程':'活动中';
    const activeStep=p>0.97?2:(returning?3:(p>0.03?1:0));
    document.querySelectorAll?.('[data-step]').forEach((step,index)=>step.setAttribute('data-active',String(index===activeStep)));
    const arrows=svg.querySelector('#arrows'); if(arrows) arrows.innerHTML=id==='hip-flexion'?hipFlexionArrowMarkup(pose):arrowMarkup(id,p,pose);
  }
  function hipFlexionArrowMarkup(pose){
    const j=pose.joints;
    return `<g data-motion-annotation="hip-flexion"><path d="M252 88L${j.knee.x+9} ${j.knee.y-10}" class="arrow" marker-end="url(#tip)"/><text x="225" y="76" class="arrow-label">髋屈抬腿 · 膝随动伸展</text></g>`;
  }
  function arrowMarkup(id,p,pose){
    if(id==='calf-raise') return `<path d="M246 269V${255-8*p}" class="arrow" marker-end="url(#tip)"/><text x="250" y="250" class="arrow-label">脚跟上提</text>`;
    if(id==='hip-adduction') return `<path d="M126 211L${154+24*p} 211M294 211L${266-24*p} 211" class="arrow" marker-end="url(#tip)"/><text x="156" y="198" class="arrow-label">向中间</text>`;
    if(id==='bulgarian-split-squat') return `<path d="M338 218V${174+31*p}" class="arrow" marker-end="url(#tip)"/><text x="342" y="190" class="arrow-label">髋部升降</text>`;
    if(id==='dumbbell-rdl') {
      const {hip,farDumbbell}=pose.joints;
      return `<g data-motion-annotation="rdl"><path d="M${hip.x-7} ${hip.y+7}L${hip.x-14} ${hip.y+17}" class="arrow"/><path d="M${hip.x-14} ${hip.y+17}H${hip.x-52}" class="arrow" marker-end="url(#tip)"/><text x="${hip.x-86}" y="${hip.y+9}" class="arrow-label">臀向后</text><path d="M${farDumbbell.x+28} ${farDumbbell.y-13}L${farDumbbell.x+13} ${farDumbbell.y-4}" fill="none" stroke="#8b9a8b" stroke-width="1.2" stroke-dasharray="3 3"/><text x="${farDumbbell.x+32}" y="${farDumbbell.y-20}" class="machine-label">哑铃贴近腿部</text></g>`;
    }
    if(id==='hip-flexion') return `<path d="M278 230L${278-18*p} ${206-42*p}" class="arrow" marker-end="url(#tip)"/><text x="294" y="215" class="arrow-label">大腿由髋抬起</text>`;
    if(id==='prone-leg-curl') return `<g data-motion-annotation="prone-leg-curl"><text x="288" y="86" class="arrow-label">脚跟靠近臀部</text></g>`;
    return `<path d="M340 205L${326-8*p} ${225-22*p}" class="arrow" marker-end="url(#tip)"/><text x="335" y="197" class="arrow-label">脚跟靠近臀部</text>`;
  }
  function renderEquipment(progress=0) {
    const p=Math.max(0,Math.min(1,Number(progress)||0));
    const id=document.body?.dataset.exercise||'calf-raise';
    const raw=definitions[id](p);
    const joints=raw.j;
    const chains=chainsFrom(joints,raw.chains);
    const contacts=raw.contacts.map(([joint,anchor,tolerance])=>{const point={...joints[joint]},distance=distanceTo(point,raw.anchors[anchor]);return {joint,anchor,tolerance,point,distance,attached:distance<=tolerance+1e-6};});
    const primaryMotion={
      'calf-raise':'ankle plantarflexion; forefoot fixed; hip and trunk rise',
      'hip-adduction':'bilateral hip adduction; pelvis held against shallow-incline support',
      'bulgarian-split-squat':'front hip and knee flex to lower; rear ankle fixed to roller',
      'dumbbell-rdl':'hip hinge; knees and feet held steady',
      'hip-flexion':'hip-flexion-led thigh lift with progressive knee extension; torso steady',
      'prone-leg-curl':'knee flexion; hip and knee support points held'
    }[id];
    const pose={exercise:id,progress:p,primaryMotion,joints,chains,contacts,anchors:raw.anchors,...(raw.joints3D?{joints3D:raw.joints3D,chains3D:raw.chains3D,sideJoints:raw.sideJoints,sideChains:raw.sideChains,contacts3D:raw.contacts3D,anchors3D:raw.anchors3D,sourceEvidence:raw.sourceEvidence,drawingParameters:raw.drawingParameters}:{}),...(id==='hip-flexion'?{sourceEvidence:raw.sourceEvidence,drawingParameters:raw.drawingParameters}:{}),...(id==='hip-adduction'?{openPose:definitions[id](0).j,closedPose:definitions[id](1).j}: {})};
    draw(pose,id);
    return pose;
  }
  window.renderEquipment=renderEquipment;
  const steps={
    'calf-raise':['站稳，脚掌前部贴地','脚跟抬高，踝关节跖屈','顶部短暂停留','缓慢降回原位'],
    'hip-adduction':['浅躺靠稳，骨盆与躯干贴住支撑','大腿朝器械前方并向中线夹紧','在可控的内收终点保持稳定','控制双腿沿摆臂打开，脚托随动'],
    'bulgarian-split-squat':['前脚整掌落地，后脚踝搭在支撑滚垫','屈髋屈膝，身体整体下降','底部稳定，不弹起','以前脚支撑将身体推回站高'],
    'dumbbell-rdl':['双脚稳定，哑铃贴近身体','臀部向后，躯干随髋铰链前倾','到可控幅度停住','髋伸展站回，哑铃贴腿上行'],
    'hip-flexion':['坐稳握住把手，躯干与骨盆靠稳','由髋带动大腿抬起，膝盖随动逐步打开','在可控终点短暂停留，不强求锁膝','控制大腿回落，膝盖重新弯曲'],
    'prone-leg-curl':['胸腹与骨盆贴稳长凳，脚踝抵住滚垫','屈膝让脚跟朝向臀部','顶部稍停并保持髋部贴垫','控制小腿回落到起始位']
  };
  function initializeArtwork(){
    const list=steps[document.body.dataset.exercise]||[];
    document.querySelectorAll('[data-step]').forEach((el,index)=>{el.textContent=list[index]||'';});
    renderEquipment(0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeArtwork,{once:true});else initializeArtwork();
})();
