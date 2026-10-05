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
