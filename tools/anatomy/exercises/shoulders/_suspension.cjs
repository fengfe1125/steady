// Geometry used only when authoring the shoulder Y spec. Every generated pose stays plain data.
// Both arm segments retain their 3-D length; f is their projection into the side plane.
const R = Math.PI / 180;
const vecUp = (a, l) => ({x: l * Math.sin(a * R), y: -l * Math.cos(a * R)});
const add = (a, b) => ({x: a.x + b.x, y: a.y + b.y});
function shoulder(p) {
  const a0 = p.pelvis, a1 = a0 + (p.lumbar || 0), a2 = a1 + (p.thorax || 0);
  let n = add({x: p.x, y: p.y}, add(vecUp(a0, 6), vecUp(a0 + 90, -4)));
  n = add(n, vecUp(a0, 22)); n = add(n, vecUp(a1, 39));
  return add(n, add(vecUp(a2, 52 * 0.56 + (p.scapE || 0)), vecUp(a2 + 90, 4 + (p.scapP || 0))));
}
function planarArm(p) {
  const a = p.arms.near, sh = a.sh - p.pelvis - (p.lumbar || 0) - (p.thorax || 0);
  return {x: 64 * Math.sin(sh * R) + 59 * Math.sin((sh + a.el) * R),
    y: 64 * Math.cos(sh * R) + 59 * Math.cos((sh + a.el) * R)};
}
function closeY(p, anchor, length) {
  const s = shoulder(p), b = planarArm(p), d = {x: s.x - anchor.x, y: s.y - anchor.y};
  const aa = b.x * b.x + b.y * b.y - 123 * 123, bb = 2 * (d.x * b.x + d.y * b.y);
  const cc = d.x * d.x + d.y * d.y + 123 * 123 - length * length;
  const disc = bb * bb - 4 * aa * cc;
  if (disc < 0) throw new Error('Shoulder Y suspension closure has no real solution');
  const roots = [(-bb + Math.sqrt(disc)) / (2 * aa), (-bb - Math.sqrt(disc)) / (2 * aa)];
  const f = roots.find(n => n > 0 && n <= 1.000001);
  if (f == null) throw new Error('Shoulder Y suspension projection outside the arm range');
  const projection = Math.min(1, f), depth = 123 * Math.sqrt(Math.max(0, 1 - projection * projection));
  return {...p, arms: {near: {...p.arms.near, f: projection, ff: projection}, far: {...p.arms.far, f: projection, ff: projection}},
    eq: {suspensionDepth: depth}};
}
module.exports = {shoulder, planarArm, closeY};
