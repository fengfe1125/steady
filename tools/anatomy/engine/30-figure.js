/* Figure renderer: builds the SVG nodes for one body once, then moves them every frame. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy;
  const U = SA.util, {V, add, sub, mul, smooth, resample, frame, matrix, local, el, lerpV, rot, fromUp, clamp, unit} = U;

  /* ---------------------------------------------------------------- muscle roles */
  function makeRoles(m) {
    const rules = [];
    [['p', m && m.primary], ['s', m && m.secondary], ['x', m && m.stretch]].forEach(([role, list]) => {
      (list || []).forEach(sel => { const [id, side] = sel.split('@'); rules.push({role, id, side}); });
    });
    return (id, side) => {
      for (const r of rules) if ((id === r.id || id.startsWith(r.id + '.')) && (!r.side || r.side === side)) return r.role;
      return null;
    };
  }

  /* ------------------------------------------------------------ static shapes */
  const outlineOf = m => m.outline || [...m.a, ...m.b.slice().reverse(), ...(m.close || [])];
  function fibersOf(m, count) {
    if (!m.a || !m.b) return [];
    const A = resample(m.a, 9), B = resample(m.b, 9), out = [];
    for (let i = 1; i <= count; i++) {
      const k = i / (count + 1);
      out.push(smooth(A.map((p, j) => lerpV(p, B[j], k)), false));
    }
    return out;
  }
  /** Open path following outline points i0..i1 with the closed curve's tangents. */
  function edgeRange(points, i0, i1) {
    const n = points.length, P = points.map(p => ({x: p[0], y: p[1], c: !!p[2]})), at = i => P[(i + n) % n];
    let d = 'M' + U.pt(at(i0));
    for (let i = i0; i < i1; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2), k1 = p1.c ? 0 : 1 / 6, k2 = p2.c ? 0 : 1 / 6;
      d += 'C' + U.pt(V(p1.x + (p2.x - p0.x) * k1, p1.y + (p2.y - p0.y) * k1)) + ' ' +
        U.pt(V(p2.x - (p3.x - p1.x) * k2, p2.y - (p3.y - p1.y) * k2)) + ' ' + U.pt(p2);
    }
    return d;
  }
  const centroid = pts => { let x = 0, y = 0; pts.forEach(p => { x += p[0]; y += p[1]; }); return V(x / pts.length, y / pts.length); };

  /** Inactive muscles show only their boundary so neighbouring shapes do not double up. */
  function inactiveLine(m, map) {
    const f = map || (p => p), mode = m.line || 'outline';
    if (mode === 'none') return '';
    if (mode === 'a' || mode === 'b') return smooth(m[mode].map(f), false);
    return smooth(outlineOf(m).map(f), true);
  }
  /** Draws muscles inside a rigid group; returns anchors (local centroids) for labels. */
  function drawMuscles(g, muscles, side, roles, prefix, layers) {
    const anchors = [];
    (muscles || []).forEach(m => {
      const role = roles(m.id, side), pts = outlineOf(m), d = smooth(pts, true);
      const base = m.id.startsWith('deltoid');
      if (base) el('path', {d, class: 'skin base'}, layers.base);
      if (!role) {
        if (base) el('path', {d, class: 'edge thin'}, layers.lines);
        else if (!m.deep) { const ln = inactiveLine(m); if (ln) el('path', {d: ln, class: 'detail'}, layers.lines); }
        return;
      }
      const cls = 'm m-' + role + (m.deep ? ' deep' : '');
      el('path', {d, class: cls, fill: role === 'x' ? `url(#${prefix}-hatch)` : null}, layers.fill);
      if (role === 'p') fibersOf(m, m.deep ? 2 : 4).forEach(f => el('path', {d: f, class: 'fiber'}, layers.fill));
      el('path', {d, class: 'm-edge m-edge-' + role + (m.deep ? ' deep' : '')}, layers.fill);
      anchors.push({id: m.id, side, role, local: centroid(pts)});
    });
    return anchors;
  }

  /** A rigid part: one group whose matrix follows a bone frame. */
  function rigidPart(parent, def, art, side, roles, prefix, cls) {
    const g = el('g', {class: 'part ' + cls}, parent);
    const pts = def.outline;
    const layers = {};
    el('path', {d: smooth(pts, true), class: 'skin'}, g);
    layers.base = el('g', null, g);
    layers.lines = el('g', null, g);
    (art.details || def.details || []).forEach(d => el('path', {d: smooth(d, false), class: 'detail'}, layers.lines));
    if (art.extra || def.extra) layers.lines.insertAdjacentHTML('beforeend', art.extra || def.extra);
    layers.fill = el('g', null, g);
    const anchors = drawMuscles(g, art.muscles || def.muscles, side, roles, prefix, layers);
    el('path', {d: (def.edges || []).map(([a, b]) => edgeRange(pts, a, b)).join(''), class: 'edge'}, g);
    // deltoid caps sit above the arm outline: give them a silhouette
    return {g, anchors, L: def.L};
  }

  /* -------------------------------------------------------------- side figure */
  function chainMapper(j, flexNear) {
    const N = j.N, S = SA.body.side.TORSO_S, dirs = [], fronts = [];
    for (let i = 0; i < N.length - 1; i++) dirs.push(unit(sub(N[i + 1], N[i])));
    for (let i = 0; i < N.length; i++) {
      const d = unit(add(dirs[Math.max(0, i - 1)], dirs[Math.min(dirs.length - 1, i)]));
      fronts.push(V(-d.y, d.x));
    }
    const hip = j.hip;
    return (s, off) => {
      let i = 0; while (i < S.length - 2 && s > S[i + 1]) i++;
      const t = (s - S[i]) / (S[i + 1] - S[i]);
      const base = s < 0 ? add(N[0], mul(dirs[0], s)) : (s > S[S.length - 1] ? add(N[N.length - 1], mul(dirs[dirs.length - 1], s - S[S.length - 1])) : lerpV(N[i], N[i + 1], clamp(t, 0, 1)));
      const fr = s < 0 ? fronts[0] : (s > S[S.length - 1] ? fronts[fronts.length - 1] : unit(lerpV(fronts[i], fronts[i + 1], clamp(t, 0, 1))));
      let p = add(base, mul(fr, off));
      if (s < 0) { // buttock and groin follow the thigh part of the way
        const w = clamp(-s / 30, 0, 1) * 0.5;
        p = add(hip, rot(sub(p, hip), -w * clamp(flexNear, -40, 110)));
      }
      return p;
    };
  }

  function SideFigure(parent, opts) {
    const B = SA.body.side, roles = makeRoles(opts.muscles), prefix = opts.prefix;
    const root = el('g', {class: 'figure side' + (opts.ghost ? ' ghost' : '')}, parent);
    const parts = {}, anchors = [];
    const hands = opts.hands || {};
    const addRigid = (key, defName, side, cls) => {
      const def = B.parts[defName];
      const p = rigidPart(root, def, def, side, roles, prefix, cls + ' ' + side);
      p.anchors.forEach(a => anchors.push(Object.assign(a, {part: key})));
      parts[key] = p;
    };
    const torso = {g: null};
    for (const slot of B.order) {
      const [kind, side] = slot.split(':');
      if (kind === 'arm') { addRigid('upper:' + side, 'upper', side, 'upper'); addRigid('fore:' + side, 'fore', side, 'fore'); addRigid('hand:' + side, hands[side] === 'open' ? 'open' : 'fist', side, 'hand'); }
      else if (kind === 'leg') { addRigid('thigh:' + side, 'thigh', side, 'thigh'); addRigid('shank:' + side, 'shank', side, 'shank'); addRigid('foot:' + side, 'foot', side, 'foot'); }
      else if (kind === 'head') addRigid('head', 'head', 'near', 'head');
      else if (kind === 'torso') {
        const g = el('g', {class: 'part torso near'}, root);
        torso.fill = el('path', {class: 'skin'}, g);
        torso.lines = el('g', null, g);
        torso.details = B.torso.details.map(() => el('path', {class: 'detail'}, torso.lines));
        torso.muscles = B.torso.muscles.map(m => {
          const role = roles(m.id, 'near');
          if (!role && m.deep) return null;
          const node = {m, role, pts: outlineOf(m)};
          if (!role) { if ((m.line || 'outline') === 'none') return null; node.line = el('path', {class: 'detail'}, torso.lines); }
          else {
            node.fill = el('path', {class: 'm m-' + role + (m.deep ? ' deep' : ''), fill: role === 'x' ? `url(#${prefix}-hatch)` : null}, g);
            node.fibers = role === 'p' ? [1, 2, 3, 4].map(() => el('path', {class: 'fiber'}, g)) : [];
            node.edge = el('path', {class: 'm-edge m-edge-' + role + (m.deep ? ' deep' : '')}, g);
            anchors.push(node.anchor = {id: m.id, side: 'near', role, part: 'torso'});
          }
          return node;
        }).filter(Boolean);
        torso.edge = el('path', {class: 'edge'}, g);
      }
    }
    function update(j) {
      const L = SA.rig.LEN;
      for (const side of ['near', 'far']) {
        const a = j.arms[side], l = j.legs[side];
        parts['upper:' + side].frame = frame(a.S, a.E, L.upper);
        parts['fore:' + side].frame = frame(a.E, a.W, L.fore);
        parts['hand:' + side].frame = frame(a.W, a.H, L.hand);
        parts['thigh:' + side].frame = frame(l.H, l.K, L.thigh);
        parts['shank:' + side].frame = frame(l.K, l.A, L.shank);
        parts['foot:' + side].frame = frame(l.A, l.sole, L.ankle);
      }
      parts.head.frame = frame(j.headTop, j.headPivot, L.head);
      for (const k in parts) parts[k].g.setAttribute('transform', matrix(parts[k].frame));
      // torso skin follows the spine chain
      const flex = j.legs.near.thighAbs + j.angles.pelvis;
      const map = chainMapper(j, flex), mp = p => { const q = map(p[0], p[1]); return [q.x, q.y, p[2]]; };
      const out = B.torso.outline.map(mp);
      torso.fill.setAttribute('d', smooth(out, true));
      torso.edge.setAttribute('d', B.torso.edges.map(([a, b]) => edgeRange(out, a, b)).join(''));
      B.torso.details.forEach((d, i) => torso.details[i].setAttribute('d', smooth(d.map(mp), false)));
      torso.muscles.forEach(n => {
        const d = smooth(n.pts.map(mp), true);
        if (n.line) n.line.setAttribute('d', inactiveLine(n.m, mp));
        if (n.fill) { n.fill.setAttribute('d', d); n.edge.setAttribute('d', d); }
        if (n.fibers && n.fibers.length) {
          const A = resample(n.m.a.map(mp), 9), Bp = resample(n.m.b.map(mp), 9);
          n.fibers.forEach((f, i) => { const k = (i + 1) / 5; f.setAttribute('d', smooth(A.map((p, q) => lerpV(p, Bp[q], k)), false)); });
        }
        if (n.anchor) { const c = centroid(n.pts); n.anchor.world = map(c.x, c.y); }
      });
      anchors.forEach(a => { if (a.part !== 'torso') a.world = local(parts[a.part].frame, a.local.x, a.local.y); });
      return j;
    }
    return {root, update, anchors, parts};
  }

  /* -------------------------------------------------------- front/back figure */
  function FrontBackFigure(parent, opts) {
    const FB = SA.body.frontBack, isBack = opts.view === 'back', art = isBack ? FB.back : FB.front;
    const trunk = isBack ? FB.backTrunk : FB.frontTrunk, roles = makeRoles(opts.muscles), prefix = opts.prefix;
    const O = FB.SKETCH_ORIGIN, root = el('g', {class: 'figure ' + opts.view + (opts.ghost ? ' ghost' : '')}, parent);
    const parts = {}, anchors = [], hands = opts.hands || {};
    const addRigid = (key, name, side, sideArt) => {
      const def = FB.limb[name];
      const p = rigidPart(root, def, sideArt || {}, side, roles, prefix, name + ' ' + side);
      p.anchors.forEach(a => anchors.push(Object.assign(a, {part: key})));
      parts[key] = p;
    };
    for (const s of ['r', 'l']) { addRigid('thigh:' + s, 'thigh', s, art.thigh); addRigid('shank:' + s, 'shank', s, art.shank); addRigid('foot:' + s, 'foot', s, art.foot); }
    // arm parts in front of a back-view body (or behind a front-view body) are drawn before the trunk
    const behind = new Set(opts.behind || []);
    const addArm = (s, name) => name === 'hand' ? addRigid('hand:' + s, hands[s] === 'open' ? 'open' : 'fist', s, {}) : addRigid(name + ':' + s, name, s, art[name]);
    for (const s of ['r', 'l']) ['upper', 'fore', 'hand'].forEach(n => { if (behind.has(n)) addArm(s, n); });
    // trunk + head share one rigid group in sketch coordinates
    const tg = el('g', {class: 'part torso'}, root);
    const inner = el('g', {transform: `translate(${-O.x} ${-O.y})`}, tg);
    el('path', {d: trunk.fill, class: 'skin'}, inner);
    const lines = el('g', null, inner), fills = el('g', null, inner);
    const mirror = 'translate(320 0) scale(-1 1)';
    const halves = {r: el('g', null, lines), l: el('g', {transform: mirror}, lines)};
    const fillHalves = {r: el('g', null, fills), l: el('g', {transform: mirror}, fills)};
    for (const s of ['r', 'l']) {
      trunk.details.forEach(d => el('path', {d, class: 'detail'}, halves[s]));
      drawMuscles(null, trunk.muscles, s, roles, prefix, {base: halves[s], lines: halves[s], fill: fillHalves[s]})
        .forEach(a => anchors.push(Object.assign(a, {part: 'trunk', mirror: s === 'l'})));
    }
    el('path', {d: trunk.center, class: 'detail'}, inner);
    if (trunk.extra) inner.insertAdjacentHTML('beforeend', trunk.extra);
    const bridges = [];
    for (const s of ['r', 'l']) trunk.bridges.forEach(b => {
      const role = roles(b.id, s), group = s === 'r' ? fills : el('g', {transform: mirror}, fills);
      const node = {b, s, role};
      if (!role) node.line = el('path', {class: 'detail'}, s === 'r' ? lines : halves.l);
      else {
        node.fill = el('path', {class: 'm m-' + role, fill: role === 'x' ? `url(#${prefix}-hatch)` : null}, group);
        node.fibers = role === 'p' ? [1, 2, 3].map(() => el('path', {class: 'fiber'}, group)) : [];
        node.edge = el('path', {class: 'm-edge m-edge-' + role}, group);
        anchors.push(node.anchor = {id: b.id, side: s, role, part: 'trunk'});
      }
      bridges.push(node);
    });
    el('path', {d: trunk.edge, class: 'edge'}, inner);
    // arms after the trunk, head last
    for (const s of ['r', 'l']) ['upper', 'fore', 'hand'].forEach(n => { if (!behind.has(n)) addArm(s, n); });
    const hg = el('g', {class: 'part head'}, root), hinner = el('g', {transform: `translate(${-O.x} ${-O.y})`}, hg);
    el('path', {d: FB.HEAD, class: 'skin edge'}, hinner);
    el('path', {d: FB.EAR, class: 'skin edge'}, hinner);
    el('path', {d: FB.EAR, class: 'skin edge', transform: mirror}, hinner);

    const flipFrame = (A, B, L0, s) => { const f = frame(A, B, L0); if (s === 'l') f.n = V(-f.n.x, -f.n.y); return f; };
    function update(j) {
      const L = SA.rig.LEN;
      for (const s of ['r', 'l']) {
        const a = j.arms[s], g = j.legs[s];
        parts['upper:' + s].frame = flipFrame(a.S, a.E, L.upper, s);
        parts['fore:' + s].frame = flipFrame(a.E, a.W, L.fore, s);
        parts['hand:' + s].frame = flipFrame(a.W, a.H, L.hand, s);
        parts['thigh:' + s].frame = flipFrame(g.H, g.K, L.thigh, s);
        parts['shank:' + s].frame = flipFrame(g.K, g.A, L.shank, s);
        parts['foot:' + s].frame = flipFrame(g.A, g.sole, L.ankle, s);
      }
      for (const k in parts) parts[k].g.setAttribute('transform', matrix(parts[k].frame));
      const lean = U.angleFromDown(V(-j.up.x, -j.up.y)) * -1;
      const tr = `translate(${U.n1(j.pelvis.x)} ${U.n1(j.pelvis.y)}) rotate(${U.n1(-U.angleFromDown(V(-j.up.x, -j.up.y)))})`;
      tg.setAttribute('transform', tr); hg.setAttribute('transform', tr);
      // world → sketch coordinates of the trunk
      const ang = Math.atan2(j.up.x, -j.up.y);
      const toSketch = (w, mirror) => {
        const d = sub(w, j.pelvis), c = Math.cos(-ang), sn = Math.sin(-ang);
        const x = d.x * c - d.y * sn + O.x, y = d.x * sn + d.y * c + O.y;
        return mirror ? [320 - x, y] : [x, y];
      };
      bridges.forEach(n => {
        const f = parts['upper:' + n.s].frame;
        const armPts = n.b.arm.map(p => toSketch(local(f, p[0], p[1]), n.s === 'l'));
        const pts = [...n.b.torso, ...armPts, ...n.b.back];
        const d = smooth(pts, true);
        if (n.line) n.line.setAttribute('d', n.b.line === 'torso' ? smooth(n.b.torso, false) : d);
        if (n.fill) {
          n.fill.setAttribute('d', d); n.edge.setAttribute('d', d);
          n.fibers.forEach((fb, i) => {
            const k = (i + 1) / 4, from = lerpV(V(n.b.torso[0][0], n.b.torso[0][1]), V(n.b.torso[n.b.torso.length - 1][0], n.b.torso[n.b.torso.length - 1][1]), k);
            const to = lerpV(V(armPts[0][0], armPts[0][1]), V(armPts[armPts.length - 1][0], armPts[armPts.length - 1][1]), k);
            fb.setAttribute('d', smooth([from, lerpV(from, to, 0.5), to], false));
          });
          const c = centroid(pts);
          const w = add(j.pelvis, rot(V((n.s === 'l' ? 320 - c.x : c.x) - O.x, c.y - O.y), ang / U.RAD));
          n.anchor.world = w;
        }
      });
      anchors.forEach(a => {
        if (a.part === 'trunk') {
          if (a.local) { const x = a.mirror ? 320 - a.local.x : a.local.x; a.world = add(j.pelvis, rot(V(x - O.x, a.local.y - O.y), ang / U.RAD)); }
        } else a.world = local(parts[a.part].frame, a.local.x, a.local.y);
      });
      return j;
    }
    return {root, update, anchors, parts};
  }

  SA.Figure = (parent, opts) => opts.view === 'side' ? SideFigure(parent, opts) : FrontBackFigure(parent, opts);
  SA.figureUtil = {makeRoles, outlineOf, fibersOf, edgeRange, centroid, inactiveLine};
})(typeof window !== 'undefined' ? window : globalThis);
