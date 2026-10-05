/* Original, offline SVG motion drawings for the abdominal lessons. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (parent) parent.appendChild(node);
    return node;
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const blend = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
  const path = (d, cls, root) => el('path', { d, class: cls }, root);
  const circle = (x, y, r, cls, root) => el('circle', { cx: x, cy: y, r, class: cls }, root);
  const poly = (pts, cls, root) => el('polygon', { points: pts.map(p => p.join(',')).join(' '), class: cls }, root);

  function segment(root, a, b, cls, width = 14, bone = null) {
    const node=path(`M${a[0]} ${a[1]} L${b[0]} ${b[1]}`, `${cls} limb`, root);
    node.setAttribute('stroke-width', width);
    if(bone) node.setAttribute('data-bone',bone);
  }
  function solveElbow(shoulder, hand, upper, lower, bend = 1) {
    const dx=hand[0]-shoulder[0], dy=hand[1]-shoulder[1];
    const d=Math.max(1,Math.min(Math.hypot(dx,dy),upper+lower-.01));
    const ux=dx/d, uy=dy/d, along=(upper*upper-lower*lower+d*d)/(2*d);
    const h=Math.sqrt(Math.max(0,upper*upper-along*along));
    return [shoulder[0]+ux*along-bend*uy*h,shoulder[1]+uy*along+bend*ux*h];
  }
  function joint(root, p, r = 4) { circle(p[0], p[1], r, 'skin-fill joint', root); }
  function shoe(root, x, y, angle = 0) {
    const g = el('g', { transform: `translate(${x} ${y}) rotate(${angle})` }, root);
    el('rect', { x: -5, y: -5, width: 21, height: 10, rx: 5, class: 'shoe' }, g);
    path('M-2 2 H13', 'shoe-sole', g);
  }
  function head(root, x, y, tilt = 0) {
    const g = el('g', { transform: `translate(${x} ${y}) rotate(${tilt})` }, root);
    el('ellipse', { cx: 0, cy: 0, rx: 13, ry: 15, class: 'skin-fill head' }, g);
    path('M-12 -4 Q-7 -19 7 -14 Q13 -10 12 -4 Q5 -9 -3 -7 Q-8 -6 -12 -4', 'hair', g);
    circle(7, 1, 1.4, 'eye', g);
  }
  function abdomen(root, x, y, angle = 0, width = 30, height = 33) {
    const g = el('g', { transform: `translate(${x} ${y}) rotate(${angle})` }, root);
    el('rect', { x: -width / 2, y: -height / 2, width, height, rx: height / 2, class: 'ab-highlight' }, g);
    path(`M0 ${-height/2+5} V${height/2-5} M-7 -2 H7 M-7 5 H7`, 'ab-detail', g);
  }
  function base(root, showFloor = true) {
    el('rect', { x: 20, y: 14, width: 360, height: 232, rx: 24, class: 'stage' }, root);
    if (showFloor) path('M32 224 H368', 'floor', root);
  }
  function drawHanging(root, t, bad) {
    base(root,false);
    path('M122 44 H278 M142 44 V67 M258 44 V67', 'equipment', root);
    const hipY = 165 - t * (bad ? 0 : 4);
    const thighAngle = (bad ? 7 : 12 + 64 * t) * Math.PI / 180;
    const shinAngle = (bad ? 0 : -8 + 10 * t) * Math.PI / 180;
    const thigh = 34, shin = 37;
    const hip1=[188,hipY+4], hip2=[212,hipY+4];
    const knee1 = [hip1[0] + Math.sin(thighAngle)*thigh, hip1[1] + Math.cos(thighAngle)*thigh];
    const knee2 = [hip2[0] + Math.sin(thighAngle)*thigh, hip2[1] + Math.cos(thighAngle)*thigh];
    const ankle1 = [knee1[0] + Math.sin(shinAngle)*shin, knee1[1] + Math.cos(shinAngle)*shin];
    const ankle2 = [knee2[0] + Math.sin(shinAngle)*shin, knee2[1] + Math.cos(shinAngle)*shin];
    // Palms stay on the same rail points while equal-length thigh and shin links rotate.
    const lean=bad?t*14:0;
    const upperLeft=[168+lean,86-lean], upperRight=[232+lean,86+lean*.1], gripLeft=[142,45], gripRight=[258,45];
    const elbowLeft=solveElbow(upperLeft,gripLeft,24.5,24.5,1), elbowRight=solveElbow(upperRight,gripRight,24.5,24.5,-1);
    segment(root,upperLeft,elbowLeft,'skin',12); segment(root,elbowLeft,gripLeft,'skin',10);
    segment(root,upperRight,elbowRight,'skin',12); segment(root,elbowRight,gripRight,'skin',10);
    joint(root,gripLeft,3); joint(root,gripRight,3);
    poly([[165+lean,83-lean],[235+lean,83+lean*.1],[229,hipY-4],[173,hipY-4]], 'shirt torso', root);
    abdomen(root, 200+lean*.35, 123, 0, 34, 38);
    poly([[174,hipY-9],[226,hipY-9],[231,hipY+14],[169,hipY+14]], 'shorts', root);
    segment(root,hip1,knee1,'skin',15,'left-thigh'); segment(root,knee1,ankle1,'skin',12,'left-shin');
    segment(root,hip2,knee2,'skin',15,'right-thigh'); segment(root,knee2,ankle2,'skin',12,'right-shin');
    joint(root,knee1); joint(root,knee2); shoe(root,ankle1[0],ankle1[1]+6,16); shoe(root,ankle2[0],ankle2[1]+6,16);
    head(root,200+lean,69-lean*.4);
  }
  function drawSupported(root, t, bad) {
    base(root,false);
    // Oblique view of the fixed chair: shoulders above elbows, elbows on pads,
    // forearms rising forward to visible vertical grips (source at 350 seconds).
    path('M140 65 V204 M273 87 V204 M140 145 H168 M259 145 H273', 'equipment', root);
    el('rect',{x:186,y:85,width:31,height:81,rx:9,class:'back-pad'},root);
    // The source uses nearly extended knees on the fixed chair; the hanging-bar
    // lesson deliberately keeps its bent-knee pattern separate.
    const legAngle=(bad?14:10+76*t)*Math.PI/180;
    const shinAngle=legAngle-(bad?20:5)*Math.PI/180;
    const thighLength=33, shinLength=39;
    const knee1=[184+Math.sin(legAngle)*thighLength,171+Math.cos(legAngle)*thighLength];
    const knee2=[216+Math.sin(legAngle)*thighLength,171+Math.cos(legAngle)*thighLength];
    const ankle1=[knee1[0]+Math.sin(shinAngle)*shinLength,knee1[1]+Math.cos(shinAngle)*shinLength];
    const ankle2=[knee2[0]+Math.sin(shinAngle)*shinLength,knee2[1]+Math.cos(shinAngle)*shinLength];
    const shrug=bad?15:0;
    poly([[175,89-shrug],[224,89-shrug],[225,158],[177,158]],bad?'shirt error-torso':'shirt torso',root);
    abdomen(root,200,128,0,32,40);
    poly([[175,154],[225,154],[231,177],[169,177]],'shorts',root);
    segment(root,[184,171],knee1,'skin',15,'left-thigh'); segment(root,knee1,ankle1,'skin',12,'left-shin');
    segment(root,[216,171],knee2,'skin',15,'right-thigh'); segment(root,knee2,ankle2,'skin',12,'right-shin');
    joint(root,knee1); joint(root,knee2); shoe(root,ankle1[0],ankle1[1]+5,20); shoe(root,ankle2[0],ankle2[1]+5,20);
    // Pad top faces show depth and their connection to the rear frame.
    poly([[158,137],[191,137],[202,143],[170,147]],'arm-pad',root).setAttribute('data-support','left');
    poly([[217,137],[253,137],[265,143],[229,147]],'arm-pad',root).setAttribute('data-support','right');
    path('M191 91 V140 M251 91 V140','equipment-thin',root);
    const shoulderA=[171,96-shrug],shoulderB=[228,96-shrug],handA=[191,99],handB=[251,99];
    const elbowA=solveElbow(shoulderA,handA,37,38,1),elbowB=solveElbow(shoulderB,handB,37,38,1);
    segment(root,shoulderA,elbowA,'skin',12,'left-upper-arm'); segment(root,elbowA,handA,'skin',9,'left-forearm');
    segment(root,shoulderB,elbowB,'skin',12,'right-upper-arm'); segment(root,elbowB,handB,'skin',9,'right-forearm');
    joint(root,elbowA); joint(root,elbowB); joint(root,handA,4); joint(root,handB,4);
    head(root,200,75);
  }
  function drawSling(root,t,bad) {
    base(root,false);
    path('M115 42 H285','equipment',root);
    // Both ends of each fabric loop visibly run all the way to the overhead bar.
    // The lower cuff wraps the arm near the elbow; it is not a floating U shape.
    path('M147 42 L142 83 Q141 116 163 118 Q182 119 182 101 L171 87 L156 42 M253 42 L258 83 Q259 116 237 118 Q218 119 218 101 L229 87 L244 42','sling',root);
    el('rect',{x:143,y:37,width:17,height:10,rx:3,class:'sling-anchor'},root);
    el('rect',{x:240,y:37,width:17,height:10,rx:3,class:'sling-anchor'},root);
    const swing=bad?t*16:0;
    segment(root,[170+swing,96],[160,105],'skin',13); segment(root,[160,105],[147,48],'skin',10);
    segment(root,[230+swing,96],[240,105],'skin',13); segment(root,[240,105],[253,48],'skin',10);
    poly([[171+swing,89],[229+swing,89],[226,158],[174,158]],bad?'shirt error-torso':'shirt torso',root);
    abdomen(root,200,124,0,32,39);
    poly([[174,153],[226,153],[230,177],[170,177]],'shorts',root);
    // At 220s the sling-supported legs are close to straight, unlike the free
    // hanging bent-knee demonstration. Keep a small, visible knee softness.
    const angle=(bad?5:18+68*t)*Math.PI/180, shinAngle=angle-(bad?18:8)*Math.PI/180, femur=34, tibia=38;
    const hip1=[184,171],hip2=[216,171];
    const k1=[hip1[0]+Math.sin(angle)*femur,hip1[1]+Math.cos(angle)*femur];
    const k2=[hip2[0]+Math.sin(angle)*femur,hip2[1]+Math.cos(angle)*femur];
    const a1=[k1[0]+Math.sin(shinAngle)*tibia,k1[1]+Math.cos(shinAngle)*tibia];
    const a2=[k2[0]+Math.sin(shinAngle)*tibia,k2[1]+Math.cos(shinAngle)*tibia];
    segment(root,hip1,k1,'skin',15,'left-thigh'); segment(root,k1,a1,'skin',12,'left-shin');
    segment(root,hip2,k2,'skin',15,'right-thigh'); segment(root,k2,a2,'skin',12,'right-shin');
    joint(root,k1); joint(root,k2); shoe(root,a1[0],a1[1]+5,16); shoe(root,a2[0],a2[1]+5,16);
    head(root,200+swing,74);
  }
  function drawCrunch(root, t, bad) {
    base(root);
    path('M50 218 H344', 'mat', root);
    const hip=[204,205], angle=lerp(-171,bad?-164:-149,t)*Math.PI/180;
    const shoulder=[hip[0]+Math.cos(angle)*100,hip[1]+Math.sin(angle)*100];
    const neck=bad?[shoulder[0]-5,shoulder[1]-20]:[shoulder[0]-23,shoulder[1]-1];
    segment(root, shoulder, hip, 'shirt torso-side', 28);
    abdomen(root,(shoulder[0]+hip[0])/2,(shoulder[1]+hip[1])/2,angle*180/Math.PI+180,33,25);
    poly([[186,197],[218,202],[226,214],[185,214]], 'shorts', root);
    head(root, neck[0], neck[1], bad?24:-10);
    // Hands lightly support the sides of the head; elbows stay relaxed.
    const handA=[neck[0]+12,neck[1]+(bad?-8:2)],handB=[neck[0]-10,neck[1]+(bad?-8:2)];
    const shoulderA=[shoulder[0]+6,shoulder[1]+1],shoulderB=[shoulder[0]+8,shoulder[1]+7];
    const elbowA=solveElbow(shoulderA,handA,bad?30:34,bad?30:34,1);
    const elbowB=solveElbow(shoulderB,handB,bad?30:34,bad?30:34,1);
    segment(root,shoulderA,elbowA,bad?'error-limb':'skin',8); segment(root,elbowA,handA,bad?'error-limb':'skin',7);
    segment(root,shoulderB,elbowB,bad?'error-limb':'skin',8); segment(root,elbowB,handB,bad?'error-limb':'skin',7);
    segment(root,[207,207],[244,182],'skin',15); segment(root,[244,182],[265,208],'skin',13);
    segment(root,[213,208],[255,188],'skin',13); segment(root,[255,188],[277,210],'skin',11);
    joint(root,[244,182]); joint(root,[255,188]); shoe(root,267,215); shoe(root,280,215);
  }
  function drawWheel(root, t, bad) {
    base(root,false); path('M40 220 H350', 'mat', root);
    const knee=[260,218], thetaLeg=lerp(-100,-118,t)*Math.PI/180, thigh=70;
    const hip=[knee[0]+Math.cos(thetaLeg)*thigh,knee[1]+Math.sin(thetaLeg)*thigh];
    const theta=lerp(-160,-175,t)*Math.PI/180, torsoLength=76;
    const shoulder=[hip[0]+Math.cos(theta)*torsoLength,hip[1]+Math.sin(theta)*torsoLength];
    // The knee stays on the mat and both femur and trunk keep a fixed length.
    const vx = hip[0]-shoulder[0], vy = hip[1]-shoulder[1], len = Math.hypot(vx,vy), nx = -vy/len*13, ny = vx/len*13;
    const topEdge=[shoulder[0]+nx,shoulder[1]+ny], hipEdge=[hip[0]+nx,hip[1]+ny], hipLow=[hip[0]-nx,hip[1]-ny], topLow=[shoulder[0]-nx,shoulder[1]-ny];
    if (!bad) poly([topEdge,hipEdge,hipLow,topLow], 'shirt torso', root);
    else {
      const midX=(shoulder[0]+hip[0])/2, midY=(shoulder[1]+hip[1])/2+17;
      poly([topEdge,[midX-nx,midY+ny],hipEdge,hipLow,[midX+nx,midY-ny],topLow], 'shirt error-torso', root);
    }
    abdomen(root, (shoulder[0]+hip[0])/2, (shoulder[1]+hip[1])/2, Math.atan2(vy,vx)*180/Math.PI, 34, 21);
    poly([[hip[0]-8,hip[1]-11],[hip[0]+22,hip[1]-7],[hip[0]+29,hip[1]+11],[hip[0]-6,hip[1]+14]], 'shorts', root);
    head(root, shoulder[0]-15, shoulder[1]-11, -12);
    const dy=206-shoulder[1], dx=Math.sqrt(Math.max(1,90*90-dy*dy));
    const wheel = [shoulder[0]-dx-8,206];
    // Both hands meet the axle; upper arms extend as the wheel moves away.
    const shoulder1=[shoulder[0]-3,shoulder[1]+2], shoulder2=[shoulder[0]+4,shoulder[1]+6];
    const hand1=[wheel[0]+8,204], hand2=[wheel[0]+8,208];
    const elbow1=solveElbow(shoulder1,hand1,46,46,1), elbow2=solveElbow(shoulder2,hand2,46,46,-1);
    segment(root,shoulder1,elbow1,'skin',11); segment(root,elbow1,hand1,'skin',9);
    segment(root,shoulder2,elbow2,'skin',11); segment(root,elbow2,hand2,'skin',9);
    joint(root,elbow1); joint(root,elbow2); joint(root,hand1); joint(root,hand2);
    const hip2=[hip[0]+6,hip[1]], knee2=[knee[0]+6,knee[1]];
    segment(root,hip,knee,'skin',17); segment(root,knee,[318,218],'skin',12);
    segment(root,hip2,knee2,'skin',15); segment(root,knee2,[324,218],'skin',11);
    joint(root,knee); joint(root,knee2); shoe(root,326,218); shoe(root,332,218);
    circle(wheel[0],wheel[1],14,'wheel',root); circle(wheel[0],wheel[1],4,'axle',root);
    path(`M${wheel[0]-11} ${wheel[1]} H${wheel[0]+11}`, 'axle-line', root);
    if (bad) abdomen(root,(shoulder[0]+hip[0])/2,(shoulder[1]+hip[1])/2+12,0,28,18);
  }
  function drawMarch(root,t,bad,cycleProgress) {
    base(root);
    // Front projection: the figure's left leg is on the viewer's right.
    // Each half of the full cycle lifts and lands a different leg. The first
    // amplitude argument remains a single-side pose fallback for static panels.
    let left=t,right=0;
    if(Number.isFinite(cycleProgress)) {
      const cycle=Math.max(0,Math.min(1,cycleProgress));
      const pulse=(start,end)=>{
        const position=Math.max(0,Math.min(1,(cycle-start)/(end-start)));
        return (1-Math.cos(2*Math.PI*position))/2;
      };
      left=pulse(.6/6,2.8/6); right=pulse(3.3/6,1);
    }
    const effort=Math.max(left,right),swing=left-right,lean=bad?-effort*16:0,femur=28,tibia=30;
    poly([[171+lean,79],[224+lean,79],[232,151],[168,151]],bad?'shirt error-torso':'shirt torso',root);
    abdomen(root,199+lean*.45,119,0,30,32); poly([[169,145],[231,145],[232,168],[168,168]],'shorts',root); head(root,198+lean,64);
    const shoulderA=[178+lean,91],shoulderB=[219+lean,91],handA=[165-9*swing,147-4*swing],handB=[232+9*swing,147+4*swing];
    const elbowA=solveElbow(shoulderA,handA,34,32,1),elbowB=solveElbow(shoulderB,handB,34,32,-1);
    segment(root,shoulderA,elbowA,'skin',11); segment(root,elbowA,handA,'skin',9);
    segment(root,shoulderB,elbowB,'skin',11); segment(root,elbowB,handB,'skin',9);
    for(const [side,hip,lift] of [['right',[181,161],right],['left',[219,161],left]]) {
      const angle=lift*(bad?18:45)*Math.PI/180,shinAngle=angle*.25-18*lift*Math.PI/180;
      const knee=[hip[0]+Math.sin(angle)*femur,hip[1]+Math.cos(angle)*femur];
      const ankle=[knee[0]+Math.sin(shinAngle)*tibia,knee[1]+Math.cos(shinAngle)*tibia];
      segment(root,hip,knee,'skin',15,`${side}-thigh`);segment(root,knee,ankle,'skin',12,`${side}-shin`);
      shoe(root,ankle[0],ankle[1],-8*lift);joint(root,knee);
    }
  }
  function drawPelvic(root,t,bad) {
    base(root); path('M48 218 H351','mat',root);
    const roll=t*(bad?1:7);
    const arch=bad?t*15:0;
    // Head, shoulders and buttocks remain in contact in the correct motion.
    const lumbarPress=bad?-arch:roll*.55;
    path(`M96 197 Q124 196 155 198 Q174 ${203+lumbarPress} 190 ${209-arch} L182 ${216-arch} Q163 ${213-arch*.6} 151 211 L98 210 Z`,'shirt torso',root); abdomen(root,140,202,2,28,21);
    head(root,81,202);
    poly([[157,195-arch],[192,195-arch],[209,207-arch],[190,218-arch],[161,216-arch]],bad?'shorts error-fill':'shorts',root);
    circle(190,208-arch,9,'skin-fill joint',root);
    segment(root,[198,205-arch],[244,187],'skin',15); segment(root,[244,187],[271,213],'skin',13); shoe(root,275,216);
    segment(root,[196,207-arch],[237,193],'skin',13); segment(root,[237,193],[260,214],'skin',11); shoe(root,264,217);
    segment(root,[98,204],[82,215],'skin',8); segment(root,[82,215],[67,217],'skin',7);
    path(`M143 ${208-roll} Q163 ${199-roll-arch} 182 ${208-arch}`,bad?'error-line':'lumbar-gap',root);
  }
  function drawCatCow(root,t,bad) {
    base(root); path('M42 218 H357','mat',root);
    // A gentle cow-to-cat cycle: exhale to round the back, inhale to return.
    const curve=bad?34:16-32*t;
    path(`M134 143 Q187 ${143+curve} 242 143`, 'shirt-spine', root);
    abdomen(root,188,142+curve*.5,0,33,21);
    poly([[235,138],[263,146],[271,161],[239,162]],'shorts',root); head(root,117,139,bad?-22:-5+10*t);
    const shoulderA=[132,149],shoulderB=[147,149],handA=[130,215],handB=[145,215];
    const elbowA=solveElbow(shoulderA,handA,34,34,1),elbowB=solveElbow(shoulderB,handB,34,34,-1);
    segment(root,shoulderA,elbowA,'skin',10); segment(root,elbowA,handA,'skin',8);
    segment(root,shoulderB,elbowB,'skin',9); segment(root,elbowB,handB,'skin',8);
    joint(root,handA,3); joint(root,handB,3);
    segment(root,[254,155],[254,211],'skin',14); segment(root,[254,211],[320,213],'skin',11);
    segment(root,[263,157],[263,211],'skin',13); segment(root,[263,211],[337,213],'skin',10);
    joint(root,[254,211]); joint(root,[263,211]);
    shoe(root,337,215); shoe(root,323,215);
    if(bad) path('M149 137 H232','error-line dashed',root);
  }
  function drawStretch(root,t,bad) {
    base(root); path('M42 218 H357','mat',root);
    const pelvisLift=bad?t*18:0, hip=[216,205-pelvisLift];
    const angle=lerp(-178,-117,t)*Math.PI/180;
    const shoulder=[216+Math.cos(angle)*86,205+Math.sin(angle)*86],curve=[lerp(171,177,t),hip[1]-7];
    path(`M${shoulder[0]} ${shoulder[1]} Q${curve[0]} ${curve[1]} ${hip[0]} ${hip[1]}`,bad?'shirt-spine error-line':'shirt-spine',root);
    const middle=[shoulder[0]*.25+curve[0]*.5+hip[0]*.25,shoulder[1]*.25+curve[1]*.5+hip[1]*.25];
    abdomen(root,middle[0],middle[1],Math.atan2(hip[1]-shoulder[1],hip[0]-shoulder[0])*180/Math.PI,28,19);
    poly([[207,197-pelvisLift],[242,199-pelvisLift],[247,216-pelvisLift],[211,215-pelvisLift]],bad?'shorts error-fill':'shorts',root);
    head(root,shoulder[0]-18,shoulder[1]-6);
    const handA=[148,216],handB=[161,216],shoulderA=[shoulder[0]+3,shoulder[1]+3],shoulderB=[shoulder[0]+12,shoulder[1]+5];
    const elbowA=solveElbow(shoulderA,handA,47,47,-1), elbowB=solveElbow(shoulderB,handB,47,47,-1);
    segment(root,shoulderA,elbowA,'skin',9); segment(root,elbowA,handA,'skin',8);
    segment(root,shoulderB,elbowB,'skin',9); segment(root,elbowB,handB,'skin',8);
    joint(root,elbowA); joint(root,elbowB);
    segment(root,[238,207-pelvisLift],[286,214],'skin',15); segment(root,[286,214],[332,213],'skin',12); shoe(root,335,215);
    segment(root,[236,208-pelvisLift],[278,214],'skin',13); segment(root,[278,214],[319,216],'skin',11);
  }
  function drawSideCrunch(root,t,bad) {
    base(root); path('M50 213 H350','mat',root);
    const lift=t*(bad?41:28), twist=t*(bad?34:13);
    const nearShoulder=[112,194-lift-twist*.5], farShoulder=[129,190-lift*.65];
    const hip=[207,205], hipFar=[224,207];
    poly([[nearShoulder[0]-7,nearShoulder[1]-5],[farShoulder[0],farShoulder[1]-7],[hipFar[0],197],[216,214],[nearShoulder[0]-6,nearShoulder[1]+16]],bad?'shirt error-torso':'shirt torso',root);
    abdomen(root,165,199-lift*.43-twist*.12,Math.atan2(hip[1]-nearShoulder[1],hip[0]-nearShoulder[0])*180/Math.PI,31,18);
    poly([[hip[0]-7,194],[hipFar[0]+8,196],[232,211],[206,216],[187,211]],'shorts',root);
    head(root,88,189-lift*.9,bad?32:twist*.35);
    // Both hands cradle the temples; the target shoulder rotates slightly farther forward.
    const headX=88,headY=189-lift*.9, handNear=[headX-10,headY+2],handFar=[headX+11,headY+2];
    const elbowNear=solveElbow(nearShoulder,handNear,32,32,1),elbowFar=solveElbow(farShoulder,handFar,32,32,1);
    segment(root,nearShoulder,elbowNear,bad?'error-limb':'skin',9); segment(root,elbowNear,handNear,bad?'error-limb':'skin',8);
    segment(root,farShoulder,elbowFar,bad?'error-limb':'skin',9); segment(root,elbowFar,handFar,bad?'error-limb':'skin',8);
    segment(root,[213,207],[253,190],'skin',15); segment(root,[253,190],[276,211],'skin',12);
    segment(root,[222,208],[260,193],'skin',13); segment(root,[260,193],[288,212],'skin',11);
    joint(root,[253,190]); joint(root,[260,193]); shoe(root,278,215); shoe(root,290,216);
  }
  const renderers = {
    'abs-hanging-leg-raise': drawHanging, 'abs-supine-crunch': drawCrunch,
    'abs-kneeling-ab-wheel': drawWheel, 'abs-warmup-marching': drawMarch,
    'abs-warmup-pelvic-tilt': drawPelvic, 'abs-warmup-cat-cow': drawCatCow,
    'abs-prone-abdominal-stretch': drawStretch, 'abs-supported-knee-raise': drawSupported,
    'abs-sling-knee-raise': drawSling, 'abs-side-biased-crunch': drawSideCrunch
  };
  window.renderEquipment = (progress,cycleProgress) => {
    renderInto('motion-svg', progress, false,cycleProgress);
  };
  function renderInto(id, progress, bad,cycleProgress) {
    const root = document.getElementById(id);
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);
    const motion=document.body.dataset.motion,fn=renderers[motion];
    const effort=Math.max(0,Math.min(1,Number(progress)||0));
    if(motion==='abs-warmup-marching') fn(root,effort,bad,cycleProgress);
    else if(fn) fn(root,effort,bad);
  }
  window.renderAbsError = () => {
    renderInto('mistake-good', .82, false);
    renderInto('mistake-bad', .82, true);
  };
  const style = document.createElement('style');
  style.textContent = `
    :root { color-scheme: light dark; --page:#f5f6f3; --card:#ffffff; --ink:#263331; --muted:#687470; --soft:#edf1ed; --line:#d4dcd6; --accent:#4f8068; --red:#c83e43; }
    @media(prefers-color-scheme:dark) { :root { --page:#141916; --card:#202824; --ink:#edf2ee; --muted:#aab5ae; --soft:#29332e; --line:#435149; --accent:#8dbda0; --red:#ff777b; } }
    html[data-dark="true"] { --page:#141916; --card:#202824; --ink:#edf2ee; --muted:#aab5ae; --soft:#29332e; --line:#435149; --accent:#8dbda0; --red:#ff777b; color-scheme:dark; }
    html[data-dark="false"] { --page:#f5f6f3; --card:#ffffff; --ink:#263331; --muted:#687470; --soft:#edf1ed; --line:#d4dcd6; --accent:#4f8068; --red:#c83e43; color-scheme:light; }
    * { box-sizing:border-box } body { margin:0; padding:0; width:100vw; height:100vh; overflow:hidden; background:var(--page); color:var(--ink); font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif }
    section { width:100vw; height:100vh; max-width:none; margin:0; display:flex; align-items:center; justify-content:center; overflow:hidden } [hidden] { display:none!important }
    .panel { width:100vw; height:100vh; margin:0; padding:0; border:0; border-radius:0; background:var(--page); display:flex; align-items:center; justify-content:center; overflow:hidden }
    svg { display:block; width:100%; height:100%; max-height:100vh; overflow:hidden; flex:0 0 100%; min-width:0 }
    #mistakes svg { flex:1 1 50%; width:50% }
    .stage { fill:var(--soft) } .floor,.mat { fill:none; stroke:var(--line); stroke-width:4; stroke-linecap:round }
    .equipment { fill:none; stroke:var(--muted); stroke-width:8; stroke-linecap:round; stroke-linejoin:round }
    .equipment-thin { fill:none; stroke:var(--muted); stroke-width:5; stroke-linecap:round }
    .sling { fill:none; stroke:var(--accent); stroke-width:10; stroke-linecap:round; stroke-linejoin:round }
    .sling-anchor { fill:var(--accent); stroke:var(--ink); stroke-width:1 }
    .back-pad,.arm-pad { fill:var(--line); stroke:var(--muted); stroke-width:1 }
    .skin { fill:none; stroke:#bd805f; stroke-linecap:round; stroke-linejoin:round } .skin-fill { fill:#d39a75; stroke:#a96f52; stroke-width:1.5 }
    .torso { fill:var(--accent); stroke:color-mix(in srgb,var(--ink) 18%,transparent); stroke-width:1.4; stroke-linejoin:round }
    .shirt { fill:var(--accent); stroke:color-mix(in srgb,var(--ink) 18%,transparent); stroke-linejoin:round }
    .shirt.error-torso { fill:color-mix(in srgb,var(--red) 48%,#27312e); stroke:var(--red) }
    .shirt.limb { fill:none; stroke:var(--accent); stroke-width:26 } .shirt-spine { fill:none; stroke:var(--accent); stroke-width:26; stroke-linecap:round }
    .torso-side { fill:none; stroke:var(--accent) } .shorts,.shoe,.hair { fill:#293534; stroke:color-mix(in srgb,var(--ink) 20%,transparent); stroke-width:1.3 }
    .shorts.error-fill { fill:color-mix(in srgb,var(--red) 40%,#293534); stroke:var(--red) }
    .error-limb { fill:none; stroke:var(--red); stroke-linecap:round; stroke-linejoin:round }
    .shoe-sole { fill:none; stroke:#d4dbd6; stroke-width:1.6; stroke-linecap:round } .eye { fill:#303936 }
    .joint { stroke:#a96f52; stroke-width:1 } .ab-highlight { fill:color-mix(in srgb,var(--accent) 34%,transparent); stroke:var(--accent); stroke-width:1.5 }
    .ab-detail { fill:none; stroke:var(--accent); stroke-width:1.6; stroke-linecap:round; opacity:.85 }
    .wheel { fill:var(--card); stroke:var(--muted); stroke-width:5 } .axle { fill:var(--accent) } .axle-line { stroke:var(--muted); stroke-width:3 }
    .error-line { fill:none; stroke:var(--red); stroke-width:4; stroke-linecap:round; stroke-linejoin:round }
    .shirt-spine.error-line { stroke-width:26 }
    .swing-body { fill:none; stroke:var(--red); stroke-width:9; stroke-linecap:round }
    .sag-curve { fill:none; stroke:var(--red); stroke-width:7; stroke-linecap:round }
    .lumbar-gap { fill:none; stroke:var(--muted); stroke-width:2; stroke-dasharray:3 3 }
    .error-fill { fill:color-mix(in srgb,var(--red) 45%,#293534); stroke:var(--red); stroke-width:2 }
    .error-line.dashed { stroke-dasharray:6 5 } .detail-grid { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); margin-top:12px }
    .note { margin:12px 0 0; color:var(--muted); font-size:.95rem } .label { font-weight:650; margin:.25rem 0 .4rem }
    .tag { display:inline-block; border-radius:99px; padding:4px 10px; background:var(--soft); color:var(--muted); font-size:.82rem }
    ol { margin:.35rem 0 0; padding-left:1.3rem } li { margin:.35rem 0 } .red { color:var(--red) }
  `;
  document.head.appendChild(style);
  window.renderEquipment(0);
  renderInto('detail-svg', .8, false);
  window.renderAbsError();
})();
