/* Source-video machine variants. Hidden transmissions intentionally omitted. */
(()=>{const SA=window.SteadyAnatomy,{el,V}=SA.util;
const line=(g,a,b,w=7,c='var(--frame)')=>el('path',{d:`M${a.x},${a.y}L${b.x},${b.y}`,stroke:c,'stroke-width':w,'stroke-linecap':'round',fill:'none'},g);
const rect=(g,x,y,w,h,c)=>el('rect',{x,y,width:w,height:h,rx:4,fill:c},g);
SA.equipment.types.reference_sled={
 bounds:()=>[V(-150,-265),V(155,6)],
 build(l,c,it){const g=l.back;line(g,V(-145,0),V(145,0),10);line(g,V(108,0),V(108,-170),9);rect(g,106,-163,9,97,'var(--pad)');line(g,V(-130,-87),V(12,-56),5);line(g,V(-130,-76),V(12,-45),5);it.seat=el('g',{},g);rect(it.seat,-24,8,58,9,'var(--pad)');line(it.seat,V(-18,6),V(-58,-99),15,'var(--pad)');line(it.seat,V(-8,20),V(-8,43),9);it.grips=el('g',{},l.front);this.update(c,it);},
 update(c,it){const h=c.joints.hip;it.seat.setAttribute('transform',`translate(${h.x},${h.y})`);it.grips.replaceChildren();for(const s of ['near','far']){const a=c.joints.arms[s].H;line(it.grips,V(a.x-10,a.y),V(a.x+12,a.y),6,'var(--metal-mid)');}}
};
SA.equipment.types.reference_press={
 bounds:()=>[V(-135,-330),V(135,6)],
 build(l,c,it){const g=l.back;line(g,V(-128,0),V(128,0),10);for(const x of [-118,118])line(g,V(x,0),V(x,-300),8);line(g,V(-118,-300),V(118,-300),7);rect(g,-31,-225,62,103,'var(--pad)');rect(g,-54,-117,108,10,'var(--pad)');line(g,V(0,-107),V(0,0),9);it.arms=el('g',{},g);it.handles=el('g',{},l.front);this.update(c,it);},
 update(c,it){it.arms.replaceChildren();it.handles.replaceChildren();for(const side of ['r','l']){const sign=side==='r'?1:-1;const h=c.joints.arms[side].H;line(it.arms,V(sign*35,-265),h,8,'var(--metal-mid)');el('circle',{cx:sign*35,cy:-265,r:7,fill:'var(--metal)'},it.arms);line(it.handles,V(h.x-10,h.y),V(h.x+10,h.y),6,'var(--pad)');}}
};
// A wall parallel to the camera (the body stands in front of it): a background panel, not the edge-on chest_wall strip.
SA.equipment.types.wall_back={
 bounds:(c,it)=>[V(it.x,-352),V(it.x+(it.width??120),0)],
 build(l,c,it){const g=l.back,w=it.width??120;el('rect',{x:it.x,y:-350,width:w,height:350,fill:'var(--stage-line)',opacity:.45},g);line(g,V(it.x,-350),V(it.x,0),2,'var(--stage-line)');line(g,V(it.x+w,-350),V(it.x+w,0),2,'var(--stage-line)');},
 update(){}
};
// ---- Round-2 C additions (chest library). Generic props; positions in world units, ground y=0.
const C=(g,x,y,r,cls)=>el('circle',{cx:x,cy:y,r,class:cls},g);
const HW=(c,s)=>(c.joints.arms[s]||{}).H;
const sides=c=>c.view==='side'?['far','near']:['r','l'];
const T=SA.equipment.types;
// Barbell. Side view: the plate is seen face-on, centred on the hands (drawn behind the figure so the grip stays legible).
// Front view: the bar runs through both hands with plates past them. r = plate radius (default 34; 0 = bare bar).
T.barbell={
 build(l,c,it){it.g=el('g',{class:'eq barbell'},c.view==='side'?l.back:l.front);this.update(c,it);},
 update(c,it){const g=it.g;g.replaceChildren();const r=it.r??34;
  if(c.view==='side'){const h=HW(c,'near')||HW(c,'far');if(!h)return;if(r>0){C(g,h.x,h.y,r,'metal');C(g,h.x,h.y,r-6,'metal-face');}C(g,h.x,h.y,6,'metal-light');return;}
  const a=HW(c,'r'),b=HW(c,'l');if(!a||!b)return;const d=b.x>=a.x?1:-1,ext=it.ext??70;
  const A=V(a.x-d*ext,a.y),B=V(b.x+d*ext,b.y);line(g,A,B,6,'var(--metal-mid)');
  if(r>0)for(const [p,s] of [[A,-1],[B,1]]){const x=p.x+s*d*(-14);rect(g,x-7,p.y-r,14,2*r,'var(--metal)');}},
 bounds(c,it){const out=[];for(const s of sides(c)){const h=HW(c,s);if(h){const r=(it.r??34)+(c.view==='side'?0:80);out.push(V(h.x-r,h.y-(it.r??34)),V(h.x+r,h.y+(it.r??34)));}}return out.length?[V(Math.min(...out.map(p=>p.x)),Math.min(...out.map(p=>p.y))),V(Math.max(...out.map(p=>p.x)),Math.max(...out.map(p=>p.y)))]:[];}
};
// Smith machine: a barbell riding on a fixed vertical rail at x (side view), or two rails at ±rail (front view).
T.smith={
 build(l,c,it){it.rails=el('g',{class:'eq smith'},l.back);T.barbell.build(l,c,it);this.update(c,it);},
 update(c,it){const g=it.rails;g.replaceChildren();const top=it.topY??-340;
  let xs;if(c.view==='side'){const h=HW(c,'near')||HW(c,'far');xs=[it.x??(h?h.x:0)];}else xs=[-(it.rail??150),it.rail??150];
  for(const x of xs)rect(g,x-5,top,10,-top,'var(--frame-dark)');
  if(c.view!=='side')line(g,V(xs[0],top),V(xs[1],top),8,'var(--frame)');else line(g,V(xs[0]-40,top),V(xs[0]+40,top),8,'var(--frame)');
  line(g,V(Math.min(...xs)-50,0),V(Math.max(...xs)+50,0),9,'var(--frame)');T.barbell.update(c,it);},
 bounds(c,it){const top=it.topY??-340;if(c.view!=='side'){const w=(it.rail??150)+55;return [V(-w,top),V(w,0)];}const h=HW(c,'near')||HW(c,'far'),x=it.x??(h?h.x:0);return [V(x-60,top),V(x+60,0)];}
};
// Exercise / stability ball (r≈60), medicine ball (r≈20), massage ball (r≈8). Centre (x, y); y defaults to resting on the floor (-r).
T.ball={
 build(l,c,it){it.g=el('g',{class:'eq ball'},(it.layer??(it.between?'front':'back'))==='front'?l.front:l.back);this.update(c,it);},
 pos(c,it){const r=it.r??60;if(it.between){const a=HW(c,c.view==='side'?'near':'r'),b=HW(c,c.view==='side'?'far':'l');if(a&&b)return V((a.x+b.x)/2+(it.dx??0),(a.y+b.y)/2+(it.dy??0));}if(it.under){const h=HW(c,it.under==='hands'?(c.view==='side'?'near':'r'):it.under);if(h)return V(h.x+(it.dx??0),h.y+r+(it.gap??4));}return V(it.x??0,it.y??-r);},
 update(c,it){const g=it.g,r=it.r??60;if(it.under||it.between||!g.firstChild){g.replaceChildren();const p=this.pos(c,it);
  C(g,p.x,p.y,r,it.kind==='medicine'?'frame-dark':'roller');
  el('path',{d:`M${p.x-r*0.62},${p.y-r*0.35}A${r*0.75},${r*0.75} 0 0 1 ${p.x+r*0.1},${p.y-r*0.72}`,fill:'none',stroke:'#fff','stroke-width':Math.max(1.5,r*0.07),'stroke-linecap':'round',opacity:.45},g);}},
 bounds(c,it){const r=it.r??60,p=this.pos(c,it);return [V(p.x-r,p.y-r),V(p.x+r,p.y+r)];}
};
// BOSU half ball: dome up (default, r≈58, height≈0.5r) or flip:true for platform up (hands on the flat side).
T.bosu={
 build(l,c,it){const g=el('g',{class:'eq bosu'},it.layer==='front'?l.front:l.back),r=it.r??58,h=it.h??r*0.5,x=it.x;
  if(it.flip){el('path',{d:`M${x-r},${-h}A${r},${h} 0 0 0 ${x+r},${-h}Z`,class:'pad'},g);rect(g,x-r-2,-h-8,2*r+4,9,'var(--frame-dark)');}
  else{el('path',{d:`M${x-r},0A${r},${h} 0 0 1 ${x+r},0Z`,class:'pad'},g);rect(g,x-r-2,-6,2*r+4,6,'var(--frame-dark)');}},
 update(){},bounds(c,it){const r=it.r??58,h=(it.h??r*0.5)+(it.flip?8:0);return [V(it.x-r-2,-h),V(it.x+r+2,0)];}
};
// Pilates ring. Front view: a circle squeezed between both palms. Side view: the ring seen edge-on, an ellipse at the near hand.
T.ring={
 build(l,c,it){it.n=el('ellipse',{fill:'none',stroke:'var(--metal)','stroke-width':6},l.front);this.update(c,it);},
 update(c,it){let cx,cy,rx,ry;
  if(c.view==='side'){const h=HW(c,'near')||HW(c,'far');if(!h)return;cx=h.x+(it.dx??0);cy=h.y+(it.dy??0);rx=it.rx??9;ry=it.ry??36;}
  else{const a=HW(c,'r'),b=HW(c,'l');if(!a||!b)return;cx=(a.x+b.x)/2;cy=(a.y+b.y)/2;const R=it.ry??38,d=Math.hypot(a.x-b.x,a.y-b.y)/2;rx=Math.min(Math.max(d,R*0.6),R);ry=R;}
  it.n.setAttribute('cx',cx);it.n.setAttribute('cy',cy);it.n.setAttribute('rx',rx);it.n.setAttribute('ry',ry);
  if(it.angle)it.n.setAttribute('transform',`rotate(${it.angle} ${cx} ${cy})`);},
 bounds(){return [];}
};
// Kettlebell held by the handle: the bell hangs offset from the hand (default straight below; offset [dx,dy]).
T.kettlebell={
 build(l,c,it){it.g=el('g',{class:'eq kettlebell'},l.front);this.update(c,it);},
 update(c,it){const g=it.g;g.replaceChildren();const h=HW(c,it.hand??'near');if(!h)return;const o=it.offset??[0,22],r=it.r??17,b=V(h.x+o[0],h.y+o[1]);
  line(g,h,b,6,'var(--metal-mid)');C(g,b.x,b.y,r,'metal');C(g,b.x-r*0.25,b.y-r*0.25,r*0.45,'metal-face');},
 bounds(c,it){const h=HW(c,it.hand??'near');if(!h)return [];const o=it.offset??[0,22],r=it.r??17;return [V(h.x+o[0]-r,h.y+o[1]-r),V(h.x+o[0]+r,h.y+o[1]+r)];}
};
// Push-up handles / parallettes: a small stand under each supporting hand, top at y=top (default -24).
T.pushup_bars={
 build(l,c,it){it.g=el('g',{class:'eq pushup-bars'},l.back);this.update(c,it);},
 update(c,it){const g=it.g;g.replaceChildren();const top=it.top??-24;for(const s of sides(c)){const h=HW(c,s);if(!h)continue;
  el('path',{d:`M${h.x-16},0L${h.x-7},${top}L${h.x+7},${top}L${h.x+16},0Z`,class:'frame-dark'},g);line(g,V(h.x-9,top),V(h.x+9,top),7,'var(--metal-mid)');}},
 bounds(){return [];}
};
// Generic block: yoga brick, aerobic step, raised platform, plyo box. Left edge x, width, top y (ground 0).
T.box={
 build(l,c,it){it.g=el('g',{class:'eq box'},it.layer==='front'?l.front:l.back);this.update(c,it);},
 x(c,it){const w=it.width??60;if(it.under){const h=HW(c,it.under==='hands'?(c.view==='side'?'near':'r'):it.under);if(h)return h.x-w/2+(it.dx??0);}return it.x??0;},
 update(c,it){const g=it.g;if(!it.under&&g.firstChild)return;g.replaceChildren();const w=it.width??60,top=it.top??-24,x=this.x(c,it);
  rect(g,x,top,w,-top,it.kind==='step'?'var(--frame-dark)':'var(--pad)');rect(g,x+3,top+2,w-6,3,'#ffffff55');},
 bounds(c,it){const x=this.x(c,it);return [V(x,it.top??-24),V(x+(it.width??60),0)];}
};
// Cable / rope / elastic band from a fixed anchor to the hands. anchor {x,y}; hands (default all); style 'cable'|'band';
// column:true draws a cable-tower upright at anchor.x.
T.cable={
 build(l,c,it){const g=el('g',{class:'eq cable'},l.back),A=it.anchor;
  if(it.column){rect(g,A.x-7,-330,14,330,'var(--frame-dark)');line(g,V(A.x-45,0),V(A.x+45,0),9,'var(--frame)');}
  C(g,A.x,A.y,it.column?9:5,'metal');
  const hs=it.hands??sides(c);it.lines=hs.map(s=>({s,n:el('path',{class:it.style==='band'?'band':'cable'},s==='near'||s==='r'?l.front:l.back),gr:el('path',{class:'metal'},s==='near'||s==='r'?l.front:l.back)}));this.update(c,it);},
 update(c,it){const A=V(it.anchor.x,it.anchor.y);for(const q of it.lines){const h=HW(c,q.s);if(!h)continue;const d=SA.util.unit?SA.util.unit(V(h.x-A.x,h.y-A.y)):V(0,1);
  q.n.setAttribute('d',`M${A.x},${A.y}L${h.x},${h.y}`);const n=V(-d.y,d.x);if(it.style!=='band')q.gr.setAttribute('d',`M${h.x-n.x*9},${h.y-n.y*9}L${h.x+n.x*9},${h.y+n.y*9}`);}},
 bounds(c,it){const A=it.anchor;return it.column?[V(A.x-45,-332),V(A.x+45,0)]:[V(A.x-6,A.y-6),V(A.x+6,A.y+6)];}
};
// Machine press arm: a lever from a fixed pivot to the hands (chest-press / incline-press machines).
// pivot {x,y}; optional column:true draws the machine upright under the pivot; hands default to all.
T.lever={
 build(l,c,it){const g=el('g',{class:'eq lever'},l.back),P=it.pivot;
  if(it.column!==false){rect(g,P.x-8,P.y,16,-P.y,'var(--frame-dark)');line(g,V(P.x-60,0),V(P.x+60,0),9,'var(--frame)');rect(g,P.x-22,P.y+30,44,90,'var(--metal-light)');}
  it.arms=(it.hands??sides(c)).map(s=>({s,n:el('g',{},s==='near'||s==='r'?l.front:l.back)}));C(g,P.x,P.y,9,'metal-mid');this.update(c,it);},
 update(c,it){const P=V(it.pivot.x,it.pivot.y);for(const q of it.arms){const h=HW(c,q.s);if(!h)continue;q.n.replaceChildren();line(q.n,P,h,8,'var(--frame)');line(q.n,V(h.x-9,h.y),V(h.x+9,h.y),7,'var(--metal-mid)');}},
 bounds(c,it){const P=it.pivot;return [V(P.x-60,P.y-10),V(P.x+60,0)];}
};
// Seen-from-above support for lying moves drawn with rotate: 90 (front-view figure turned flat).
// Coordinates are the unrotated standing frame: head near y -350, feet near y 0, body centred on x 0.
// shape 'rect' {x, y, w, h} (mat, bench pad) or 'circle' {x, y, r} (ball, BOSU); kind picks the fill.
T.top={
 build(l,c,it){const g=el('g',{class:'eq top'},l.back),fill={mat:'var(--mat)',bench:'var(--pad)',ball:'var(--roller)',bosu:'var(--frame-dark)'}[it.kind??'mat'];
  if(it.shape==='circle'){C(g,it.x??0,it.y,it.r??55,'');g.lastChild.setAttribute('fill',fill);g.lastChild.setAttribute('opacity',it.kind==='bosu'?.85:1);}
  else{rect(g,it.x??-90,it.y??-385,it.w??180,it.h??405,fill);}},
 update(){},
 bounds(c,it){return it.shape==='circle'?[V((it.x??0)-(it.r??55),it.y-(it.r??55)),V((it.x??0)+(it.r??55),it.y+(it.r??55))]:[V(it.x??-90,it.y??-385),V((it.x??-90)+(it.w??180),(it.y??-385)+(it.h??405))];}
};
// VIPR: a short rubber tube held in the hands, lying along the forearm direction (elbow → hand).
// length (default 95) and r (half thickness, default 16); offset shifts it along the forearm (default 30: mostly beyond the hand).
T.vipr={
 build(l,c,it){it.g=el('g',{class:'eq vipr'},l.front);this.update(c,it);},
 update(c,it){const g=it.g;g.replaceChildren();const s=c.view==='side'?(HW(c,'near')?'near':'far'):'r',a=c.joints.arms[s];if(!a||!a.H)return;
  const E=a.E||a.W,H=a.H,dx=H.x-E.x,dy=H.y-E.y,n=Math.hypot(dx,dy)||1,u=V(dx/n,dy/n),L=it.length??95,o=it.offset??30,r=it.r??16;
  const A=V(H.x-u.x*(L/2-o),H.y-u.y*(L/2-o)),B=V(H.x+u.x*(L/2+o),H.y+u.y*(L/2+o));
  line(g,A,B,2*r,'var(--frame-dark)');line(g,A,V(A.x+u.x*10,A.y+u.y*10),2*r-2,'var(--metal-mid)');line(g,B,V(B.x-u.x*10,B.y-u.y*10),2*r-2,'var(--metal-mid)');
  line(g,V(H.x-u.x*12,H.y-u.y*12),V(H.x+u.x*12,H.y+u.y*12),8,'var(--metal)');},
 bounds(){return [];}
};
// Crescent sandbag (牛角包): a low soft bag on the floor with two strap handles. x = left edge, w width, h height.
T.sandbag={
 build(l,c,it){const g=el('g',{class:'eq sandbag'},l.back),x=it.x??0,w=it.w??120,h=it.h??32;
  el('path',{d:`M${x},0L${x+6},${-h*0.7}Q${x+w/2},${-h*1.15} ${x+w-6},${-h*0.7}L${x+w},0Z`,fill:'var(--frame-dark)'},g);
  for(const k of [0.25,0.75]){const hx=x+w*k;el('path',{d:`M${hx-11},${-h*0.85}q11,-14 22,0`,fill:'none',stroke:'var(--metal-mid)','stroke-width':4,'stroke-linecap':'round'},g);}},
 update(){},bounds(c,it){return [V(it.x??0,-(it.h??32)*1.2),V((it.x??0)+(it.w??120),0)];}
};
// Handheld massage gun: handle in the hand, barrel and round head pointing along angle (degrees; 0 = +x, 180 = -x).
T.massage_gun={
 build(l,c,it){it.g=el('g',{class:'eq massage-gun'},l.front);this.update(c,it);},
 update(c,it){const g=it.g;g.replaceChildren();const H=HW(c,it.hand??'near');if(!H)return;const a=(it.angle??180)*Math.PI/180,u=V(Math.cos(a),Math.sin(a));
  const top=V(H.x,H.y-16);line(g,V(H.x,H.y+8),top,11,'var(--frame-dark)');
  const tail=V(top.x-u.x*14,top.y-u.y*14),tip=V(top.x+u.x*(it.length??34),top.y+u.y*(it.length??34));
  line(g,tail,tip,15,'var(--frame-dark)');C(g,tip.x+u.x*6,tip.y+u.y*6,8,'metal-mid');},
 bounds(){return [];}
};
})();
