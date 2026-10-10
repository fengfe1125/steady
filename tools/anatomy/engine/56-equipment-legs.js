/* Legs equipment and its contact geometry. Optional 3-D floor/seat contacts are
   projected into the SAME anatomical Figure; only poses carrying eq.legs3D use
   this adapter. All other topics keep the stock rig. x=forward, y=down, z=near. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy, U = SA.util, T = SA.equipment.types;
  const {el, V, add, sub, mul, unit, fromDown, n1, pt} = U;
  const {bar, rect} = SA.equipment;
  const rad = Math.PI / 180;
  const v3 = (x, y, z = 0) => ({x, y, z});
  const plus = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
  const minus = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
  const times = (a, k) => v3(a.x * k, a.y * k, a.z * k);
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const norm = a => Math.hypot(a.x, a.y, a.z);
  const normalize = a => times(a, 1 / (norm(a) || 1));
  const cross = (a, b) => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  // Orthographic oblique view: preserves the floor and never stretches a bone.
  const P = a => V(Math.cos(30 * rad) * a.x + .5 * a.z, a.y);
  const rotate = (v, axis, deg) => {
    const u = normalize(axis), c = Math.cos(deg * rad), s = Math.sin(deg * rad);
    return plus(plus(times(v, c), times(cross(u, v), s)), times(u, dot(u, v) * (1 - c)));
  };
  function solve3(A, C, l1, l2, bend) {
    const d = minus(C, A), D = Math.min(Math.max(norm(d), Math.abs(l1 - l2) + .001), l1 + l2 - .001), u = normalize(d);
    const q = normalize(minus(bend, times(u, dot(bend, u))));
    const a = (l1 * l1 - l2 * l2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    return plus(plus(A, times(u, a)), times(q, h));
  }
  function body(H, up, options = {}) {
    const d = normalize(up), front = normalize(v3(-d.y, d.x));
    const stem = plus(H, plus(times(d, 6), times(front, -4)));
    const N = [stem, plus(stem, times(d, 22)), plus(stem, times(d, 61)), plus(stem, times(d, 113))];
    const nd = normalize(options.neck || d);
    N.push(plus(N[3], times(nd, 18)));
    const shoulder = plus(N[2], plus(times(d, 29.12), times(front, 4)));
    return {hip: H, N, shoulder, headPivot: N[4], headTop: plus(N[4], times(nd, 32)), arms: {}, legs: {}};
  }
  function arm(j, side, hand, bend = v3(-1, 0, 0), twist = 0) {
    const sign = side === 'near' ? 1 : -1;
    const S = j.shoulder, E = solve3(S, hand, 64, 59, bend);
    const W = plus(E, times(minus(hand, E), 50 / 59));
    j.arms[side] = {S, E, W, H: hand};
  }
  function leg(j, side, K, A, foot = v3(0, 14, 0)) {
    const sole = plus(A, foot), toeDir = normalize(v3(foot.y, -foot.x, 0));
    j.legs[side] = {H: j.hip, K, A, sole, toe: plus(sole, times(toeDir, 40)), heel: plus(sole, times(toeDir, -12))};
  }
  function floorKnees(H) {
    return {near: v3(86.42, -12, 0), far: v3(0, -12, -86.42)};
  }
  const MODELS = {};
  MODELS.frog = q => {
    const z = 71, hx = -(q.rock || 0) * 27, hy = -14 - Math.sqrt(87 ** 2 - z ** 2 - hx ** 2);
    const H = v3(hx, hy), E = V(84, -10);
    const ss = U.solve2(V(H.x, H.y), E, 96.12, Math.sqrt(64 ** 2 - 23 ** 2), -1).mid;
    const up = normalize(v3(ss.x - H.x, ss.y - H.y));
    const j = body(H, up, {neck: normalize(v3(1, -.04, 0))});
    for (const s of ['near', 'far']) {
      const sign = s === 'near' ? 1 : -1, K = v3(0, -14, sign * z);
      const axis = normalize(minus(K, H));
      // The shin rotates around the FIXED femur, with knee flexion preserved.
      const seed = v3(-1, 0);
      const shin = rotate(times(seed, 88), axis, sign * (q.rotation || 0));
      leg(j, s, K, plus(K, shin));
      const S = j.shoulder;
      const elbow = v3(84, -10, sign * 23);
      const dir = normalize(minus(elbow, S));
      const exactE = plus(S, times(dir, 64));
      const W = plus(exactE, v3(50, 0, 0));
      j.arms[s] = {S, E: exactE, W, H: plus(W, v3(9, 0, 0))};
    }
    if (q.round) {
      const d2 = rotate(up, v3(0, 0, 1), q.round * 28), d3 = rotate(up, v3(0, 0, 1), q.round * 38);
      j.N[2] = plus(j.N[1], times(d2, 39)); j.N[3] = plus(j.N[2], times(d3, 52));
      j.N[4] = plus(j.N[3], v3(18, 0)); j.headPivot = j.N[4]; j.headTop = plus(j.N[4], v3(32, 0));
      j.shoulder = plus(j.N[2], plus(times(d3, 29.12), times(v3(-d3.y, d3.x), 4)));
      for (const s of ['near', 'far']) arm(j, s, v3(143, -10, s === 'near' ? 23 : -23), v3(-1, 0));
    }
    return j;
  };
  MODELS.switch = q => {
    const H = v3(0, -24), j = body(H, v3(.10 + (q.lean || 0) * .38, -1));
    const k = q.switch || 0;
    for (const s of ['near', 'far']) {
      const sign = s === 'near' ? 1 : -1, A = v3(86, -14, sign * 79);
      const d = normalize(minus(A, H)), horizontal = normalize(v3(-d.z, 0, d.x));
      const up = normalize(minus(v3(0, -1), times(d, dot(v3(0, -1), d))));
      const phase = Math.PI * k;
      const bend = plus(times(horizontal, -Math.cos(phase)), times(up, Math.sin(phase)));
      leg(j, s, solve3(H, A, 87, 88, bend), A);
      arm(j, s, v3(18, -9, sign * 50), v3(-1, 0, sign));
    }
    return j;
  };
  MODELS.rise = q => {
    const C = v3(43.21, -12, -43.21), r = Math.sqrt(87 ** 2 - (86.42 / Math.sqrt(2)) ** 2);
    const theta = (Math.asin(12 / r) + (Math.PI / 2 - Math.asin(12 / r)) * (q.rise || 0));
    const H = plus(C, v3(-r * Math.cos(theta) / Math.sqrt(2), -r * Math.sin(theta), r * Math.cos(theta) / Math.sqrt(2)));
    const j = body(H, v3(q.arch ? -.25 : .02, -1));
    const K = floorKnees(H);
    leg(j, 'near', K.near, v3(86.42, -14, -87.98));
    leg(j, 'far', K.far, v3(87.98, -14, -86.42));
    for (const s of ['near', 'far']) arm(j, s, plus(j.shoulder, v3(24, 25, s === 'near' ? 25 : -25)), v3(1, 1, s === 'near' ? 1 : -1));
    return j;
  };
  MODELS.step = q => {
    const r = MODELS.rise({rise: q.rise || 0, arch: q.arch || 0});
    const step = q.step || 0;
    const H0 = r.hip, H1 = v3(10, -Math.sqrt(87 ** 2 - 10 ** 2 - 11.42 ** 2) - 12, -75);
    const H = plus(times(H0, 1 - step), times(H1, step));
    const j = body(H, v3(q.pitch ? .42 : .02, -1));
    const rearK = v3(0, -12, -86.42), rearA = v3(87.98, -14, -86.42);
    // Once the foot steps, the rear knee stays on the mat. Tibia rolls on the mat.
    const rearThigh = normalize(minus(rearK, H));
    const stableH = step ? plus(rearK, times(rearThigh, -87)) : H;
    const offset = minus(stableH, H);
    if (norm(offset) > .001) {
      j.hip = stableH; j.N = j.N.map(p => plus(p, offset)); j.shoulder = plus(j.shoulder, offset); j.headPivot = plus(j.headPivot, offset); j.headTop = plus(j.headTop, offset);
    }
    leg(j, 'far', rearK, rearA);
    const A = v3(86.42 + 22 * step, -14 - 55 * Math.sin(Math.PI * step), -87.98 + 49 * step);
    // Start the bend from the floor knee and turn it toward the stepping hint, so the knee
    // lifts off the mat continuously instead of snapping up on the first frame of the step.
    const floorK = v3(86.42, -12, 0);
    let K = floorK;
    if (step) {
      const w = Math.min(1, step / .85), blend = w * w * (3 - 2 * w);
      const h0 = normalize(minus(floorK, times(plus(j.hip, A), .5))), h1 = normalize(v3(1, -.2, .4));
      K = solve3(j.hip, A, 87, 88, plus(times(h0, 1 - blend), times(h1, blend)));
    }
    leg(j, 'near', K, A);
    for (const s of ['near', 'far']) arm(j, s, plus(j.shoulder, v3(24, 25, s === 'near' ? 25 : -25)), v3(1, 1, s === 'near' ? 1 : -1));
    return j;
  };
  MODELS.lunge = q => {
    const H = v3(-25, -112), j = body(H, v3(1, q.arch ? -.28 : 0), {neck: v3(1, -.10)});
    const frontA = v3(65, -14, 24), rearA = v3(-166, -14, -14);
    leg(j, 'near', solve3(H, frontA, 87, 88, v3(1, -.1)), frontA);
    leg(j, 'far', solve3(H, rearA, 87, 88, v3(-1, -1)), rearA);
    const turn = q.turn || 0;
    arm(j, 'far', v3(64, -20, -35), v3(-1, 0), turn * 68);
    const h0 = v3(80, -20, 35), h1 = v3(70, -231, 18);
    arm(j, 'near', plus(times(h0, 1 - turn), times(h1, turn)), v3(1, 0, 1), turn * 68);
    j.torsoRoll = turn * 68;
    j.gazeRoll = turn * 150;
    return j;
  };
  MODELS.adduction = q => {
    const H = v3(0, -128), tilt = (18 + (q.arch || 0) * 16) * rad;
    const j = body(H, v3(-Math.cos(tilt), -Math.sin(tilt)), {neck: v3(-.98, -.2)});
    for (const s of ['near', 'far']) {
      const sign = s === 'near' ? 1 : -1, angle = (q.spread == null ? 32 : q.spread) * rad;
      const thigh = v3(87 * Math.cos(8 * rad) * Math.cos(angle), 87 * Math.sin(8 * rad), sign * 87 * Math.cos(8 * rad) * Math.sin(angle));
      const K = plus(H, thigh), A = plus(K, v3(88 * Math.cos(82 * rad) * Math.cos(angle), 88 * Math.sin(82 * rad), sign * 88 * Math.cos(82 * rad) * Math.sin(angle)));
      leg(j, s, K, A);
      arm(j, s, v3(12, -112, sign * 32), v3(-1, 1, sign));
    }
    return j;
  };
  function projectJoints(j) {
    const out = {hip: P(j.hip), N: j.N.map(P), shoulder: P(j.shoulder), headPivot: P(j.headPivot), headTop: P(j.headTop), arms: {}, legs: {}, source3D: j};
    const d = unit(sub(out.N[1], out.N[0]));
    const a = Math.atan2(d.x, -d.y) / rad;
    out.angles = {pelvis: a, lumbar: a, thorax: a, neck: a, head: a};
    for (const s of ['near', 'far']) {
      const ar = j.arms[s], g = j.legs[s];
      out.arms[s] = Object.fromEntries(Object.entries(ar).map(([k, p]) => [k, P(p)]));
      out.legs[s] = Object.fromEntries(Object.entries(g).map(([k, p]) => [k, P(p)]));
      const a2 = out.arms[s], g2 = out.legs[s];
      a2.upperAbs = U.angleFromDown(sub(a2.E, a2.S)); a2.foreAbs = U.angleFromDown(sub(a2.W, a2.E)); a2.handAbs = U.angleFromDown(sub(a2.H, a2.W));
      g2.thighAbs = U.angleFromDown(sub(g2.K, g2.H)); g2.shankAbs = U.angleFromDown(sub(g2.A, g2.K)); g2.footAbs = U.angleFromDown(sub(g2.sole, g2.A));
    }
    return out;
  }
  const stockJoints = SA.rig.joints;
  SA.rig.joints = (view, pose) => {
    if (pose.eq && pose.eq.legsCalf != null) {
      const deg = -25 * pose.eq.legsCalf, a = deg * rad;
      pose.x = 40 - 40 * Math.cos(a) - 14 * Math.sin(a);
      pose.y = 40 * Math.sin(a) - 14 * Math.cos(a) - 175;
      pose.legs = {near: {...pose.legs.near, hip: 0, knee: 0, ankle: -deg}, far: {...pose.legs.far, hip: 0, knee: 0, ankle: -deg}};
    }
    const q = pose.eq && pose.eq.legs3D;
    if (!q || !MODELS[q.type]) return stockJoints(view, pose);
    const j = projectJoints(MODELS[q.type](q));
    // Record the projected segment lengths just like the stock frontal rig.
    // Copy first: defaults must never be mutated by a contact sample.
    pose.arms = {near: {...pose.arms.near}, far: {...pose.arms.far}};
    for (const s of ['near', 'far']) {
      const a = j.arms[s], src = j.source3D.arms[s];
      pose.arms[s].f = U.dist(a.S, a.E) / 64;
      pose.arms[s].ff = U.dist(a.E, a.W) / 50;
      const u = normalize(minus(src.E, src.S)), v = normalize(minus(src.W, src.E));
      pose.arms[s].el = Math.acos(Math.min(1, Math.max(-1, dot(u, v)))) / rad;
    }
    return j;
  };
  SA.legsContact = {project: P, models: MODELS, norm, minus};

  T.legs_mat = {
    build(L, ctx, it) {
      const x0 = it.x == null ? -145 : it.x, x1 = x0 + (it.length || 350), z = it.width || 115;
      const pts = [V(P(v3(x0, 0, -z)).x, -8), V(P(v3(x1, 0, -z)).x, -8), V(P(v3(x1, 0, z)).x, 5), V(P(v3(x0, 0, z)).x, 5)];
      el('path', {d: 'M' + pts.map(pt).join('L') + 'Z', class: 'mat', stroke: 'var(--stage-line)', 'stroke-width': 1}, L.back);
      if (ctx.eq && ctx.eq.legs3D && ctx.eq.legs3D.type === 'lunge') {
        // Rotate the anatomical surface about the fixed spinal axis, rather
        // than representing a thoracic turn as a sagittal back extension.
        const original = ctx.figure.root.querySelector('.part.torso');
        it.torso = el('g', {class: 'part torso legs-thoracic-turn'});
        original.parentNode.insertBefore(it.torso, original); original.style.visibility = 'hidden';
        const art = SA.body.side.torso;
        it.surface = [{node: el('path', {class: 'skin'}, it.torso), points: art.outline, closed: true},
          ...art.details.map(points => ({node: el('path', {class: 'detail'}, it.torso), points, closed: false}))];
        const prefix = L.back.closest('svg').querySelector('pattern').id;
        for (const m of art.muscles) {
          const anchor = ctx.figure.anchors.find(a => a.part === 'torso' && a.id === m.id);
          const points = SA.figureUtil.outlineOf(m);
          if (!anchor) {
            if (!m.deep && m.line !== 'none') it.surface.push({node: el('path', {class: 'detail'}, it.torso), points: m.line === 'a' ? m.a : m.line === 'b' ? m.b : points, closed: !['a','b'].includes(m.line)});
          } else {
            const role = anchor.role;
            it.surface.push({node: el('path', {class: 'm m-' + role + (m.deep ? ' deep' : ''), fill: role === 'x' ? `url(#${prefix})` : null}, it.torso), points, closed: true, anchor});
            it.surface.push({node: el('path', {class: 'm-edge m-edge-' + role}, it.torso), points, closed: true});
          }
        }
        it.surface.push({node: el('path', {class: 'edge'}, it.torso), points: art.outline, closed: true});
      }
    }, update(ctx, it) {
      if (!it.surface) return;
      const j = ctx.joints.source3D, S = SA.body.side.TORSO_S;
      const map = p => {
        const [s,off] = p; let i=0; while (i<S.length-2 && s>S[i+1]) i++;
        const u = normalize(minus(j.N[i+1],j.N[i])), t=(s-S[i])/(S[i+1]-S[i]);
        const base = plus(j.N[i],times(minus(j.N[i+1],j.N[i]),t));
        const roll = (j.torsoRoll || 0) * Math.min(1,Math.max(0,(s-18)/55));
        const front = rotate(v3(-u.y,u.x),u,roll);
        const q=P(plus(base,times(front,off))); return [q.x,q.y,p[2]];
      };
      for (const surface of it.surface) {
        surface.node.setAttribute('d',U.smooth(surface.points.map(map),surface.closed));
        if(surface.anchor){const p=SA.figureUtil.centroid(surface.points), w=map([p.x,p.y]);surface.anchor.world=V(w[0],w[1]);}
      }
      const head=ctx.figure.parts.head, d=normalize(minus(j.N[4],j.N[3])), front=rotate(v3(-d.y,d.x),d,j.gazeRoll || 0);
      head.frame.n=P(front);head.g.setAttribute('transform',U.matrix(head.frame));
    },
    bounds(ctx, it) { const x = it.x == null ? -145 : it.x, z = it.width || 115; return [P(v3(x, 0, -z)), P(v3(x + (it.length || 350), 0, z))]; }
  };
  T.legs_rollerStand = {
    build(L, ctx, it) {
      const x = it.x, y = it.y, r = it.r || 13, g = el('g', {class: 'eq legs-roller-stand'}, L.back);
      el('path', {d: rect(x - 40, -7, 80, 7, 3) + rect(x - 4, y, 8, -y - 7, 2), class: 'frame-dark'}, g);
      for (let yy = y + 20; yy < -12; yy += 13) el('circle', {cx: x, cy: yy, r: 1.5, fill: 'var(--metal-light)'}, g);
      el('path', {d: bar(V(x - 18, y), V(x + 10, y), 8), class: 'frame'}, g);
      el('circle', {cx: x, cy: y, r, class: 'pad'}, g); el('circle', {cx: x, cy: y, r: 5, class: 'pad-light'}, g);
    }, update() {}, bounds(ctx, it) { return [V(it.x - 43, it.y - (it.r || 13)), V(it.x + 43, 0)]; }
  };
  function stack(L, x, top) {
    const g = el('g', {class: 'eq weight-stack'}, L.back);
    el('path', {d: rect(x - 25, top - 9, 50, -top + 9, 6), class: 'frame-dark'}, g);
    el('path', {d: rect(x - 18, top, 36, -top - 10, 3), fill: 'var(--stage)', opacity: .55}, g);
    for (let y = -94; y < -18; y += 8) el('path', {d: rect(x - 15, y, 30, 6, 1.5), class: 'metal-mid'}, g);
    for (const s of [-1, 1]) el('path', {d: bar(V(x + s * 10, top + 6), V(x + s * 10, -15), 2), class: 'metal-light'}, g);
    el('circle', {cx: x, cy: top + 7, r: 8, class: 'metal-mid'}, g);
    el('circle', {cx: x, cy: -64, r: 3, fill: 'var(--band)'}, g);
    return g;
  }
  function handle(L, h) {
    el('path', {d: bar(V(h.x - 7, h.y), V(h.x + 7, h.y), 5), class: 'metal'}, L.front);
  }
  T.legs_hipAdductor = {
    build(L, ctx, it) {
      const g = el('g', {class: 'eq legs-adductor'}, L.back);
      el('path', {d: rect(-160, -7, 330, 7, 3), class: 'frame'}, g);
      for (const x of [-116, -18, 120]) el('path', {d: bar(V(x, -108), V(x, -7), 8), class: 'frame-dark'}, g);
      const d = V(-Math.cos(18 * rad), -Math.sin(18 * rad)), base = V(-7, -107), tip = add(base, mul(d, 137));
      el('path', {d: bar(base, tip, 13), class: 'pad'}, g);
      el('path', {d: bar(add(base, V(0, -2)), add(tip, V(0, -2)), 3), class: 'pad-light'}, g);
      el('path', {d: rect(-32, -108, 59, 12, 5), class: 'pad'}, g);
      el('path', {d: bar(V(-88, -93), V(-58, -37), 6), class: 'frame'}, g); // gas-assisted backrest strut
      stack(L, -169, -195);
      it.cable = el('path', {class: 'cable'}, g);
      it.work = ['far', 'near'].map(s => ({s, arm: el('path', {class: 'frame'}, g), pad: el('path', {class: 'pad'}, L.front), foot: el('path', {class: 'metal-mid'}, L.front)}));
      ['near', 'far'].forEach(s => handle(L, P(v3(12, -112, s === 'near' ? 32 : -32))));
    },
    update(ctx, it) {
      for (const n of it.work) {
        const g = ctx.joints.legs[n.s], pivot = V(8, -97);
        const thigh = unit(sub(g.K, g.H)), inside = V(-thigh.y, thigh.x);
        const padC = add(g.K, mul(inside, n.s === 'near' ? -13 : 13));
        n.arm.setAttribute('d', bar(pivot, add(g.sole, V(-4, 12)), 8));
        n.pad.setAttribute('d', bar(add(padC, mul(thigh, -13)), add(padC, mul(thigh, 10)), 10));
        n.foot.setAttribute('d', bar(add(g.sole, V(-13, 2)), add(g.sole, V(41, 2)), 5));
      }
      it.cable.setAttribute('d', 'M-169,-188V-12H8V-97');
    }, bounds() { return [V(-198, -207), V(170, 0)]; }
  };
  function extensionRoller(ctx, it) {
    const g = ctx.joints.legs.near, u = unit(sub(g.A, g.K)), normal = V(u.y, -u.x), base = add(g.K, mul(normal, 24));
    const pivot = V(it.pivot.x, it.pivot.y), d = sub(base, pivot), b = d.x * u.x + d.y * u.y;
    const disc = b * b - (d.x * d.x + d.y * d.y - it.radius ** 2);
    return add(base, mul(u, -b + Math.sqrt(Math.max(0, disc))));
  }
  T.legs_hipFlexionMachine = {
    build(L, ctx, it) {
      const g = el('g', {class: 'eq legs-extension'}, L.back);
      el('path', {d: rect(-143, -7, 310, 7, 3) + bar(V(-61, -107), V(-82, -7), 9) + bar(V(15, -113), V(55, -7), 9), class: 'frame'}, g);
      el('path', {d: rect(-77, -116, 98, 13, 5) + bar(V(-68, -120), V(-68, -245), 14), class: 'pad'}, g);
      stack(L, -147, -218);
      el('path', {d: 'M-147,-210V-14H43V-135', class: 'cable'}, g);
      el('path', {d: bar(V(21, -113), V(it.pivot.x, it.pivot.y), 10), class: 'frame-dark'}, g);
      el('circle', {cx: it.pivot.x, cy: it.pivot.y, r: 8, class: 'metal-mid'}, g);
      it.lever = el('path', {class: 'frame-dark'}, g);
      it.roller = el('circle', {r: 13, class: 'pad'}, L.front); it.cap = el('circle', {r: 6, class: 'pad-light'}, L.front);
      for (const s of [-1, 1]) handle(L, V(-1 - (s < 0 ? 8 : 0), -125 - (s < 0 ? 5 : 0)));
    }, update(ctx, it) {
      const q = extensionRoller(ctx, it);
      it.lever.setAttribute('d', bar(V(it.pivot.x, it.pivot.y), q, 8));
      for (const n of [it.roller, it.cap]) { n.setAttribute('cx', n1(q.x)); n.setAttribute('cy', n1(q.y)); }
    }, bounds() { return [V(-175, -250), V(169, 0)]; }
  };
  T.legs_proneCurlMachine = {
    build(L, ctx, it) {
      const g = el('g', {class: 'eq legs-prone-curl'}, L.back);
      el('path', {d: rect(-189, -7, 350, 7, 3) + bar(V(-123, -96), V(-150, -7), 9) + bar(V(60, -89), V(99, -7), 9), class: 'frame'}, g);
      el('path', {d: bar(V(-119, -102), V(-22, -102), 14) + bar(V(-22, -100), V(87, -91), 15), class: 'pad'}, g);
      stack(L, -215, -203);
      el('path', {d: 'M-215,-195V-15H-112V-120', class: 'cable'}, g);
      el('circle', {cx: -112, cy: -120, r: 8, class: 'metal-mid'}, g);
      it.arm = el('path', {class: 'frame-dark'}, g);
      it.roller = el('circle', {r: 13, class: 'pad'}, L.front); it.cap = el('circle', {r: 5, class: 'pad-light'}, L.front);
      el('path', {d: bar(V(88, -91), V(110, -81), 7), class: 'frame'}, g);
      handle(L, V(102, -82)); handle(L, V(98, -87));
    }, update(ctx, it) {
      const k = ctx.eq && ctx.eq.curlKnee != null ? ctx.eq.curlKnee : 15;
      const u = fromDown(-90 - k), a = add(V(-112, -120), mul(u, 88)), n = V(u.y, -u.x), q = add(a, mul(n, -23));
      it.arm.setAttribute('d', bar(V(-112, -120), q, 8));
      for (const node of [it.roller, it.cap]) { node.setAttribute('cx', n1(q.x)); node.setAttribute('cy', n1(q.y)); }
    }, bounds() { return [V(-244, -214), V(164, 0)]; }
  };
  SA.legsContact.extensionRoller = extensionRoller;
})(typeof window !== 'undefined' ? window : globalThis);
