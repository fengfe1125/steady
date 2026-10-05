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
