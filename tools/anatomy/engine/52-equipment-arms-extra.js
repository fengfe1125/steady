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
