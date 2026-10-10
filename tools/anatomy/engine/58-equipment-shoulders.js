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
