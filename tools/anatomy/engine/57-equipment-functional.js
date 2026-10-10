/* Functional equipment and its contact projections. Registered names are local
   to functional specs; no common rig, renderer, runtime or other topic is changed.
   Hallmark · pre-emit critique: P4 H4 E4 S5 R5 V4 · inherits anatomy tokens. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy, U = SA.util, R = SA.rig;
  const {V, add, sub, mul, unit, el, frame, matrix, fromUp, fromDown} = U;
  const T = SA.equipment.types, {rect,bar} = SA.equipment;
  const clone = value => JSON.parse(JSON.stringify(value));
  const p3 = (x,h,z=0) => ({x,h,z});
  const project = q => V(q.x + q.z*.46, -q.h + q.z*.25);
  const length3 = (a,b) => Math.hypot(a.x-b.x,a.h-b.h,a.z-b.z);
  const isMistake = ctx => ctx.figure.root.closest('svg').parentElement.id === 'mistakes';
  const points = j => [j.hip,j.shoulder,j.headTop,...j.N,...['near','far'].flatMap(s=>[j.arms[s].S,j.arms[s].E,j.arms[s].H,j.legs[s].H,j.legs[s].K,j.legs[s].A,j.legs[s].sole,j.legs[s].toe,j.legs[s].heel])];
  function setJoints(ctx,j) {
    // The same object is used by pins/labels after Stage.update, so contacts and
    // annotations follow the rendered projection, including the static panels.
    Object.assign(ctx.joints,j); ctx.figure.update(ctx.joints);
  }
  function ghost(L,ctx,it,geometry) {
    // Only the static detail diagram compares with the start pose; in the moving
    // picture the dashed outline sat on top of the body.
    if (ctx.figure.root.closest('svg').parentElement.id !== 'detail') return;
    const spec=root.SteadyLesson, sample=SA.scene.staticPose(spec,'start');
    it.ghost = SA.Figure(L.back,{view:spec.view,muscles:{},prefix:'functional-contact-ghost',hands:spec.hands,ghost:true});
    it.ghost.update(geometry(sample.joints,sample.pose.eq));
  }

  /** True three-dimensional knee/forearm contacts for the wide frog position.
      Orthographic oblique projection keeps the near/far supports distinguishable.
      Hip motion is solved from the fixed abducted knee points and an 87-unit
      thigh, and shin rotation keeps both knees fixed. This is a projection of
      the common anatomy mesh, not a second illustration copied from a photo. */
  function frogGeometry(eq) {
    const f=(eq&&eq.frog)||{}, rock=f.rock||0, lift=f.lift||0, round=f.round||0;
    const hx=24-22*rock, kz=74, hz=19, ky=12;
    const hh=ky+Math.sqrt(R.LEN.thigh**2-hx**2-(kz-hz)**2);
    const trunk=round?78:90.12;
    const hip3=p3(hx,hh), hip=project(hip3), shoulder3=U.solve2(V(hx,-hh),V(140,-ky),trunk,64,-1).mid;
    const S3=p3(shoulder3.x,-shoulder3.y), dir3={x:(S3.x-hx)/trunk,h:(S3.h-hh)/trunk};
    const along=(d,z=0)=>p3(hx+dir3.x*d,hh+dir3.h*d,z);
    let spine=[0,22,61,113,131].map(d=>along(d));
    // The supplemental wrong pose changes spine curvature while leaving the
    // original forearm and knee support points in place.
    if (round) {
      const tilted=U.rot(V(dir3.x,-dir3.h),-20), N1=add(V(hx,-hh),mul(tilted,22));
      const N2=U.solve2(N1,shoulder3,39,29.12,-1).mid, thorax=unit(sub(shoulder3,N2));
      const N3=add(N2,mul(thorax,52)),N4=add(N3,mul(thorax,18));
      spine=[V(hx,-hh),N1,N2,N3,N4].map(p=>p3(p.x,-p.y));
    }
    const N=spine.map(project),headDirection=unit(sub(N[4],N[3])),head3=p3(spine[4].x+headDirection.x*32,spine[4].h-headDirection.y*32);
    const up=sub(project(S3),hip), a=Math.atan2(up.x,-up.y)/U.RAD, j={hip,N,shoulder:project(S3),headPivot:N[4],headTop:project(head3),angles:{pelvis:a,lumbar:a,thorax:a,neck:a,head:a},arms:{},legs:{},physical:{hip:hip3,spine,head:head3,arms:{},legs:{}}};
    for (const s of ['near','far']) {
      const sign=s==='near'?1:-1, z=sign*kz, legH=p3(hx,hh,sign*hz), K=p3(0,ky,z);
      const theta=(f.oneSide?(s==='near'?38:0):lift)*U.RAD;
      const A=p3(-88*Math.cos(theta),ky+88*Math.sin(theta),z);
      const sole=p3(A.x,A.h-12,z), E=p3(140,ky,sign*28), H=p3(199,ky,sign*28), W=p3(190,ky,sign*28);
      const S=p3(S3.x,S3.h,sign*28);
      const ja={S:project(S),E:project(E),W:project(W),H:project(H)};
      const jl={H:project(legH),K:project(K),A:project(A),sole:project(sole)};
      ja.upperAbs=U.angleFromDown(sub(ja.E,ja.S));ja.foreAbs=U.angleFromDown(sub(ja.W,ja.E));ja.handAbs=ja.foreAbs;
      jl.thighAbs=U.angleFromDown(sub(jl.K,jl.H));jl.shankAbs=U.angleFromDown(sub(jl.A,jl.K));jl.footAbs=0;
      jl.heel=add(jl.sole,V(-12,0)); jl.toe=add(jl.sole,V(40,0));
      j.arms[s]=ja; j.legs[s]=jl; j.physical.arms[s]={S,E,W,H};j.physical.legs[s]={H:legH,K,A,sole};
    }
    j.shoulder=j.arms.near.S;
    return j;
  }
  T.functional_frog_mat = {
    build(L,ctx,it) {
      const g=el('g',{class:'eq functional-frog-mat'},L.back);
      el('path',{d:'M-155,-38L181,-38L255,27L-81,27Z',class:'mat'},g);
      el('path',{d:'M-155,-38L-81,27L255,27',class:'eq-line',opacity:.2},g);
      for(const s of ['near','far']) {
        const j=frogGeometry({frog:{rock:0}}); const k=j.legs[s].K,e=j.arms[s].E;
        for(const q of [k,e]) el('ellipse',{cx:q.x,cy:q.y+8,rx:16,ry:3,fill:'var(--guide)',opacity:.16},g);
      }
      ghost(L,ctx,it,(_,eq)=>frogGeometry(eq));
      it.arrow=el('path',{class:'arrow',fill:'none','stroke-linecap':'round'},L.front);
    },
    update(ctx,it) {
      const j=frogGeometry(ctx.eq);setJoints(ctx,j);
      const f=ctx.eq.frog;
      // A lifting lesson keeps the same bilateral cue at zero and at the loop
      // boundary. Testing a tiny numeric lift switched to the hip-rock cue at 0.
      if(it.liftCue||f.oneSide){
        const d=['near','far'].map(s=>{const a=j.legs[s].A;return `M${U.pt(add(a,V(-15,12)))}l0,-20m-4,5l4,-5l4,5`;}).join('');it.arrow.setAttribute('d',d);
      } else { const p=j.hip; it.arrow.setAttribute('d',`M${p.x-20},${p.y-22}h-26m6,-4l-6,4l6,4`); }
    },
    bounds(ctx) {return [V(-155,-135),V(255,27),...points(frogGeometry(ctx.eq))];},
    geometry:frogGeometry, length3
  };

  /** Turn a side skeleton about the trunk's long axis in three dimensions.
      The supporting hand/leg remain fixed; the free arm and raised leg rotate.
      The projected limb lengths change because of depth, not bone stretching. */
  function turnGeometry(j0,eq,working) {
    const j=clone(j0), deg=(eq&&eq.turn)||0;
    const axis=unit(sub(j.shoulder,j.hip)), n=V(-axis.y,axis.x);
    // The supported hip turn starts with the free side directed into depth;
    // turning inward/outward then moves it visibly across the sagittal plane.
    const rad=(working==='far'?90+deg:deg)*U.RAD;
    const c=Math.cos(rad), s=Math.sin(rad), origin=j.hip;
    const physical=(p,depth=0)=>p3(p.x,-p.y,depth);
    const turn=p=>{
      const v=V(p.x-origin.x,-p.h-origin.y), axial=v.x*axis.x+v.y*axis.y, normal=v.x*n.x+v.y*n.y;
      const across=normal*c-p.z*s, z=normal*s+p.z*c;
      const q=add(origin,add(mul(axis,axial),mul(n,across)));
      return p3(q.x,-q.y,z);
    };
    const projection=p=>V(p.x+.18*p.z,-p.h+.08*p.z);
    const solve3=(a,b,l1,l2,preferred)=>{
      const v=p3(b.x-a.x,b.h-a.h,b.z-a.z), d=Math.hypot(v.x,v.h,v.z);
      const u=p3(v.x/d,v.h/d,v.z/d), reach=U.clamp(d,Math.abs(l1-l2)+.001,l1+l2-.001);
      const along=(l1*l1-l2*l2+reach*reach)/(2*reach), height=Math.sqrt(Math.max(0,l1*l1-along*along));
      const pref=p3(preferred.x-a.x,preferred.h-a.h,preferred.z-a.z), dot=pref.x*u.x+pref.h*u.h+pref.z*u.z;
      let normal=p3(pref.x-u.x*dot,pref.h-u.h*dot,pref.z-u.z*dot);
      let m=Math.hypot(normal.x,normal.h,normal.z);
      if(m<.001){normal=p3(-u.h,u.x,0);m=Math.hypot(normal.x,normal.h)||1;}
      const mid=p3(a.x+u.x*along+normal.x/m*height,a.h+u.h*along+normal.h/m*height,a.z+u.z*along+normal.z/m*height);
      const end=p3(a.x+u.x*reach,a.h+u.h*reach,a.z+u.z*reach);
      return {mid,end,miss:Math.max(0,d-reach)};
    };
    j.physical={arms:{},legs:{},contacts:[],turnDegrees:deg};
    for(const side of ['near','far']) {
      const a=j.arms[side], sign=side==='near'?1:-1;
      const src=Object.fromEntries(['S','E','W','H'].map(k=>[k,physical(a[k],sign*12)]));
      let arm=Object.fromEntries(Object.entries(src).map(([k,p])=>[k,turn(p)]));
      if(side!==working) {
        const ik=solve3(arm.S,src.H,R.LEN.upper,R.LEN.fore+R.LEN.hand,src.E);
        arm.E=ik.mid;arm.H=ik.end;
        arm.W=p3(arm.E.x+(arm.H.x-arm.E.x)*50/59,arm.E.h+(arm.H.h-arm.E.h)*50/59,arm.E.z+(arm.H.z-arm.E.z)*50/59);
        j.physical.contacts.push({kind:'hand',side,target:src.H,point:arm.H,miss:ik.miss});
      }
      j.physical.arms[side]=arm;for(const k of ['S','E','W','H'])a[k]=projection(arm[k]);
      const l=j.legs[side], source=Object.fromEntries(['H','K','A','sole','toe','heel'].map(k=>[k,physical(l[k],sign*19)]));
      let leg=Object.fromEntries(Object.entries(source).map(([k,p])=>[k,turn(p)]));
      if(working==='near'||side==='near'){
        const ik=solve3(leg.H,source.A,R.LEN.thigh,R.LEN.shank,source.K);leg.K=ik.mid;leg.A=ik.end;
        for(const k of ['sole','toe','heel']) leg[k]=source[k];
        j.physical.contacts.push({kind:'ankle',side,target:source.A,point:leg.A,miss:ik.miss});
      }
      j.physical.legs[side]=leg;for(const k of ['H','K','A','sole','toe','heel'])l[k]=projection(leg[k]);
    }
    j.shoulder=j.arms.near.S;
    j.turnWidth=Math.max(.55,Math.abs(Math.cos(rad)));j.turnAxis=axis;
    return j;
  }
  function renderTurn(ctx,working) {
    const j=turnGeometry(ctx.joints,ctx.eq,working);setJoints(ctx,j);
    for(const side of ['near','far']) {
      const part=ctx.figure.parts['foot:'+side],l=j.legs[side];
      part.frame.n=mul(sub(l.toe,l.sole),1/40);
      part.g.setAttribute('transform',matrix(part.frame));
    }
    if(!j.turnWidth) return;
    // Compress only cross-sectional width; spine length and support points stay
    // fixed. Torso paths remain the common anatomical shapes and muscle roles.
    const n=V(-j.turnAxis.y,j.turnAxis.x), k=j.turnWidth-1;
    const a=1+k*n.x*n.x,b=k*n.x*n.y,c=b,d=1+k*n.y*n.y;
    const tx=j.hip.x-a*j.hip.x-c*j.hip.y,ty=j.hip.y-b*j.hip.x-d*j.hip.y;
    ctx.figure.root.querySelector('.part.torso').setAttribute('transform',`matrix(${a} ${b} ${c} ${d} ${tx} ${ty})`);
    ctx.figure.anchors.filter(a0=>a0.part==='torso').forEach(a0=>{const p=a0.world;a0.world=V(a*p.x+c*p.y+tx,b*p.x+d*p.y+ty);});
  }
  function turnArrow(L,ctx,it) {
    // A fixed arc on the trunk covered the moving body; the motion shows the turn itself.
    if (ctx.figure.root.closest('svg').parentElement.id === 'motion') return;
    it.turnArrow=el('path',{class:'arrow',fill:'none'},L.front);
    const p=ctx.joints.N[2]; it.turnArrow.setAttribute('d',`M${p.x-24},${p.y-14}q22,-18 44,0m-6,-5l6,5l-7,2`);
  }
  T.functional_rotation_bench = {
    build(L,ctx,it) {T.bench.build(L,ctx,it);ghost(L,ctx,it,(j,eq)=>turnGeometry(j,eq,'far'));turnArrow(L,ctx,it);},
    update(ctx,it) {renderTurn(ctx,'far'); const p=ctx.joints.N[2];if(it.turnArrow)it.turnArrow.setAttribute('d',`M${p.x-22},${p.y-17}q24,-18 45,0m-6,-5l6,5l-7,2`);},
    bounds(ctx,it) {return [...T.bench.bounds(ctx,it),...points(turnGeometry(ctx.joints,ctx.eq,'far'))];},
    geometry:turnGeometry
  };

  // Seat and two thigh rollers from the reviewed source machine. The visible
  // tower/cable identify the real equipment, but the cable is parked throughout
  // this independent-dumbbell exercise. Structural cross-check: Life Fitness
  // Optima OSLR user manual; the source machine brand/model is not asserted.
  T.functional_lat_seat = {
    build(L,ctx,it) {
      T.bench.build(L,ctx,it);
      const g=el('g',{class:'eq functional-lat-station'},L.back);
      el('path',{d:rect(154,-365,10,365,3)+rect(141,-8,54,8,3),class:'frame-dark'},g);
      el('path',{d:bar(V(158,-358),V(72,-368),9),class:'frame'},g);
      el('path',{d:rect(174,-189,27,179,4),class:'frame'},g);
      for(let y=-115;y<-18;y+=8)el('path',{d:rect(177,y,21,6,1),class:'metal-mid'},g);
      el('circle',{cx:150,cy:-354,r:7,class:'metal-mid'},g);
      el('path',{d:'M185,-190V-345Q185,-354 150,-354L76,-367V-330',class:'cable'},g);
      el('path',{d:bar(V(47,-329),V(106,-329),5),class:'metal-mid'},g);
      el('path',{d:bar(V(it.thighX+12,-7),V(it.thighX+12,it.thighY),8),class:'frame'},g);
      el('path',{d:bar(V(it.thighX-13,it.thighY+4),V(it.thighX+22,it.thighY+4),19),class:'pad'},L.front);
      el('ellipse',{cx:it.thighX+21,cy:it.thighY+4,rx:5,ry:9,class:'pad-light'},L.front);
      ghost(L,ctx,it,(j,eq)=>turnGeometry(j,eq,'near'));turnArrow(L,ctx,it);
    },
    update(ctx,it) {renderTurn(ctx,'near');const p=ctx.joints.N[2];if(it.turnArrow)it.turnArrow.setAttribute('d',`M${p.x-23},${p.y-5}q20,-19 40,0m-6,-5l6,5l-7,2`);},
    bounds(ctx,it) {return [...T.bench.bounds(ctx,it),V(47,-375),V(201,0),...points(turnGeometry(ctx.joints,ctx.eq,'near'))];},
    geometry:turnGeometry, length3
  };
  T.functional_wall = {
    build(L,ctx,it) {
      const g=el('g',{class:'eq functional-wall'},L.back);
      el('path',{d:rect(it.x,it.top,8,-it.top,2),class:'frame'},g);
      for(let y=it.top+10;y<-10;y+=22)el('path',{d:`M${it.x+8},${y}l12,-8`,class:'eq-line',opacity:.35},g);
    },
    update(){},bounds(ctx,it){return[V(it.x,it.top),V(it.x+20,0)];}
  };
  T.functional_split_floor = {
    build(L,ctx,it) {
      it.node=el('g',{class:'eq functional-split-floor'},L.back);
      for(const s of ['r','l']){
        const p=ctx.joints.legs[s].sole;
        el('path',{d:`M${p.x-48},${p.y+5}h105`,class:'ground','stroke-dasharray':'4 5'},it.node);
      }
    },update(){},bounds(){return[];}
  };
})(typeof window !== 'undefined' ? window : globalThis);
