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
