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
