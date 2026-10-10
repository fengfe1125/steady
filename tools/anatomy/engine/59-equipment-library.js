/* Standalone equipment library: manufacturer-grounded structures for the 14 native lessons.
 * Extends the approved anatomy renderer. Ground = 0; all handles, pads and pedals use its joints.
 * The models are teaching drawings, not dimensional CAD. References live in the lesson specs.
 */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy, T = SA.equipment.types, U = SA.util;
  const {V, add, sub, mul, unit, lerpV, rot, fromDown, el} = U;
  const {bar, rect, hex} = SA.equipment;
  const setPath = (node, points) => node.setAttribute('d', points.map((p, i) => (i ? 'L' : 'M') + U.pt(p)).join(''));
  const pointAttrs = (node, key, p) => node.setAttribute('data-' + key, U.pt(p));
  const tube = (g, a, b, width = 8, cls = 'frame-dark', name) => el('path', {d: bar(a, b, width), class: cls, 'data-component': name}, g);
  const path = (g, cls, name) => el('path', {class: cls, 'data-component': name}, g);
  const pad = (g, a, b, width = 16, name = 'pad') => {
    tube(g, a, b, width, 'pad', name);
    tube(g, lerpV(a, b, .12), lerpV(a, b, .88), 2, 'pad-light', name + '-seam');
  };
  function pivot(g, P, name, r = 8) {
    const n = el('g', {'data-component': name || 'pivot', 'data-center': U.pt(P)}, g);
    el('circle', {cx: P.x, cy: P.y, r, class: 'metal'}, n);
    el('circle', {cx: P.x, cy: P.y, r: r * .46, class: 'metal-face'}, n);
    el('circle', {cx: P.x, cy: P.y, r: 1.8, class: 'frame-dark'}, n);
    return n;
  }
  // Adjustment knobs and model numbers sat on top of the body and read as clutter; the
  // machine names stay in the native caption, so neither is drawn.
  const button = () => {};
  const model = () => {};
  const base = (g, x0, x1) => {
    tube(g, V(x0, -4), V(x1, -4), 9, 'frame-dark', 'base');
    for (const x of [x0 + 8, x1 - 8]) tube(g, V(x - 8, -2), V(x + 8, -2), 5, 'metal', 'rubber-foot');
  };
  function groups(L, it, name) {
    it.layers = L;
    it.nodes = {back: el('g', {class: 'eq library-machine', 'data-machine': name}, L.back),
      front: el('g', {class: 'eq library-machine', 'data-machine-front': name}, L.front)};
    return it.nodes;
  }
  function seatSide(n, {x = 0, top = -108, angle = -6, short = false, back = true} = {}) {
    const seatA = V(x - 24, top), seatB = V(x + (short ? 25 : 70), top + (short ? 0 : 14));
    tube(n.back, V(x - 7, top + 12), V(x - 7, -5), 10, 'frame-dark', 'seat-stem');
    tube(n.back, V(x + 35, top + 16), V(x + 35, -5), 7, 'frame', 'seat-front-support');
    pad(n.back, seatA, seatB, 15, 'seat');
    // The foreground lip covers the bottom edge of the seated buttock, as on the shoulder example.
    tube(n.front, add(seatA, V(0, 6)), add(seatB, V(0, 6)), 4, 'pad-light', 'seat-lip');
    button(n.front, V(x - 7, top + 35));
    if (back) {
      const A = V(x - 27, top - 7), B = add(A, mul(U.fromUp(angle), 129));
      tube(n.back, add(A, V(-8, 15)), add(B, V(-8, 4)), 7, 'frame-dark', 'back-support');
      pad(n.back, A, B, 15, 'backrest');
    }
  }
  function seatFront(n, top = -104, back = true) {
    for (const x of [-27, 27]) tube(n.back, V(x, top + 14), V(x, -5), 9, 'frame-dark', 'seat-leg');
    tube(n.back, V(-44, -4), V(44, -4), 9, 'frame', 'seat-base');
    if (back) {
      el('path', {d: rect(-26, -273, 52, top + 273, 8), class: 'pad', 'data-component': 'backrest'}, n.back);
      tube(n.back, V(0, -273), V(0, top), 4, 'pad-light', 'backrest-seam');
    }
    el('path', {d: rect(-40, top, 80, 16, 6), class: 'pad', 'data-component': 'seat'}, n.back);
    // Behind the thighs: seen from the front the legs rest on the seat and must stay visible.
    el('path', {d: rect(-36, top + 10, 72, 5, 2), class: 'pad-light', 'data-component': 'seat-lip'}, n.back);
    button(n.front, V(0, top + 26));
  }
  function tower(n, it, x, top = -295, width = 45) {
    const g = el('g', {'data-component': 'weight-tower'}, n.back);
    const left = x - width / 2;
    el('path', {d: rect(left, top, width, -top - 9, 8), class: 'frame-dark'}, g);
    el('path', {d: rect(left + 5, top + 8, width - 10, -top - 20, 5), class: 'metal-light', opacity: .5}, g);
    for (const dx of [-10, 10]) tube(g, V(x + dx, top + 58), V(x + dx, -26), 1.7, 'metal-face', 'guide-rod');
    for (let i = 0; i < 5; i++) el('path', {d: rect(left + 8, -32 - 9 * i, width - 16, 6, 1.5), class: 'frame', 'data-component': 'unused-plate'}, g);
    const selected = el('g', {'data-component': 'selected-plates'}, g);
    for (let i = 0; i < 3; i++) el('path', {d: rect(left + 8, -77 - 9 * i, width - 16, 6, 1.5), class: 'metal', 'data-component': 'selected-plate'}, selected);
    el('circle', {cx: x + 10, cy: -73, r: 2.5, fill: 'var(--warn)', 'data-component': 'weight-pin'}, selected);
    const line = path(g, 'cable', 'stack-cable');
    tube(g, V(x, top + 20), V(x, top + 43), 14, 'pad', 'instruction-placard');
    el('path', {d: `M${x - 4},${top + 31}l4,-5 4,5M${x},${top + 27}v9m-3,4 3,-4 3,4`, class: 'library-placard'}, g);
    model(g, '配重透视', V(x, -13));
    it.stack = {selected, line, x, top};
    return [V(left - 3, top - 3), V(left + width + 3, 0)];
  }
  function updateStack(ctx, it, cableRise) {
    if (!it.stack) return;
    const s = it.stack, rise = cableRise == null ? (ctx.eq && ctx.eq.phase || 0) * 48 : Math.max(0, cableRise);
    s.selected.setAttribute('transform', `translate(0 ${-rise})`);
    setPath(s.line, [V(s.x, s.top + 48), V(s.x, -96 - rise)]);
    s.selected.setAttribute('data-rise', U.n1(rise));
  }
  function grip(n, name) {
    return {shaft: path(n.back, 'metal', name), rim: path(n.front, 'metal-face', name + '-ends')};
  }
  function setGrip(nodes, H, dir = V(0, 1), length = 27) {
    const A = add(H, mul(dir, -length / 2)), B = add(H, mul(dir, length / 2));
    nodes.shaft.setAttribute('d', bar(A, B, 6));
    nodes.rim.setAttribute('d', bar(A, add(A, mul(dir, 3)), 7) + bar(sub(B, mul(dir, 3)), B, 7));
    pointAttrs(nodes.shaft, 'contact', H);
  }
  const updateFixedGrips = (ctx, it, targets) => Object.entries(it.grips).forEach(([s, n]) => setGrip(n, targets ? targets[s] : ctx.joints.arms[s].H));
  const addFixedGrips = (n, it, sides = ['near', 'far']) => {
    it.grips = Object.fromEntries(sides.map(s => [s, grip(n, s + '-grip')]));
  };
  const dynamic = (n, name, cls = 'frame-dark') => path(n.back, cls, name);
  const animateLink = (node, A, B, width = 8) => {
    node.setAttribute('d', bar(A, B, width)); pointAttrs(node, 'root', A); pointAttrs(node, 'end', B);
    node.setAttribute('data-length', U.n1(U.dist(A, B)));
  };

  /* VSL001BP: low pivot, upward curved arm, fixed seat/backrest. */
  T.library_chestPress = {
    build(L, ctx, it) {
      const n = groups(L, it, 'VSL001BP'); base(n.back, -55, 130); seatSide(n, {top: it.seat});
      tube(n.back, V(-39, -4), V(-39, -248), 9, 'frame-dark', 'rear-upright');
      tube(n.back, V(-25, -11), it.pivot, 11, 'frame', 'low-pivot-support');
      it.bounds0 = tower(n, it, -104); model(n.back, 'VSL001BP', V(-104, -302));
      // Both press arms sit behind the body so the near arm no longer covers the thigh and knee.
      it.arm = dynamic(n, 'low-pivot-press-arm'); it.armFront = path(n.back, 'frame', 'curved-press-arm');
      addFixedGrips(n, it); pivot(n.front, it.pivot, 'low-pivot');
    },
    update(ctx, it) {
      updateStack(ctx, it); const H = ctx.joints.arms.near.H, P = it.pivot;
      animateLink(it.arm, P, H, 8);
      const u = unit(sub(H, P)), side = V(u.y, -u.x), B = add(lerpV(P, H, .68), mul(side, -13));
      it.armFront.setAttribute('d', bar(P, B, 6) + bar(B, H, 6)); updateFixedGrips(ctx, it);
    },
    bounds(ctx, it) { return [V(-135, -307), V(135, 1)]; }
  };

  /* VSL012BP: high pivot behind the backrest, bent press arm and two grip positions. */
  T.library_shoulderPress = {
    build(L, ctx, it) {
      const n = groups(L, it, 'VSL012BP'); base(n.back, -71, 105); seatSide(n);
      tube(n.back, V(it.pivot.x, -5), V(it.pivot.x, -292), 11, 'frame-dark', 'rear-pivot-upright');
      tube(n.back, V(-48, -278), V(-98, -274), 8, 'frame', 'tower-brace');
      it.bounds0 = tower(n, it, -110); model(n.back, 'VSL012BP', V(-110, -302));
      it.arm = dynamic(n, 'rigid-press-arm'); it.curve = path(n.back, 'frame', 'forked-press-arm');
      it.extraGrip = path(n.back, 'metal', 'neutral-grip'); addFixedGrips(n, it); pivot(n.front, it.pivot, 'high-rear-pivot', 9);
    },
    update(ctx, it) {
      updateStack(ctx, it); const H = ctx.joints.arms.near.H, P = it.pivot;
      animateLink(it.arm, P, H, 8); const u = unit(sub(H, P)), normal = V(-u.y, u.x);
      const B = add(lerpV(P, H, .48), mul(normal, 13));
      it.curve.setAttribute('d', bar(P, B, 6) + bar(B, H, 6));
      it.extraGrip.setAttribute('d', bar(add(H, V(-11, 5)), add(H, V(-11, 25)), 5)); updateFixedGrips(ctx, it, {near: H, far: H});
    },
    bounds(ctx, it) { return [V(-139, -340), V(108, 1)]; }
  };

  /* VSL026BP shared chassis. The upper and lower pulley, long bench and mast are
     present in both drawings; only the exercise attachment and foot/leg support differ. */
  function dualPulley(n, it) {
    base(n.back, -58, 226);
    pad(n.back, V(-38, -108), V(128, -108), 13, 'long-bench');
    for (const x of [-21, 108]) tube(n.back, V(x, -100), V(x, -5), 9, 'frame-dark', 'bench-leg');
    tube(n.back, V(-30, -70), V(204, -70), 7, 'frame', 'bench-spine');
    tube(n.back, V(194, -5), V(194, -330), 12, 'frame-dark', 'pulley-mast');
    tube(n.back, V(194, -330), V(137, -391), 12, 'frame-dark', 'upper-boom');
    tube(n.back, V(137, -391), V(29, -391), 12, 'frame', 'overhead-boom');
    tube(n.back, V(194, -227), V(146, -380), 7, 'frame', 'mast-brace');
    tube(n.back, V(172, -54), V(217, -54), 8, 'frame-dark', 'low-pulley-bracket');
    pivot(n.back, V(29, -380), 'high-pulley', 7); pivot(n.back, V(200, -54), 'low-pulley', 9);
    it.bounds0 = tower(n, it, 252, -327); model(n.back, 'VSL026BP', V(252, -334));
    it.route = path(n.back, 'cable', 'chassis-cable'); setPath(it.route, [V(252, -279), V(240, -347), V(137, -378), V(29, -380)]);
  }
  T.library_pulldown = {
    build(L, ctx, it) {
      const n = groups(L, it, 'VSL026BP-pulldown'); dualPulley(n, it);
      tube(n.back, V(58, -104), V(58, -141), 8, 'frame-dark', 'thigh-pad-support');
      pad(n.front, V(47, -140), V(78, -133), 16, 'thigh-restraint'); button(n.front, V(59, -121));
      it.bar = path(n.back, 'metal', 'wide-lat-bar'); it.cable = path(n.back, 'cable', 'active-high-cable'); addFixedGrips(n, it);
    },
    update(ctx, it) {
      const A = ctx.joints.arms.near.H, B = ctx.joints.arms.far.H, C = lerpV(A, B, .5);
      updateStack(ctx, it, U.dist(C, V(29, -380)) - U.dist(V(34.5, -333.5), V(29, -380)));
      // A wide bar projects mostly into depth in this side view. Both grip contacts
      // and the central eye are still shown; the bar stays in front in the correct scene.
      const span = V(30, 8);
      it.bar.setAttribute('d', bar(sub(B, span), add(A, span), 5));
      setPath(it.cable, [C, V(29, -380)]); pointAttrs(it.bar, 'near-contact', A); pointAttrs(it.bar, 'far-contact', B);
      updateFixedGrips(ctx, it);
    },
    bounds() { return [V(-60, -397), V(280, 1)]; }
  };
  T.library_cableRow = {
    build(L, ctx, it) {
      const n = groups(L, it, 'VSL026BP-row'); dualPulley(n, it);
      // Whole soles meet slanted pedals. These support points are fixed throughout the cycle.
      const leg = ctx.joints.legs.near;
      pad(n.back, add(leg.heel, V(0, 1)), add(leg.toe, V(0, 1)), 6, 'slanted-footplate');
      tube(n.back, V(158, -4), leg.sole, 8, 'frame-dark', 'pedal-support');
      it.handle = path(n.back, 'metal', 'narrow-V-handle'); it.cable = path(n.back, 'cable', 'active-low-cable'); addFixedGrips(n, it);
    },
    update(ctx, it) {
      const A = ctx.joints.arms.near.H, B = ctx.joints.arms.far.H, C = add(lerpV(A, B, .5), V(13, 0));
      updateStack(ctx, it, U.dist(C, V(200, -54)) - U.dist(V(122, -192), V(200, -54)));
      it.handle.setAttribute('d', bar(A, C, 5) + bar(B, C, 5)); setPath(it.cable, [C, V(200, -54)]); updateFixedGrips(ctx, it);
      pointAttrs(it.handle, 'cable-eye', C);
    },
    bounds() { return [V(-60, -397), V(280, 1)]; }
  };

  /* VSL010BP: fixed seat and an upright footplate on a parallelogram. */
  T.library_legPress = {
    build(L, ctx, it) {
      const n = groups(L, it, 'VSL010BP'); base(n.back, -67, 242); seatSide(n, {top: -66, angle: -22, short: true});
      tube(n.back, V(-53, -4), V(-69, -195), 10, 'frame-dark', 'inclined-back-frame');
      it.bounds0 = tower(n, it, -120, -279); model(n.back, 'VSL010BP', V(-120, -286));
      it.links = [dynamic(n, 'front-link'), dynamic(n, 'rear-link', 'frame')];
      it.bracket = dynamic(n, 'footplate-bracket'); it.plate = el('g', {'data-component': 'upright-footplate'}, n.back);
      el('path', {d: rect(0, -47, 13, 100, 4), class: 'pad'}, it.plate);
      for (let i = -36; i <= 42; i += 12) tube(it.plate, V(0, i), V(7, i), 1.5, 'pad-light', 'plate-tread');
      pivot(n.front, it.pivot, 'front-fixed-pivot'); pivot(n.front, add(it.pivot, V(32, 0)), 'rear-fixed-pivot');
      addFixedGrips(n, it); tube(n.back, V(-18, -63), V(16, -63), 8, 'frame', 'seat-handle-mount');
    },
    update(ctx, it) {
      updateStack(ctx, it); const p = ctx.eq && ctx.eq.phase || 0;
      const P = add(it.pivot, mul(fromDown(209 - 29 * p), it.radius)), P2 = add(P, V(32, 0));
      animateLink(it.links[0], it.pivot, P); animateLink(it.links[1], add(it.pivot, V(32, 0)), P2);
      animateLink(it.bracket, P, P2, 9); it.plate.setAttribute('transform', `translate(${U.pt(P)})`); pointAttrs(it.plate, 'contact-plane', P);
      updateFixedGrips(ctx, it, {near: V(16, -77), far: V(10, -81)});
    },
    bounds() { return [V(-148, -289), V(244, 1)]; }
  };

  function kneeMachine(L, ctx, it, curl) {
    const n = groups(L, it, curl ? 'RSL0619' : 'VSL005BP'); base(n.back, -57, 200); seatSide(n, {top: -114});
    it.knee = V(87, -132); tube(n.back, V(89, -5), it.knee, 10, 'frame-dark', 'knee-axis-post');
    it.bounds0 = tower(n, it, -112, -283); model(n.back, curl ? 'RSL0619' : 'VSL005BP', V(-112, -290));
    it.arm = dynamic(n, 'knee-pivot-work-arm'); it.roller = el('g', {'data-component': 'lower-roller'}, n.front);
    el('ellipse', {rx: 12, ry: 13, class: 'pad'}, it.roller);
    el('ellipse', {cx: -3, cy: -3, rx: 8, ry: 8, class: 'pad-light'}, it.roller);
    el('ellipse', {rx: 12, ry: 13, fill: 'none', stroke: 'var(--metal)', 'stroke-width': 1.2}, it.roller);
    pivot(n.front, it.knee, 'knee-pivot', 11); button(n.front, add(it.knee, V(12, 0))); addFixedGrips(n, it);
    if (curl) {
      it.restraint = el('g', {'data-component': 'fixed-thigh-restraint'}, n.front);
      pad(it.restraint, V(43, -156), V(70, -156), 15, 'thigh-pad');
      tube(n.back, V(90, -133), V(90, -155), 7, 'frame', 'restraint-upright');
      tube(n.back, V(90, -155), V(64, -155), 7, 'frame', 'restraint-support');
      button(n.front, V(84, -154));
      for (const H of [V(58, -166), V(52, -170)]) tube(n.back, V(H.x, -156), add(H, V(0, -15)), 5, 'frame-dark', 'upper-grip-mount');
    } else tube(n.back, V(-10, -113), V(20, -113), 6, 'frame-dark', 'side-handle-mount');
  }
  function updateKnee(ctx, it, curl) {
    updateStack(ctx, it); const l = ctx.joints.legs.near, u = unit(sub(l.A, l.K)), normal = V(u.y, -u.x);
    const side = ctx.eq && ctx.eq.rollerSide != null ? ctx.eq.rollerSide : (curl ? -1 : 1);
    const t = ctx.eq && ctx.eq.rollerT || .82;
    const C = add(lerpV(l.K, l.A, t), mul(normal, (curl ? 21 : 19) * side));
    animateLink(it.arm, it.knee, C, 7); it.roller.setAttribute('transform', `translate(${U.pt(C)})`);
    pointAttrs(it.roller, 'center', C); it.roller.setAttribute('data-shank-fraction', t); it.roller.setAttribute('data-side', side);
    if (it.restraint) it.restraint.setAttribute('transform', `translate(0 ${-(ctx.eq && ctx.eq.restraintLift || 0)})`);
    updateFixedGrips(ctx, it, curl ? {near: V(58, -166), far: V(52, -170)} : {near: V(20, -125), far: V(14, -129)});
  }
  T.library_legExtension = {build(L, ctx, it) { kneeMachine(L, ctx, it, false); }, update(ctx, it) { updateKnee(ctx, it, false); }, bounds() { return [V(-140, -294), V(220, 1)]; }};
  T.library_legCurl = {build(L, ctx, it) { kneeMachine(L, ctx, it, true); }, update(ctx, it) { updateKnee(ctx, it, true); }, bounds() { return [V(-140, -294), V(203, 1)]; }};

  /* RSL0204: angled upper-arm support, fixed elbow pivot and linked grips. */
  T.library_bicepsCurl = {
    build(L, ctx, it) {
      const n = groups(L, it, 'RSL0204'); base(n.back, -170, 87); seatSide(n, {x: -70, top: -108, back: false});
      it.bounds0 = tower(n, it, -158, -287); model(n.back, 'RSL0204', V(-158, -294));
      const A = add(it.shoulder, V(8, 14)), B = add(it.elbow, V(8, 14));
      pad(n.back, A, B, 21, 'angled-arm-pad');
      tube(n.back, B, V(34, -4), 10, 'frame-dark', 'curved-front-frame');
      tube(n.back, V(-148, -54), B, 8, 'frame', 'pad-brace');
      tube(n.back, V(-97, -7), V(44, -7), 10, 'frame-dark', 'front-base');
      it.lever = dynamic(n, 'linked-curl-lever'); it.cross = path(n.back, 'frame', 'linked-grip-crossbar'); addFixedGrips(n, it);
      pivot(n.front, it.elbow, 'elbow-pivot', 10); button(n.front, add(it.elbow, V(10, 12)));
    },
    update(ctx, it) {
      updateStack(ctx, it); const A = ctx.joints.arms.near.H, B = ctx.joints.arms.far.H;
      animateLink(it.lever, it.elbow, A, 8); animateLink(it.cross, sub(A, V(8, 2)), add(B, V(8, 2)), 6); updateFixedGrips(ctx, it);
    },
    bounds() { return [V(-185, -300), V(92, 1)]; }
  };

  /* VSL015BP: overhead dual pivots and hanging vertical handles. The arms sweep
     in a horizontal plane; foreshortening is intentional, while physical elbow flexion stays 21°. */
  T.library_pecFly = {
    build(L, ctx, it) {
      const n = groups(L, it, 'VSL015BP'); seatFront(n);
      for (const s of [-1, 1]) tube(n.back, V(s * 129, -5), V(s * 129, -336), 10, 'frame-dark', 'gantry-upright');
      tube(n.back, V(-129, -336), V(129, -336), 11, 'frame', 'gantry-top-beam');
      it.bounds0 = tower(n, it, 188, -319); model(n.back, 'VSL015BP', V(188, -326));
      it.arms = ['r', 'l'].map((s, i) => {
        const P = V((i ? -1 : 1) * 32, -327);
        tube(n.back, V(P.x, -336), P, 7, 'frame-dark', 'pivot-support'); pivot(n.front, P, s + '-overhead-pivot', 7); button(n.front, add(P, V(0, 12)));
        return {s, P, boom: dynamic(n, s + '-overhead-arm'), hang: dynamic(n, s + '-hanging-arm', 'frame')};
      });
      addFixedGrips(n, it, ['r', 'l']);
    },
    update(ctx, it) {
      updateStack(ctx, it);
      it.arms.forEach(a => {
        const H = ctx.joints.arms[a.s].H, Q = V(H.x, -324 + 8 * Math.sin((ctx.eq && ctx.eq.horizontalAngle || 0) * U.RAD));
        animateLink(a.boom, a.P, Q, 7); animateLink(a.hang, Q, add(H, V(0, -9)), 7);
        a.boom.setAttribute('data-projection', 'horizontal-plane'); a.hang.setAttribute('data-projection', 'horizontal-plane');
      });
      updateFixedGrips(ctx, it);
    },
    bounds() { return [V(-170, -343), V(217, 1)]; }
  };

  /* VSL008BP: outer-thigh pads and paired foot pegs on the moving abduction arms. */
  T.library_hipAbduction = {
    build(L, ctx, it) {
      const n = groups(L, it, 'VSL008BP'); seatFront(n, -120); it.bounds0 = tower(n, it, 152, -292); model(n.back, 'VSL008BP', V(152, -299));
      it.legs = ['r', 'l'].map((s, i) => {
        const sign = i ? -1 : 1, P = V(sign * 19, -104); pivot(n.back, P, s + '-seat-pivot');
        // Adduction mode sets the pads between the knees: behind the legs, so the knees stay visible.
        const inner = ctx.eq && ctx.eq.padSide === -1;
        const g = el('g', {'data-component': s + (inner ? '-inner-thigh-pad' : '-outer-thigh-pad')}, inner ? n.back : n.front);
        el('path', {d: rect(-7, -17, 14, 34, 5), class: 'pad'}, g);
        tube(g, V(0, -11), V(0, 11), 2, 'pad-light', 'pad-face');
        return {s, sign, P, pad: g, arm: dynamic(n, s + '-swing-arm'), mount: dynamic(n, s + '-pad-mount', 'frame'),
          peg: path(n.back, 'metal', s + '-foot-pegs'), footMount: dynamic(n, s + '-peg-mount', 'frame')};
      });
      addFixedGrips(n, it, ['r', 'l']); button(n.front, V(0, -98));
      for (const s of [-1, 1]) tube(n.back, V(s * 32, -123), V(s * 56, -152), 7, 'frame', 'side-grip-mount');
    },
    update(ctx, it) {
      updateStack(ctx, it);
      it.legs.forEach(a => {
        const j = ctx.joints.legs[a.s], mode = ctx.eq && ctx.eq.padSide || 1;
        const C = add(j.K, V(a.sign * mode * 23, -4)), E = add(j.K, V(0, 40));
        animateLink(a.arm, a.P, E, 8); a.arm.setAttribute('data-projection', 'horizontal-plane');
        animateLink(a.mount, E, C, 6); animateLink(a.footMount, E, add(j.sole, V(0, 9)), 6);
        a.pad.setAttribute('transform', `translate(${U.pt(C)})`); pointAttrs(a.pad, 'center', C); a.pad.setAttribute('data-side', mode);
        const F = add(j.sole, V(0, 9));
        a.peg.setAttribute('d', bar(add(F, V(-14, 0)), add(F, V(14, 0)), 6) + bar(add(F, V(-14, -13)), add(F, V(14, -13)), 5));
        pointAttrs(a.peg, 'foot-contact', add(j.sole, V(0, 6)));
      }); updateFixedGrips(ctx, it, {r: V(56, -152), l: V(-56, -152)});
    },
    bounds() { return [V(-106, -305), V(182, 1)]; }
  };

  /* VSL014BP: shoulder pads and tall grips move with the torso; pelvis and elevated feet stay fixed. */
  T.library_crunch = {
    build(L, ctx, it) {
      const n = groups(L, it, 'VSL014BP'); base(n.back, -62, 142); seatSide(n, {back: false});
      pad(n.back, V(-23, -183), V(-23, -209), 15, 'short-back-cushion');
      tube(n.back, V(-32, -5), V(-32, -209), 9, 'frame-dark', 'short-back-support');
      pad(n.back, V(66, -24), V(127, -24), 8, 'elevated-footrest');
      tube(n.back, V(94, -4), V(94, -25), 10, 'frame-dark', 'footrest-stand');
      it.bounds0 = tower(n, it, -116, -285); model(n.back, 'VSL014BP', V(-116, -292));
      it.P = V(-4, -154); tube(n.back, V(-38, -5), it.P, 9, 'frame-dark', 'work-arm-support');
      it.work = dynamic(n, 'curved-shoulder-arm'); it.upright = dynamic(n, 'tall-grip-upright', 'frame');
      it.pads = el('g', {'data-component': 'paired-shoulder-pads'}, n.front);
      pad(it.pads, V(-9, -12), V(12, -12), 14, 'near-shoulder-pad');
      pad(it.pads, V(-16, -18), V(-8, -18), 12, 'far-shoulder-pad');
      addFixedGrips(n, it); pivot(n.front, it.P, 'shoulder-arm-pivot', 9);
    },
    update(ctx, it) {
      updateStack(ctx, it); const S = ctx.joints.shoulder, H = ctx.joints.arms.near.H, a = ctx.joints.angles.thorax;
      const Q = add(S, rot(V(0, -12), a));
      animateLink(it.work, it.P, Q, 8); animateLink(it.upright, Q, H, 6);
      it.pads.setAttribute('transform', `translate(${U.pt(S)}) rotate(${U.n1(a)})`); pointAttrs(it.pads, 'shoulder-contact', S);
      updateFixedGrips(ctx, it);
    },
    bounds() { return [V(-144, -301), V(146, 1)]; }
  };

  /* Three free-weight variants: upright goblet, left hand/knee bench support,
     and two palm-forward dumbbells with a backrest. */
  T.library_goblet = {
    build(L, ctx, it) {
      it.node = el('g', {class: 'eq library-goblet', 'data-component': 'vertical-goblet-dumbbell'}, L.back);
      tube(it.node, V(0, 0), V(0, 49), 8, 'metal-mid', 'dumbbell-handle');
      for (const [y, width] of [[-9, 38], [41, 34]]) {
        el('path', {d: rect(-width / 2, y, width, 17, 4), class: 'metal', 'data-component': y < 0 ? 'upper-bell-head' : 'lower-bell-head'}, it.node);
        tube(it.node, V(-width / 2 + 4, y + 4), V(width / 2 - 4, y + 4), 2, 'metal-face', 'bell-edge');
      }
    },
    update(ctx, it) {
      const H = lerpV(ctx.joints.arms.near.H, ctx.joints.arms.far.H, .5), C = add(H, V(0, -8));
      it.node.setAttribute('transform', `translate(${U.pt(C)})`); pointAttrs(it.node, 'palm-contact', H);
    },
    bounds(ctx) { const H = lerpV(ctx.joints.arms.near.H, ctx.joints.arms.far.H, .5); return [add(H, V(-22, -22)), add(H, V(22, 53))]; }
  };
  T.library_rowBench = {
    build(L, ctx, it) { T.bench.build(L, ctx, it); const g = el('g', {'data-component': 'same-side-bench-supports'}, L.front);
      tube(g, V(it.x + 16, it.top + 8), V(it.x + it.length - 16, it.top + 8), 2, 'pad-light', 'bench-front-edge'); },
    update() {}, bounds(ctx, it) { return T.bench.bounds(ctx, it); }
  };
  T.library_dumbbellBench = {
    build(L, ctx, it) { const n = groups(L, it, 'inclined-free-weight-bench'); base(n.back, -53, 94); seatSide(n); },
    update() {}, bounds() { return [V(-52, -257), V(96, 1)]; }
  };
  T.library_dumbbell = {build: T.dumbbell.build, update: T.dumbbell.update, bounds: T.dumbbell.bounds};
  SA.CSS += '\n.library-model{font-size:8px;font-weight:600;fill:var(--label-sub)}#detail .library-stack-note{display:none}.library-placard{fill:none;stroke:var(--metal-face);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}\n';
})(typeof window !== 'undefined' ? window : globalThis);
