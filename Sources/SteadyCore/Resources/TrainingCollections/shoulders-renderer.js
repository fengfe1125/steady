/* Offline shoulder motion geometry and SVG renderer. No network/storage dependencies. */
(() => {
  'use strict';
  const names = ['bandExternalRotation','bandPullApart','bandPassThrough','suspensionRow',
    'bentOverExtension','seatedReverseFly','seatedPress','lateralRaise','frontRaise','lightCardio'];
  const clamp = n => Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
  const mix = (a,b,t) => a + (b-a)*t;
  const pt = (x,y) => ({x,y});
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  function elbow(s,w,side) {
    const a=51,b=44,dx=w.x-s.x,dy=w.y-s.y,d=Math.max(.01,Math.hypot(dx,dy));
    const reach=Math.min(a+b-.1,Math.max(Math.abs(a-b)+.1,d));
    const k=(a*a-b*b+reach*reach)/(2*reach),h=Math.sqrt(Math.max(0,a*a-k*k));
    return pt(s.x+k*dx/d-side*h*dy/d,s.y+k*dy/d+side*h*dx/d);
  }
  function sample(id, raw) {
    if (!names.includes(id)) id='seatedPress';
    const t=clamp(raw), q=t*t*(3-2*t), seated=id==='seatedPress'||id==='seatedReverseFly';
    const sideView=id==='frontRaise', sy=seated?145:132, hipY=seated?252:238;
    let a,b,kind='dumbbell',lean=0;
    switch(id) {
      case 'bandExternalRotation': kind='band'; a=[pt(170,sy+42),pt(230,sy+42)]; b=[pt(116,sy+25),pt(284,sy+25)]; break;
      case 'bandPullApart': kind='band'; a=[pt(180,sy+28),pt(220,sy+28)]; b=[pt(112,sy+28),pt(288,sy+28)]; break;
      case 'bandPassThrough': kind='band'; sideView=true;
        // Front-low -> crown -> back-low: a continuous sagittal loop through the overhead arc.
        { const u=q<.5?q*2:(1-q)*2, front=q<.5;
          const y=front?mix(208,45,u):mix(45,210,u), x=front?mix(222,202,u):mix(202,178,u);
          a=[pt(x-8,y),pt(x+8,y)]; b=a; }
        break;
      case 'suspensionRow': kind='trx'; a=[pt(110,sy+66),pt(290,sy+66)]; b=[pt(148,sy+10),pt(252,sy+10)]; lean=mix(0,10,q); break;
      case 'bentOverExtension': lean=34; a=[pt(132,sy+91),pt(268,sy+91)]; b=[pt(112,sy+36),pt(288,sy+36)]; break;
      case 'seatedReverseFly': lean=12; a=[pt(180,sy+73),pt(220,sy+73)]; b=[pt(106,sy+35),pt(294,sy+35)]; break;
      case 'seatedPress': a=[pt(150,sy+31),pt(250,sy+31)]; b=[pt(145,62),pt(255,62)]; break;
      case 'lateralRaise': a=[pt(157,sy+91),pt(243,sy+91)]; b=[pt(94,sy+13),pt(306,sy+13)]; break;
      case 'frontRaise': sideView=true; a=[pt(214,sy+92),pt(232,sy+95)]; b=[pt(230,sy-8),pt(247,sy-5)]; break;
      case 'lightCardio': kind='none'; a=[pt(136,sy+75),pt(264,sy+75)]; b=[pt(136,sy+31),pt(264,sy+31)]; break;
    }
    const wrists=[pt(mix(a[0].x,b[0].x,q),mix(a[0].y,b[0].y,q)),pt(mix(a[1].x,b[1].x,q),mix(a[1].y,b[1].y,q))];
    const shoulders=sideView?[pt(184,sy),pt(216,sy)]:[pt(158,sy),pt(242,sy)];
    const hips=sideView?[pt(194,hipY),pt(206,hipY)]:[pt(174,hipY),pt(226,hipY)];
    const knees=seated?[pt(187,301),pt(213,301)]:[pt(178,316),pt(222,316)];
    const ankles=seated?[pt(145,381),pt(255,381)]:[pt(170,387),pt(230,387)];
    const feet=seated?[pt(125,394),pt(275,394)]:[pt(152,399),pt(248,399)];
    const arms=[0,1].map(i=>({shoulder:shoulders[i],elbow:elbow(shoulders[i],wrists[i],i===0?-1:1),wrist:wrists[i]}));
    const equipment=kind==='none'?[]:wrists.map((w,i)=>({kind,side:i===0?-1:1,grip:w,
      other:kind==='dumbbell'?pt(w.x,w.y+17):kind==='trx'?pt(i===0?133:267,34):pt(200, id==='bandPassThrough'?230:sy+30)}));
    return {id,progress:t,head:sideView?pt(207,61):pt(200,62),neck:pt(200,106),pelvis:pt(200,hipY),
      shoulders,hips,knees,ankles,feet,arms,equipment,seated,sideView,lean,
      contacts:equipment.map(e=>({hand:e.grip,equipment:e.grip,gap:0})),
      anchors:[pt(44,421),pt(356,421)],
      finite:[pt(200,62),...shoulders,...hips,...knees,...ankles,...feet,...arms.flatMap(a=>[a.elbow,a.wrist])].every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),
      reachable:arms.every(a=>dist(a.shoulder,a.elbow)>16&&dist(a.elbow,a.wrist)>14&&dist(a.shoulder,a.wrist)<100)};
  }
  const n=(p)=>`${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  function segment(a,b,color,width,extra='') { return `<path d="M${n(a)}L${n(b)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`; }
  function circle(p,r,fill,stroke='#a47c63',sw=2) { return `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`; }
  function shoe(p) { return `<path d="M${p.x-14} ${p.y-4}q9-8 17 0l19 8q4 2 1 7h-34q-9-3-3-15Z" fill="#e9eae2" stroke="#5c6b5b" stroke-width="2"/>`; }
  function dumbbell(w) { return `<g transform="translate(${w.x} ${w.y}) rotate(90)"><rect x="-3" y="-18" width="6" height="36" rx="2" fill="#aab5a3" stroke="#46594a" stroke-width="1.5"/><path d="M-7-27h14l4 5v8H-11v-8zM-11 14H11v8l-4 5H-7l-4-5z" fill="#53684f" stroke="#46594a" stroke-width="1.4"/><path d="M0-14v28" stroke="#dbe2d4" stroke-width="2"/></g>`; }
  function hand(w,dir) { return `<g transform="translate(${w.x} ${w.y})"><path d="M-8 3Q-12-4-7-9Q-3-12 4-8L11-3Q14 2 9 8L2 11L-7 8Z" fill="#d7b292" stroke="#a47c63" stroke-width="1.7"/><path d="M-5 0Q1-3 8 1M-4 4Q2 2 7 5M-2 7Q2 6 5 8" fill="none" stroke="#b88c70" stroke-width="1.2" stroke-linecap="round"/><path d="M-8-4Q-2-6 1 0L2 4" fill="none" stroke="#ecd0b5" stroke-width="2" stroke-linecap="round"/></g>`; }
  function draw(p, target) {
    const [L,R]=p.arms, [sL,sR]=p.shoulders,[hL,hR]=p.hips,[kL,kR]=p.knees,[aL,aR]=p.ankles,[fL,fR]=p.feet;
    const far=segment(sR,L.elbow,'#3f6048',28)+segment(L.elbow,L.wrist,'#d7b292',19)+segment(L.elbow,L.wrist,'#b88c70',1.5,'stroke-dasharray="1 22"');
    const legFar=segment(hR,kR,'#526057',31)+segment(kR,aR,'#526057',25)+shoe(fR);
    const torso=`<path d="M${sL.x} ${sL.y} Q200 ${sL.y-13} ${sR.x} ${sR.y} L${hR.x} ${hR.y} Q200 ${hR.y+16} ${hL.x} ${hL.y}Z" fill="#54765a" stroke="#46594a" stroke-width="3"/><path d="M200 ${sL.y+9}L200 ${hL.y-4}" stroke="#91ac83" stroke-width="3" opacity=".72"/><path d="M${sL.x+11} ${sL.y+8}Q200 ${sL.y+1} ${sR.x-11} ${sR.y+8}" fill="none" stroke="#91ac83" stroke-width="3"/>`;
    const legs=segment(hL,kL,'#647267',32)+segment(kL,aL,'#526057',26)+segment(hR,kR,'#526057',31)+segment(kR,aR,'#526057',25)+shoe(fL)+shoe(fR);
    const armBack=segment(sR,R.elbow,'#3f6048',29)+segment(R.elbow,R.wrist,'#d7b292',20)+segment(R.elbow,R.wrist,'#ecd0b5',2,'stroke-dasharray="1 22"');
    const sleeves=segment(sL,L.elbow,'#54765a',28)+segment(sR,R.elbow,'#54765a',28)+segment(sL,L.elbow,'#91ac83',2)+segment(sR,R.elbow,'#91ac83',2);
    const armFront=segment(sL,L.elbow,'#d7b292',20)+segment(sL,L.elbow,'#ecd0b5',2,'stroke-dasharray="1 22"')+segment(R.elbow,R.wrist,'#d7b292',19);
    const props=p.equipment.map(e=>{
      if(e.kind==='dumbbell') return dumbbell(e.grip);
      if(e.kind==='trx') return segment(e.other,e.grip,'#879182',5)+circle(e.other,4,'#46594a')+`<path d="M${e.grip.x-9} ${e.grip.y+4}q9 11 18 0" fill="none" stroke="#46594a" stroke-width="5" stroke-linecap="round"/>`;
      return '';
    }).join('');
    let band='';
    if(p.equipment.some(e=>e.kind==='band')) {
      const [x,y]=[L.wrist,R.wrist], arch=p.id==='bandPassThrough'?`C${x.x-90} 60 ${y.x+90} 60 ${y.x} ${y.y}`:`Q200 ${Math.min(y.y,x.y)-34} ${y.x} ${y.y}`;
      band=`<path d="M${x.x} ${x.y} ${arch}" fill="none" stroke="#93613f" stroke-width="8" stroke-linecap="round"/><path d="M${x.x} ${x.y-2} ${arch}" fill="none" stroke="#e7d8c9" stroke-width="2" stroke-linecap="round"/>`;
    }
    const bench=p.seated?`<path d="M126 265H274M140 265V390M260 265V390" fill="none" stroke="#879182" stroke-width="12" stroke-linecap="round"/><path d="M128 252H272" stroke="#4a5a4e" stroke-width="18" stroke-linecap="round"/>`:'';
    const trxAnchor=p.id==='suspensionRow'?`<path d="M110 30H290" stroke="#879182" stroke-width="8" stroke-linecap="round"/><path d="M200 30V19" stroke="#46594a" stroke-width="4"/>`:'';
    const hair=p.sideView?`<path d="M193 58Q191 36 211 37Q230 41 224 64L218 57Q206 52 197 62Z" fill="#46594a"/>`:`<path d="M164 62Q164 32 198 32Q229 36 236 57L225 68L219 54Q194 45 173 67Z" fill="#46594a"/>`;
    const face=p.sideView?`<path d="M218 67l9 5-9 4" fill="none" stroke="#a47c63" stroke-width="2"/><circle cx="211" cy="63" r="2" fill="#46594a"/>`:`<circle cx="188" cy="66" r="2" fill="#46594a"/><circle cx="211" cy="66" r="2" fill="#46594a"/><path d="M192 77q8 6 16 0" fill="none" stroke="#a47c63" stroke-width="1.5"/>`;
    const head=`<path d="M184 50Q193 39 207 43Q222 45 222 61L220 77Q216 94 201 97Q184 93 180 76Z" fill="#d7b292" stroke="#a47c63" stroke-width="2"/>${hair}${face}<path d="M190 99V111" stroke="#b88c70" stroke-width="15" stroke-linecap="round"/>`;
    const floor=`<ellipse cx="200" cy="411" rx="113" ry="9" fill="#879182" opacity=".17"/><path d="M55 421H345" stroke="#879182" stroke-width="2" opacity=".38"/>`;
    const front=segment(sL,L.elbow,'#d7b292',18)+segment(L.elbow,L.wrist,'#d7b292',17)+segment(L.elbow,L.wrist,'#ecd0b5',1.5,'stroke-dasharray="1 19"');
    target.innerHTML=`${floor}${trxAnchor}${bench}${legFar}${far}${torso}${legs}${sleeves}${armFront}${armBack}${band}${props}${head}${hand(L.wrist,-1)}${hand(R.wrist,1)}`;
  }
  function render(p,id) {
    const movement=id||document.body.dataset.movement||'seatedPress';
    const pose=sample(movement,p), target=document.getElementById('art');
    if(target) draw(pose,target);
    return pose;
  }
  globalThis.ShoulderArtwork={movements:names,sample,render};
  globalThis.renderEquipment=p=>render(p);
  render(0);
})();
