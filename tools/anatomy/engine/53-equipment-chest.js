/* Chest-only equipment extensions. Source shape evidence: training-chest/evidence/video-keyframes.
   Registers types; does not patch any shared figure, sampler, bridge, or canvas behavior. */
(function(root){
  'use strict';
  const SA=root.SteadyAnatomy,U=SA.util,{V,add,sub,mul,unit,el}=U;
  const {bar,rect}=SA.equipment,T=SA.equipment.types;
  const attr=(n,k,v)=>n.setAttribute(k,v);
  const path=(g,d,cls)=>el('path',{d,class:cls},g);
  const isMistake=ctx=>/错误对照/.test(ctx.figure.root.ownerSVGElement.getAttribute('aria-label')||'');
  function grip(ctx,side){
    // Shaft under the fist; the fingers remain visible over the grasped portion.
    const g=ctx.figure.parts['hand:'+side].g;
    const n=el('path',{d:rect(-13,6.5,26,5,2),class:'metal-mid'});
    g.insertBefore(n,g.firstChild);
  }
  T.chest_platePress={
    build(L,ctx,it){
      const inc=it.kind==='incline',g=el('g',{class:'eq chest-machine'},L.back),P=it.pivot;
      path(g,rect(-127,-8,265,8,3),'frame');
      const post=inc?V(-126,-336):V(87,-69);
      path(g,bar(V(post.x,0),post,12),'frame-dark');
      if(inc)path(g,bar(post,V(P.x+8,P.y),12),'frame');
      else path(g,bar(V(-104,-6),V(-104,-256),10),'frame-dark');
      const seat=it.seat,top=seat.y;
      path(g,bar(V(seat.x+28,0),V(seat.x+28,top+12),9),'frame-dark');
      path(g,rect(seat.x,top,70,14,5),'pad');
      path(g,rect(seat.x+5,top+2,60,3,1),'pad-light');
      const B=it.back;
      path(g,bar(V(B[0],B[1]),V(B[2],B[3]),13),'pad');
      path(g,bar(V(B[0]-3,B[1]),V(B[2]-3,B[3]),3),'pad-light');
      // Separate far/near load sleeves and discs stay rigidly attached to the same projected pivot axis.
      it.levers=['far','near'].map((side,i)=>{
        const q=el('g',{class:'chest-independent-lever '+side},g);
        return {side,i,lever:path(q,'','frame-dark'),sleeve:path(q,'','metal-mid'),
          disc:el('circle',{r:it.light?13:24,class:'metal'},q),rim:el('circle',{r:it.light?9:19,class:'metal-face'},q),
          hub:el('circle',{r:5,class:'metal-light'},q),contact:path(q,'','metal')};
      });
      el('circle',{cx:P.x,cy:P.y,r:8,class:'metal-mid'},g);
      el('circle',{cx:P.x,cy:P.y,r:3,class:'metal-light'},g);
      grip(ctx,'far');grip(ctx,'near');
    },
    update(ctx,it){
      const P=V(it.pivot.x,it.pivot.y);
      it.levers.forEach(q=>{
        const H=ctx.joints.arms[q.side].H,d=unit(sub(H,P)),n=V(-d.y,d.x);
        // Incline: both plates sit on the outer side of the lever, staggered for depth;
        // the inner offset put a plate right behind the head.
        const off=it.kind==='incline'?(q.i===0?-44:-27):(q.i===0?-29:29);
        const c=add(add(P,mul(sub(H,P),0.61)),mul(n,off));
        const mount=add(P,mul(sub(H,P),0.61));
        attr(q.lever,'d',bar(P,H,9));attr(q.sleeve,'d',bar(mount,c,7));
        for(const k of ['disc','rim','hub']){attr(q[k],'cx',U.n1(c.x));attr(q[k],'cy',U.n1(c.y));}
        attr(q.contact,'d',bar(add(H,V(-6,0)),H,6));
      });
    },
    bounds(ctx,it){return [V(-137,it.kind==='incline'?-350:-274),V(143,0)];}
  };
  T.chest_parallelBars={
    build(L,ctx,it){
      ['far','near'].forEach((s,i)=>{
        const g=el('g',{class:'eq parallel-bar '+s},i===0?L.back:L.front),x=it.x,y=it.top,off=i===0?-12:0;
        path(g,bar(V(x-72+off,0),V(x-72+off,y),9),'frame-dark');
        path(g,bar(V(x+58+off,0),V(x+58+off,y),9),'frame-dark');
        path(g,bar(V(x-92+off,y),V(x+80+off,y),9),'metal');
        path(g,rect(x-95+off,-6,190,6,2),'frame');
      });
      // Near rail is behind the hand, so the grip is legible instead of covering the fingers.
      const rail=L.front.lastChild;L.back.appendChild(rail);
    },update(){},bounds(ctx,it){return [V(it.x-108,it.top-6),V(it.x+95,0)];}
  };
  T.chest_lowCable={
    build(L,ctx,it){
      const g=el('g',{class:'eq low-pulley-station'},L.back);
      path(g,rect(-212,-7,424,7,3),'frame');
      it.lines=[];
      for(const [s,sg]of [['r',1],['l',-1]]){
        const x=sg*192,y=-48;
        path(g,rect(x-7,-298,14,298,4),'frame-dark');
        path(g,rect(x-32,-156,25,148,4),'metal-light');
        for(let k=0;k<8;k++)path(g,rect(x-30,-21-k*12,21,8,2),'metal-mid');
        el('circle',{cx:x,cy:y,r:11,class:'metal'},g);
        el('circle',{cx:x,cy:y,r:6,class:'metal-light'},g);
        const cab=path(g,'','cable'),strap=path(L.front,'','strap');
        grip(ctx,s);it.lines.push({s,P:V(x,y),cab,strap});
      }
      path(g,rect(-36,-296,72,174,8),'pad');
      path(L.front,rect(-44,-104,88,15,5),'pad');
      path(g,bar(V(0,-90),V(0,-4),9),'frame-dark');
      path(g,rect(-66,-6,132,6,2),'frame');
    },
    update(ctx,it){
      it.lines.forEach(q=>{
        const H=ctx.joints.arms[q.s].H,d=unit(sub(q.P,H)),n=V(-d.y,d.x),A=add(H,mul(d,18));
        attr(q.cab,'d',`M${U.pt(q.P)}L${U.pt(A)}`);
        attr(q.strap,'d',`M${U.pt(add(H,mul(n,11)))}Q${U.pt(A)} ${U.pt(add(H,mul(n,-11)))}`);
      });
    },bounds(){return [V(-214,-303),V(214,0)];}
  };
  T.chest_wall={
    build(L,ctx,it){
      const g=el('g',{class:'eq wall'},L.back);
      path(g,rect(it.x,-350,14,350,2),'metal-light');
      for(let y=-330;y<-8;y+=30)path(g,`M${it.x},${y}l14,-9`,'eq-line');
    },update(){},bounds(ctx,it){return [V(it.x,-352),V(it.x+16,0)];}
  };
  // A front-view grip-width reference complements the depth-compressed band in the side motion.
  T.chest_bandWidth={
    build(L,ctx,it){
      it.omit=!/细节图解/.test(ctx.figure.root.ownerSVGElement.getAttribute('aria-label')||'');
      if(it.omit)return;
      const g=el('g',{class:'eq band-width'},L.back);
      attr(g,'transform',`translate(${it.x} ${it.y}) scale(.27)`);
      const fg=el('g',null,g),a={abd:100,el:4};
      const j=SA.rig.frontJoints(SA.rig.merge(SA.rig.FRONT_DEFAULT,{arms:{r:a,l:a}}));
      it.fig=SA.Figure(fg,{view:'front',muscles:{secondary:['deltoid'],stretch:['pec.upper']},prefix:'chest-band-width'});
      it.fig.update(j);
      const A=j.arms.r.H,B=j.arms.l.H;
      path(g,`M${U.pt(A)}L${U.pt(B)}`,'band');
      const text=el('text',{x:it.x,y:it.y-113,class:'lbl','text-anchor':'middle'},L.back);
      text.textContent='宽握 · 正面示意';
    },update(){},bounds(ctx,it){return it.omit?[]:[V(it.x-59,it.y-132),V(it.x+59,it.y+4)];}
  };
  // Prone on a cross-wise roller, seen from above (the lesson sets view:'back', rotate:90).
  // The T, Y and W shapes read directly; the arm shadows on the mat slide out as the arms lift.
  // eq.rollerAt:'belly' draws the misplaced roller for the mistake comparison.
  T.chest_proneTop={
    build(L,ctx,it){
      const g=el('g',{class:'eq prone-top'},L.back);
      path(g,rect(-182,-412,364,430,16),'mat');
      const belly=(ctx.eq||{}).rollerAt==='belly';
      path(g,rect(-82,belly?-232:-272,164,30,14),'roller');
      it.shadows=['r','l'].map(()=>el('path',{fill:'var(--edge)',opacity:.24},g));
    },
    update(ctx,it){
      const lift=(ctx.eq||{}).lift||0,off=V(15*lift,17*lift);
      ['r','l'].forEach((s,i)=>{
        const a=ctx.joints.arms[s];
        attr(it.shadows[i],'d',lift>0.02?bar(add(a.S,off),add(a.H,off),11):'');
      });
    },
    bounds(){return [V(-182,-412),V(182,18)];}
  };
  T.chest_direction={
    build(L,ctx,it){
      if(isMistake(ctx))return;
      const a=V(it.a[0],it.a[1]),b=V(it.b[0],it.b[1]),d=unit(sub(b,a)),n=V(-d.y,d.x),tip=sub(b,mul(d,7));
      path(L.front,`M${U.pt(a)}L${U.pt(b)}M${U.pt(add(tip,mul(n,4)))}L${U.pt(b)}L${U.pt(sub(tip,mul(n,4)))}`,'arrow');
    },update(){},bounds(){return [];}
  };
})(typeof window!=='undefined'?window:globalThis);
