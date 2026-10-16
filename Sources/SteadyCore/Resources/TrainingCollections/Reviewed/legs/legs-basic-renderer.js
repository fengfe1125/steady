/* Original Steady lower-body teaching drawings. No third-party media.
   Native bridge: milliseconds, six stages; playback time never defines dose. */
(() => {
  'use strict';
  const spec = window.SteadyBasicLesson;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const pt = (x, y) => [x, y];
  const mix = (a,b,t) => a.map((v,i) => v+(b[i]-v)*t);
  const add = (a,b) => [a[0]+b[0],a[1]+b[1]];
  const smooth = t => (1-Math.cos(Math.PI*clamp(t,0,1)))/2;
  // Two segment inverse kinematics: keeps limb lengths stable while feet/hands stay planted.
  function joint(a,b,l1,l2,side=1) {
    const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.max(.001,Math.hypot(dx,dy));
    const reach=clamp(d,Math.abs(l1-l2)+.001,l1+l2-.001);
    const along=(l1*l1-l2*l2+reach*reach)/(2*reach);
    const h=Math.sqrt(Math.max(0,l1*l1-along*along));
    return [a[0]+along*dx/d-side*h*dy/d,a[1]+along*dy/d+side*h*dx/d];
  }
  function pose(key,p,bad=false) {
    let hip=pt(190,211), shoulder=pt(190,117), ankle=pt(190,359), toe=pt(220,370), heel=pt(182,370);
    let farAnkle=pt(174,359),farToe=pt(204,370),farHeel=pt(166,370), knee,farKnee;
    let hand, elbow, head, farHand, farElbow, support=null, chair=null;
    let ground=370;
    if (key==='chair-sit-to-stand') {
      hip=mix(pt(132,291),pt(185,211),p);
      shoulder=add(hip,pt(20*Math.sin(Math.PI*p),-94));
      chair={seat:[89,300,78,9],back:[88,228,9,77],legs:[[98,309,98,370],[156,309,156,370]]};
    } else if (key==='bodyweight-squat') {
      hip=mix(pt(187,211),pt(145,276),p); shoulder=add(hip,pt(35*p,-Math.sqrt(94*94-35*35*p*p)));
    } else if(key==='unloaded-hip-hinge') {
      knee=pt(200,359-Math.sqrt(74*74-10*10));
      const femurAngle=.132+.12*p;
      hip=add(knee,pt(-76*Math.sin(femurAngle),-76*Math.cos(femurAngle)));
      shoulder=add(hip,pt(82*p,-Math.sqrt(94*94-82*82*p*p)));
    } else if(key==='supported-calf-raise') {
      const angle=p*0.42;
      // Rotate the whole foot about its forefoot contact, never translate the toe.
      const rotate=(a,origin)=> {const x=a[0]-origin[0],y=a[1]-origin[1];return [origin[0]+x*Math.cos(angle)-y*Math.sin(angle),origin[1]+x*Math.sin(angle)+y*Math.cos(angle)];};
      ankle=rotate(ankle,toe);heel=rotate(heel,toe);farAnkle=rotate(farAnkle,farToe);farHeel=rotate(farHeel,farToe);
      hip=add(ankle,pt(0,-148));shoulder=add(hip,pt(0,-94));support=pt(252,167);
    } else if(key==='supported-split-squat') {
      ankle=pt(239,359);toe=pt(268,370);heel=pt(230,370);
      farAnkle=pt(113,341);farToe=pt(137,370);farHeel=pt(106,350);
      hip=mix(pt(184,222),pt(184,269),p);shoulder=add(hip,pt(8,-93.66));support=pt(252,167);
    } else if(key==='floor-glute-bridge') {
      ground=340; shoulder=pt(98,328);ankle=pt(282,329);toe=pt(312,340);heel=pt(274,340);
      farAnkle=pt(268,329);farToe=pt(298,340);farHeel=pt(260,340);
      const angle=p*.414; hip=add(shoulder,pt(94*Math.cos(angle),-94*Math.sin(angle)));
      head=pt(69,320);hand=pt(168,339);elbow=pt(130,339);farHand=pt(154,336);farElbow=pt(116,336);
    } else if(key==='side-lying-hip-abduction') {
      ground=340;hip=pt(183,327);shoulder=pt(92,318);head=pt(62,314);
      const angle=.45*p; knee=add(hip,pt(76*Math.cos(angle),-76*Math.sin(angle)));
      ankle=add(knee,pt(74*Math.cos(angle),-74*Math.sin(angle)));toe=add(ankle,pt(4,-22));heel=add(ankle,pt(-3,8));
      farKnee=pt(259,328);farAnkle=pt(333,329);farToe=pt(337,307);farHeel=pt(330,337);
      hand=pt(173,312);elbow=pt(134,291);farHand=pt(63,326);farElbow=pt(92,337);
    }
    if(bad) {
      if(key==='floor-glute-bridge') hip[1]-=27;
      else if(key==='side-lying-hip-abduction') {hip[1]-=22;knee[1]-=48;ankle[1]-=70;toe[1]-=70;heel[1]-=70;}
      else if(key==='unloaded-hip-hinge') {hip=pt(153,282);shoulder=pt(182,193);knee=null;}
      else if(key==='chair-sit-to-stand') {hip=pt(112,288);shoulder=pt(83,205);}
      else {heel[1]-=24;ankle[1]-=12;shoulder[0]+=26;}
    }
    const farHip=key==='side-lying-hip-abduction'?hip:add(hip,pt(-10,0));
    if(!knee) knee=joint(hip,ankle,76,74,-1);
    if(!farKnee) farKnee=joint(farHip,farAnkle,76,74,-1);
    if(!head) {const dx=shoulder[0]-hip[0],dy=shoulder[1]-hip[1],d=Math.hypot(dx,dy);head=add(shoulder,pt(dx/d*24,dy/d*24));}
    if(!hand) hand=support || (key==='unloaded-hip-hinge'?add(hip,pt(7,-5)):add(shoulder,pt(65,28)));
    if(!elbow) elbow=joint(shoulder,hand,48,43,1);
    if(!farHand) farHand=support || add(hand,pt(-9,-4));
    if(!farElbow) farElbow=joint(add(shoulder,pt(-9,0)),farHand,48,43,1);
    return {hip,farHip,shoulder,head,knee,ankle,toe,heel,farKnee,farAnkle,farToe,farHeel,hand,elbow,farHand,farElbow,support,chair,ground};
  }
  const NS='http://www.w3.org/2000/svg';
  const esc = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const line=(a,b,color,width=12,extra='')=>`<path d="M${a} L${b}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${extra}/>`;
  const circle=(p,r,color,extra='')=>`<circle cx="${p[0]}" cy="${p[1]}" r="${r}" fill="${color}" ${extra}/>`;
  function scene(p,bad=false){
    const j=pose(spec.key,p,bad),dark=state.dark;
    const skin=dark?'#bfc9c0':'#c3c9c3',ink=dark?'#e3e9e3':'#415549',far=dark?'#78877c':'#879a8b',muscle=bad?'#d9a15b':'#c96459';
    let s=line(pt(40,j.ground+2),pt(355,j.ground+2),dark?'#59675e':'#b7c3b8',2);
    if(j.chair){let c=j.chair;s+=`<g data-equipment="chair" fill="${far}"><rect x="${c.seat[0]}" y="${c.seat[1]}" width="${c.seat[2]}" height="${c.seat[3]}" rx="3"/><rect x="${c.back[0]}" y="${c.back[1]}" width="${c.back[2]}" height="${c.back[3]}" rx="3"/>${c.legs.map(x=>line(x.slice(0,2),x.slice(2),far,6)).join('')}</g>`;}
    if(j.support)s+=`<g data-equipment="fixed-support">${line(pt(j.support[0],j.ground),j.support,far,9)}${line(add(j.support,pt(-14,0)),add(j.support,pt(35,0)),far,9)}${line(pt(j.support[0]-22,j.ground),pt(j.support[0]+22,j.ground),far,8)}</g>`;
    s+=line(j.farHip,j.farKnee,far,22)+line(j.farKnee,j.farAnkle,far,17)+line(j.farHeel,j.farToe,far,10);
    s+=line(add(j.shoulder,pt(-9,0)),j.farElbow,far,14)+line(j.farElbow,j.farHand,far,11);
    s+=line(j.hip,j.shoulder,ink,37)+line(j.hip,j.shoulder,skin,31)+circle(j.hip,19,ink)+circle(j.hip,16,spec.key.includes('calf')?skin:muscle);
    s+=line(j.hip,j.knee,ink,27)+line(j.hip,j.knee,skin,23)+(spec.primaryMuscles.some(m=>['股四头肌','腘绳肌'].includes(m))?line(mix(j.hip,j.knee,.2),mix(j.hip,j.knee,.74),muscle,13):'');
    s+=line(j.knee,j.ankle,ink,20)+line(j.knee,j.ankle,skin,16);
    if(spec.key.includes('calf'))s+=line(mix(j.knee,j.ankle,.24),mix(j.knee,j.ankle,.67),muscle,12);
    s+=line(j.heel,j.toe,ink,11)+circle(j.knee,7,skin);
    s+=line(j.shoulder,j.head,skin,14)+circle(j.head,17,ink)+circle(j.head,14,skin);
    s+=line(j.shoulder,j.elbow,skin,15)+line(j.elbow,j.hand,skin,12)+circle(j.hand,6,skin);
    // Contact dots make the mechanical support points explicit in all views.
    for(const c of spec.key==='side-lying-hip-abduction'?[j.hip,j.shoulder]:spec.key==='floor-glute-bridge'?[j.shoulder,j.toe,j.heel]:[j.toe,j.farToe])s+=circle(c,3,bad?'#d9a15b':'#218264');
    if(bad)s+=`<circle cx="${j.hip[0]}" cy="${j.hip[1]}" r="28" fill="none" stroke="#d9a15b" stroke-width="3" stroke-dasharray="5 4"/>`;
    return `<g data-pose="${p}" data-example="${bad?'incorrect':'correct'}">${s}</g>`;
  }
  const state={time:0,playing:false,speed:1,mode:'motion',dark:false,reducedMotion:false,seekRevision:-1};
  let frameID=0,last=null,lastReport=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const report=event=>window.webkit?.messageHandlers?.lesson?.postMessage({event,time:state.time});
  function progress(t){return t<2000?0:t<4000?smooth((t-2000)/2000):t<5000?1:t<7000?1-smooth((t-5000)/2000):0;}
  const stage=t=>t<1000?0:t<2000?1:t<4000?2:t<5000?3:t<7000?4:5;
  const stageNames=['准备','起始','执行','终点','返回','结束'];
  function draw(){
    const ink=state.dark?'#e6ece6':'#2d4937',muted=state.dark?'#a6b4aa':'#697c6f';
    let body='',view='0 0 400 410';
    if(state.mode==='detail'){
      view='0 0 800 830';
      [0,.5,1,.5].forEach((p,i)=>{body+=`<g transform="translate(${i%2*400},${Math.floor(i/2)*410})"><text x="200" y="28" text-anchor="middle" fill="${ink}" font-size="20">${['① 起始','② 移动中','③ 可控终点','④ 返回'][i]}</text>${scene(p)}</g>`;});
    }else if(state.mode==='mistakes'){
      view='0 0 800 410';
      body=`<text x="200" y="27" text-anchor="middle" fill="#218264" font-size="22">正确</text><text x="600" y="27" text-anchor="middle" fill="#c88b42" font-size="22">错误示意</text>${scene(spec.key==='chair-sit-to-stand'?0:1)}<g transform="translate(400,0)">${scene(spec.key==='chair-sit-to-stand'?0:1,true)}</g>`;
    }else body=`<text x="22" y="28" fill="${ink}" font-size="17">${stageNames[stage(state.time)]}</text><text x="378" y="28" text-anchor="end" fill="${muted}" font-size="13">原创动作示意 · 侧面</text>${scene(progress(state.time))}`;
    document.getElementById('stage').innerHTML=`<svg xmlns="${NS}" viewBox="${view}" role="img" aria-label="${esc(spec.title)}" font-family="-apple-system, sans-serif"><title>${esc(spec.title)}</title><rect width="100%" height="100%" rx="16" fill="${state.dark?'#1e2822':'#eef2e9'}"/>${body}</svg>`;
  }
  function stop(){state.playing=false;cancelAnimationFrame(frameID);frameID=0;last=null;draw();}
  function frame(now){
    const dt=last===null?0:clamp(now-last,0,100);last=now;
    if(state.playing&&!document.hidden&&!state.reducedMotion&&state.mode==='motion'){
      state.time=(state.time+dt*state.speed)%8000;draw();
      if(now-lastReport>=100){lastReport=now;report('progress');}frameID=requestAnimationFrame(frame);
    }
  }
  window.setLessonState=command=>{
    cancelAnimationFrame(frameID);frameID=0;last=null;
    if(['motion','detail','mistakes'].includes(command.mode))state.mode=command.mode;
    if(command.dark!==undefined)state.dark=command.dark===true;
    if(command.speed!==undefined)state.speed=command.speed===.5?.5:1;
    state.reducedMotion=reduced.matches||command.reduceMotion===true;
    if(command.seekTime!==undefined&&(command.seekRevision===undefined||command.seekRevision!==state.seekRevision)){
      state.time=clamp(Number(command.seekTime)||0,0,8000);state.seekRevision=command.seekRevision??state.seekRevision+1;
    }
    state.playing=command.playing===true&&state.mode==='motion'&&!state.reducedMotion&&!document.hidden;
    draw();report('progress');if(state.playing)frameID=requestAnimationFrame(frame);
  };
  window.stopLesson=stop;
  window.SteadyBasicAudit={pose,progress,state:()=>({...state}),keyframes:()=>[0,.5,1,.5].map(p=>pose(spec.key,p))};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  reduced.addEventListener('change',()=>{state.reducedMotion=reduced.matches;if(state.reducedMotion)stop();});
  draw();report('ready');
})();
