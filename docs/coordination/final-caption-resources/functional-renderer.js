/* Original joint-based SVG scenes for the functional training lessons. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const clamp = n => Math.max(0, Math.min(1, Number(n) || 0));
  const mix = (a, b, t) => a + (b - a) * t;
  const pt = (x, y) => ({x, y});
  const lerp = (a, b, p) => pt(mix(a.x, b.x, p), mix(a.y, b.y, p));
  const path = (a, b, width = 12, color = '#226c60') => `<path d="M${a.x} ${a.y}L${b.x} ${b.y}" stroke-width="${width}" stroke="${color}" stroke-linecap="round" fill="none"/>`;
  const dot = (p, r = 7) => `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="#e7aa78" stroke="#8a573f" stroke-width="1.5"/>`;
  const gripHand = (x,y) => `<ellipse class="grip-hand" cx="${x}" cy="${y}" rx="7" ry="5"/>`;
  const label = (x, y, text, cls = '') => `<text class="${cls}" x="${x}" y="${y}">${text}</text>`;
  const line = (x1,y1,x2,y2,cls='guide') => {
    const style = cls === 'arrow' ? 'stroke:#ed9446;stroke-width:3;fill:none;marker-end:url(#arrow)' : cls === 'brace' ? 'stroke:#ef7867;stroke-width:3;fill:none;stroke-dasharray:4 4' : 'stroke:#93a19b;stroke-width:1.5;fill:none;stroke-dasharray:5 5';
    return `<path class="${cls}" style="${style}" d="M${x1} ${y1}L${x2} ${y2}"/>`;
  };
  const ground = `<path class="ground" style="stroke:#60736b;stroke-width:2;fill:none" d="M22 350H498"/><path class="tick" style="stroke:#60736b;stroke-width:2;fill:none" d="M75 350v8M445 350v8"/>`;

  function limb(a, b, c, far = false) {
    const cls = far ? 'limb far' : 'limb';
    const color = far ? '#8ab7a4' : '#226c60';
    return `<g class="${cls}">${path(a,b,far?10:14,color)}${path(b,c,far?9:12,color)}${dot(a,5)}${dot(b,6)}${dot(c,5)}</g>`;
  }
  function torso(shoulder, hip, head, farShoulder, farHip) {
    return `<g class="body">${path(farShoulder,farHip,23,'#79a995')}${path(shoulder,hip,31,'#347f70')}<ellipse cx="${head.x}" cy="${head.y}" rx="17" ry="20" fill="#e5ad80" stroke="#8a573f" stroke-width="1.5"/><path class="face" d="M${head.x-3} ${head.y-2}h10" stroke="#784f3c" stroke-width="2" fill="none"/>${dot(shoulder,6)}${dot(hip,7)}</g>`;
  }
  function footwear(ankle, knee) {
    const direction=ankle.x>=knee.x?1:-1, toe=ankle.x+direction*13, heel=ankle.x-direction*8;
    const shadow=ankle.y>=305?`<ellipse class="contact-shadow" cx="${ankle.x+7*direction}" cy="${ankle.y+7}" rx="15" ry="3"/>`:'';
    return `${shadow}<path class="shoe" d="M${heel} ${ankle.y-4}q-2 0 -3 4l2 4h${toe-heel-1}q5 0 4-4l-3-4z"/><path class="shoe-sole" d="M${heel-1} ${ankle.y+4}h${toe-heel+2}"/>`;
  }
  function figure({shoulder, hip, head, farShoulder, farHip, arms, legs, footDirections = [], equipment = '', guides = '', caption = ''}) {
    const allLimbs = [...arms.map((v,i)=>limb(...v,i===0)), ...legs.map((v,i)=>limb(...v,i===0))].join('');
    const shoes=legs.map(([,knee,ankle],i)=>footwear(ankle,pt(ankle.x-(footDirections[i]||Math.sign(ankle.x-knee.x||1)),ankle.y))).join('');
    return `${ground}<g class="equipment">${equipment}</g><g class="guides">${guides}</g>${torso(shoulder,hip,head,farShoulder,farHip)}${allLimbs}<g class="footwear">${shoes}</g>${caption}`;
  }
  function frog(p, hands, liftFoot = false) {
    const hip = liftFoot?pt(296,221):lerp(pt(296,221),pt(320,208),p), shoulder=pt(209,178), head=pt(180,161);
    // Side view: knees open away from the pelvis, then the shins fold back
    // toward the body. This makes the frog position visibly different from a
    // straight-legged crawl or ordinary quadruped stance.
    const kneeL=pt(366,284), ankleL=liftFoot?lerp(pt(320,266),pt(322,244),p):lerp(pt(320,266),pt(321,255),p), kneeR=pt(366,174), ankleR=liftFoot?lerp(pt(320,194),pt(322,172),p):lerp(pt(320,194),pt(321,204),p);
    const supportY=hands?268:277, elbowL=pt(201,supportY), wristL=pt(166,supportY), elbowR=pt(208,supportY+12), wristR=pt(174,supportY+12);
    const handsDetail=hands
      ? `<path class="hand" d="M158 ${supportY}h-20m20 4h-18m18 4h-16"/>`
      : `<path class="forearm-contact" d="M155 ${supportY+8}h46M155 ${supportY+20}h46"/>`;
    const mat=`<path class="mat-plane" d="M118 290L372 142L469 241L194 347z"/><ellipse class="contact-shadow" cx="366" cy="284" rx="17" ry="4"/><ellipse class="contact-shadow" cx="366" cy="174" rx="17" ry="4"/><ellipse class="contact-shadow" cx="199" cy="286" rx="14" ry="4"/><ellipse class="contact-shadow" cx="201" cy="274" rx="14" ry="4"/>`;
    const tilt=liftFoot?'':`<path class="pelvis-axis" d="M${hip.x-18} ${hip.y+mix(-5,5,p)}L${hip.x+18} ${hip.y+mix(5,-5,p)}"/>`;
    const guides=`${mat}${liftFoot?`${line(343,177,337,152,'arrow')}${line(343,284,337,258,'arrow')}`:line(282,214,337,202,'arrow')}`;
    return figure({shoulder,hip,head,farShoulder:pt(214,187),farHip:pt(296,229),arms:[[shoulder,elbowR,wristR],[pt(214,187),elbowL,wristL]],legs:[[hip,kneeR,ankleR],[pt(296,229),kneeL,ankleL]],guides,caption:`${tilt}${handsDetail}`});
  }
  function rotation(p) {
    const supportShoulder=pt(224,184), hip=pt(314,202), head=pt(190,157);
    const reachHand=lerp(pt(246,214),pt(272,104),p), reachElbow=lerp(pt(257,204),pt(256,157),p);
    const supportElbow=pt(199,223), supportHand=pt(185,266);
    const arms=[[supportShoulder,supportElbow,supportHand],[pt(230,178),reachElbow,reachHand]];
    const guides=`${line(251,206,270,112,'arrow')}`;
    return figure({shoulder:supportShoulder,hip,head,farShoulder:pt(230,178),farHip:pt(318,208),arms,legs:[[hip,pt(340,240),pt(341,295)],[pt(318,208),pt(301,246),pt(301,295)]],guides,caption:line(306,203,323,203,'brace')});
  }
  function warmupLungeControl(p) {
    const t=clamp(p), step=32*t;
    const drift=step*.6, shoulder=pt(251+drift,128), hip=pt(264+drift,227), head=pt(246+drift,91);
    const frontKnee=pt(328+step,260), frontFoot=pt(365+step,320), backKnee=pt(197+step*.2,264), backFoot=pt(151+step*.3,319);
    const handA=lerp(pt(232,184),pt(226,171),t), handB=lerp(pt(293,184),pt(298,197),t);
    const guides=`${line(334,287,366,287,'arrow')}${line(259,151,259,321,'guide')}`;
    return figure({shoulder,hip,head,farShoulder:pt(267+drift,131),farHip:pt(270+drift,231),arms:[[shoulder,pt(238+drift,164),handA],[pt(267+drift,131),pt(283+drift,164),handB]],legs:[[hip,frontKnee,frontFoot],[pt(270+drift,231),backKnee,backFoot]],footDirections:[1,1],guides});
  }
  function supportedRotation(p) {
    const shoulder=lerp(pt(324,180),pt(344,206),p), hip=pt(260,234), head=lerp(pt(345,148),pt(369,175),p);
    const benchHand=pt(399,205), benchElbow=lerp(pt(348,177),pt(369,190),p);
    const freeElbow=lerp(pt(254,189),pt(274,143),p), freeHand=lerp(pt(229,215),pt(227,101),p);
    const rearKnee=lerp(pt(203,276),pt(175,258),p), rearAnkle=lerp(pt(156,312),pt(103,291),p);
    const guides=`<path class="bench" style="fill:#b65c47;stroke:#70372c;stroke-width:3" d="M365 205h125v12H365zM465 217v133M381 217v133"/>${line(291,206,242,119,'arrow')}`;
    return figure({shoulder,hip,head,farShoulder:pt(331,187),farHip:pt(265,240),arms:[[shoulder,benchElbow,benchHand],[pt(331,187),freeElbow,freeHand]],legs:[[hip,pt(273,285),pt(270,340)],[pt(265,240),rearKnee,rearAnkle]],footDirections:[1,1],guides});
  }
  function supportedHinge(p) {
    const shoulder=lerp(pt(273,144),pt(300,190),p), hip=lerp(pt(264,232),pt(247,232),p), head=lerp(pt(281,112),pt(315,157),p);
    const support=pt(357,201), free=lerp(pt(227,324),pt(134,292),p), knee=lerp(pt(275,285),pt(276,282),p);
    const freeElbow=lerp(pt(270,197),pt(280,150),p), freeHand=lerp(pt(257,220),pt(288,98),p);
    const guides=`<path class="bench" style="fill:#b65c47;stroke:#70372c;stroke-width:3" d="M325 201h131v12H325zM440 213v137M350 213v137"/>${line(250,230,155,224,'arrow')}${label(350,184,'支撑手轻扶长凳','callout')}${label(94,270,'髋向后，胸口转开','callout')}`;
    return figure({shoulder,hip,head,farShoulder:pt(282,153),farHip:pt(269,237),arms:[[shoulder,pt(309,182),support],[pt(282,153),freeElbow,freeHand]],legs:[[hip,knee,pt(282,341)],[pt(269,237),pt(205,282),free]],guides,caption:`${line(288,212,289,104,'arrow')}${label(376,342,'支撑脚三点着地','callout')}`});
  }
  function bridge(p, context = {}) {
    const defaultPhases=[['setup',0,600],['load',600,1600],['jump',1600,1900],['flight',1900,2250],['land',2250,2600],['hold',2600,3500],['return',3500,6000]];
    let phase=context.phase||'cycle', t=clamp(context.phaseProgress ?? p);
    if(phase==='cycle'){
      const time=Math.max(0,Math.min(5999,Number(context.time)||0));
      const active=defaultPhases.find(([,start,end])=>time>=start&&time<end)||defaultPhases.at(-1);
      phase=active[0]; t=(time-active[1])/(active[2]-active[1]);
    }
    let hipY=282, supportFlight=0, freeLift=0, phaseLabel='准备：肩胛下缘压凳，双脚踩稳';
    if (phase==='setup') { hipY=286; freeLift=1; phaseLabel='起始：肩背靠凳，单腿低位加载'; }
    else if (phase==='load') { hipY=286; freeLift=1; phaseLabel='加载：支撑脚踩稳，自由腿保持抬起'; }
    else if (phase==='jump') { hipY=mix(286,240,t); freeLift=1; supportFlight=t; phaseLabel='跳起：支撑脚离地，自由腿保持抬起'; }
    else if (phase==='flight') { hipY=240; freeLift=1; supportFlight=1; phaseLabel='腾空：支撑脚短暂离地，自由腿不动'; }
    else if (phase==='land') { hipY=240; freeLift=1; supportFlight=1-t; phaseLabel='落地：唯一支撑脚轻轻接地'; }
    else if (phase==='hold') { hipY=240; freeLift=1; phaseLabel='停稳：支撑脚踩地，自由腿仍抬起'; }
    else if (phase==='return') { hipY=mix(240,286,t); freeLift=1; phaseLabel='慢降：保持单脚支撑，自由腿不落地'; }
    else { hipY=mix(282,224,p); supportFlight=0; freeLift=0; }
    const pelvis=pt(275,hipY), shoulder=pt(154,265), head=pt(127,259), supportKnee=pt(354,mix(268,250,supportFlight)), supportFoot=pt(390,mix(337,284,supportFlight));
    const freeKnee=pt(282,mix(268,235,freeLift)), freeFoot=pt(263,mix(337,220,freeLift));
    window.functionalPoseNote=phaseLabel;
    const guides=`<path class="bench" style="fill:#b65c47;stroke:#70372c;stroke-width:3" d="M109 269h99v18h-99zM121 287v63M196 287v63"/>${line(263,286,263,220,'arrow')}`;
    const farHip=pt(279,hipY+6);
    return figure({shoulder,hip:pelvis,head,farShoulder:pt(163,270),farHip,arms:[[shoulder,pt(156,294),pt(178,306)],[pt(163,270),pt(169,293),pt(194,304)]],legs:[[pelvis,supportKnee,supportFoot],[farHip,freeKnee,freeFoot]],guides});
  }
  function frontRackSquat(p) {
    const shoulder=lerp(pt(248,133),pt(246,145),p), hip=lerp(pt(250,225),pt(248,278),p), head=pt(249,94);
    const nk=lerp(pt(305,265),pt(331,316),p), bk=lerp(pt(198,262),pt(176,310),p);
    const db=(x,y)=>`<rect class="db" x="${x-16}" y="${y-18}" width="32" height="36" rx="6"/><path class="db-handle" d="M${x-22} ${y}h44"/>`;
    const guides=`${line(248,166,248,321,'guide')}${label(300,219,'膝随脚尖方向','callout')}${label(88,328,'分腿站姿；两只哑铃在肩前','callout')}`;
    return figure({shoulder,hip,head,farShoulder:pt(261,137),farHip:pt(258,229),arms:[[shoulder,pt(225,159),pt(228,138)],[pt(261,137),pt(278,159),pt(278,138)]],legs:[[hip,nk,pt(366,329)],[pt(258,229),bk,pt(137,329)]],equipment:db(228,133)+db(278,133),guides,caption:label(325,348,'前后脚保持两条轨道','callout')});
  }
  function hinge(p) {
    const shoulder=lerp(pt(278,130),pt(328,174),p), hip=lerp(pt(278,231),pt(246,242),p), head=lerp(pt(276,91),pt(356,141),p);
    const farShoulder=lerp(pt(287,132),pt(337,176),p), farHip=lerp(pt(286,234),pt(254,245),p);
    const knee=lerp(pt(290,286),pt(282,288),p), foot=pt(310,337), farKnee=lerp(pt(280,284),pt(274,286),p), farFoot=pt(297,334);
    const nearHand=lerp(pt(286,251),pt(302,300),p), farHand=lerp(pt(304,253),pt(320,302),p);
    const nearElbow=lerp(pt(279,190),pt(315,232),p), farElbow=lerp(pt(299,192),pt(331,234),p);
    const arms=[[shoulder,nearElbow,nearHand],[farShoulder,farElbow,farHand]];
    const dumbbell = (x,y) => `<rect class="db" x="${x-18}" y="${y-8}" width="8" height="16" rx="3"/><path class="db-handle" d="M${x-10} ${y}h20"/><rect class="db" x="${x+10}" y="${y-8}" width="8" height="16" rx="3"/>`;
    const equipment=dumbbell(nearHand.x,nearHand.y)+dumbbell(farHand.x,farHand.y);
    const guides=`${line(240,258,188,258,'arrow')}${label(349,91,'髋后移，躯干从髋部前倾','callout')}${label(62,152,'两脚并列、脚尖同向','callout')}${label(62,330,'膝微屈并保持稳定','callout')}`;
    return figure({shoulder,hip,head,farShoulder,farHip,arms,legs:[[hip,knee,foot],[farHip,farKnee,farFoot]],footDirections:[1,1],equipment,guides,caption:`${label(360,322,'哑铃贴腿下放','callout')}${gripHand(nearHand.x,nearHand.y)}${gripHand(farHand.x,farHand.y)}`});
  }
  function lungePress(p) {
    const rack=clamp(p*2.8), press=clamp((p-.28)/.72), lowered=clamp((p-.2)/.8);
    const shoulder=lerp(pt(255,126),pt(251,151),lowered), hip=lerp(pt(256,225),pt(255,260),lowered), head=pt(254,91);
    const frontKnee=lerp(pt(274,289),pt(318,266),lowered), backKnee=lerp(pt(241,289),pt(197,266),lowered);
    const frontFoot=lerp(pt(284,337),pt(356,331),lowered), backFoot=lerp(pt(224,337),pt(154,331),lowered);
    const handY=mix(mix(237,160,rack),79,press);
    const elbowNear=lerp(pt(220,160),pt(233,115),press),elbowFar=lerp(pt(289,160),pt(279,106),press);
    const db=(x,y)=>`<rect class="db" x="${x-18}" y="${y-12}" width="8" height="24" rx="3"/><path class="db-handle" d="M${x-10} ${y}h20"/><rect class="db" x="${x+10}" y="${y-12}" width="8" height="24" rx="3"/>`;
    const guides=`${line(319,254,343,306,'arrow')}`;
    return figure({shoulder,hip,head,farShoulder:pt(267,131),farHip:pt(263,229),arms:[[shoulder,elbowNear,pt(219,handY)],[pt(267,131),elbowFar,pt(290,handY)]],legs:[[hip,frontKnee,frontFoot],[pt(263,229),backKnee,backFoot]],footDirections:[1,1],equipment:db(219,handY)+db(290,handY),guides,caption:`${gripHand(219,handY)}${gripHand(290,handY)}`});
  }
  function alternatingLunge(p) {
    const t=clamp(p), shoulder=lerp(pt(254,128),pt(265,145),t), hip=lerp(pt(256,227),pt(276,263),t), head=lerp(pt(254,92),pt(265,109),t);
    const frontKnee=lerp(pt(275,286),pt(344,300),t), backKnee=lerp(pt(237,286),pt(205,303),t);
    const frontFoot=lerp(pt(284,337),pt(336,337),t), backFoot=lerp(pt(224,337),pt(184,337),t);
    const farShoulder=lerp(pt(266,132),pt(277,148),t),farHip=lerp(pt(264,231),pt(283,269),t);
    const arms=[[shoulder,pt(224,184),pt(224,228)],[farShoulder,pt(289,184),pt(289,228)]];
    const guides=`${line(329,258,342,293,'arrow')}`;
    return figure({shoulder,hip,head,farShoulder,farHip,arms,legs:[[hip,frontKnee,frontFoot],[farHip,backKnee,backFoot]],footDirections:[1,1],guides});
  }
  function seatedDumbbellPress(p) {
    const t=clamp(p), shoulder=lerp(pt(210,160),pt(193,164),t), hip=pt(253,241), head=lerp(pt(182,127),pt(164,132),t);
    const elbow=lerp(pt(241,188),pt(198,119),t), hand=lerp(pt(266,158),pt(195,69),t);
    const restingElbow=lerp(pt(239,191),pt(231,196),t), restingHand=lerp(pt(256,229),pt(250,229),t);
    const kneeNear=pt(322,282), footNear=pt(352,334), kneeFar=pt(305,286), footFar=pt(327,334);
    const db=`<rect class="db" x="${hand.x-22}" y="${hand.y-9}" width="44" height="18" rx="6"/><path class="db-handle" d="M${hand.x-10} ${hand.y-5}v10"/>`;
    const seat=`<path class="bench" d="M226 246h108v15H226zM244 261v89M320 261v89"/><path class="thigh-pad" d="M299 279h72"/>`;
    const guides=`${line(253,147,204,75,'arrow')}`;
    return figure({shoulder,hip,head,farShoulder:pt(219,166),farHip:pt(261,245),arms:[[shoulder,elbow,hand],[pt(219,166),restingElbow,restingHand]],legs:[[hip,kneeNear,footNear],[pt(261,245),kneeFar,footFar]],equipment:`${seat}${db}`,guides,caption:gripHand(hand.x,hand.y)});
  }
  function pulldown(p) {
    const shoulder=pt(248,190), hip=pt(252,275), head=pt(247,150), pivot=pt(360,65);
    const grip=lerp(pt(364,104),pt(348,169),p), elbow=lerp(pt(219,170),pt(220,211),p);
    const armFar=lerp(pt(278,170),pt(276,210),p), handFar=pt(grip.x+12,grip.y+2);
    const leverEnd=grip;
    const equipment=`<path class="machine" d="M${pivot.x} ${pivot.y}v240M${pivot.x} 70l-68 12M${pivot.x} 70L${leverEnd.x} ${leverEnd.y}"/><circle class="pivot" cx="${pivot.x}" cy="${pivot.y}" r="13"/><path class="gripbar" d="M${leverEnd.x-39} ${leverEnd.y}h78"/><path class="seat" d="M191 266h104v13H191zM206 279v70M286 279v70"/>`;
    const guides=`${line(346,112,328,176,'arrow')}`;
    return figure({shoulder,hip,head,farShoulder:pt(258,194),farHip:pt(260,279),arms:[[shoulder,elbow,grip],[pt(258,194),armFar,handFar]],legs:[[hip,pt(299,308),pt(321,332)],[pt(260,279),pt(217,308),pt(204,332)]],equipment,guides});
  }
  function walk(p, context={}) {
    const time=Number(context.time)||0, swing=Math.sin(time/2000*Math.PI*2), bodyY=150+Math.abs(swing)*2;
    const shoulder=pt(256,bodyY), hip=pt(258,248), head=pt(256,108);
    const nearFoot=pt(318+24*swing,337-9*Math.max(0,swing)), farFoot=pt(192-24*swing,337-9*Math.max(0,-swing));
    const guides=`${line(256,286,256,338,'guide')}`;
    const farShoulder=pt(267,bodyY+3),farHip=pt(266,251);
    return figure({shoulder,hip,head,farShoulder,farHip,arms:[[shoulder,pt(224-11*swing,190),pt(219-22*swing,234)],[farShoulder,pt(285+11*swing,190),pt(291+22*swing,234)]],legs:[[hip,pt(299+10*swing,292-3*Math.max(0,swing)),nearFoot],[farHip,pt(216-10*swing,292-3*Math.max(0,-swing)),farFoot]],guides});
  }
  function calfStretch(p) {
    const shoulder=lerp(pt(259,151),pt(245,157),p), hip=lerp(pt(263,237),pt(267,241),p), head=lerp(pt(262,112),pt(245,122),p);
    const wallX=421, frontKnee=lerp(pt(347,278),pt(339,279),p), backKnee=pt(235.5,289.5);
    const frontFoot=pt(379,337), backFoot=pt(199,337);
    const nearElbow=lerp(pt(332,178),pt(344,153),p), nearHand=pt(wallX,147);
    const farElbow=lerp(pt(339,186),pt(351,168),p), farHand=pt(wallX,165);
    const guides=`<path class="wall" style="fill:none;stroke:#829092;stroke-width:6" d="M${wallX} 47v303"/>${line(196,286,199,337,'brace')}`;
    return figure({shoulder,hip,head,farShoulder:pt(269,157),farHip:pt(272,242),arms:[[shoulder,nearElbow,nearHand],[pt(269,157),farElbow,farHand]],legs:[[hip,frontKnee,frontFoot],[pt(272,242),backKnee,backFoot]],footDirections:[1,1],guides});
  }
  function hamstringStretch(p) {
    const shoulder=pt(148,325), hip=pt(253,325), head=pt(121,315);
    const plantedKnee=pt(326,298), plantedFoot=pt(366,337), raisedKnee=lerp(pt(288,238),pt(285,230),p), raisedAnkle=lerp(pt(270,276),pt(290,137),p);
    const hands=pt(raisedKnee.x-1,raisedKnee.y+12), farHand=pt(raisedKnee.x+12,raisedKnee.y+13);
    const guides=`<path class="mat-plane" style="fill:#b65c47;stroke:#70372c;stroke-width:9;stroke-linecap:round" d="M42 341h334"/>${line(291,223,291,143,'arrow')}`;
    const palms='<path class="support-thumb" d="M'+(hands.x-6)+' '+(hands.y-2)+'q-5 -6 -8 -1M'+(farHand.x-6)+' '+(farHand.y-2)+'q-5 -6 -8 -1"/>'+gripHand(hands.x,hands.y)+gripHand(farHand.x,farHand.y);
    return figure({shoulder,hip,head,farShoulder:pt(160,325),farHip:pt(257,325),arms:[[shoulder,pt(213,326),hands],[pt(160,325),pt(220,326),farHand]],legs:[[hip,plantedKnee,plantedFoot],[pt(257,325),raisedKnee,raisedAnkle]],guides,caption:palms});
  }

  const scenes = {
    'frog-forearm': p => frog(p, false),
    'frog-internal-rotation': p => frog(p, false, true),
    'warmup-lunge-control': warmupLungeControl,
    'warmup-supported-rotation': supportedRotation,
    'single-leg-hip-thrust': bridge,
    'dumbbell-rdl': hinge,
    'dumbbell-lunge-press': lungePress,
    'alternating-lunge': alternatingLunge,
    'seated-dumbbell-press': seatedDumbbellPress,
    'cooldown-walk': (p,context) => walk(p,context),
    'cooldown-calf-stretch': calfStretch,
    'cooldown-hamstring-stretch': hamstringStretch
  };

  const style = `<style>
    #figure{width:100%;height:100%;display:block} #figure *{vector-effect:non-scaling-stroke}
    .ground,.tick{stroke:#60736b;stroke-width:2;fill:none}.limb path{stroke:#226c60;stroke-linecap:round;fill:none}.limb.far path{stroke:#8ab7a4;stroke-linecap:round;fill:none}.limb circle{fill:#e7aa78;stroke:#8a573f;stroke-width:1.5}
    .body path{stroke:#347f70;stroke-width:30;stroke-linecap:round;fill:none}.body ellipse{fill:#e5ad80;stroke:#8a573f;stroke-width:1.5}.body .face{stroke:#784f3c;stroke-width:2}.body circle{fill:#db9e70;stroke:#8a573f;stroke-width:1.5}
    .equipment{fill:#df8a40;stroke:#87501e;stroke-width:3}.equipment .bench,.equipment .seat{fill:#b65c47;stroke:#70372c;stroke-width:3}.equipment .machine{fill:none;stroke:#53616c;stroke-width:11;stroke-linecap:round}.equipment .pivot{fill:#f3c65d;stroke:#685735;stroke-width:3}.equipment .gripbar{stroke:#293b43;stroke-width:10;stroke-linecap:round}.equipment .db{fill:#36434b;stroke:#162329;stroke-width:2}.equipment .db-handle{stroke:#a7b0af;stroke-width:4}.equipment .kb{fill:#3c4b50;stroke:#15262b;stroke-width:3}.equipment .kb-handle{fill:none;stroke:#273a40;stroke-width:6}
    .equipment .thigh-pad{fill:none;stroke:#53616c;stroke-width:14;stroke-linecap:round}
    .equipment .wall{fill:none;stroke:#829092;stroke-width:6}.equipment .mat{fill:none;stroke:#b65c47;stroke-width:9;stroke-linecap:round}
    .hand{stroke:#226c60;stroke-width:3;stroke-linecap:round;fill:none}.grip-hand{fill:#e5ad80;stroke:#8a573f;stroke-width:1.5}.support-thumb{fill:none;stroke:#8a573f;stroke-width:2.5;stroke-linecap:round}.forearm-contact{stroke:#226c60;stroke-width:8;stroke-linecap:round;opacity:.85}.pelvis-axis{stroke:#ef7867;stroke-width:4;stroke-linecap:round}
    .shoe{fill:#bc6658;stroke:#633d3a;stroke-width:2;stroke-linejoin:round}.shoe-sole{stroke:#f1c887;stroke-width:2;stroke-linecap:round}.contact-shadow{fill:#43574f;opacity:.2}.mat-plane{fill:#cbd6ce;stroke:#87968b;stroke-width:2;fill-opacity:.55}
    .guide{stroke:#93a19b;stroke-width:1.5;stroke-dasharray:5 5;fill:none}.arrow{stroke:#ed9446;stroke-width:3;marker-end:url(#arrow)}.brace{stroke:#ef7867;stroke-width:3;stroke-dasharray:4 4}.callout{font-family:STHeiti,'PingFang SC',sans-serif;font-size:12px;font-weight:700;fill:#283d38;paint-order:stroke;stroke:#f5f2e9;stroke-width:4px;stroke-linejoin:round}
    html[data-dark="true"] .ground{stroke:#658078} html[data-dark="true"] .callout{fill:#eff4ee;stroke:#172522} html[data-dark="true"] .guide{stroke:#7b8b83} #figure[data-dark="true"] .callout{fill:#eff4ee;stroke:#172522}
    .motion-note{font:600 11px system-ui,sans-serif;fill:#477166}
  </style>`;
  const marker = `<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#ed9446"/></marker></defs>`;
  const staticPoseNotes = {
    'frog-forearm':'以前臂和双膝支撑；髋后移配骨盆前倾，前移回位配骨盆后倾。',
    'frog-internal-rotation':'以前臂和双膝支撑；两侧小腿与脚小幅同时抬起，膝和骨盆保持稳定。',
    'warmup-lunge-control':'维持前后分腿、后脚尖朝前；小步侧移时让躯干尽量稳定。',
    'warmup-supported-rotation':'支撑手扶稳长凳、单脚踩稳；保持前倾支撑，身体左右转动，不要用弯腰代替转体，眼睛跟随手指。',
    'dumbbell-lunge-press':'双铃由体侧提至肩前，配合弓步向上推举，再收步降铃回位。',
    'alternating-lunge':'前后脚分轨站稳；前后膝弯曲下沉，回站后换腿。',
    'seated-dumbbell-press':'大腿卡在腿垫、双脚向前踩地；核心维持后仰，单手推举并轻微转胸。',
    'cooldown-walk':'在平坦路线轻松走动、自然摆臂，并逐步减速。',
    'cooldown-calf-stretch':'前膝微屈；后腿保持伸直、足跟贴地，必要时扶稳墙面或椅背。',
    'cooldown-hamstring-stretch':'双手托住抬起腿膝盖下方的腿后侧；另一脚屈膝踩地，缓慢伸腿牵拉。'
  };
  window.renderEquipment = (progress, context = {}) => {
    const key = document.body.dataset.artwork;
    if (!scenes[key]) throw new Error(`Unknown functional artwork: ${key}`);
    const svg = $('figure');
    if (!svg) throw new Error('Missing #figure SVG');
    const amount = clamp(progress);
    svg.dataset.artwork = key;
    svg.dataset.progress = String(amount);
    svg.dataset.dark = String(document.documentElement?.dataset?.dark === 'true');
    window.functionalPoseNote = '';
    svg.innerHTML = `${style}${marker}${scenes[key](amount, context)}`;
    const poseNote = $('pose-note');
    const poseText = window.functionalPoseNote || staticPoseNotes[key] || '';
    if (poseNote && poseText) {
      if (poseNote.hidden) poseNote.hidden = false;
      if (poseNote.textContent !== poseText) poseNote.textContent = poseText;
    }
  };
  if (document.body.dataset.artwork) window.renderEquipment(0);
})();
