/* Steady anatomy engine · core math and path helpers. Offline, no dependencies. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy = root.SteadyAnatomy || {};
  const RAD = Math.PI / 180;

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const clamp01 = n => Number.isFinite(n) ? clamp(n, 0, 1) : 0;
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => (1 - Math.cos(Math.PI * clamp01(t))) / 2;
  const V = (x, y) => ({x, y});
  const add = (a, b) => V(a.x + b.x, a.y + b.y);
  const sub = (a, b) => V(a.x - b.x, a.y - b.y);
  const mul = (a, k) => V(a.x * k, a.y * k);
  const len = a => Math.hypot(a.x, a.y);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const unit = a => { const l = len(a) || 1; return V(a.x / l, a.y / l); };
  const lerpV = (a, b, t) => V(mix(a.x, b.x, t), mix(a.y, b.y, t));
  /** Direction for an angle measured from straight down, positive toward +x. */
  const fromDown = deg => V(Math.sin(deg * RAD), Math.cos(deg * RAD));
  /** Direction for an angle measured from straight up, positive toward +x. */
  const fromUp = deg => V(Math.sin(deg * RAD), -Math.cos(deg * RAD));
  const angleFromDown = d => Math.atan2(d.x, d.y) / RAD;
  const rot = (a, deg) => { const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD); return V(a.x * c - a.y * s, a.x * s + a.y * c); };
  const n1 = v => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? '0' : String(r); };
  const pt = p => n1(p.x) + ',' + n1(p.y);

  /** Frame of a rigid part: origin A, axis u (A→B), normal n (u rotated -90°, i.e. "front" when u points down). */
  function frame(A, B, L0) {
    const d = sub(B, A), L = len(d) || 1e-6, u = V(d.x / L, d.y / L);
    return {A, B, u, n: V(u.y, -u.x), L, k: L0 ? L / L0 : 1};
  }
  /** Local (x = offset along normal, y = distance along axis at canonical length) to world. */
  const local = (f, x, y) => V(f.A.x + f.u.x * y * f.k + f.n.x * x, f.A.y + f.u.y * y * f.k + f.n.y * x);
  /** SVG matrix string for a rigid part frame: local x→n, local y→u·k. */
  const matrix = f => `matrix(${[f.n.x, f.n.y, f.u.x * f.k, f.u.y * f.k, f.A.x, f.A.y].map(v => +v.toFixed(4)).join(' ')})`;

  /**
   * Smooth path through points with Catmull-Rom tangents.
   * A point may be [x, y] or [x, y, 1] where the third value marks a sharp corner.
   */
  function smooth(points, closed, tension) {
    const t = tension == null ? 1 : tension;
    const P = points.map(p => Array.isArray(p) ? {x: p[0], y: p[1], c: !!p[2]} : {x: p.x, y: p.y, c: !!p.c});
    const n = P.length;
    if (n < 2) return '';
    const get = i => closed ? P[(i + n) % n] : P[clamp(i, 0, n - 1)];
    let d = 'M' + pt(P[0]);
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const k1 = p1.c ? 0 : t / 6, k2 = p2.c ? 0 : t / 6;
      const c1 = V(p1.x + (p2.x - p0.x) * k1, p1.y + (p2.y - p0.y) * k1);
      const c2 = V(p2.x - (p3.x - p1.x) * k2, p2.y - (p3.y - p1.y) * k2);
      d += 'C' + pt(c1) + ' ' + pt(c2) + ' ' + pt(p2);
    }
    return closed ? d + 'Z' : d;
  }

  /** Resample a polyline to n evenly spaced points (by arc length). */
  function resample(points, n) {
    const P = points.map(p => Array.isArray(p) ? V(p[0], p[1]) : p);
    const acc = [0];
    for (let i = 1; i < P.length; i++) acc.push(acc[i - 1] + dist(P[i - 1], P[i]));
    const total = acc[acc.length - 1] || 1, out = [];
    for (let k = 0; k < n; k++) {
      const target = total * k / (n - 1);
      let i = 1; while (i < acc.length - 1 && acc[i] < target) i++;
      const seg = acc[i] - acc[i - 1] || 1, t = (target - acc[i - 1]) / seg;
      out.push(lerpV(P[i - 1], P[i], clamp01(t)));
    }
    return out;
  }

  /** Two-bone IK. Returns the middle joint. bend = +1/-1 picks the side of the A→C line. */
  function solve2(A, C, l1, l2, bend) {
    const d = sub(C, A), D = clamp(len(d), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3), u = unit(d);
    const a = (l1 * l1 - l2 * l2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const n = V(-u.y * bend, u.x * bend);
    return {mid: V(A.x + u.x * a + n.x * h, A.y + u.y * a + n.y * h), end: V(A.x + u.x * D, A.y + u.y * D), reach: len(d) <= l1 + l2};
  }

  /** Piecewise-linear lookup in [[t, v], ...]. */
  function lookup(table, t) {
    if (t <= table[0][0]) return table[0][1];
    for (let i = 1; i < table.length; i++) if (t <= table[i][0]) {
      const [t0, v0] = table[i - 1], [t1, v1] = table[i];
      return mix(v0, v1, (t - t0) / ((t1 - t0) || 1));
    }
    return table[table.length - 1][1];
  }

  const NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    const node = root.document.createElementNS(NS, name);
    if (attrs) for (const k in attrs) if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  SA.util = {RAD, clamp, clamp01, mix, ease, V, add, sub, mul, len, dist, unit, lerpV, fromDown, fromUp, angleFromDown,
    rot, n1, pt, frame, local, matrix, smooth, resample, solve2, lookup, el, esc, NS};
})(typeof window !== 'undefined' ? window : globalThis);

/* Skeleton for three fixed views. World units ≈ 2.05 per cm, ground at y = 0, y grows downward. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy;
  const U = SA.util, {V, add, sub, mul, fromDown, fromUp, mix, solve2, dist} = U;

  /** Canonical segment lengths shared by every view so lessons keep one body. */
  const LEN = {thigh: 87, shank: 88, ankle: 14, upper: 64, fore: 50, hand: 9,
    pelvis: 22, lumbar: 39, thorax: 52, neck: 18, head: 32};
  const SHOULDER_ON_THORAX = 0.56; // fraction of the thorax from its base

  /* ------------------------------------------------------------------ side */
  /**
   * Pose angles in degrees. Side view faces +x; "near" limbs face the viewer.
   * pelvis/lumbar/thorax/neck/head: forward lean (+). sh: shoulder flexion from hanging (+ forward, − behind).
   * el: elbow flexion. hip: hip flexion relative to pelvis. knee: knee flexion. ankle: plantarflexion (+) / dorsiflexion (−);
   * leave ankle unset to keep the sole flat on level ground.
   */
  const SIDE_DEFAULT = {x: 0, y: -189, pelvis: 0, lumbar: 0, thorax: 0, neck: 0, head: 0, scapE: 0, scapP: 0,
    arms: {near: {sh: 4, el: 8, wr: 0}, far: {sh: 4, el: 8, wr: 0}},
    legs: {near: {hip: 0, knee: 0}, far: {hip: 0, knee: 0}}};

  function sideJoints(p) {
    const hip = V(p.x, p.y);
    const a0 = p.pelvis, a1 = a0 + p.lumbar, a2 = a1 + p.thorax, a3 = a2 + 14 + p.neck, a4 = a3 + p.head;
    const N0 = add(hip, add(mul(fromUp(a0), 6), mul(fromUp(a0 + 90), -4)));
    const N1 = add(N0, mul(fromUp(a0), LEN.pelvis));
    const N2 = add(N1, mul(fromUp(a1), LEN.lumbar));
    const N3 = add(N2, mul(fromUp(a2), LEN.thorax));
    const N4 = add(N3, mul(fromUp(a3), LEN.neck));
    const top = add(N4, mul(fromUp(a4), LEN.head));
    const thoraxUp = fromUp(a2), thoraxFront = fromUp(a2 + 90);
    const S = add(N2, add(mul(thoraxUp, LEN.thorax * SHOULDER_ON_THORAX + (p.scapE || 0)), mul(thoraxFront, 4 + (p.scapP || 0))));
    const j = {hip, N: [N0, N1, N2, N3, N4], headTop: top, headPivot: N4, shoulder: S,
      angles: {pelvis: a0, lumbar: a1, thorax: a2, neck: a3, head: a4}, arms: {}, legs: {}};
    for (const side of ['near', 'far']) {
      const arm = p.arms[side], leg = p.legs[side];
      const upperAbs = arm.sh - a2, foreAbs = upperAbs + arm.el, handAbs = foreAbs + (arm.wr || 0);
      const f = arm.f == null ? 1 : arm.f, ff = arm.ff == null ? 1 : arm.ff; // foreshortening when a limb points at the viewer
      const E = add(S, mul(fromDown(upperAbs), LEN.upper * f));
      const W = add(E, mul(fromDown(foreAbs), LEN.fore * ff));
      const Hc = add(W, mul(fromDown(handAbs), LEN.hand * ff));
      j.arms[side] = {S, E, W, H: Hc, upperAbs, foreAbs, handAbs};
      // ankle left undefined keeps the sole level on the ground (standing work with bent knees)
      const thighAbs = leg.hip - a0, shankAbs = thighAbs - leg.knee, footAbs = leg.ankle == null ? 0 : shankAbs - leg.ankle;
      const K = add(hip, mul(fromDown(thighAbs), LEN.thigh));
      const A = add(K, mul(fromDown(shankAbs), LEN.shank));
      const sole = add(A, mul(fromDown(footAbs), LEN.ankle));
      j.legs[side] = {H: hip, K, A, sole, thighAbs, shankAbs, footAbs,
        heel: add(sole, mul(fromDown(footAbs + 90), -12)), toe: add(sole, mul(fromDown(footAbs + 90), 40))};
    }
    return j;
  }

  /* ----------------------------------------------------------- front / back */
  /** Front and back share a frontal-plane rig. "r" is the limb on screen right. */
  const FRONT_DEFAULT = {x: 0, y: -189, lean: 0, scapE: {r: 0, l: 0},
    arms: {r: {abd: 10, el: 0, f: 1, ff: 1}, l: {abd: 10, el: 0, f: 1, ff: 1}},
    legs: {r: {abd: 0, knee: 0, f: 1, fs: 1}, l: {abd: 0, knee: 0, f: 1, fs: 1}}};
  const HIP_HALF = 19, SHOULDER_HALF = 40, SHOULDER_ABOVE_HIP = 96;

  function frontJoints(p) {
    const pelvis = V(p.x, p.y), up = fromUp(p.lean || 0), side = fromUp((p.lean || 0) + 90);
    const neck = add(pelvis, mul(up, SHOULDER_ABOVE_HIP + 12));
    const j = {pelvis, up, side, neck, headPivot: add(pelvis, mul(up, 140)), headTop: add(pelvis, mul(up, 173)), arms: {}, legs: {}};
    for (const s of ['r', 'l']) {
      const sign = s === 'r' ? 1 : -1, arm = p.arms[s], leg = p.legs[s];
      const S = add(add(pelvis, mul(up, SHOULDER_ABOVE_HIP + ((p.scapE && p.scapE[s]) || 0))), mul(side, sign * SHOULDER_HALF));
      const upperAbs = sign * arm.abd + (p.lean || 0), foreAbs = upperAbs + sign * (arm.el || 0);
      const E = add(S, mul(fromDown(upperAbs), LEN.upper * (arm.f == null ? 1 : arm.f)));
      const W = add(E, mul(fromDown(foreAbs), LEN.fore * (arm.ff == null ? 1 : arm.ff)));
      const Hc = add(W, mul(fromDown(foreAbs), LEN.hand * (arm.ff == null ? 1 : arm.ff)));
      j.arms[s] = {S, E, W, H: Hc, upperAbs, foreAbs, sign};
      const Hj = add(pelvis, mul(V(1, 0), sign * HIP_HALF));
      const thighAbs = sign * (leg.abd || 0), shankAbs = thighAbs - sign * (leg.knee || 0);
      const K = add(Hj, mul(fromDown(thighAbs), LEN.thigh * (leg.f == null ? 1 : leg.f)));
      const A = add(K, mul(fromDown(shankAbs), LEN.shank * (leg.fs == null ? 1 : leg.fs)));
      j.legs[s] = {H: Hj, K, A, sole: add(A, mul(fromDown(shankAbs), LEN.ankle)), thighAbs, shankAbs, sign};
    }
    return j;
  }

  /* -------------------------------------------------------------- posing */
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const clone = value => Array.isArray(value) ? value.map(clone) : isObj(value) ?
    Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clone(child)])) : value;
  function merge(base, over) {
    if (!isObj(over)) return clone(over === undefined ? base : over);
    // Unchanged nested defaults must also belong to the resulting pose. IK and
    // contact adapters adjust limbs after merge; shallow copies leak across lessons.
    const out = isObj(base) ? clone(base) : {};
    for (const k in over) out[k] = merge(out[k], over[k]);
    return out;
  }
  /** Interpolate every numeric leaf; non-numeric leaves switch at the midpoint. */
  function blend(a, b, t) {
    if (typeof a === 'number' && typeof b === 'number') return mix(a, b, t);
    if (isObj(a) && isObj(b)) {
      const out = {};
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = k in a && k in b ? blend(a[k], b[k], t) : clone(k in a ? a[k] : b[k]);
      return out;
    }
    return clone(t < 0.5 ? a : b);
  }

  /**
   * Inverse kinematics for contacts. Targets are world points:
   * side: {hand: {near: {x,y,bend}}, ankle: {near: {x,y,bend}}}
   * front: {hand: {r: {...}}, ankle: {r: {...}}}
   */
  function applyIK(view, pose, ik) {
    const p = merge(pose, {});
    if (!ik) return p;
    if (view === 'side') {
      let j = sideJoints(p);
      for (const side in (ik.hand || {})) {
        const t = ik.hand[side]; if (!t) continue;
        const arm = p.arms[side], f = arm.f == null ? 1 : arm.f, ff = arm.ff == null ? 1 : arm.ff;
        const r = solve2(j.shoulder, V(t.x, t.y), LEN.upper * f, (LEN.fore + LEN.hand) * ff, t.bend == null ? 1 : t.bend);
        const upperAbs = U.angleFromDown(sub(r.mid, j.shoulder)), foreAbs = U.angleFromDown(sub(r.end, r.mid));
        p.arms[side] = Object.assign({}, p.arms[side], {sh: upperAbs + j.angles.thorax, el: foreAbs - upperAbs, wr: t.wr == null ? (p.arms[side].wr || 0) : t.wr});
      }
      for (const side in (ik.ankle || {})) {
        const t = ik.ankle[side]; if (!t) continue;
        const r = solve2(j.hip, V(t.x, t.y), LEN.thigh, LEN.shank, t.bend == null ? -1 : t.bend);
        const thighAbs = U.angleFromDown(sub(r.mid, j.hip)), shankAbs = U.angleFromDown(sub(r.end, r.mid));
        // foot = absolute angle of the ankle-to-sole axis; 0 keeps the sole flat on level ground
        p.legs[side] = Object.assign({}, p.legs[side], {hip: thighAbs + j.angles.pelvis, knee: thighAbs - shankAbs,
          ankle: shankAbs - (t.foot || 0)});
      }
      return p;
    }
    let j = frontJoints(p);
    for (const s in (ik.hand || {})) {
      const t = ik.hand[s]; if (!t) continue;
      const arm = j.arms[s], f = p.arms[s].f == null ? 1 : p.arms[s].f, ff = p.arms[s].ff == null ? 1 : p.arms[s].ff;
      const r = solve2(arm.S, V(t.x, t.y), LEN.upper * f, (LEN.fore + LEN.hand) * ff, (t.bend == null ? 1 : t.bend) * arm.sign);
      const upperAbs = U.angleFromDown(sub(r.mid, arm.S)), foreAbs = U.angleFromDown(sub(r.end, r.mid));
      p.arms[s] = Object.assign({}, p.arms[s], {abd: arm.sign * (upperAbs - (p.lean || 0)), el: arm.sign * (foreAbs - upperAbs)});
    }
    return p;
  }

  SA.rig = {LEN, SIDE_DEFAULT, FRONT_DEFAULT, sideJoints, frontJoints, merge, blend, applyIK,
    joints: (view, pose) => view === 'side' ? sideJoints(pose) : frontJoints(pose),
    defaults: view => clone(view === 'side' ? SIDE_DEFAULT : FRONT_DEFAULT), dist};
})(typeof window !== 'undefined' ? window : globalThis);

/* Side-view anatomical body (faces +x). Rigid parts use local x = front, y = along the bone. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy;
  SA.body = SA.body || {};

  /* Chain coordinates for the torso: s = distance along the trunk from just above the hip joint
     (pelvis 0–22, lumbar 22–61, thorax 61–113, neck 113–131), off = front (+) / back (−). */
  const TORSO_S = [0, 22, 61, 113, 131];
  const torso = {
    outline: [
      [-30, -6], [-24, -12.5], [-16, -21], [-5, -26], [6, -27], [16, -24], [24, -20.5], [32, -18.5], [42, -18.5],
      [52, -20], [63, -23], [78, -25.5], [92, -24.5], [103, -19], [113, -13], [121, -10.5], [129, -9.5], [140, -9],
      [140, 8], [130, 8], [121, 9], [113, 12], [106, 18.5], [98, 24.5], [90, 27.5], [82, 27.5], [75, 25],
      [68, 22], [58, 21], [46, 21.5], [34, 22.5], [24, 22], [14, 20.5], [5, 18], [-3, 15], [-9, 12],
      [-16, 6], [-26, 1]],
    edges: [[0, 17], [18, 35]],
    details: [
      [[30, 13.5], [30, 21.5]], [[42, 13], [42, 21.5]], [[54, 12.5], [54, 21]],          // tendinous intersections
      [[70, 13], [76, 9], [80, 2]], [[74, 15], [80, 12], [85, 6]],                        // serratus slips
      [[110, 6], [118, 2], [126, -2]],                                                    // sternocleidomastoid
      [[106, 15], [100, 8], [94, 5]]                                                      // clavicle
    ],
    muscles: [
      {id: 'glute.max', line: 'a', a: [[18, -24], [6, -17], [-8, -9], [-18, -3]], b: [[8, -26.5], [-5, -25.5], [-17, -20], [-27, -9]]},
      {id: 'glute.med', line: 'none', a: [[27, -19], [15, -15], [3, -6]], b: [[27, -3], [15, -1], [3, -3]]},
      {id: 'tfl', line: 'none', a: [[19, 16], [9, 12], [-2, 8]], b: [[17, 7], [7, 5], [-3, 3]]},
      {id: 'erectors', line: 'none', a: [[8, -21], [22, -17.5], [36, -15.5], [52, -17], [68, -21.5]], b: [[8, -14], [22, -11], [36, -9.5], [52, -11], [68, -15]]},
      {id: 'obliques', line: 'b', a: [[72, 6], [60, 9], [46, 11], [32, 12.5], [20, 10.5], [12, 6]], b: [[72, -5], [60, -8], [46, -9.5], [32, -8.5], [22, -5], [13, -1]]},
      {id: 'abs', line: 'b', a: [[4, 15.5], [16, 19.5], [28, 21], [42, 20.8], [56, 20], [67, 20.5]], b: [[5, 9.5], [16, 12.5], [28, 13.5], [42, 13], [56, 12.5], [67, 13]]},
      {id: 'serratus', line: 'none', a: [[84, 9], [77, 13], [69, 13]], b: [[84, 0], [76, -1], [68, 3]]},
      {id: 'lats', line: 'a', a: [[38, -15.5], [52, -13], [66, -9], [80, -5], [91, -3]], b: [[38, -18], [52, -20], [66, -23], [80, -25], [92, -17]]},
      {id: 'trap.lower', line: 'none', a: [[64, -21], [74, -20], [84, -20]], b: [[64, -23.5], [74, -25.5], [84, -26]]},
      {id: 'trap.mid', line: 'none', a: [[84, -20], [92, -19], [100, -18]], b: [[84, -26], [92, -25.5], [100, -22]]},
      {id: 'trap.upper', line: 'a', a: [[132, -8.5], [120, -6.5], [108, -6], [97, -4]], b: [[132, -9.3], [121, -10.5], [110, -16], [99, -18.5]]},
      {id: 'rhomboid', deep: true, a: [[104, -17], [94, -15], [84, -14]], b: [[104, -12], [94, -10], [84, -9]]},
      {id: 'iliopsoas', deep: true, a: [[36, 4], [22, 7], [8, 9], [-6, 8]], b: [[36, -5], [22, -2], [8, 1], [-6, 2]]},
      {id: 'pec.lower', line: 'a', a: [[75, 24.5], [80, 17], [85, 9]], b: [[97, 25], [92, 17], [88, 8]], close: [[90, 27.5], [82, 27.5]]},
      {id: 'pec.upper', line: 'none', a: [[97, 25], [92, 17], [88, 8]], b: [[106, 18.5], [98, 11], [90, 6]], close: [[102, 22]]}
    ]
  };

  const parts = {
    thigh: {L: 87, outline: [[4, -15], [13, -9], [16.5, 6], [18.5, 30], [17, 55], [13.5, 74], [12, 84], [11, 92], [2, 96],
      [-9, 93], [-11, 86], [-12.5, 76], [-15, 58], [-19, 32], [-21, 14], [-20.5, -4], [-11, -15]],
      edges: [[2, 9], [9, 14]],
      details: [[[-3, 8], [-2, 40], [-1, 80]], [[13, 84], [9, 88], [5, 92]]],
      muscles: [
        {id: 'quads.vl', line: 'b', a: [[5, 2], [7, 26], [7, 52], [6, 80]], b: [[-10, 6], [-12.5, 28], [-11, 54], [-2, 84]]},
        {id: 'quads.rf', line: 'b', a: [[14, -6], [17.5, 20], [16, 50], [11.5, 80]], b: [[6, -4], [8.5, 22], [8.5, 52], [6.5, 80]]},
        {id: 'quads.vm', line: 'b', a: [[13, 60], [13.8, 72], [12.2, 83]], b: [[8, 62], [7, 72], [7.5, 83]]},
        {id: 'hamstrings', line: 'none', a: [[-11, 8], [-13, 28], [-11.5, 54], [-7.5, 84]], b: [[-20.5, 10], [-19.5, 32], [-15.5, 56], [-11, 84]]},
        {id: 'adductors', deep: true, a: [[3, 0], [3, 30], [3, 52]], b: [[-8, 2], [-7, 32], [-6, 52]]}
      ]},
    shank: {L: 88, outline: [[10, -6], [9.5, 6], [8, 30], [6.5, 60], [5.5, 80], [5.5, 90], [-1, 93], [-7, 90], [-7, 82],
      [-9, 66], [-14, 46], [-17, 24], [-15, 6], [-11, -8], [0, -12]],
      edges: [[1, 5], [7, 13]],
      details: [[[-5, 50], [-4, 70], [-5, 86]]],
      muscles: [
        {id: 'tibialis', line: 'b', a: [[8.5, 4], [7.5, 30], [5.5, 62]], b: [[3, 4], [2.8, 32], [3, 64]]},
        {id: 'soleus', line: 'a', a: [[-4, 28], [-4.5, 50], [-5, 72]], b: [[-11.5, 34], [-10.5, 56], [-7, 78]]},
        {id: 'gastrocnemius', line: 'a', a: [[-5, -5], [-9, 12], [-10, 30], [-6, 50]], b: [[-11, -6], [-16.5, 12], [-15.5, 32], [-9.5, 54]]}
      ]},
    foot: {L: 14, outline: [[7, -6], [13, 1], [24, 5.5], [35, 8], [40.5, 10.5, 1], [41, 14], [34, 15], [20, 15], [4, 15],
      [-8, 15], [-12, 12], [-12.5, 6], [-9, -1], [-6, -7]],
      edges: [[0, 13]],
      details: [[[34, 8.5], [34, 14.5]], [[29, 7.5], [29.5, 14.5]]],
      extra: '<circle cx="-1" cy="0" r="2.6" class="detail"/>', muscles: []},
    upper: {L: 64, outline: [[2, -11], [10, -6], [12.5, 12], [13, 30], [11, 48], [8.5, 60], [7, 67], [2, 71], [-6, 70],
      [-9, 64], [-12, 46], [-14, 26], [-13, 8], [-10, -6]],
      edges: [[1, 6], [8, 12]],
      details: [],
      muscles: [
        {id: 'triceps.long', line: 'a', a: [[-8.5, 6], [-10.5, 26], [-9.5, 46], [-7.5, 60]], b: [[-12.5, 6], [-14, 26], [-12, 46], [-9, 62]]},
        {id: 'triceps.lat', line: 'none', a: [[-3, 22], [-3.5, 36], [-4, 50]], b: [[-8.5, 18], [-11, 32], [-9.8, 50]]},
        {id: 'brachialis', line: 'none', a: [[3, 40], [3.8, 52], [3.5, 63]], b: [[-3, 42], [-3.5, 54], [-1.5, 64]]},
        {id: 'biceps', line: 'b', a: [[9, 14], [12, 30], [11, 46], [7, 61]], b: [[3, 16], [4, 30], [4, 46], [3, 61]]},
        {id: 'deltoid.post', a: [[-13, -5], [-15, 4], [-10.5, 19], [-0.5, 34, 1]], b: [[-5, -13.5], [-5.5, 0], [-2, 18], [0.5, 34, 1]], close: [[-10, -11]]},
        {id: 'deltoid.lat', a: [[-5, -13.5], [-5.5, 0], [-2, 18], [0.5, 34, 1]], b: [[3, -13.5], [5, 0], [3.5, 18], [1, 34, 1]], close: [[-1, -14.8]]},
        {id: 'deltoid.ant', a: [[3, -13.5], [5, 0], [3.5, 18], [1, 34, 1]], b: [[12.5, -5], [14.8, 4], [11.5, 19], [2, 34, 1]], close: [[9, -11]]}
      ]},
    fore: {L: 50, outline: [[8, -6], [11, 5], [10, 17], [7, 34], [5, 48], [4.5, 52], [-4.5, 52], [-5, 48], [-6.5, 36],
      [-9, 20], [-10, 6], [-8.5, -6], [0, -10]],
      edges: [[0, 5], [6, 11]],
      details: [],
      muscles: [
        {id: 'forearm.ext', line: 'none', a: [[3, 0], [2, 20], [1, 42]], b: [[-8, 2], [-8, 20], [-5, 42]]},
        {id: 'brachioradialis', line: 'b', a: [[10, -6], [11, 5], [9.8, 17], [6.5, 34]], b: [[4, -4], [5, 6], [4, 18], [3.5, 34]]}
      ]},
    fist: {L: 9, outline: [[-5, -1], [5, -1], [8, 4], [9, 10], [7, 15], [3, 18], [-3, 18], [-7, 14], [-7, 6]],
      edges: [[0, 8]], details: [[[-7, 8], [-2, 8]], [[-6.5, 12.5], [-2, 12.5]], [[8, 4], [4, 9], [8.5, 11]]], muscles: []},
    open: {L: 9, outline: [[-5, -1], [5, -1], [7.5, 6], [6, 12], [4.5, 22], [1.5, 25], [-3, 24], [-5, 16], [-6, 8]],
      edges: [[0, 8]], details: [[[6, 12], [3, 9]]], muscles: []},
    head: {L: 32, outline: [[-3, 0], [7, 1.5], [13, 7], [15.5, 13], [15.5, 17.5], [16.5, 20.5], [19.5, 26.5, 1], [16, 28.5], [16.8, 31.5],
      [15.8, 33.2], [16.4, 35.2], [14.8, 39.5], [12, 43.5], [5, 44.5], [-1, 42], [-5, 37], [-11, 34], [-16.5, 26], [-18, 15], [-14, 5], [-9, 1]],
      edges: [[0, 20]],
      details: [[[-3, 20], [-7.5, 18.5], [-9.5, 24], [-7.5, 30], [-4, 29]], [[12, 43.5], [3, 40], [-2, 34]], [[11, 18.5], [13.5, 18]]],
      muscles: []}
  };

  SA.body.side = {torso, TORSO_S, parts,
    // The head is drawn last: the near arm passes beside the ear (overhead, hands behind the
    // head, reaching past the face) and must never hide the face.
    order: ['arm:far', 'leg:far', 'torso', 'leg:near', 'arm:near', 'head']};
})(typeof window !== 'undefined' ? window : globalThis);

/* Front and back anatomical bodies. The trunk is authored in the approved sketch's coordinates
   (centre x 160, hip joints at y 191) and moved rigidly with the pelvis. Limbs are drawn for the
   screen-right side (local x = lateral) and mirrored for the other side. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy;
  SA.body = SA.body || {};

  const mx = x => +(320 - x).toFixed(2);
  /** Closed path from a right-half outline that starts and ends on the centre line. */
  function mirrored(start, segs) {
    let d = `M${start[0]},${start[1]}`;
    segs.forEach(s => { d += `C${s[0]},${s[1]} ${s[2]},${s[3]} ${s[4]},${s[5]}`; });
    const pts = [start, ...segs.map(s => [s[4], s[5]])];
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i], prev = pts[i];
      d += `C${mx(s[2])},${s[3]} ${mx(s[0])},${s[1]} ${mx(prev[0])},${prev[1]}`;
    }
    return d + 'Z';
  }
  /** Open path for one side of the silhouette (and its mirror). */
  function sideEdge(start, segs, from, to) {
    const pts = [start, ...segs.map(s => [s[4], s[5]])];
    let d = `M${pts[from][0]},${pts[from][1]}`, m = `M${mx(pts[from][0])},${pts[from][1]}`;
    for (let i = from; i < to; i++) {
      const s = segs[i];
      d += `C${s[0]},${s[1]} ${s[2]},${s[3]} ${s[4]},${s[5]}`;
      m += `C${mx(s[0])},${s[1]} ${mx(s[2])},${s[3]} ${mx(s[4])},${s[5]}`;
    }
    return d + m;
  }

  const TRUNK_START = [160, 60];
  const TRUNK_FRONT = [[165, 60, 170, 61, 171, 64], [172, 69, 172, 73, 174, 77], [182, 81, 193, 83, 201, 88],
    [204, 96, 200, 110, 198, 120], [197, 136, 193, 152, 191, 168], [190, 180, 197, 190, 199, 204],
    [199, 210, 190, 216, 176, 218], [170, 219, 164, 218, 161, 216], [160.7, 216, 160.3, 216, 160, 216]];
  const TRUNK_BACK = [[165, 60, 170, 61, 171, 64], [172, 70, 173, 75, 176, 78], [184, 82, 194, 84, 201, 88],
    [204, 96, 200, 110, 198, 120], [197, 136, 193, 152, 191, 168], [190, 180, 197, 190, 199, 204],
    [200, 214, 196, 226, 182, 229], [172, 231, 165, 228, 161, 224], [160.7, 224, 160.3, 224, 160, 224]];
  const HEAD = mirrored([160, 18], [[171, 18, 178, 27, 178, 38], [178, 48, 175, 55, 170, 60], [167, 63, 163, 65, 160, 65]]);
  const EAR = 'M177,38C181,36 183,44 178,49';

  const frontTrunk = {
    fill: mirrored(TRUNK_START, TRUNK_FRONT),
    edge: sideEdge(TRUNK_START, TRUNK_FRONT, 1, 6),
    details: [
      'M171,58C168,66 166,73 163,80', 'M164,82C175,80 187,83 197,88',
      'M191,128C188,130 186,133 185,137', 'M192,138C189,140 187,143 186,147', 'M191,148C189,150 187,153 186,156',
      'M172,137C176,152 176,176 172,196C170,202 166,208 162,212',
      'M161,151C165,152 170,151 174,149', 'M161,166C165,167 170,166 175,165', 'M161,181C165,182 169,181 174,180',
      'M187,141C189,156 189,170 188,182', 'M191,187C186,197 176,206 166,214'],
    center: 'M160,86L160,130M160,136L160,206',
    extra: '<ellipse class="detail" cx="160" cy="190" rx="1.6" ry="2.4"/>',
    muscles: [
      {id: 'abs', line: 'none', a: [[160.7, 135], [160.7, 160], [160.7, 185], [160.7, 210]], b: [[171.5, 137], [175.6, 158], [175, 184], [166, 208]]},
      {id: 'obliques', line: 'none', a: [[187.5, 141], [189, 160], [188, 182], [182, 198]], b: [[176.5, 141], [177, 160], [176, 182], [170, 206]]},
      {id: 'serratus', line: 'none', a: [[192, 124], [192, 138], [190, 152]], b: [[186, 126], [184.5, 138], [186, 150]]},
      {id: 'trap.upper', line: 'none', a: [[171, 64], [174, 76], [184, 81.5], [199, 87]], b: [[167, 72], [171, 80], [184, 84], [196, 88.5]]},
      {id: 'glute.med', line: 'none', a: [[195, 188], [198.5, 198], [199, 206]], b: [[189, 191], [191, 201], [192, 211]]}
    ],
    /* Pectorals reach the humerus; their lateral points come from the arm each frame. */
    bridges: [
      {id: 'pec.upper', torso: [[161, 105], [161, 86], [172, 86], [186, 88], [194, 92]], arm: [[-7, 12], [-7, 18]], back: [[178, 101]]},
      {id: 'pec.lower', torso: [[161, 129], [161, 105], [178, 101]], arm: [[-7, 18], [-6, 22]], back: [[196, 126], [184, 133], [172, 135]]}
    ]
  };

  const backTrunk = {
    fill: mirrored(TRUNK_START, TRUNK_BACK),
    edge: sideEdge(TRUNK_START, TRUNK_BACK, 1, 6),
    details: ['M161,224C168,230 178,231 188,224', 'M171,58C170,66 170,72 172,78'],
    center: 'M160,64L160,208',
    extra: '',
    muscles: [
      {id: 'erectors', line: 'b', a: [[162, 140], [163, 168], [163, 200]], b: [[172, 140], [173.5, 170], [170, 202]]},
      {id: 'glute.max', line: 'b', a: [[161.5, 200], [162, 214], [164, 226]], b: [[190, 199], [196, 213], [184, 227]]},
      {id: 'glute.med', line: 'none', a: [[188, 187], [197, 196], [199.5, 206]], b: [[176, 190], [184, 199], [191, 208]]},
      {id: 'teres', line: 'b', a: [[184, 112], [190, 118], [195, 123]], b: [[180, 120], [186, 126], [192, 129]]},
      {id: 'infraspinatus', line: 'none', a: [[170, 104], [180, 106], [192, 108]], b: [[172, 122], [180, 120], [187, 116]]},
      {id: 'rhomboid', deep: true, a: [[162, 94], [162, 108], [163, 124]], b: [[175, 102], [175, 112], [174, 126]]},
      {id: 'trap.lower', line: 'b', a: [[161, 166], [162, 142], [164, 120]], b: [[161, 166], [168, 140], [180, 108]]},
      {id: 'trap.mid', line: 'b', a: [[161, 90], [161, 100], [161, 116]], b: [[184, 96], [184, 102], [180, 108]]},
      {id: 'trap.upper', line: 'b', a: [[163, 62], [165, 72], [161, 88]], b: [[171, 64], [184, 82], [199, 88]], close: [[188, 92], [174, 92]]}
    ],
    bridges: [
      {id: 'lats', line: 'torso', torso: [[164, 132], [162, 150], [164, 178], [176, 192], [190, 180], [194, 152], [196, 126]], arm: [[-8, 16], [-6, 24]], back: [[184, 120], [172, 126]]}
    ]
  };

  const limb = {
    upper: {L: 64, outline: [[-13, -4], [-13, 12], [-12.6, 30], [-11, 48], [-9, 64], [0, 67], [9, 64], [11.5, 46], [13, 28], [13, 16], [11, 2], [5, -7], [-5, -9]],
      edges: [[0, 4], [6, 9]]},
    fore: {L: 50, outline: [[-9, -6], [-10.3, 6], [-9.5, 18], [-7.5, 30], [-6, 40], [-5, 50], [0, 51.5], [5, 50], [6, 40], [9, 24], [10.8, 10], [9.4, -2], [0, -9]],
      edges: [[0, 5], [7, 11]]},
    fist: {L: 9, outline: [[-6.5, -3], [-8.5, 3], [-8, 9], [-5.5, 13], [-1.5, 15.5], [4, 15.5], [7, 12], [9, 7], [8.5, 1], [6.5, -3]],
      edges: [[0, 9]], details: [[[-5, 1], [-2, -1], [3, 0], [6, 3]]]},
    open: {L: 9, outline: [[-6, -3], [6, -3], [8, 6], [7, 16], [4, 22], [-1, 23], [-5, 19], [-7, 10]], edges: [[0, 7]],
      details: [[[-2, 10], [-2, 21]], [[2, 10], [2, 21.5]]]},
    thigh: {L: 87, outline: [[6, -14], [18, -8], [20, 10], [19, 35], [15.5, 60], [12.5, 80], [11.5, 88], [10, 95], [0, 97.5], [-10, 94],
      [-11, 86], [-12, 70], [-14.5, 50], [-16.5, 25], [-17, 8], [-17, -6], [-8, -14]],
      edges: [[2, 7], [10, 13]]},
    shank: {L: 88, outline: [[12, -6], [12.5, 6], [13, 22], [11.5, 40], [8, 62], [7, 80], [7, 88], [0, 92], [-6, 88], [-6, 84], [-7, 66], [-11, 44],
      [-14, 24], [-12, 8], [-11, -6], [0, -9]], edges: [[1, 6], [8, 13]]},
    foot: {L: 14, outline: [[7, -3], [9, 5], [12, 11], [14, 16], [12, 19.5], [0, 20], [-9, 19.5], [-10, 13], [-8, 5], [-6, -3]], edges: [[0, 9]],
      details: [[[3, 16], [3, 19.5]], [[8, 15.5], [8, 19]]]}
  };

  const front = {
    upper: {details: [], muscles: [
      {id: 'triceps.lat', line: 'none', a: [[10.5, 30], [11.8, 44], [9.5, 60]], b: [[13, 28], [12.8, 44], [10.5, 58]]},
      {id: 'brachialis', line: 'none', a: [[5.5, 42], [7.5, 52], [7, 62]], b: [[10.5, 40], [11, 50], [9, 62]]},
      {id: 'biceps', a: [[-8, 22], [-10, 34], [-8.5, 48], [-3, 61]], b: [[4, 26], [6, 38], [5.5, 50], [2, 61]]},
      {id: 'deltoid.ant', a: [[-3, -11], [0.5, 4], [3.5, 18], [5.5, 31, 1]], b: [[-15, -3], [-11, 6], [-4, 16], [5.5, 31, 1]], close: [[-10, -9]]},
      {id: 'deltoid.lat', a: [[-3, -11], [0.5, 4], [3.5, 18], [6, 31, 1]], b: [[8, -12.5], [16, -4], [17.5, 8], [14, 22], [8, 31, 1]], close: [[2, -13]]}
    ], cap: true},
    fore: {details: [], muscles: [
      {id: 'forearm.flex', line: 'none', a: [[-3, -2], [-4, 12], [-3, 28], [-2, 42]], b: [[-9, -2], [-10, 10], [-8.5, 24], [-5.5, 42]]},
      {id: 'brachioradialis', line: 'none', a: [[3, -2], [4, 10], [3, 24], [2, 40]], b: [[9, -4], [10.8, 8], [9, 22], [5, 40]]}
    ]},
    thigh: {details: [[[17, -2], [8, 24], [-2, 48], [-9, 72]], [[16, 40], [13, 62], [11, 78]]],
      extra: '<path class="detail" d="M-3,86C1,83 7,84 8,89C8,94 3,97 -1,95C-4,93 -5,89 -3,86Z"/>',
      muscles: [
        {id: 'adductors', line: 'none', a: [[-4, 14], [-8, 32], [-11, 52]], b: [[-16.5, 16], [-16.5, 32], [-14, 52]]},
        {id: 'quads.vl', line: 'none', a: [[12, 12], [14, 34], [12.5, 58], [9, 82]], b: [[19.5, 14], [19, 36], [15.5, 60], [11.5, 82]]},
        {id: 'quads.rf', line: 'none', a: [[2, 8], [3, 32], [2.5, 58], [2, 82]], b: [[12, 8], [14, 32], [12.5, 58], [9, 82]]},
        {id: 'quads.vm', a: [[-5, 58], [-11, 70], [-10, 82], [-3, 89]], b: [[-1, 60], [-3, 72], [-2, 82], [0, 87]]},
        {id: 'tfl', line: 'none', a: [[16, -6], [18.5, 8], [18, 22]], b: [[10, -4], [13, 8], [14, 22]]},
        {id: 'iliopsoas', deep: true, a: [[2, -6], [-2, 4], [-6, 14]], b: [[-6, -6], [-9, 2], [-12, 12]]}
      ]},
    shank: {details: [[[2, 6], [3, 40], [1, 84]]], muscles: [
      {id: 'gastrocnemius', line: 'a', a: [[-6, -2], [-8.5, 14], [-9, 32], [-6, 50]], b: [[-11, -4], [-14, 14], [-13.5, 30], [-9, 48]]},
      {id: 'soleus', line: 'none', a: [[9.5, 32], [8.5, 52], [6.5, 72]], b: [[12.8, 28], [11.5, 46], [8, 68]]},
      {id: 'tibialis', line: 'b', a: [[9, 4], [8, 30], [5, 62]], b: [[4, 4], [3.5, 32], [2.5, 62]]}
    ]},
    foot: {details: [], muscles: []}
  };

  const back = {
    upper: {details: [], muscles: [
      {id: 'triceps.long', line: 'b', a: [[-2, 14], [-4, 34], [-3, 58]], b: [[-12.5, 10], [-12.8, 32], [-9.5, 60]]},
      {id: 'triceps.lat', line: 'none', a: [[1, 14], [3, 34], [1, 58]], b: [[12.5, 18], [12.8, 36], [9, 58]]},
      {id: 'deltoid.post', a: [[-3, -11], [0.5, 4], [3.5, 18], [5.5, 31, 1]], b: [[-15, -3], [-11, 6], [-4, 16], [5.5, 31, 1]], close: [[-10, -9]]},
      {id: 'deltoid.lat', a: [[-3, -11], [0.5, 4], [3.5, 18], [6, 31, 1]], b: [[8, -12.5], [16, -4], [17.5, 8], [14, 22], [8, 31, 1]], close: [[2, -13]]}
    ], cap: true},
    fore: {details: [], muscles: [
      {id: 'forearm.ext', line: 'none', a: [[-3, -2], [-3, 20], [-2, 42]], b: [[9, -2], [10.5, 14], [5, 42]]}
    ]},
    thigh: {details: [[[2, 24], [2, 84]]], muscles: [
      {id: 'adductors', line: 'none', a: [[-10, 12], [-13, 30], [-14, 44]], b: [[-17, 14], [-16.8, 30], [-15.5, 44]]},
      {id: 'hamstrings', line: 'a', a: [[3, 24], [4, 52], [6, 84]], b: [[16, 20], [16.5, 48], [11, 82]]},
      {id: 'hamstrings', line: 'none', a: [[1, 24], [0, 52], [-4, 86]], b: [[-12, 26], [-14, 50], [-9, 82]]}
    ]},
    shank: {details: [[[0, 52], [0, 86]]], muscles: [
      {id: 'soleus', line: 'none', a: [[-9, 40], [-6, 60], [-2.5, 78]], b: [[10, 38], [7.5, 60], [3, 78]]},
      {id: 'gastrocnemius', a: [[-1, -4], [-3, 16], [-3, 42]], b: [[-11, -4], [-14, 18], [-10, 44]]},
      {id: 'gastrocnemius', a: [[1, -4], [3, 16], [3, 38]], b: [[11.5, -4], [13, 18], [9, 40]]}
    ]},
    foot: {details: [], muscles: []}
  };

  SA.body.frontBack = {HEAD, EAR, frontTrunk, backTrunk, limb, front, back, SKETCH_ORIGIN: {x: 160, y: 191}};
})(typeof window !== 'undefined' ? window : globalThis);

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

/* Visual tokens (approved style A on the app's pale green stage) and the muscle name catalog. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy;

  SA.MUSCLES = {
    'deltoid': '三角肌', 'deltoid.ant': '三角肌前束', 'deltoid.lat': '三角肌中束', 'deltoid.post': '三角肌后束',
    'trap': '斜方肌', 'trap.upper': '斜方肌上束', 'trap.mid': '斜方肌中束', 'trap.lower': '斜方肌下束',
    'rhomboid': '菱形肌', 'lats': '背阔肌', 'teres': '大圆肌', 'infraspinatus': '冈下肌', 'serratus': '前锯肌',
    'pec': '胸大肌', 'pec.upper': '胸大肌上部', 'pec.lower': '胸大肌中下部',
    'biceps': '肱二头肌', 'brachialis': '肱肌', 'brachioradialis': '肱桡肌',
    'triceps': '肱三头肌', 'triceps.long': '肱三头肌长头', 'triceps.lat': '肱三头肌外侧头',
    'forearm.flex': '前臂屈肌群', 'forearm.ext': '前臂伸肌群',
    'abs': '腹直肌', 'obliques': '腹外斜肌', 'erectors': '竖脊肌', 'iliopsoas': '髂腰肌',
    'glute.max': '臀大肌', 'glute.med': '臀中肌', 'tfl': '阔筋膜张肌',
    'quads': '股四头肌', 'quads.rf': '股直肌', 'quads.vl': '股外侧肌', 'quads.vm': '股内侧肌',
    'hamstrings': '腘绳肌', 'adductors': '内收肌群', 'gastrocnemius': '腓肠肌', 'soleus': '比目鱼肌', 'tibialis': '胫骨前肌'
  };
  SA.muscleName = id => SA.MUSCLES[id.split('@')[0]] || id;

  SA.CSS = `
:root{--stage:#eff2e9;--stage-line:#dbe2d4;--skin:#f4ede5;--skin-far:#e7ddd2;--edge:#8a7c70;--detail:#c7b7a8;
--p:#d8302a;--p-dark:#93201b;--s:#ee8a80;--s-dark:#c4675e;--label:#2c4633;--label-sub:#5c6d60;--leader:#5c6d60;
--guide:#4f8a5f;--good:#376749;--warn:#d98a1c;--warn-text:#925508;--ghost:#9aa79c;
--metal:#46594a;--metal-mid:#6d806f;--metal-face:#879182;--metal-light:#aab5a3;--pad:#4a5a4e;--pad-light:#64766a;
--frame:#879182;--frame-dark:#5b6b5e;--cable:#3a463d;--band:#d8a03a;--strap:#3f5045;--mat:#dfe7d6;--roller:#9fb7a1}
html[data-dark="true"]{--stage:#29352c;--stage-line:#3d4c40;--skin:#3d3832;--skin-far:#332f2a;--edge:#b9a999;--detail:#6c6157;
--p:#ff4a3f;--p-dark:#ffb3ab;--s:#b9615a;--s-dark:#e08b82;--label:#e3ecdf;--label-sub:#abb9a7;--leader:#abb9a7;
--guide:#9cc8a6;--good:#b4c9a8;--warn:#f0aa45;--warn-text:#f0aa45;--ghost:#6f7d72;
--metal:#b4c9a8;--metal-mid:#879c7c;--metal-face:#d8e4cf;--metal-light:#5d6e5e;--pad:#5a6c5e;--pad-light:#6f8273;
--frame:#7f907f;--frame-dark:#a9b8a6;--cable:#cfd9c9;--band:#e7b65a;--strap:#9db29f;--mat:#33413a;--roller:#6f8a73}
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;-webkit-user-select:none;user-select:none}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif}
.panel{width:100%;height:100%}.panel[hidden]{display:none!important}
.panel>svg{display:block;width:100%;height:100%}
.stage{fill:var(--stage)}.ground{stroke:var(--stage-line);stroke-width:2;fill:none}
.skin{fill:var(--skin)}.far .skin{fill:var(--skin-far)}
.edge{fill:none;stroke:var(--edge);stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round}
.skin.edge{fill:var(--skin)}.edge.thin{stroke-width:1.1}
.detail{fill:none;stroke:var(--detail);stroke-width:1;stroke-linecap:round;stroke-linejoin:round}
.m-p{fill:var(--p);fill-opacity:var(--act,1)}.m-s{fill:var(--s);fill-opacity:var(--act2,.75)}.m-x{fill-opacity:var(--act,1)}
.m.deep{fill-opacity:calc(var(--act,1)*.55)}
.fiber{fill:none;stroke:var(--p-dark);stroke-width:.7;stroke-linecap:round;opacity:calc(var(--act,1)*.55)}
.m-edge{fill:none;stroke-width:1.1;stroke-linejoin:round}.m-edge-p{stroke:var(--p-dark);opacity:.7}.m-edge-s{stroke:var(--s-dark);opacity:.7}.m-edge-x{stroke:var(--p);opacity:.9}
.m-edge.deep{stroke-dasharray:3 2.5}
.far .edge{stroke-opacity:.8}
.ghost .skin{fill:none}.ghost .edge,.ghost .skin.edge{stroke:var(--ghost);stroke-dasharray:4 3;fill:none;stroke-width:1.2}
.ghost .detail,.ghost .m,.ghost .fiber,.ghost .m-edge,.ghost .base{display:none}
.lbl{font-size:15px;font-weight:650;fill:var(--label)}.lbl-sub{font-size:12px;font-weight:500;fill:var(--label-sub)}
.lbl,.lbl-sub,.callout .txt,.verdict,.warn-text{paint-order:stroke;stroke:var(--stage);stroke-width:4px;stroke-linejoin:round}
.leader{fill:none;stroke:var(--leader);stroke-width:1;opacity:.7}.pin{fill:var(--label)}
.guide{fill:none;stroke:var(--guide);stroke-width:1.8;stroke-dasharray:1 5;stroke-linecap:round}
.arrow{fill:none;stroke:var(--guide);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.callout circle{fill:var(--good)}.callout .num{font-size:12px;font-weight:700;fill:var(--stage);text-anchor:middle}
.callout .txt{font-size:13px;font-weight:600;fill:var(--label)}
.verdict{font-size:15px;font-weight:700}.verdict.good{fill:var(--good)}.verdict.bad{fill:var(--warn-text)}
.warn-mark{fill:none;stroke:var(--warn);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.warn-text{font-size:12.5px;font-weight:650;fill:var(--warn-text)}
.divider{stroke:var(--stage-line);stroke-width:2}
.metal{fill:var(--metal)}.metal-mid{fill:var(--metal-mid)}.metal-face{fill:var(--metal-face)}.metal-light{fill:var(--metal-light)}
.eq-line{fill:none;stroke:var(--metal);stroke-width:1.2;stroke-linejoin:round}
.frame{fill:var(--frame)}.frame-dark{fill:var(--frame-dark)}.pad{fill:var(--pad)}.pad-light{fill:var(--pad-light)}
.cable{fill:none;stroke:var(--cable);stroke-width:1.6}.band{fill:none;stroke:var(--band);stroke-width:4;stroke-linecap:round}
.strap{fill:none;stroke:var(--strap);stroke-width:3.2;stroke-linecap:round}.mat{fill:var(--mat)}.roller{fill:var(--roller)}
`;
})(typeof window !== 'undefined' ? window : globalThis);

/* Equipment. Each item: build(layers, ctx) once, update(ctx) per frame, bounds(ctx) for camera fitting.
   World units match the body (≈2.05 per cm); ground is y = 0. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy;
  const U = SA.util, {V, add, sub, mul, el, smooth, unit, lerpV, fromDown, rot, frame, local, matrix} = U;
  const n1 = U.n1;
  const hex = (c, r, rot0) => [0, 60, 120, 180, 240, 300].map(a => n1(c.x + r * Math.cos((a + (rot0 || 0)) * U.RAD)) + ',' + n1(c.y + r * Math.sin((a + (rot0 || 0)) * U.RAD))).join(' ');
  const rect = (x, y, w, h, r) => `M${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x + r}Q${x},${y + h} ${x},${y + h - r}V${y + r}Q${x},${y} ${x + r},${y}Z`;
  /** Rounded bar between two points, as a closed path. */
  function bar(a, b, w) {
    const d = unit(sub(b, a)), n = V(-d.y * w / 2, d.x * w / 2);
    const p = [add(a, n), add(b, n), sub(b, n), sub(a, n)];
    // Sweep 0 bulges the caps outward; sweep 1 bit a notch into every tube end.
    return `M${U.pt(p[0])}L${U.pt(p[1])}A${n1(w / 2)},${n1(w / 2)} 0 0 0 ${U.pt(p[2])}L${U.pt(p[3])}A${n1(w / 2)},${n1(w / 2)} 0 0 0 ${U.pt(p[0])}Z`;
  }
  const handFrame = (ctx, hand) => ctx.figure.parts['hand:' + hand].frame;
  const handWorld = (ctx, hand) => (ctx.joints.arms[hand] || {}).H;

  const T = {};

  /* Dumbbell. axis 'x': handle lies in the drawing plane across the palm; 'z': handle points at the viewer. */
  T.dumbbell = {
    build(L, ctx, it) {
      const s = it.size || 1;
      if (it.axis === 'z' && ctx.view !== 'side') {
        it.nodes = {back: el('g', null, L.back), front: el('g', null, L.front)};
        it.nodes.backRim = el('polygon', {class: 'metal'}, it.nodes.back);
        it.nodes.backFace = el('polygon', {class: 'metal-face'}, it.nodes.back);
        it.nodes.handle = el('path', {stroke: 'var(--metal)', 'stroke-width': 5, 'stroke-linecap': 'round'}, it.nodes.back);
        it.nodes.frontRim = el('polygon', {class: 'metal'}, it.nodes.front);
        it.nodes.frontFace = el('polygon', {class: 'metal-face'}, it.nodes.front);
        return;
      }
      const part = ctx.figure.parts['hand:' + it.hand];
      const under = el('g', {class: 'eq dumbbell'}), over = el('g', {class: 'eq dumbbell'});
      part.g.insertBefore(under, part.g.firstChild); part.g.appendChild(over);
      if (it.axis === 'z') { // side view, handle toward the viewer
        el('polygon', {class: 'metal', points: hex(V(-2, 3), 10 * s, 0)}, under);
        el('polygon', {class: 'metal', points: hex(V(1.5, 11), 10 * s, 0)}, over);
        el('polygon', {class: 'metal-face', points: hex(V(2.5, 12.5), 10 * s, 0)}, over);
        return;
      }
      const y = 8, h = 21 * s, w = 8 * s, gap = 13;
      el('path', {d: rect(-gap - 2, y - 2.6, 2 * gap + 4, 5.2, 2.2), class: 'metal-mid'}, under);
      for (const sgn of [-1, 1]) {
        const x0 = sgn < 0 ? -gap - w : gap;
        el('path', {d: rect(x0, y - h / 2, w, h, 2.5), class: 'metal'}, under);
        el('path', {d: rect(x0 + (sgn < 0 ? 1.6 : 0), y - h / 2 + 2, w - 1.6, h - 4, 1.5), class: 'metal-face'}, under);
      }
    },
    update(ctx, it) {
      if (!it.nodes) return;
      const h = handWorld(ctx, it.hand), VP = V(it.vpx == null ? 0 : it.vpx, it.vpy == null ? -520 : it.vpy);
      const d = unit(sub(h, VP)), gap = 8;
      const at = k => add(h, mul(d, k));
      it.nodes.backRim.setAttribute('points', hex(at(-gap - 3), 8.5));
      it.nodes.backFace.setAttribute('points', hex(at(-gap), 8.5));
      it.nodes.frontRim.setAttribute('points', hex(at(gap), 9));
      it.nodes.frontFace.setAttribute('points', hex(at(gap + 3), 9));
      it.nodes.handle.setAttribute('d', `M${U.pt(at(-gap))}L${U.pt(at(gap))}`);
    },
    bounds(ctx, it) { const h = handWorld(ctx, it.hand); return h ? [V(h.x - 22, h.y - 24), V(h.x + 22, h.y + 24)] : []; }
  };

  /* Bench / seat seen from the side: seat pad, optional back pad, legs. */
  T.bench = {
    build(L, ctx, it) {
      const g = el('g', {class: 'eq bench'}, it.layer === 'front' ? L.front : L.back);
      const x0 = it.x, x1 = it.x + it.length, top = it.top, t = it.pad || 12;
      const legs = it.legs || [x0 + 14, x1 - 14];
      legs.forEach(x => el('path', {d: rect(x - 4, top + t, 8, -top - t, 2), class: 'frame-dark'}, g));
      el('path', {d: rect(Math.min(...legs) - 10, -6, Math.abs(legs[1] - legs[0]) + 20, 6, 2), class: 'frame'}, g);
      el('path', {d: rect(x0, top, it.length, t, 5), class: 'pad'}, g);
      el('path', {d: rect(x0 + 4, top + 2, it.length - 8, 3, 1.5), class: 'pad-light'}, g);
      if (it.back) {
        const b = it.back, base = V(b.x == null ? x0 + 6 : b.x, top + 2), dir = U.fromUp(-(b.angle || 0));
        const tip = add(base, mul(dir, b.length));
        el('path', {d: bar(add(base, mul(dir, 8)), tip, 13), class: 'pad'}, g);
        const post = add(base, mul(dir, b.length * 0.35));
        el('path', {d: bar(V(post.x - 7, top + t), add(post, V(-4, 0)), 6), class: 'frame-dark'}, g);
      }
    },
    update() {},
    bounds(ctx, it) { return [V(it.x, it.top - (it.back ? it.back.length : 0)), V(it.x + it.length, 0)]; }
  };

  /* Reverse-fly / pec-deck machine seen from behind the user. */
  T.reverseFly = {
    build(L, ctx, it) {
      const g = el('g', {class: 'eq machine'}, L.back), cx = it.x || 0;
      el('path', {d: rect(cx - 9, -330, 18, 330, 3), class: 'frame-dark'}, g);              // column
      el('path', {d: rect(cx - 70, -8, 140, 8, 3), class: 'frame'}, g);                      // base
      el('path', {d: rect(cx - 70, -338, 140, 14, 5), class: 'frame'}, g);                   // top beam
      el('path', {d: rect(cx - 6, it.seat + 16, 12, -it.seat - 16, 2), class: 'frame-dark'}, g);
      el('path', {d: rect(cx - 38, it.seat, 76, 18, 6), class: 'pad'}, L.front);             // seat covers the buttocks' lower edge
      el('path', {d: rect(cx - 34, it.seat + 3, 68, 4, 2), class: 'pad-light'}, L.front);
      it.arms = ['r', 'l'].map(s => ({s, line: el('path', {class: 'frame', 'stroke-linejoin': 'round'}, g)}));
      it.handles = ['r', 'l'].map(s => el('path', {class: 'metal'}, L.front));
      it.pivots = [1, -1].map(sg => el('circle', {cx: cx + sg * 52, cy: -331, r: 7, class: 'metal-mid'}, g));
    },
    update(ctx, it) {
      const cx = it.x || 0;
      it.arms.forEach((a, i) => {
        const sg = i === 0 ? 1 : -1, h = ctx.joints.arms[a.s].H, piv = V(cx + sg * 52, -331);
        const elbow = V(h.x, piv.y + 26);
        a.line.setAttribute('d', bar(piv, elbow, 9) + bar(elbow, V(h.x, h.y - 4), 9));
        it.handles[i].setAttribute('d', bar(V(h.x, h.y - 13), V(h.x, h.y + 13), 7));
      });
    },
    bounds(ctx, it) { const cx = it.x || 0; return [V(cx - 75, -340), V(cx + 75, 0)]; }
  };

  /* Flat mat on the floor. */
  T.mat = {
    build(L, ctx, it) { el('path', {d: rect(it.x, -5, it.length, 5, 2.5), class: 'mat'}, L.back); },
    update() {}, bounds(ctx, it) { return [V(it.x, -6), V(it.x + it.length, 0)]; }
  };

  /* Foam roller lying across the view (side view: a circle). */
  T.roller = {
    build(L, ctx, it) {
      it.node = el('g', null, it.layer === 'front' ? L.front : L.back);
      el('circle', {r: it.r || 15, class: 'roller'}, it.node);
      el('circle', {r: (it.r || 15) - 5, fill: 'none', stroke: 'var(--stage)', 'stroke-opacity': .5, 'stroke-width': 1.2}, it.node);
    },
    update(ctx, it) { const p = ctx.eq && ctx.eq.roller || V(it.x, -(it.r || 15)); it.node.setAttribute('transform', `translate(${n1(p.x)} ${n1(p.y)})`); },
    bounds(ctx, it) { const r = it.r || 15; return [V(it.x - r, -2 * r), V(it.x + r, 0)]; }
  };

  /* Resistance band held in both hands. Side view: the band runs across the body, so it is drawn
     from the near hand toward a depth offset (the far hand sits behind it). Front view: hand to hand. */
  T.band = {
    build(L, ctx, it) {
      it.node = el('path', {class: 'band'}, it.layer === 'front' ? L.front : L.back);
      if (ctx.view === 'side') it.cap = el('path', {class: 'band', 'stroke-width': 3}, L.front);
    },
    update(ctx, it) {
      const A = ctx.joints.arms;
      if (ctx.view === 'side') {
        const h = A.near.H, dep = V(it.depth ? it.depth[0] : -9, it.depth ? it.depth[1] : -6);
        const far = add(h, dep);
        it.node.setAttribute('d', `M${U.pt(add(h, V(2, 4)))}L${U.pt(far)}`);
        it.cap.setAttribute('d', `M${U.pt(add(h, V(-1, -6)))}L${U.pt(add(h, V(3, 7)))}`);
        return;
      }
      const a = A.r.H, b = A.l.H, sag = it.sag == null ? 4 : it.sag, m = add(lerpV(a, b, 0.5), V(0, sag));
      it.node.setAttribute('d', smooth([a, m, b], false));
    },
    bounds() { return []; }
  };

  /* Bench with backrest seen from the front: the seat shows below the hips, the backrest above the shoulders. */
  T.benchFront = {
    build(L, ctx, it) {
      const g = el('g', {class: 'eq bench'}, L.back), w = it.width || 84, top = it.top;
      el('path', {d: rect(-w / 2 + 8, top + 12, 10, -top - 12, 2), class: 'frame-dark'}, g);
      el('path', {d: rect(w / 2 - 18, top + 12, 10, -top - 12, 2), class: 'frame-dark'}, g);
      el('path', {d: rect(-w / 2 - 6, -6, w + 12, 6, 2), class: 'frame'}, g);
      if (it.back) el('path', {d: rect(-(it.back.width || 56) / 2, it.back.top, it.back.width || 56, top - it.back.top, 8), class: 'pad'}, g);
      el('path', {d: rect(-w / 2, top - 4, w, 16, 6), class: 'pad'}, g);
      el('path', {d: rect(-w / 2 + 5, top - 1, w - 10, 3.5, 1.5), class: 'pad-light'}, g);
    },
    update() {},
    bounds(ctx, it) { return [V(-(it.width || 84) / 2, it.back ? it.back.top : it.top), V((it.width || 84) / 2, 0)]; }
  };

  /* Suspension trainer: anchor high in front, two straps to the hands. */
  T.trx = {
    build(L, ctx, it) {
      const g = el('g', {class: 'eq trx'}, L.back);
      if (it.showAnchor !== false) {
        el('circle', {cx: it.anchor.x, cy: it.anchor.y, r: 5, class: 'metal'}, g);
        el('path', {d: rect(it.anchor.x - 30, it.anchor.y - 12, 60, 6, 3), class: 'frame'}, g);
      }
      it.straps = ['far', 'near'].map(s => el('path', {class: 'strap'}, s === 'far' ? L.back : L.front));
      it.grips = ['far', 'near'].map(s => el('path', {class: 'metal'}, s === 'far' ? L.back : L.front));
    },
    update(ctx, it) {
      ['far', 'near'].forEach((s, i) => {
        const h = ctx.joints.arms[s] && ctx.joints.arms[s].H; if (!h) return;
        const A = V(it.anchor.x, it.anchor.y), d = unit(sub(h, A));
        it.straps[i].setAttribute('d', `M${U.pt(A)}L${U.pt(sub(h, mul(d, 8)))}`);
        const n = V(-d.y, d.x);
        it.grips[i].setAttribute('d', bar(add(h, mul(n, -8)), add(h, mul(n, 8)), 5));
      });
    },
    bounds(ctx, it) { return it.showAnchor === false ? [] : [V(it.anchor.x - 30, it.anchor.y - 14), V(it.anchor.x + 30, it.anchor.y)]; }
  };

  SA.equipment = {types: T, rect, bar, hex};
})(typeof window !== 'undefined' ? window : globalThis);

/* Arms-only equipment extensions. Generic structure follows the retained source frames;
   adjustable column / stack / swivel pulley, D handle, rope stops, EZ bar and ladder bench.
   No public renderer or runtime is changed. All grips are centred on the solved palm. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy, U = SA.util;
  const {V, add, sub, mul, unit, el, lerpV} = U;
  const {rect, bar} = SA.equipment, T = SA.equipment.types;
  const path = (g, d, cls) => el('path', {d, class: cls}, g);
  const hand = (ctx, s) => ctx.joints.arms[s].H;

  /** Column remains fixed; only the cable, attachment and selected stack rise move.
      pulley is the cable exit at the near edge of the actual swivel wheel. */
  T.arms_cableStation = {
    build(L, ctx, it) {
      const x = it.x, top = it.top == null ? -365 : it.top;
      const g = el('g', {class: 'eq arms-cable-station'}, L.back);
      const facing = it.facing == null ? -1 : it.facing;
      path(g, rect(x - 16, top, 32, -top - 7, 5), 'frame-dark');
      path(g, rect(x - 31, -9, 62, 9, 3), 'frame');
      // Exposed height rail and stop holes; the side stack is supported on guide rods.
      path(g, rect(x - 3, top + 14, 6, -top - 27, 2), 'metal-light');
      for (let y = top + 24; y < -25; y += 17) el('circle', {cx: x, cy: y, r: 1.5, fill: 'var(--metal)'}, g);
      const sx = x - facing * 24;
      path(g, rect(sx - 11, top + 15, 22, -top - 34, 3), 'frame');
      for (const dx of [-7, 7]) path(g, rect(sx + dx - 1, top + 24, 2, -top - 44, 0.8), 'metal-mid');
      for (let y = -112; y < -20; y += 9) path(g, rect(sx - 10, y, 20, 7, 1.4), 'metal');
      el('circle', {cx: sx + 8, cy: -69, r: 2.5, fill: 'var(--band)'}, g);
      it.stack = path(g, rect(sx - 10, -121, 20, 7, 1.4), 'metal-mid');
      // Continuous reeving: top wheel, descending cable, movable outlet carriage.
      const c = V(it.pulley.x - facing * 8, it.pulley.y);
      it.internalCable = path(g, `M${U.pt(V(sx, -121))}V${top + 12}H${x}V${c.y}`, 'cable');
      it.stackX = sx;
      el('circle', {cx: x, cy: top + 12, r: 8, class: 'metal'}, g);
      el('circle', {cx: x, cy: top + 12, r: 3, class: 'metal-light'}, g);
      path(g, rect(x - 8, c.y - 16, 16, 32, 4), 'frame');
      path(g, bar(V(x, c.y), c, 9), 'frame-dark');
      el('circle', {cx: c.x, cy: c.y, r: 8, class: 'metal'}, g);
      el('circle', {cx: c.x, cy: c.y, r: 3.2, class: 'metal-mid'}, g);
      el('circle', {cx: x + 7, cy: c.y - 10, r: 3, fill: 'var(--band)'}, g);
      it.cable = path(g, '', 'cable');
      it.junction = el('circle', {r: 3, class: 'metal-mid'}, L.front);
      it.grips = [];
      const sides = it.hands || ['near'];
      sides.forEach(s => {
        // Grip barrel below the fingers; outside loop / rope stop above the palm.
        const p = ctx.figure.parts['hand:' + s];
        const under = el('g', {class: 'eq arms-grip'});
        p.g.insertBefore(under, p.g.firstChild);
        const over = el('g', {class: 'eq arms-grip'}, p.g);
        if (it.attachment === 'rope') {
          path(under, 'M0,-12V19', 'strap');
          path(over, rect(-7, 14, 14, 9, 4), 'metal');
          for (const y of [-8, -3, 2]) path(under, `M-2,${y}l4,3`, 'eq-line');
        } else if (it.attachment !== 'shortbar') {
          path(under, bar(V(-11, 8), V(11, 8), 5), 'metal-mid');
          path(under, 'M-11,8L-9,-6Q0,-16 9,-6L11,8', 'eq-line');
          path(over, 'M-11,7v4M11,7v4', 'eq-line');
        }
        it.grips.push({s, line: it.attachment === 'rope' ? path(g, '', 'strap') : null});
      });
      if (it.attachment === 'shortbar') {
        it.shortbar = path(g, '', 'metal-mid');
        it.collar = path(g, '', 'metal');
      }
    },
    update(ctx, it) {
      const P = it.pulley, hs = (it.hands || ['near']).map(s => hand(ctx, s));
      let C;
      if (it.attachment === 'rope') {
        const m = hs.length === 2 ? lerpV(hs[0], hs[1], .5) : hs[0];
        C = add(m, mul(unit(sub(P, m)), it.branch || 36));
        it.grips.forEach((n, i) => n.line.setAttribute('d', `M${U.pt(C)}L${U.pt(hs[i])}`));
      } else if (it.attachment === 'shortbar') {
        const A = hs[0], B = hs[1], m = lerpV(A, B, .5);
        const dir = U.dist(A, B) > 3 ? unit(sub(B, A)) : V(.9, .44);
        const ends = [sub(A, mul(dir, 22)), add(B, mul(dir, 22))];
        it.shortbar.setAttribute('d', bar(ends[0], ends[1], 5));
        it.collar.setAttribute('d', bar(sub(m, mul(dir, 5)), add(m, mul(dir, 5)), 9));
        C = add(m, mul(unit(sub(P, m)), 6));
      } else {
        const f = ctx.figure.parts['hand:' + (it.hands || ['near'])[0]].frame;
        C = U.local(f, 0, -11);
      }
      it.cable.setAttribute('d', `M${U.pt(P)}L${U.pt(C)}`);
      it.junction.setAttribute('cx', U.n1(C.x)); it.junction.setAttribute('cy', U.n1(C.y));
      if (it.restLength == null) it.restLength = U.dist(P, C);
      const rise = Math.max(0, U.dist(P, C) - it.restLength);
      it.stack.setAttribute('transform', `translate(0 ${U.n1(-rise)})`);
      it.internalCable.setAttribute('d', `M${U.pt(V(it.stackX, -121 - rise))}V${(it.top == null ? -365 : it.top) + 12}H${it.x}V${P.y}`);
    },
    bounds(ctx, it) {
      return [V(it.x - 40, (it.top == null ? -365 : it.top) - 2), V(it.x + 40, 0), it.pulley];
    }
  };

  /** EZ bar projected across both palms. Zigzag shaft, grip knurling, collars and plates
      follow the two hands rather than being an unrelated prop beside the body. */
  T.arms_ezBar = {
    build(L, ctx, it) {
      const g = el('g', {class: 'eq arms-ez-bar'}, L.back);
      it.shaft = path(g, '', 'metal-mid');
      it.collars = path(g, '', 'metal');
      it.plates = [el('ellipse', {rx: 7, ry: 20, class: 'metal'}, g), el('ellipse', {rx: 7, ry: 20, class: 'metal'}, g)];
      it.faces = [el('ellipse', {rx: 4, ry: 16, class: 'metal-face'}, g), el('ellipse', {rx: 4, ry: 16, class: 'metal-face'}, g)];
      it.knurl = [path(g, '', 'eq-line'), path(g, '', 'eq-line')];
    },
    update(ctx, it) {
      const a = hand(ctx, 'near'), b = hand(ctx, 'far');
      const d = U.dist(a, b) > 3 ? unit(sub(b, a)) : V(.94, -.34), n = V(-d.y, d.x);
      const c = lerpV(a, b, .5), half = Math.max(U.dist(a, b) / 2, 8);
      const at = (k, off = 0) => add(add(c, mul(d, k)), mul(n, off));
      const pts = [at(-half - 36), at(-half - 12), a, at(-4, 3), at(4, -3), b, at(half + 12), at(half + 36)];
      it.shaft.setAttribute('d', pts.slice(1).map((p, i) => bar(pts[i], p, 4.5)).join(''));
      it.collars.setAttribute('d', [-1, 1].map(s => bar(at(s * (half + 23), -5), at(s * (half + 23), 5), 5)).join(''));
      [-1, 1].forEach((s, i) => {
        const p = at(s * (half + 30)), angle = Math.atan2(d.y, d.x) / U.RAD;
        [it.plates[i], it.faces[i]].forEach(node => node.setAttribute('transform', `translate(${U.pt(p).replace(',', ' ')}) rotate(${angle})`));
        it.knurl[i].setAttribute('d', [2, 5, 8].map(k => `M${U.pt(add((i ? b : a), mul(d, k)))}l${U.pt(mul(n, 3))}`).join(''));
      });
    },
    bounds(ctx) {
      const hs = ['near', 'far'].map(s => hand(ctx, s));
      return hs.flatMap(h => [V(h.x - 47, h.y - 35), V(h.x + 47, h.y + 35)]);
    }
  };

  /** Pad surface A→B is specified from the body support plane. Padding projects away
      from the user, and a locking ladder + hinge + steel legs support the bench. */
  T.arms_adjustableBench = {
    build(L, ctx, it) {
      const g = el('g', {class: 'eq arms-adjustable-bench'}, L.back);
      const A = it.a, B = it.b, u = unit(sub(B, A)), away = V(u.y, -u.x), thick = 12;
      const poly = (a, b, t) => `M${U.pt(a)}L${U.pt(b)}L${U.pt(add(b, mul(away, t)))}L${U.pt(add(a, mul(away, t)))}Z`;
      const front = it.seatEnd, hinge = add(A, mul(away, thick));
      const leg1 = V(A.x - 9, -6), leg2 = V(front.x - 4, -6);
      path(g, bar(leg1, leg2, 8), 'frame');
      path(g, bar(leg1, hinge, 8), 'frame-dark');
      path(g, bar(leg2, V(front.x - 8, front.y + 12), 8), 'frame-dark');
      const brace = add(lerpV(A, B, .55), mul(away, thick));
      path(g, bar(V(A.x - 16, -18), brace, 7), 'frame');
      path(g, bar(V(A.x - 12, -19), V(front.x - 18, -19), 5), 'frame-dark');
      for (let x = A.x - 4; x < front.x - 15; x += 11) path(g, bar(V(x, -18), V(x + 2, -24), 3), 'metal');
      path(g, poly(A, B, thick), 'pad');
      path(g, bar(add(A, mul(away, 2)), add(B, mul(away, 2)), 2), 'pad-light');
      // Short independent seat, with a visible hinge gap rather than a floating board.
      path(g, `M${U.pt(A)}L${U.pt(front)}L${U.pt(add(front,V(0,12)))}L${U.pt(add(A,V(0,12)))}Z`, 'pad');
      el('circle', {cx: hinge.x, cy: hinge.y, r: 6, class: 'metal'}, g);
      el('circle', {cx: hinge.x, cy: hinge.y, r: 2.5, class: 'metal-light'}, g);
      if (it.headPad) path(g, poly(it.headPad.a, it.headPad.b, -it.headPad.depth), 'roller');
    },
    update() {},
    bounds(ctx, it) { return [it.a, it.b, it.seatEnd, V(Math.min(it.a.x,it.b.x)-12,0)]; }
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* Arms-extra equipment. One adjustable cable tower, a cable bar, an EZ bar and an incline bench.
 * Structure is based on the retained video frames and manufacturer references in the topic report.
 * These additions only register types; they do not change the common rig, figure or playback engine.
 */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy, U = SA.util;
  const {V, add, sub, mul, unit, el, local, dist} = U;
  const {rect, bar} = SA.equipment, T = SA.equipment.types;
  const path = (parent, d, cls) => el('path', {d, class: cls}, parent);
  const point = U.pt;
  const hand = (ctx, name) => ctx.joints.arms[name].H;

  // Side projection of one working side of a dual adjustable pulley. The frame and carriage
  // are fixed. Only selected plates rise; the flexible cable follows the attached handle.
  T.arms_extra_cable_station = {
    build(L, ctx, it) {
      const x = it.x, top = it.top || -382, py = it.outlet.y;
      const g = el('g', {class: 'eq arms-extra-cable-station'}, L.back);
      path(g, rect(x + 22, top + 12, 46, -top - 22, 6), 'metal-light');
      path(g, rect(x + 34, top + 25, 5, -top - 44, 2), 'metal-mid');
      path(g, rect(x + 55, top + 25, 5, -top - 44, 2), 'metal-mid');
      path(g, rect(x - 9, top, 13, -top - 7, 3), 'frame-dark');
      path(g, rect(x - 29, -8, 111, 8, 3), 'frame');
      path(g, bar(V(x - 3, top + 7), V(x + 52, top + 7), 9), 'frame');
      for (let y = top + 29; y < -20; y += 19) el('circle', {cx: x - 2.5, cy: y, r: 1.6, fill: 'var(--stage)'}, g);
      path(g, rect(x - 16, py - 17, 28, 34, 4), 'metal-mid');
      path(g, rect(x - 23, py - 9, 8, 18, 3), 'frame-dark'); // carriage adjustment handle
      el('circle', {cx: it.outlet.x, cy: py, r: 9.5, class: 'metal'}, g);
      el('circle', {cx: it.outlet.x, cy: py, r: 5.5, class: 'metal-face'}, g);
      el('circle', {cx: it.outlet.x, cy: py, r: 1.8, class: 'metal'}, g);
      for (let i = 0; i < 9; i++) path(g, rect(x + 27, -110 + i * 10, 38, 8.5, 2), 'metal-mid');
      it.selected = el('g', {'data-arms-extra-selected-stack': ''}, g);
      for (let i = 0; i < 5; i++) path(it.selected, rect(x + 27, -160 + i * 10, 38, 8.5, 2), 'metal');
      el('circle', {cx: x + 47, cy: -121, r: 2.6, fill: 'var(--band)'}, it.selected);
      it.routing = el('path', {class: 'cable'}, g);
      it.line = el('path', {class: 'cable', 'data-arms-extra-cable': ''}, L.back);
      it.clip = el('circle', {r: 2.8, fill: 'none', stroke: 'var(--metal)', 'stroke-width': 1.6}, L.back);
      if (it.grip === 'single') {
        it.strap = el('path', {class: 'strap'}, L.back);
        const part = ctx.figure.parts['hand:' + (it.hand || 'near')];
        const under = el('g', {class: 'eq cable-grip'});
        part.g.insertBefore(under, part.g.firstChild);
        path(under, rect(-12, 6.5, 24, 5, 2), 'metal-mid');
      }
    },
    update(ctx, it) {
      const h = hand(ctx, it.hand || 'near'), out = it.outlet;
      const d = unit(sub(out, h));
      const clip = it.grip === 'single' ? add(h, mul(d, 19)) : h;
      const length = dist(out, clip);
      const lift = U.clamp((length - it.restLength) / 4, 0, 40);
      it.selected.setAttribute('transform', `translate(0 ${U.n1(-lift)})`);
      it.routing.setAttribute('d', `M${it.x + 47},${-160 - lift}V${it.top + 12}H${it.x - 2}V${out.y}`);
      it.line.setAttribute('d', `M${point(out)}L${point(clip)}`);
      it.clip.setAttribute('cx', U.n1(clip.x)); it.clip.setAttribute('cy', U.n1(clip.y));
      if (it.strap) {
        const f = ctx.figure.parts['hand:' + (it.hand || 'near')].frame;
        const a = local(f, -12, 9), b = local(f, 12, 9);
        it.strap.setAttribute('d', `M${point(a)}L${point(clip)}L${point(b)}`);
      }
    },
    bounds(ctx, it) { return [V(it.x - 30, (it.top || -382) - 2), V(it.x + 83, 0)]; }
  };

  // In a lateral view both hands project to the same gripping region. The fixed depth axis
  // shows the other sleeve and the near plate; the rod always passes through the palm centres.
  function heldBar(L, ctx, it, ez) {
    it.back = el('g', {class: 'eq arms-extra-held-bar'}, L.back);
    it.front = el('g', {class: 'eq arms-extra-held-bar'}, L.front);
    it.rod = el('path', {fill: 'none', stroke: 'var(--metal-face)', 'stroke-width': 5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'}, it.back);
    it.sleeves = [-1, 1].map(() => el('path', {class: 'metal-mid'}, it.back));
    it.plates = ez ? [-1, 1].map((sign) => {
      const g = sign < 0 ? it.back : it.front;
      return {rim: el('ellipse', {rx: 12, ry: 17, class: 'metal'}, g), face: el('ellipse', {rx: 9, ry: 14, class: 'metal-mid'}, g), hub: el('circle', {r: 3.5, class: 'metal-face'}, g)};
    }) : null;
    it.ez = ez;
    it.grips = ['far', 'near'].map(s => {
      const part = ctx.figure.parts['hand:' + s], g = el('g', {class: 'eq bar-grip'});
      part.g.insertBefore(g, part.g.firstChild);
      return path(g, bar(V(-9, 9), V(9, 9), 4.6), 'metal-face');
    });
    // The lateral body view projects the two hands onto each other. A front-facing grip
    // close-up in the detail panel makes the bar shape and both gripping points clear.
    const svg = L.front.ownerSVGElement;
    if ((svg.getAttribute('aria-label') || '').includes('细节图解')) {
      const g = el('g', {'data-arms-extra-grip-inset': ''}, svg);
      el('rect', {x: 240, y: 324, width: 146, height: 65, rx: 10, fill: 'var(--stage)', stroke: 'var(--stage-line)', 'stroke-width': 1}, g);
      el('text', {x: 313, y: 338, fill: 'var(--label)', 'font-size': 10, 'font-weight': 650, 'text-anchor': 'middle'}, g).textContent = it.gripLabel || (ez ? 'EZ 曲杆 · 反握斜段' : '直横杆 · 掌心朝上');
      const points = ez ? [[251,356],[273,356],[288,363],[304,357],[322,357],[338,363],[353,356],[375,356]] : [[251,360],[375,360]];
      el('path', {d: 'M'+points.map(p=>p.join(',')).join('L'), fill: 'none', stroke: 'var(--metal-face)', 'stroke-width': 4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'}, g);
      if (ez) for (const x of [253,373]) {
        el('ellipse', {cx: x, cy: 356, rx: 6, ry: 11, class: 'metal'}, g);
        el('ellipse', {cx: x, cy: 356, rx: 4, ry: 8, class: 'metal-mid'}, g);
      } else {
        el('circle', {cx:313,cy:357,r:3,fill:'none',stroke:'var(--metal)','stroke-width':1.6},g);
        path(g,'M313,354V345','cable');
      }
      for (const [x, sign] of [[296,1],[331,-1]]) {
        path(g,bar(V(x,376),V(x,384),8),'skin');
        const h=el('g',{transform:`translate(${x} 371) scale(${sign*.8} -.8)`},g);
        path(h,U.smooth(SA.body.frontBack.limb.fist.outline,true),'skin edge');
        path(h,'M-5,5L3,5M-5,9L3,9','detail');
      }
    }
  }
  function updateBar(ctx, it) {
    const a = hand(ctx, 'far'), b = hand(ctx, 'near'), c = U.lerpV(a, b, .5);
    const axis = dist(a, b) > 2 ? unit(sub(b, a)) : unit(V(1, .28));
    const n = V(-axis.y, axis.x), length = it.ez ? 45 : 34;
    const at = (z, off = 0) => add(c, add(mul(axis, z), mul(n, off)));
    const points = it.ez ? [[-45, 0], [-28, 0], [-18, -4], [-8, 2], [8, 2], [18, -4], [28, 0], [45, 0]] : [[-length, 0], [length, 0]];
    it.rod.setAttribute('d', 'M' + points.map(([z, off]) => point(at(z, off))).join('L'));
    [-1, 1].forEach((sign, i) => {
      it.sleeves[i].setAttribute('d', bar(at(sign * (length - 16)), at(sign * (length + 6)), 6));
      if (it.plates) {
        const p = at(sign * (length - 8));
        for (const node of Object.values(it.plates[i])) { node.setAttribute('cx', U.n1(p.x)); node.setAttribute('cy', U.n1(p.y)); }
      }
    });
  }
  const heldBounds = (ctx, it) => {
    const a = hand(ctx, 'far'), b = hand(ctx, 'near');
    return [V(Math.min(a.x, b.x) - 54, Math.min(a.y, b.y) - 24), V(Math.max(a.x, b.x) + 54, Math.max(a.y, b.y) + 24)];
  };
  T.arms_extra_straight_cable_bar = {build: (L, c, it) => heldBar(L, c, it, false), update: updateBar, bounds: heldBounds};
  T.arms_extra_ez_bar = {build: (L, c, it) => heldBar(L, c, it, true), update: updateBar, bounds: heldBounds};

  // Head end is on the left and above the hip end. Separate back/seat pads, pivot,
  // ladder and wide floor feet make this an adjustable bench rather than a floating pad.
  T.arms_extra_incline_bench = {
    build(L, ctx, it) {
      const g = el('g', {class: 'eq arms-extra-incline-bench'}, L.back);
      const base = V(47, -65), tip = V(-150, -118), seat = V(99, -62);
      path(g, bar(V(-107, -6), V(125, -6), 9), 'frame');
      path(g, bar(V(-92, -6), V(-72, -87), 8), 'frame-dark');
      path(g, bar(V(91, -6), V(82, -57), 8), 'frame-dark');
      path(g, bar(V(-95, -6), V(88, -50), 8), 'frame');
      path(g, bar(V(38, -58), V(-38, -79), 7), 'frame-dark');
      path(g, bar(V(-41, -79), V(-17, -21), 6), 'frame-dark');
      path(g, rect(-24, -32, 66, 7, 2), 'frame');
      for (let x = -18; x < 40; x += 12) path(g, rect(x, -34, 4, 11, 1), 'frame-dark');
      el('circle', {cx: base.x, cy: base.y + 5, r: 5, class: 'metal-face'}, g);
      path(g, bar(add(base, V(0, 5)), add(tip, V(0, 5)), 11), 'pad');
      path(g, bar(add(base, V(0, 1.5)), add(tip, V(0, 1.5)), 3), 'pad-light');
      path(g, bar(add(base, V(7, 5)), add(seat, V(0, 5)), 13), 'pad');
      path(g, bar(add(base, V(10, 1.5)), add(seat, V(-3, 1.5)), 3), 'pad-light');
      el('circle', {cx: -107, cy: -7, r: 5, class: 'metal'}, g);
    },
    update() {},
    bounds() { return [V(-159, -126), V(132, 0)]; }
  };
})(typeof window !== 'undefined' ? window : globalThis);

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

/* Back-course equipment extensions. Offline structural diagrams, not factory
   drawings. Source-specific attachment and support identities are kept intact.
   Common engine files and its native playback protocol are unchanged. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy, U = SA.util, E = SA.equipment;
  const {V, add, sub, mul, unit, lerpV, el, pt, n1} = U;
  const {rect, bar} = E;
  const path = (parent, d, cls, attrs) => el('path', Object.assign({d, class: cls}, attrs || {}), parent);
  const circle = (parent, p, r, cls) => el('circle', {cx: n1(p.x), cy: n1(p.y), r, class: cls}, parent);
  const hAt = (ctx, hand) => ctx.joints.arms[hand].H;

  function attachment(ctx, it) {
    const H = it.hands.map(h => hAt(ctx, h)), P = it.outlet;
    const mid = H.length === 1 ? H[0] : lerpV(H[0], H[1], .5);
    const d = unit(sub(P, mid)), n = V(-d.y, d.x);
    if (it.attachment === 'neutral') {
      const left = H[0].x < H[1].x ? H[0] : H[1], right = H[0].x < H[1].x ? H[1] : H[0];
      const a = V(left.x, left.y - 15), b = V(right.x, right.y - 15), apex = V(mid.x, mid.y - 29);
      return {H, apex,
        frame: bar(a, apex, 6) + bar(apex, b, 6) + bar(a, V(left.x, left.y + 8), 5) + bar(b, V(right.x, right.y + 8), 5),
        grips: H.map(h => bar(add(h, V(0, -10)), add(h, V(0, 10)), 6))};
    }
    if (it.attachment === 'straight') {
      // Side-view projection of a long bar. Both palm centres lie on the bar;
      // the visible end sections show that this is a rod, not a rope or V grip.
      const axis = unit(sub(H[1], H[0])), a = add(mid, mul(axis, -42)), b = add(mid, mul(axis, 42));
      const apex = add(mid, mul(d, 12));
      return {H, apex, frame: bar(a, b, 5) + bar(mid, apex, 4), grips: []};
    }
    const apex = add(mid, mul(d, it.attachment === 'v' ? 23 : 25));
    if (it.attachment === 'v') {
      return {H, apex, frame: H.map(h => bar(apex, add(h, V(0, -9)), 4)).join(''),
        grips: H.map(h => bar(add(h, V(0, -11)), add(h, V(0, 11)), 5))};
    }
    const a = add(mid, mul(n, -10)), b = add(mid, mul(n, 10));
    return {H, apex, frame: bar(a, apex, 3.3) + bar(apex, b, 3.3), grips: [bar(a, b, 5)]};
  }

  E.types.back_cable = {
    build(L, ctx, it) {
      const x = it.x, top = it.top, w = it.stackWidth || 26;
      const g = it.machine = el('g', {class: 'eq back-cable-machine', 'data-back-equipment': 'cable'}, L.back);
      // Base, steel adjustment post, stack shroud and guide rods.
      path(g, rect(x - 21, -7, w + 53, 7, 3), 'frame');
      path(g, rect(x - 5, top, 10, -top - 7, 3), 'frame-dark');
      path(g, rect(x + 9, top + 40, w + 10, -top - 58, 5), 'metal-light', {opacity: .65});
      for (const gx of [x + 15, x + w + 3]) path(g, `M${gx},${top + 34}V-17`, 'eq-line');
      for (let y = top + 52; y < -40; y += 18) circle(g, V(x, y), 1.5, 'metal-mid');
      path(g, rect(x - 9, it.outlet.y - 16, 18, 30, 4), 'frame');
      path(g, bar(V(x, it.outlet.y), it.outlet, 8), 'frame-dark');
      circle(g, it.outlet, 10, 'metal'); circle(g, it.outlet, 6.5, 'metal-face'); circle(g, it.outlet, 2.2, 'frame-dark');
      const topPulley = V(x + 24, top + 18);
      circle(g, topPulley, 8, 'metal'); circle(g, topPulley, 4.7, 'metal-face');
      if (it.boom) path(g, bar(V(x, top + 8), V(it.outlet.x, it.outlet.y - 15), 9), 'frame');
      // Selection plates move along the visible rods. This is a schematic
      // cable reduction; it does not claim a source machine's exact ratio.
      it.stack = el('g', {'data-back-stack': ''}, g);
      for (let i = 0; i < 9; i++) path(it.stack, rect(x + 12, -128 + i * 10.5, w + 4, 9, 1.6), 'metal-mid');
      circle(it.stack, V(x + 14 + w / 2, -94), 2.6, 'metal');
      it.internal = path(g, '', 'cable');
      it.cable = path(g, '', 'cable', {'data-back-cable': ''});
      it.attachmentFrame = path(L.back, '', 'metal', {'data-back-attachment': it.attachment});
      it.grips = it.hands.map(h => path(L.back, '', 'metal-mid', {'data-back-grip': h}));
      it.connector = el('ellipse', {rx: 3.2, ry: 5.5, fill: 'none', stroke: 'var(--cable)', 'stroke-width': 1.6}, L.back);
      if (it.supportHand) {
        // The fingers wrap this same adjustment post, below its outlet pulley.
        it.support = path(L.front, '', 'metal-mid', {'data-back-support': it.supportHand});
      }
      const A = attachment(ctx, it);
      it.restLength = Math.hypot(A.apex.x - it.outlet.x, A.apex.y - it.outlet.y);
      this.update(ctx, it);
    },
    update(ctx, it) {
      const A = attachment(ctx, it), x = it.x, top = it.top;
      const length = Math.hypot(A.apex.x - it.outlet.x, A.apex.y - it.outlet.y);
      const lift = U.clamp((length - it.restLength) / 4, -10, 60);
      it.stack.setAttribute('transform', `translate(0 ${n1(-lift)})`);
      it.internal.setAttribute('d', `M${x + 24},${-128 - lift}V${top + 10}Q${x + 24},${top + 2} ${x + 13},${top + 13}L${pt(it.outlet)}`);
      it.cable.setAttribute('d', `M${pt(it.outlet)}L${pt(A.apex)}`);
      it.cable.dataset.endpoint = `${pt(A.apex)}`;
      it.attachmentFrame.setAttribute('d', A.frame);
      it.grips.forEach((node, i) => {
        node.setAttribute('d', A.grips[i] || '');
        node.dataset.contact = pt(A.H[i]);
      });
      it.connector.setAttribute('cx', n1(A.apex.x)); it.connector.setAttribute('cy', n1(A.apex.y));
      if (it.support) {
        const h = hAt(ctx, it.supportHand);
        it.support.setAttribute('d', bar(V(x - 6, h.y - 10), V(x + 6, h.y - 10), 2) + bar(V(x - 6, h.y + 10), V(x + 6, h.y + 10), 2));
        it.support.dataset.contact = pt(h);
        it.support.dataset.post = String(x);
      }
    },
    bounds(ctx, it) {
      const H = it.hands.map(h => hAt(ctx, h)), ext = it.attachment === 'straight' ? 44 : 14;
      return [V(it.x - 22, it.top - 5), V(it.x + (it.stackWidth || 26) + 34, 0),
        V(it.outlet.x - 11, it.outlet.y - 11), V(it.outlet.x + 11, it.outlet.y + 11),
        ...H.flatMap(h => [V(h.x - ext, h.y - 30), V(h.x + ext, h.y + 15)])];
    }
  };

  E.types.back_footplate = {
    build(L, ctx, it) {
      const g = el('g', {class: 'eq back-footplate'}, it.layer === 'front' ? L.front : L.back);
      const a = V(it.toe.x, it.toe.y), b = V(a.x - 10, a.y - it.height);
      path(g, bar(add(a, V(3, 0)), add(b, V(3, 0)), 7), 'frame-dark');
      path(g, bar(a, b, 4), 'metal-face');
      for (let k = .15; k < .9; k += .16) {
        const p = lerpV(a, b, k); path(g, `M${p.x - 2.5},${p.y}l5,-1`, 'eq-line');
      }
      path(g, rect(a.x - 8, -5, 24, 5, 2), 'frame');
    },
    update() {}, bounds(ctx, it) { return [it.toe, V(it.toe.x - 14, it.toe.y - it.height - 4), V(it.toe.x + 16, 0)]; }
  };

  E.types.back_lat_seat = {
    build(L, ctx, it) {
      E.types.benchFront.build(L, ctx, it);
      // Adjustable thigh restraint: two padded rollers on the frame in front
      // of the thighs. The projected upper-thigh surface is y≈-129.
      const back = el('g', {class: 'eq back-thigh-support'}, L.back);
      const front = el('g', {class: 'eq back-thigh-pads', 'data-back-thigh-pads': ''}, L.front);
      for (const sign of [-1, 1]) {
        path(back, bar(V(sign * 60, it.top + 8), V(sign * 60, -134), 6), 'frame-dark');
        path(front, bar(V(sign * 58, -134), V(sign * 28, -134), 10), 'pad');
        path(front, bar(V(sign * 56, -136), V(sign * 30, -136), 2), 'pad-light');
        circle(front, V(sign * 58, -134), 5, 'pad-light');
      }
    },
    update() {},
    bounds(ctx, it) { return [...E.types.benchFront.bounds(ctx, it), V(-64, -140), V(64, it.top)]; }
  };

  E.types.back_chestpad = {
    build(L, ctx, it) {
      const g = el('g', {class: 'eq back-chestpad', 'data-back-chest-surface': it.x}, L.back);
      path(g, rect(it.x + 12, it.top + 10, 8, -it.top - 10, 3), 'frame-dark');
      path(g, rect(it.x, it.top, 14, it.bottom - it.top, 7), 'pad');
      path(g, rect(it.x + 1.5, it.top + 8, 3, it.bottom - it.top - 16, 1.5), 'pad-light');
      path(g, rect(it.x - 2, -6, 44, 6, 2), 'frame');
      circle(g, V(it.x + 16, it.bottom + 14), 5, 'metal-mid');
    },
    update() {}, bounds(ctx, it) { return [V(it.x, it.top), V(it.x + 43, 0)]; }
  };

  function rollerCentre(ctx, it) {
    const a = ctx.joints.arms[it.hand], u = unit(sub(a.W, a.E)), down = V(-u.y, u.x);
    const contact = add(lerpV(a.E, a.W, it.fraction || .55), mul(down, it.clearance || 7));
    return {centre: add(contact, mul(down, it.r || 22)), contact};
  }
  E.types.back_roller = {
    build(L, ctx, it) {
      it.node = el('g', {class: 'eq back-roller', 'data-back-roller': ''}, L.back);
      const r = it.r || 22;
      path(it.node, `M-14,${-r - 4}L0,${-r}A${r},${r} 0 0 1 0,${r}L-14,${r - 4}Z`, 'roller');
      el('ellipse', {cx: -14, cy: -4, rx: r, ry: r, class: 'roller', opacity: .72}, it.node);
      circle(it.node, V(0, 0), r, 'roller');
      el('circle', {r: r - 7, fill: 'none', stroke: 'var(--pad-light)', 'stroke-width': 2}, it.node);
      it.ribs = el('g', null, it.node);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        path(it.ribs, `M${n1((r - 3) * Math.cos(a))},${n1((r - 3) * Math.sin(a))}L${n1((r - 7) * Math.cos(a))},${n1((r - 7) * Math.sin(a))}`, 'eq-line');
      }
      it.startX = rollerCentre(ctx, it).centre.x;
      this.update(ctx, it);
    },
    update(ctx, it) {
      const q = rollerCentre(ctx, it);
      it.node.setAttribute('transform', `translate(${n1(q.centre.x)} ${n1(q.centre.y)})`);
      it.node.dataset.contact = pt(q.contact);
      it.ribs.setAttribute('transform', `rotate(${n1((q.centre.x - it.startX) / (it.r || 22) / U.RAD)})`);
    },
    bounds(ctx, it) { const c = rollerCentre(ctx, it).centre, r = it.r || 22; return [V(c.x - r - 14, c.y - r - 4), V(c.x + r, c.y + r)]; }
  };
})(typeof window !== 'undefined' ? window : globalThis);

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

/* Shoulder-only equipment additions. The common body, camera and WKWebView runtime stay unchanged.
   Structure references and projection limits: docs/verification/training-shoulders/anatomy-upgrade/sources.md. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy, U = SA.util;
  const {V, add, sub, mul, unit, el, pt} = U, {rect, bar} = SA.equipment;
  const types = SA.equipment.types;

  // Suspension anchor, equalizer, two adjustable webbing straps, handle triangles and rubber grips.
  // Side-view projected length changes when the arms open in depth; eq.suspensionDepth preserves
  // the actual three-dimensional anchor-to-hand distance in the Y lesson.
  types.shoulders_trx = {
    build(L, ctx, it) {
      const A = it.anchor, g = el('g', {class: 'eq shoulders-trx'}, L.back);
      el('path', {d: rect(A.x - 30, A.y - 22, 60, 8, 3), class: 'frame-dark'}, g);
      el('path', {d: `M${A.x - 5},${A.y - 20}V${A.y - 8}Q${A.x},${A.y + 1} ${A.x + 5},${A.y - 8}V${A.y - 20}`, class: 'strap'}, g);
      el('path', {d: rect(A.x - 4, A.y - 9, 8, 12, 3), class: 'metal-mid'}, g);
      it.nodes = ['far', 'near'].map(s => {
        const back = el('g', {'data-suspension-hand': s}, s === 'far' ? L.back : L.front);
        const grip = el('path', {class: 'metal'}, ctx.figure.parts['hand:' + s].g);
        ctx.figure.parts['hand:' + s].g.insertBefore(grip, ctx.figure.parts['hand:' + s].g.firstChild);
        return {s, group: back, strap: el('path', {class: 'strap'}, back), buckle: el('path', {class: 'metal-mid'}, back),
          triangle: el('path', {class: 'strap', 'stroke-width': 2}, back), grip};
      });
    },
    update(ctx, it) {
      const A = it.anchor;
      it.nodes.forEach(n => {
        const h = ctx.joints.arms[n.s].H, d = unit(sub(h, A)), across = V(-d.y, d.x);
        const hook = sub(h, mul(d, 15)), buckle = add(A, mul(sub(hook, A), 0.38));
        n.strap.setAttribute('d', `M${pt(A)}L${pt(hook)}`);
        n.buckle.setAttribute('d', bar(sub(buckle, mul(d, 4)), add(buckle, mul(d, 4)), 6));
        n.triangle.setAttribute('d', `M${pt(add(h, mul(across, -9)))}L${pt(hook)}L${pt(add(h, mul(across, 9)))}`);
        const f = ctx.figure.parts['hand:' + n.s].frame;
        const worldToLocal = p => { const q = sub(p, f.A); return V(q.x * f.n.x + q.y * f.n.y, (q.x * f.u.x + q.y * f.u.y) / f.k); };
        n.grip.setAttribute('d', bar(worldToLocal(add(h, mul(across, -9))), worldToLocal(add(h, mul(across, 9))), 5));
        n.group.setAttribute('data-anchor-hand-length', U.n1(Math.hypot(h.x - A.x, h.y - A.y, ctx.eq && ctx.eq.suspensionDepth || 0)));
      });
    },
    bounds(ctx, it) { return [V(it.anchor.x - 30, it.anchor.y - 24), V(it.anchor.x + 30, it.anchor.y)]; }
  };

  // Rear view of a selectorized fly/rear-deltoid machine: fixed column, upper pivot assembly,
  // chest support (visible around the body's edges), adjustable seat, weight stack and pulleys.
  // Horizontal swing arms foreshorten in depth; the vertical downposts keep a fixed length.
  types.shoulders_reverseFly = {
    build(L, ctx, it) {
      const g = el('g', {class: 'eq shoulders-reverse-fly'}, L.back), cx = it.x || 0, seat = it.seat;
      el('path', {d: rect(cx - 10, -350, 20, 344, 4), class: 'frame-dark'}, g);
      el('path', {d: rect(cx - 90, -8, 180, 8, 4), class: 'frame'}, g);
      el('path', {d: rect(cx - 60, -349, 120, 16, 5), class: 'frame'}, g);
      // Stack sits behind the user's chest pad; its outer edge remains visible from the rear.
      el('path', {d: rect(cx + 58, -326, 42, 275, 5), class: 'frame-dark'}, g);
      el('path', {d: rect(cx + 63, -315, 32, 252, 4), class: 'metal-light'}, g);
      for (let i = 0; i < 11; i++) el('path', {d: rect(cx + 65, -169 + i * 9, 28, 7, 1), class: 'metal-mid'}, g);
      el('circle', {cx: cx + 87, cy: -137, r: 3.2, class: 'metal'}, g);
      el('path', {d: `M${cx + 79},-173V-312H${cx + 49}`, class: 'cable'}, g);
      el('circle', {cx: cx + 79, cy: -313, r: 7, class: 'metal-mid'}, g);
      el('circle', {cx: cx + 79, cy: -313, r: 3, class: 'metal-light'}, g);
      // Rounded chest/back pad. It is behind the back-facing figure, never over the muscle drawing.
      el('path', {d: rect(cx - 45, -235, 90, 97, 12), class: 'pad', 'data-contact': 'chest-pad'}, g);
      el('path', {d: rect(cx - 43, -225, 4, 77, 2), class: 'pad-light'}, g);
      el('path', {d: rect(cx + 39, -225, 4, 77, 2), class: 'pad-light'}, g);
      el('path', {d: rect(cx - 6, seat + 14, 12, -seat - 20, 2), class: 'frame-dark'}, g);
      el('path', {d: rect(cx - 38, seat, 76, 16, 6), class: 'pad', 'data-contact': 'seat'}, L.front);
      el('path', {d: rect(cx - 33, seat + 3, 66, 3, 1), class: 'pad-light'}, L.front);
      it.arms = ['r', 'l'].map(s => {
        const pivotX = cx + (s === 'r' ? 40 : -40);
        el('circle', {cx: pivotX, cy: -340, r: 8, class: 'metal-mid'}, g);
        return {s, top: el('path', {class: 'frame'}, g), post: el('path', {class: 'frame-dark'}, g),
          grip: el('path', {class: 'metal'}, ctx.figure.parts['hand:' + s].g)};
      });
      it.arms.forEach(a => {
        const hand = ctx.figure.parts['hand:' + a.s].g;
        hand.insertBefore(a.grip, hand.firstChild);
      });
    },
    update(ctx, it) {
      it.arms.forEach(a => {
        const h = ctx.joints.arms[a.s].H, pivot = V((it.x || 0) + (a.s === 'r' ? 40 : -40), -340);
        const top = V(h.x, h.y - 118);
        a.top.setAttribute('d', bar(pivot, top, 9));
        a.post.setAttribute('d', bar(top, h, 9));
        // A horizontal, freely pivoting grip lies across the palm, below the visible fingers.
        a.grip.setAttribute('d', bar(V(-13, 9), V(13, 9), 5));
        a.post.setAttribute('data-post-length', '118');
      });
    },
    bounds(ctx, it) { return [V(-105, -355), V(105, 0)]; }
  };

  // A roller rests on the mat's top rather than intersecting it.
  types.shoulders_roller = {
    build(L, ctx, it) {
      it.node = el('g', {transform: `translate(${it.x} ${it.y})`, 'data-contact': 'chest-roller'}, L.back);
      el('circle', {r: it.r, class: 'roller'}, it.node);
      el('circle', {r: it.r - 5, fill: 'none', stroke: 'var(--stage)', 'stroke-opacity': 0.5}, it.node);
    },
    update() {},
    bounds(ctx, it) { return [V(it.x - it.r, it.y - it.r), V(it.x + it.r, it.y + it.r)]; }
  };
})(typeof window !== 'undefined' ? window : globalThis);

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

/* Poses over time, camera fitting, and the three teaching panels. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy;
  const U = SA.util, R = SA.rig, {V, add, sub, mul, el, smooth, mix, clamp01, lerpV, unit} = U;

  /* -------------------------------------------------------------- motion */
  const DEFAULT_TIMING = {effortStart: 600, effortEnd: 2800, returnStart: 3300, returnEnd: 5700, duration: 6000};
  function effort(t, T) {
    if (t < T.effortStart || t >= T.returnEnd) return 0;
    if (t < T.effortEnd) return (1 - Math.cos(Math.PI * (t - T.effortStart) / (T.effortEnd - T.effortStart))) / 2;
    if (t < T.returnStart) return 1;
    return (1 + Math.cos(Math.PI * (t - T.returnStart) / (T.returnEnd - T.returnStart))) / 2;
  }
  const rigView = spec => spec.view === 'side' ? 'side' : 'front';
  function resolve(spec, name) {
    const poses = spec.poses || {};
    let p = R.merge(R.defaults(rigView(spec)), poses.base || {});
    if (typeof name === 'string') {
      const chain = [];
      for (let n = name; n && poses[n]; n = poses[n].from) chain.unshift(poses[n]);
      chain.forEach(q => { p = R.merge(p, q); });
    } else if (name) p = R.merge(p, name);
    return p;
  }
  /** Pose and activation at time t (ms). */
  function sample(spec, t) {
    const T = spec.timing || DEFAULT_TIMING;
    let pose, p;
    const keys = spec.track && spec.track.keys;
    if (keys && keys.length) {
      const D = T.duration, tt = ((t % D) + D) % D;
      let i = keys.length - 1;
      for (let k = 0; k < keys.length; k++) if (keys[k].t <= tt) i = k;
      const a = keys[i], b = keys[(i + 1) % keys.length];
      const t0 = a.t, t1 = b.t > t0 ? b.t : b.t + D;
      const e = U.ease((tt - t0) / ((t1 - t0) || 1));
      pose = R.blend(resolve(spec, a.pose), resolve(spec, b.pose), e);
      p = mix(a.p == null ? 0 : a.p, b.p == null ? 0 : b.p, e);
    } else {
      p = effort(t, T);
      pose = R.blend(resolve(spec, 'start'), resolve(spec, 'peak'), p);
    }
    const act = pose.act == null ? mix(0.22, 1, p) : pose.act;
    const solved = R.applyIK(rigView(spec), pose, pose.ik);
    return {pose: solved, p, act, joints: R.joints(rigView(spec), solved)};
  }
  const staticPose = (spec, name) => {
    const pose = resolve(spec, name);
    const solved = R.applyIK(rigView(spec), pose, pose.ik);
    return {pose: solved, p: 1, act: pose.act == null ? 1 : Math.max(0.85, pose.act), joints: R.joints(rigView(spec), solved)};
  };
  /** "arms.r.H", "shoulder", "legs.near.K" … */
  function jointAt(j, path) {
    let v = j;
    for (const k of path.split('.')) { if (v == null) return null; v = v[k]; }
    return v && typeof v.x === 'number' ? v : null;
  }

  /* -------------------------------------------------------------- camera */
  function jointPoints(j, view) {
    const pts = [];
    if (view === 'side') {
      pts.push(j.headTop, j.headPivot, j.shoulder, ...j.N);
      for (const s of ['near', 'far']) { const a = j.arms[s], l = j.legs[s]; pts.push(a.E, a.W, a.H, l.K, l.A, l.sole, l.heel, l.toe); }
    } else {
      pts.push(j.pelvis, j.neck, add(j.headPivot, mul(j.up, 40)));
      for (const s of ['r', 'l']) { const a = j.arms[s], l = j.legs[s]; pts.push(a.S, a.E, a.W, a.H, l.H, l.K, l.A, l.sole); }
    }
    return pts;
  }
  /** rotate (degrees) turns the whole scene, e.g. 90 lays a back-view figure flat as seen from above. */
  function fit(points, box, pad, mirror, rotate) {
    const a = (rotate || 0) * U.RAD, ca = Math.cos(a), sa = Math.sin(a);
    const turn = p => rotate ? V(p.x * ca - p.y * sa, p.x * sa + p.y * ca) : p;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    points.forEach(p0 => { if (!p0) return; const p = turn(p0); x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    x0 -= pad.side; x1 += pad.side; y0 -= pad.head; y1 += 2;
    const bx = box.x + pad.l, by = box.y + pad.t, bw = box.w - pad.l - pad.r, bh = box.h - pad.t - pad.b;
    const s = Math.min(bw / (x1 - x0), bh / (y1 - y0), pad.max || 1.05);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const tx = bx + bw / 2, ty = by + bh / 2 + (bh - (y1 - y0) * s) / 2 * (pad.floor ? 1 : 0);
    const k = mirror ? -s : s;
    return {s, k, cx, cy, tx, ty, toScreen: p0 => { const p = turn(p0); return V(tx + (p.x - cx) * k, ty + (p.y - cy) * s); },
      transform: `translate(${U.n1(tx)} ${U.n1(ty)}) scale(${+k.toFixed(4)} ${+s.toFixed(4)}) translate(${U.n1(-cx)} ${U.n1(-cy)})` +
        (rotate ? ` rotate(${rotate})` : '')};
  }

  const FOCUS = {
    upper: {front: ['arms.r.H', 'arms.l.H', 'arms.r.E', 'arms.l.E', 'headPivot', 'pelvis'], side: ['headTop', 'arms.near.H', 'arms.far.H', 'arms.near.E', 'hip', 'shoulder']},
    trunk: {front: ['arms.r.S', 'arms.l.S', 'headPivot', 'pelvis', 'legs.r.K', 'legs.l.K'], side: ['headTop', 'hip', 'shoulder', 'legs.near.K', 'N.4']}
  };
  /** Camera that fits the sampled poses (or a focus set of joints) into a box. */
  function cameraFor(spec, opts, items) {
    const view = spec.view, camSpec = Object.assign({side: view === 'side' ? 34 : 26, head: 8, l: 14, r: 14, t: opts.top == null ? 64 : opts.top, b: 12, max: 1.05},
      spec.camera || {}, opts.camera || {});
    if (opts.scale) camSpec.max = Math.min(camSpec.max, opts.scale);
    const pts = [], focus = camSpec.focus && (FOCUS[camSpec.focus] ? FOCUS[camSpec.focus][view === 'side' ? 'side' : 'front'] : camSpec.focus);
    const take = j => focus ? focus.map(f => jointAt(j, f)).filter(Boolean) : jointPoints(j, view);
    const ctx = {view, joints: null, eq: null};
    opts.samples.forEach(s => { pts.push(...take(s.joints)); ctx.joints = s.joints; ctx.eq = s.pose.eq;
      if (!focus || camSpec.withEquipment) (items || spec.equipment || []).forEach(it => pts.push(...SA.equipment.types[it.type].bounds(ctx, it))); });
    if (opts.ghostSample) pts.push(...take(opts.ghostSample.joints));
    return fit(pts, opts.box, camSpec, !!spec.mirror, spec.rotate);
  }
  /* -------------------------------------------------------------- stage */
  function defs(svg, prefix) {
    const d = el('defs', null, svg);
    const pat = el('pattern', {id: prefix + '-hatch', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(40)'}, d);
    el('rect', {width: 5, height: 5, fill: 'var(--skin)'}, pat);
    el('rect', {width: 2.2, height: 5, fill: 'var(--p)'}, pat);
    for (const [id, cls] of [['arrow', 'guide'], ['warn', 'warn']]) {
      const m = el('marker', {id: `${prefix}-${id}`, markerWidth: 10, markerHeight: 10, refX: 5.5, refY: 5, orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse'}, d);
      el('path', {d: 'M1,1L8,5L1,9', fill: 'none', stroke: cls === 'warn' ? 'var(--warn)' : 'var(--guide)', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'}, m);
    }
  }

  /** One drawn body with its equipment inside a box of the SVG. */
  function Stage(svg, spec, opts) {
    const view = spec.view, mirror = !!spec.mirror;
    const clipId = opts.prefix + '-clip';
    const cp = el('clipPath', {id: clipId}, svg.querySelector('defs') || el('defs', null, svg));
    el('rect', {x: opts.box.x, y: opts.box.y, width: opts.box.w, height: opts.box.h, rx: 22}, cp);
    const g = el('g', {class: 'stage-box', 'clip-path': `url(#${clipId})`}, svg);
    const groundLayer = el('g', null, g), cam = el('g', null, g);
    const back = el('g', {class: 'eq-back'}, cam), ghostLayer = el('g', null, cam), figLayer = el('g', null, cam), front = el('g', {class: 'eq-front'}, cam);
    const overlay = el('g', {class: 'overlay'}, g);
    const muscles = opts.muscles || spec.muscles;
    const ghost = opts.ghostPose ? SA.Figure(ghostLayer, {view, muscles: {}, prefix: opts.prefix, hands: spec.hands, behind: spec.behind, ghost: true}) : null;
    const figure = SA.Figure(figLayer, {view, muscles, prefix: opts.prefix, hands: spec.hands, behind: spec.behind});
    const items = (spec.equipment || []).map(e => Object.assign({}, e));
    const ctx = {view, figure, joints: null, eq: null};
    // equipment needs joints for hand-attached parts: prime with the first sample
    const first = opts.samples[0];
    ctx.joints = first.joints; ctx.eq = first.pose.eq; figure.update(first.joints);
    items.forEach(it => SA.equipment.types[it.type].build({back, front}, ctx, it));
    // camera fitted to every sampled pose plus equipment
    const camera = cameraFor(spec, opts, items);
    cam.setAttribute('transform', camera.transform);
    // ground line across the box
    if (spec.ground !== false) {
      const gy = camera.toScreen(V(0, 0)).y;
      if (gy < opts.box.y + opts.box.h - 2) el('path', {d: `M${opts.box.x + 10},${U.n1(gy)}H${opts.box.x + opts.box.w - 10}`, class: 'ground'}, groundLayer);
    }
    if (ghost) ghost.update(opts.ghostSample.joints);
    function update(sample) {
      ctx.joints = sample.joints; ctx.eq = sample.pose.eq;
      figure.update(sample.joints);
      items.forEach(it => SA.equipment.types[it.type].update(ctx, it));
      return ctx.joints;
    }
    return {g, cam, overlay, figure, camera, update, ctx};
  }

  /** Path of a joint across the effort (or between two keys), pushed away from a pivot. */
  function guidePath(spec, stage, g) {
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const p = mix(g.from == null ? 0.08 : g.from, g.to == null ? 0.96 : g.to, i / 28);
      const pose = R.blend(resolve(spec, g.a || 'start'), resolve(spec, g.b || 'peak'), p);
      const j = R.joints(rigView(spec), R.applyIK(rigView(spec), pose, pose.ik));
      let q = jointAt(j, g.joint); if (!q) continue;
      if (g.pivot) { const c = jointAt(j, g.pivot), d = sub(q, c); q = add(q, mul(unit(d), (g.push == null ? 16 : g.push))); }
      else if (g.offset) q = add(q, V(g.offset[0], g.offset[1]));
      pts.push(stage.camera.toScreen(q));
    }
    return pts.length > 1 ? smooth(pts, false) : '';
  }

  /* -------------------------------------------------------------- panels */
  const BOX = {x: 0, y: 0, w: 400, h: 400};
  function stageRect(svg, box) { el('rect', {x: box.x, y: box.y, width: box.w, height: box.h, rx: 22, class: 'stage'}, svg); }

  function MotionPanel(svg, spec, prefix) {
    defs(svg, prefix); stageRect(svg, BOX);
    const T0 = spec.timing || DEFAULT_TIMING, samples = [];
    for (let i = 0; i < 36; i++) samples.push(sample(spec, T0.duration * i / 36));
    // No corner labels in the moving picture: their leader lines crossed the body and the
    // equipment. The native screen lists the coloured muscles under the animation instead.
    const stage = Stage(svg, spec, {prefix, box: BOX, samples, camera: {t: 22}});
    // motionGuide:false keeps the trajectory for the detail arrow only, where it
    // would otherwise cross the head or trunk in the moving picture.
    const guides = (spec.motionGuide === false ? [] : spec.guides || (spec.guide ? [spec.guide] : [])).map(g => {
      const node = el('path', {d: guidePath(spec, stage, g), class: 'guide'}, stage.overlay);
      return {g, node};
    });
    return function render(t) {
      const T = spec.timing || DEFAULT_TIMING, s = sample(spec, t);
      s.joints = stage.update(s);
      svg.style.setProperty('--act', s.act.toFixed(3));
      svg.style.setProperty('--act2', (0.18 + 0.55 * s.act).toFixed(3));
      const up = !(spec.track && spec.track.keys) && t >= T.effortStart && t < T.effortEnd;
      const down = !(spec.track && spec.track.keys) && t >= T.returnStart && t < T.returnEnd;
      guides.forEach(({node}) => {
        node.removeAttribute('marker-end'); node.removeAttribute('marker-start');
        if (up) node.setAttribute('marker-end', `url(#${prefix}-arrow)`);
        if (down) node.setAttribute('marker-start', `url(#${prefix}-arrow)`);
        node.style.opacity = up || down ? 1 : 0.5;
      });
      return s;
    };
  }

  function DetailPanel(svg, spec, prefix) {
    defs(svg, prefix); stageRect(svg, BOX);
    const d = spec.detail || {}, main = staticPose(spec, d.pose || 'peak');
    const ghostSample = d.ghost === null ? null : staticPose(spec, d.ghost || 'start');
    const stage = Stage(svg, spec, {prefix, box: BOX, samples: [main], ghostPose: !!ghostSample, ghostSample, top: 22});
    main.joints = stage.update(main);
    svg.style.setProperty('--act', 1); svg.style.setProperty('--act2', 0.75);
    (d.arrows || (spec.guide ? [Object.assign({}, spec.guide, {from: 0.05, to: 0.97})] : [])).forEach(a => {
      el('path', {d: guidePath(spec, stage, Object.assign({push: 0}, a)), class: 'arrow', 'marker-end': `url(#${prefix}-arrow)`}, stage.overlay);
    });
    const callouts = d.callouts || [];
    callouts.forEach(c => {
      const at = jointAt(main.joints, c.at); if (!at) return;
      const p = stage.camera.toScreen(at), q = add(p, V(c.dx || 0, c.dy || 0));
      const g = el('g', {class: 'callout'}, stage.overlay);
      if (c.dx || c.dy) { el('path', {d: `M${U.pt(p)}L${U.pt(q)}`, class: 'leader'}, g); el('circle', {cx: U.n1(p.x), cy: U.n1(p.y), r: 2.2, class: 'pin'}, g); }
      el('circle', {cx: U.n1(q.x), cy: U.n1(q.y), r: 8.5}, g);
      el('text', {x: U.n1(q.x), y: U.n1(q.y + 4), class: 'num'}, g).textContent = String(c.n);
    });
    // The numbered list and the muscle colours are listed natively under the picture;
    // drawn here they covered the legs, seat and machine.
    return [{role: 'detail', sample: main}];
  }

  function MistakePanel(svg, spec, prefix) {
    defs(svg, prefix); stageRect(svg, BOX);
    const mk = spec.mistake || {};
    const goodName = mk.good || (spec.detail && spec.detail.pose) || 'peak';
    const good = staticPose(spec, goodName);
    const badPose = R.merge(R.merge(resolve(spec, goodName), {}), mk.pose || {});
    const badSolved = R.applyIK(rigView(spec), badPose, badPose.ik);
    const bad = {pose: badSolved, p: 1, act: 1, joints: R.joints(rigView(spec), badSolved)};
    const divider = el('path', {d: 'M200,58V384', class: 'divider'}, svg);
    // Header strip in the stage colour: tall equipment ended under the captions.
    const header = el('g', null, svg);
    el('path', {d: 'M0,22A22,22 0 0 1 22,0H378A22,22 0 0 1 400,22V58H0Z', class: 'stage'}, header);
    svg.style.setProperty('--act', 1); svg.style.setProperty('--act2', 0.75);
    const halves = [[good, {x: 0, y: 0, w: 200, h: 400}, spec.muscles, '✓ 正确', 'good'],
      [bad, {x: 200, y: 0, w: 200, h: 400}, mk.muscles || spec.muscles, '✗ 错误', 'bad']];
    const camOpts = {l: 10, r: 10};
    Object.assign(camOpts, mk.camera || {});
    const scale = Math.min(...halves.map(([s, box]) => cameraFor(spec, {box, samples: [s], top: 70, camera: camOpts}).s));
    halves.forEach(([s, box, muscles, title, kind], i) => {
      const st = Stage(svg, spec, {prefix: prefix + '-' + i, box, samples: [s], muscles, top: 70, camera: camOpts, scale});
      s.joints = st.update(s);
      el('text', {x: box.x + box.w / 2, y: 30, class: 'verdict ' + kind, 'text-anchor': 'middle'}, header).textContent = title;
      const caption = kind === 'good' ? (mk.goodText || '') : (mk.text || '');
      if (caption) el('text', {x: box.x + box.w / 2, y: 50, class: kind === 'good' ? 'lbl-sub' : 'warn-text', 'text-anchor': 'middle'}, header).textContent = caption;
      if (kind === 'bad') (mk.marks || []).forEach(m => {
        const at = jointAt(s.joints, m.at); if (!at) return;
        const p = st.camera.toScreen(m.off ? add(at, V(m.off[0], m.off[1])) : at);
        if (m.type === 'arrow') {
          const q = add(p, V(m.dx || 0, m.dy || -26));
          el('path', {d: `M${U.pt(q)}L${U.pt(p)}`, class: 'warn-mark', 'marker-end': `url(#${prefix}-warn)`}, st.overlay);
        } else if (m.type === 'x') {
          const r = 7;
          el('path', {d: `M${p.x - r},${p.y - r}L${p.x + r},${p.y + r}M${p.x + r},${p.y - r}L${p.x - r},${p.y + r}`, class: 'warn-mark'}, st.overlay);
        } else el('circle', {cx: U.n1(p.x), cy: U.n1(p.y), r: m.r || 16, class: 'warn-mark'}, st.overlay);
      });
    });
    svg.appendChild(divider); svg.appendChild(header);
    return halves.map(([sample, , , , role]) => ({role, sample}));
  }

  SA.scene = {DEFAULT_TIMING, effort, resolve, sample, staticPose, jointAt, fit, MotionPanel, DetailPanel, MistakePanel};
})(typeof window !== 'undefined' ? window : globalThis);

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
};})();

/* Offline video-derived lesson; same native millisecond bridge as existing artwork. */
(()=>{'use strict';const SA=window.SteadyAnatomy,spec=window.SteadyReferenceLesson;
if(!spec)return;
const style=document.createElement('style');style.textContent=SA.CSS+'#detail{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(2,minmax(0,1fr));gap:4px}#detail[hidden]{display:none}figure{margin:0;min-width:0;min-height:0}figure svg{width:100%;height:calc(100% - 30px)}figcaption{color:var(--label);font-size:12px;text-align:center;height:30px}';document.head.append(style);
const svg=(host,label)=>SA.util.el('svg',{viewBox:'0 0 400 400',role:'img','aria-label':label},host);
const motion=SA.scene.MotionPanel(svg(document.getElementById('motion'),spec.title),spec,'reference-motion');
const renderers={motion};const samples={};let modeBuilt=new Set();
function ensure(mode){if(modeBuilt.has(mode))return;
if(mode==='detail'){for(const [i,k] of spec.referenceFrames.entries()){const f=document.createElement('figure');document.getElementById('detail').append(f);const render=SA.scene.MotionPanel(svg(f,k.caption),spec,`reference-detail-${i}`);render(k.time);const c=document.createElement('figcaption');c.textContent=`${i+1}. ${k.caption} · 原片 ${k.sourceSeconds.toFixed(2)}s`;f.append(c);}}
if(mode==='mistakes') samples.mistakes=SA.scene.MistakePanel(svg(document.getElementById('mistakes'),'正确与错误教学示意'),spec,'reference-mistakes');
modeBuilt.add(mode);}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');const state={mode:'motion',playing:false,time:0,speed:1,seekRevision:-1};let raf=0,last=null,lastReport=0;
const report=event=>window.webkit?.messageHandlers?.lesson?.postMessage({event,time:state.time});
function draw(){samples.motion=motion(state.time);}
function cancel(){cancelAnimationFrame(raf);raf=0;last=null;}
function stop(){cancel();state.playing=false;report('progress');}
function frame(now){if(!state.playing||document.hidden||reduced.matches){stop();return;}if(last!==null)state.time=(state.time+Math.min(now-last,100)*state.speed)%spec.timing.duration;last=now;draw();if(now-lastReport>100){report('progress');lastReport=now;}raf=requestAnimationFrame(frame);}
window.setLessonState=c=>{cancel();state.mode=['motion','detail','mistakes'].includes(c.mode)?c.mode:'motion';state.speed=Number.isFinite(c.speed)&&c.speed>0?Math.min(c.speed,2):1;
if(c.seekRevision!==undefined&&c.seekRevision!==state.seekRevision){state.time=Number.isFinite(c.seekTime)?Math.max(0,Math.min(c.seekTime,spec.timing.duration)):0;state.seekRevision=c.seekRevision;}
document.documentElement.dataset.dark=String(!!c.dark);ensure(state.mode);for(const mode of ['motion','detail','mistakes'])document.getElementById(mode).hidden=state.mode!==mode;
state.playing=!!c.playing&&state.mode==='motion'&&!document.hidden&&!reduced.matches;draw();report('progress');if(state.playing)raf=requestAnimationFrame(frame);};
window.stopLesson=stop;document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});reduced.addEventListener('change',()=>{if(reduced.matches)stop();});
window.SteadyLessonSample=t=>SA.scene.sample(spec,t);window.SteadyLessonPlaybackState=()=>({...state,duration:spec.timing.duration});window.SteadyLessonRenderedSamples=()=>state.mode==='mistakes'?samples.mistakes:[{role:state.mode,sample:samples.motion}];
draw();report('ready');})();
