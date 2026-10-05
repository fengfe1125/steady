/* Abdominal equipment, reconstructed from the archived teaching-video frames.
   Geometry and contacts stay in world units. No shared renderer or native bridge is replaced. */
(function(root){
  'use strict';
  const SA=root.SteadyAnatomy,U=SA.util,{V,el,add,sub,mul,unit,frame,matrix}=U;
  const {bar,rect}=SA.equipment,T=SA.equipment.types;
  const line=(g,a,b,width,cls='frame-dark',attrs={})=>el('path',Object.assign({d:bar(a,b,width),class:cls},attrs),g);
  function tower(L,it){
    const g=el('g',{class:'eq abs-station','data-equipment':'pull-up-station'},L.back);
    const top=it.top||-474,post=it.post??-70,end=it.endX??60;
    line(g,V(post,-8),V(post,top-18),10);
    line(g,V(post+20,-8),V(post+20,top-18),6,'frame');
    line(g,V(post-23,-5),V(post+96,-5),10,'frame');
    line(g,V(post,top-18),V(end-2,top-18),10,'frame');
    line(g,V(post,top-18),V(-18,top),8,'frame');
    line(g,V(-18,top),V(end,top),8,'metal');
    for(const x of [post-16,post+89]) el('rect',{x:x-6,y:-6,width:12,height:6,rx:2,class:'pad'},g);
    return {g,top};
  }
  T.abs_hanging_station={
    build(L,ctx,it){
      tower(L,it);
      for(const [s,h] of Object.entries(it.grips)){
        line(L.back,V(h.x-13,h.y),V(h.x+13,h.y),7,'metal',{'data-contact':'grip-'+s});
        // A rim shows both ends of the fixed horizontal grip through the palm.
        line(L.front,V(h.x+8,h.y-3),V(h.x+14,h.y-3),3,'metal-face');
      }
    },update(){},bounds(ctx,it){return[V(-98,it.top-26),V(80,0)];}
  };
  T.abs_arm_slings={
    build(L,ctx,it){
      tower(L,Object.assign({endX:118},it));it.nodes=[];
      for(const s of ['far','near']){
        const e=it.supports[s],d=s==='far'?-9:0,g=el('g',{'data-equipment':'arm-sling-'+s},L.back);
        const anchors=[V(e.x-27+d,it.top),V(e.x+20+d,it.top)];
        anchors.forEach((a,i)=>{
          el('ellipse',{cx:a.x,cy:a.y,rx:5,ry:8,class:'strap','data-anchor':s+'-'+i},g);
          const b=V(e.x+(i?16:-17),e.y+4);
          el('path',{d:`M${U.pt(a)}L${U.pt(b)}`,class:'strap','stroke-width':5,'data-strap':s+'-'+i},g);
        });
        // A deep U-shaped padded pocket supports the elbow and proximal forearm.
        el('path',{d:`M${e.x-20},${e.y-1}Q${e.x-18},${e.y+23} ${e.x},${e.y+23}Q${e.x+20},${e.y+23} ${e.x+21},${e.y-1}L${e.x+14},${e.y+5}Q${e.x},${e.y+15} ${e.x-13},${e.y+5}Z`,class:'pad','data-contact':'sling-'+s},g);
        line(L.front,V(e.x-17,e.y+12),V(e.x+17,e.y+12),5,'pad-light');
        const h=it.grips[s];
        line(L.back,V(h.x,h.y+10),V(h.x-5,it.top),6,'frame');
        line(L.back,V(h.x,h.y-12),V(h.x,h.y+12),6,'metal',{'data-contact':'grip-'+s});
        line(L.front,V(h.x+2,h.y+8),V(h.x+2,h.y+12),3,'metal-face');
      }
    },update(){},bounds(ctx,it){return[V(-98,it.top-25),V(125,0)];}
  };
  T.abs_captains_chair={
    build(L,ctx,it){
      const g=el('g',{'data-equipment':'captains-chair'},L.back),y=it.elbowY;
      line(g,V(-66,-8),V(-66,-365),12);
      line(g,V(-48,-8),V(-48,-365),7,'frame');
      line(g,V(-83,-6),V(107,-6),11,'frame');
      line(g,V(-65,y+46),V(56,y+46),9,'frame');
      line(g,V(56,y+46),V(56,-20),8,'frame');
      line(g,V(-65,-358),V(-24,-358),7,'frame');
      line(g,V(-65,-206),V(-26,-206),7,'frame');
      // Back pad front face meets the user's posterior rib cage.
      el('path',{d:rect(-42,-358,14,153,7),class:'pad','data-contact':'back-pad'},g);
      el('path',{d:rect(-31,-351,3,137,1.5),class:'pad-light'},g);
      for(const s of ['far','near']){
        const dep=s==='far'?-10:0,e=it.supports[s],h=it.grips[s];
        line(g,V(-60,y+31+dep),V(h.x+8,y+6+dep),8,'frame');
        line(g,V(h.x+8,y+6+dep),V(h.x,h.y+13),6,'frame');
        // Sloped forearm pad, connected to the rear post, with visible thickness.
        line(g,V(e.x-16,e.y+22),V(e.x+25,e.y+7),15,'pad',{'data-contact':'forearm-pad-'+s});
        line(g,V(e.x-13,e.y+16),V(e.x+23,e.y+1),3,'pad-light');
        line(g,V(h.x,h.y-17),V(h.x,h.y+17),7,'metal',{'data-contact':'grip-'+s});
        line(L.front,V(h.x+2,h.y+10),V(h.x+2,h.y+17),3,'metal-face');
      }
      // Entry steps are below the hanging feet, not mistaken for exercise foot supports.
      for(const [x,yy] of [[-56,-26],[61,-26]]){
        el('path',{d:rect(x,yy,29,6,2),class:'frame'},g);
        for(let i=4;i<26;i+=6) line(g,V(x+i,yy+1),V(x+i+2,yy+1),1.5,'pad');
      }
    },update(){},bounds(){return[V(-90,-373),V(112,0)];}
  };
  T.abs_wheel={
    build(L,ctx,it){
      it.g=el('g',{'data-equipment':'ab-wheel'},L.back);
      it.spin=el('g',null,it.g);const r=it.radius||24;
      el('circle',{r,class:'metal'},it.spin);
      el('circle',{r:r-4,class:'metal-light'},it.spin);
      el('circle',{r:r-8,class:'metal-mid'},it.spin);
      for(const deg of [0,60,120]) line(it.spin,V(-Math.cos(deg*U.RAD)*(r-7),-Math.sin(deg*U.RAD)*(r-7)),V(Math.cos(deg*U.RAD)*(r-7),Math.sin(deg*U.RAD)*(r-7)),2.5,'metal-face');
      el('circle',{r:5,class:'metal-face'},it.g);
      it.axle=el('g',null,L.front);
      line(it.axle,V(-17,0),V(17,0),5,'metal-mid',{'data-contact':'wheel-axle'});
      for(const x of [-15,9]) el('path',{d:rect(x,-4,9,8,3),class:'pad'},it.axle);
      el('circle',{cx:0,cy:0,r:4,class:'metal-face'},it.axle);
    },update(ctx,it){
      const q=ctx.eq&&ctx.eq.wheel||{x:78,y:-(it.radius||24)};
      const tr=`translate(${U.n1(q.x)} ${U.n1(q.y)})`;
      it.g.setAttribute('transform',tr);it.axle.setAttribute('transform',tr);
      it.spin.setAttribute('transform',`rotate(${U.n1((q.x-(it.startX||78))/(it.radius||24)/U.RAD)})`);
    },bounds(ctx,it){const q=ctx.eq&&ctx.eq.wheel||V(it.startX||78,-24),r=it.radius||24;return[V(q.x-r,q.y-r),V(q.x+r,q.y+r)];}
  };
  T.abs_supine_overhead={
    build(L,ctx,it){
      const g=el('g',{'data-equipment':'supine-mat-overhead'},L.back);
      el('rect',{x:-108,y:-356,width:216,height:354,rx:12,class:'mat'},g);
      el('rect',{x:-102,y:-350,width:204,height:342,rx:9,fill:'none',stroke:'var(--stage-line)','stroke-width':1.5},g);
      el('text',{x:0,y:-369,'text-anchor':'middle',class:'lbl-sub'},g).textContent='俯视 · 短程抬肩，轻向一侧';
      it.shadow=el('ellipse',{cx:0,cy:-231,rx:37,ry:59,fill:'var(--frame)',opacity:0.13},g);
    },update(ctx,it){
      // Orthographic depth: only raised trunk, head and arms foreshorten; pelvis/feet stay on the mat.
      const lift=ctx.eq&&ctx.eq.lift||0,py=ctx.joints.pelvis.y,k=1-lift;
      const project=p=>V(p.x,py+(p.y-py)*k);
      for(const cls of ['torso','head']){
        const node=ctx.figure.root.querySelector('.part.'+cls),tr=node.getAttribute('transform');
        node.setAttribute('transform',`translate(0 ${U.n1(py)}) scale(1 ${k}) translate(0 ${U.n1(-py)}) ${tr}`);
      }
      for(const s of ['r','l']){
        const a=ctx.joints.arms[s];
        for(const [part,A,B,l] of [['upper',a.S,a.E,64],['fore',a.E,a.W,50],['hand',a.W,a.H,9]]){
          const f=frame(project(A),project(B),l);if(s==='l') f.n=mul(f.n,-1);
          ctx.figure.parts[part+':'+s].g.setAttribute('transform',matrix(f));
        }
      }
      ctx.figure.anchors.forEach(a=>{if(a.world&&(a.part==='trunk'||/^(upper|fore|hand):/.test(a.part))) a.world=project(a.world);});
      it.shadow.setAttribute('opacity',String(.11+lift*.4));
      it.shadow.setAttribute('cx',U.n1(ctx.joints.neck.x*.45));
    },bounds(){return[V(-110,-383),V(110,0)];}
  };
})(typeof window!=='undefined'?window:globalThis);
