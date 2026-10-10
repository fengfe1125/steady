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

  function segment(root, a, b, cls, width = 14) {
    path(`M${a[0]} ${a[1]} L${b[0]} ${b[1]}`, `${cls} limb`, root).setAttribute('stroke-width', width);
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
  function base(root) {
    el('rect', { x: 20, y: 14, width: 360, height: 232, rx: 24, class: 'stage' }, root);
    path('M32 224 H368', 'floor', root);
  }
  function drawHanging(root, t, bad) {
    base(root);
    path('M122 44 H278 M142 44 V67 M258 44 V67', 'equipment', root);
    const knee = lerp(204, bad ? 182 : 163, t);
    const foot = lerp(225, bad ? 220 : 197, t);
    // The palms remain on the exact same rail points throughout the cycle.
    segment(root, [168, 89], [146, 59], 'skin', 12); segment(root, [146, 59], [142, 45], 'skin', 10);
    segment(root, [232, 89], [254, 59], 'skin', 12); segment(root, [254, 59], [258, 45], 'skin', 10);
    joint(root, [146, 59]); joint(root, [254, 59]);
    poly([[165,83],[235,83],[229,157],[173,157]], 'shirt torso', root);
    abdomen(root, 200, 126, 0, 34, 43);
    poly([[174,153],[226,153],[231,177],[169,177]], 'shorts', root);
    segment(root, [182,171], [184, knee], 'skin', 15); segment(root, [184,knee], [190,foot], 'skin', 12);
    segment(root, [218,171], [216, knee], 'skin', 15); segment(root, [216,knee], [210,foot], 'skin', 12);
    joint(root,[184,knee]); joint(root,[216,knee]); shoe(root,187,foot+7,24); shoe(root,207,foot+7,24);
    head(root,200,69);
    if (bad) path('M191 175 Q218 188 239 202', 'error-line', root);
  }
  function drawCrunch(root, t, bad) {
    base(root);
    path('M50 211 H344', 'mat', root);
    const lift = t * (bad ? 16 : 34);
    const neck = [82, 188-lift]; const shoulder = [105, 189-lift]; const hip = [204, 208];
    segment(root, shoulder, hip, 'shirt torso-side', 28);
    abdomen(root, 157, 197-lift*0.52, -9, 33, 25);
    poly([[186,197],[218,202],[226,214],[185,214]], 'shorts', root);
    head(root, neck[0], neck[1], -10);
    // Hands are lightly crossed over chest; shoulders rise, waist remains anchored.
    segment(root,[111,190-lift],[147,179-lift*0.55],'skin',8);
    segment(root,[113,198-lift],[151,187-lift*0.55],'skin',8);
    segment(root,[207,207],[244,182],'skin',15); segment(root,[244,182],[265,208],'skin',13);
    segment(root,[213,208],[255,188],'skin',13); segment(root,[255,188],[277,210],'skin',11);
    joint(root,[244,182]); joint(root,[255,188]); shoe(root,267,215); shoe(root,280,215);
    if (bad) { path('M75 186 Q65 169 76 155', 'error-line', root); path('M66 167 L78 160', 'error-line', root); }
  }
  function drawWheel(root, t, bad) {
    base(root); path('M40 220 H350', 'mat', root);
    const reach = t * 68, sag = bad ? t * 27 : 0;
    const shoulder = [191-reach, 132+sag], hip = [263, 161];
    // A broad torso shape keeps the lower back line visible as it moves.
    const vx = hip[0]-shoulder[0], vy = hip[1]-shoulder[1], len = Math.hypot(vx,vy), nx = -vy/len*13, ny = vx/len*13;
    poly([[shoulder[0]+nx,shoulder[1]+ny],[hip[0]+nx,hip[1]+ny],[hip[0]-nx,hip[1]-ny],[shoulder[0]-nx,shoulder[1]-ny]], 'shirt torso', root);
    abdomen(root, (shoulder[0]+hip[0])/2, (shoulder[1]+hip[1])/2, Math.atan2(vy,vx)*180/Math.PI, 34, 21);
    poly([[249,153],[279,158],[287,177],[256,179]], 'shorts', root);
    head(root, shoulder[0]-15, shoulder[1]-11, -12);
    const wheel = [118-reach*0.68, 206];
    // Both hands meet the axle; upper arms extend as the wheel moves away.
    segment(root,[shoulder[0]-1,shoulder[1]+3],[lerp(shoulder[0],wheel[0],.45),174+sag*.5],'skin',11);
    segment(root,[lerp(shoulder[0],wheel[0],.45),174+sag*.5],[wheel[0]+8,wheel[1]-5],'skin',9);
    segment(root,[shoulder[0]+7,shoulder[1]+8],[lerp(shoulder[0],wheel[0],.42),183+sag*.5],'skin',11);
    segment(root,[lerp(shoulder[0],wheel[0],.42),183+sag*.5],[wheel[0]+8,wheel[1]+2],'skin',9);
    joint(root,[wheel[0]+8,wheel[1]-5]); joint(root,[wheel[0]+8,wheel[1]+2]);
    segment(root,[268,171],[292,192],'skin',17); segment(root,[292,192],[276,218],'skin',13);
    segment(root,[258,174],[273,199],'skin',16); segment(root,[273,199],[253,218],'skin',12);
    joint(root,[292,192]); joint(root,[273,199]);
    shoe(root,269,222); shoe(root,248,222);
    circle(wheel[0],wheel[1],14,'wheel',root); circle(wheel[0],wheel[1],4,'axle',root);
    path(`M${wheel[0]-11} ${wheel[1]} H${wheel[0]+11}`, 'axle-line', root);
    if (bad) path(`M${shoulder[0]+10} ${shoulder[1]+9} Q226 178 254 169`, 'error-line dashed', root);
  }
  function drawMarch(root,t,bad) {
    base(root); path('M48 214 H352','mat',root);
    const up=t*37;
    segment(root,[119,176],[205,184],'shirt torso',27); abdomen(root,164,181,5,30,22);
    poly([[199,173],[230,178],[237,195],[202,193]],'shorts',root); head(root,106,171);
    segment(root,[210,188],[260,194],'skin',14); segment(root,[260,194],[305,210],'skin',12);
    segment(root,[224,187],[269,197],'skin',13); segment(root,[269,197],[310,211],'skin',11);
    segment(root,[120,177],[88,196],'skin',8); segment(root,[88,196],[66,213],'skin',7);
    segment(root,[129,179],[101,198],'skin',8); segment(root,[101,198],[78,213],'skin',7);
    segment(root,[220,190],[236,170-up],'skin',12); segment(root,[236,170-up],[266,168-up],'skin',10); shoe(root,270,169-up,-15);
    segment(root,[220,190],[260,201],'skin',12); segment(root,[260,201],[306,212],'skin',10); shoe(root,306,214);
    if(bad) path('M142 176 L177 165','error-line',root);
  }
  function drawPelvic(root,t,bad) {
    base(root); path('M48 217 H351','mat',root);
    const rise=t*(bad?4:13);
    segment(root,[106,185],[192,196-rise],'shirt torso',26); abdomen(root,151,188-rise*.48,7,32,23);
    poly([[184,185-rise],[220,187-rise],[232,202],[185,204]],'shorts',root); head(root,95,183);
    segment(root,[221,196],[265,187],'skin',15); segment(root,[265,187],[306,210],'skin',13); shoe(root,310,213);
    segment(root,[214,198],[255,189],'skin',13); segment(root,[255,189],[292,212],'skin',11); shoe(root,295,214);
    segment(root,[108,186],[89,202],'skin',8); segment(root,[89,202],[67,215],'skin',7);
    if(bad) path('M165 195 L192 215','error-line',root);
  }
  function drawCatCow(root,t,bad) {
    base(root); path('M42 218 H357','mat',root);
    const curve=bad?0:(t-.5)*26;
    path(`M134 143 Q187 ${130+curve} 242 143`, 'shirt-spine', root);
    abdomen(root,188,140+curve*.5,0,33,21);
    poly([[235,138],[263,146],[271,161],[239,162]],'shorts',root); head(root,117,139,bad?-22:0);
    segment(root,[135,148],[113,175],'skin',10); segment(root,[113,175],[104,210],'skin',8);
    segment(root,[147,148],[132,177],'skin',9); segment(root,[132,177],[127,210],'skin',8);
    segment(root,[254,155],[278,179],'skin',14); segment(root,[278,179],[282,210],'skin',11);
    segment(root,[263,157],[295,179],'skin',13); segment(root,[295,179],[298,210],'skin',10);
    if(bad) path('M149 137 H232','error-line dashed',root);
  }
  function drawStretch(root,t,bad) {
    base(root); path('M42 218 H357','mat',root);
    const lift=t*25;
    segment(root,[126,185-lift],[216,195],'shirt torso',26); abdomen(root,169,187-lift*.6,4,34,22);
    poly([[207,187],[242,192],[247,207],[211,205]],'shorts',root); head(root,112,178-lift);
    segment(root,[139,185-lift],[111,202],'skin',9); segment(root,[111,202],[97,216],'skin',8);
    segment(root,[151,187-lift],[130,204],'skin',9); segment(root,[130,204],[119,216],'skin',8);
    segment(root,[238,199],[286,207],'skin',15); segment(root,[286,207],[332,213],'skin',12); shoe(root,335,215);
    segment(root,[236,200],[278,210],'skin',13); segment(root,[278,210],[319,216],'skin',11);
    if(bad) path('M188 190 L211 213','error-line',root);
  }
  const renderers = {
    'abs-hanging-leg-raise': drawHanging, 'abs-supine-crunch': drawCrunch,
    'abs-kneeling-ab-wheel': drawWheel, 'abs-warmup-marching': drawMarch,
    'abs-warmup-pelvic-tilt': drawPelvic, 'abs-warmup-cat-cow': drawCatCow,
    'abs-prone-abdominal-stretch': drawStretch
  };
  window.renderEquipment = progress => {
    const root = document.getElementById('motion-svg');
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);
    const fn = renderers[document.body.dataset.motion];
    if (fn) fn(root, Math.max(0,Math.min(1,Number(progress)||0)), false);
  };
  window.renderAbsError = () => {
    const root = document.getElementById('mistake-svg');
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);
    const fn = renderers[document.body.dataset.motion];
    if (fn) fn(root, .82, true);
  };
  window.renderEquipment(0);
})();
