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
