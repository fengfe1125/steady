// Shared helpers for lesson specs. Specs stay plain data at build time; these only compute numbers.
export const R = Math.PI / 180;
export const LEN = {thigh: 87, shank: 88, ankle: 14, upper: 64, fore: 50, hand: 9};
const fromDownDeg = (dx, dy) => Math.atan2(dx, dy) / R;

/** Two-bone solve; returns the middle joint. bend picks the side of the root→target line. */
export function solve2(A, C, l1, l2, bend) {
  const dx = C.x - A.x, dy = C.y - A.y, d0 = Math.hypot(dx, dy);
  const D = Math.min(Math.max(d0, Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3), ux = dx / d0, uy = dy / d0;
  const a = (l1 * l1 - l2 * l2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  return {mid: {x: A.x + ux * a - uy * bend * h, y: A.y + uy * a + ux * bend * h}, end: {x: A.x + ux * D, y: A.y + uy * D}};
}

/** Front/back rig: shoulder joint position for a pelvis at (x, y) with optional lean and shoulder elevation. */
export const frontShoulder = (side, pelvis = {x: 0, y: -189}, scapE = 0) => ({x: pelvis.x + (side === 'r' ? 40 : -40), y: pelvis.y - 96 - scapE});

/** Front/back rig arm angles that put the hand centre at target T. */
export function frontArm(side, T, pelvis, opts = {}) {
  const sign = side === 'r' ? 1 : -1, S = frontShoulder(side, pelvis, opts.scapE || 0);
  const f = opts.f == null ? 1 : opts.f, ff = opts.ff == null ? 1 : opts.ff;
  const r = solve2(S, T, LEN.upper * f, (LEN.fore + LEN.hand) * ff, (opts.bend == null ? 1 : opts.bend) * sign);
  const upperAbs = fromDownDeg(r.mid.x - S.x, r.mid.y - S.y), foreAbs = fromDownDeg(r.end.x - r.mid.x, r.end.y - r.mid.y);
  return Object.assign({abd: sign * upperAbs, el: sign * (foreAbs - upperAbs)}, opts.f == null ? {} : {f}, opts.ff == null ? {} : {ff});
}

/** Side rig: a straight body pivoting at the ankles, leaning back by deg (negative leans forward). */
export function leanBack(deg, footX = 0, farFootX = footX - 24) {
  const L = LEN.thigh + LEN.shank;
  return {x: footX - Math.sin(deg * R) * L, y: -LEN.ankle - Math.cos(deg * R) * L, pelvis: -deg,
    ik: {ankle: {near: {x: footX, y: -LEN.ankle, foot: 0}, far: {x: farFootX, y: -LEN.ankle, foot: 0}}}};
}
