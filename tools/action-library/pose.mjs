// Turns a declarative action spec (plain JSON, see PROMPT.md) into a pose function p∈[0,1] → rig pose.
// Specs never contain code: keyframe angles are blended, then the body is moved to its anchor and
// limbs are solved onto fixed contacts, so supports cannot drift no matter how the angles are tuned.
import {SA} from '../anatomy/exercises/equipment/_shared/library.mjs';

const R = SA.rig, U = SA.util;
const full = (view, pose) => R.merge(R.defaults(view), pose ?? {});
export const solve = (view, pose) => R.joints(view, R.applyIK(view, pose, pose.ik));

/** Named body points shared by anchors, relative contacts and the checks. */
export function point(view, j, name, side) {
  const arm = side && j.arms[side], leg = side && j.legs[side];
  const table = {
    hip: j.hip ?? j.pelvis, shoulder: view === 'side' ? j.shoulder : arm?.S, head: j.headTop,
    elbow: arm?.E, wrist: arm?.W, hand: arm?.H, knee: leg?.K, ankle: leg?.A, sole: leg?.sole,
    toe: leg?.toe ?? leg?.sole, heel: leg?.heel ?? leg?.sole,
  };
  const v = table[name];
  if (!v) throw new Error(`Unknown body point ${name}${side ? '.' + side : ''} for ${view} view`);
  return v;
}

function blendAt(spec, p) {
  const levels = Object.keys(spec.poses).map(Number).sort((a, b) => a - b);
  if (levels[0] !== 0 || levels.at(-1) !== 1) throw new Error('poses needs keys "0" and "1"');
  let i = 0;
  while (i < levels.length - 2 && p > levels[i + 1]) i++;
  const a = levels[i], b = levels[i + 1], u = Math.max(0, Math.min(1, (p - a) / (b - a)));
  return R.blend(full(spec.view, spec.poses[String(a)]), full(spec.view, spec.poses[String(b)]), u);
}

function anchor(spec, pose) {
  const A = spec.anchor;
  if (!A) return pose;
  const at = point(spec.view, solve(spec.view, pose), A.point, A.side);
  pose.x += A.at.x - at.x;
  pose.y += A.at.y - at.y;
  return pose;
}

// Normalised to (-180, 180] so neighbouring frames never blend through a full turn.
const wrap = a => { while (a > 180) a -= 360; while (a <= -180) a += 360; return a; };

function placeHand(view, pose, side, t) {
  const j = R.joints(view, pose), arm = pose.arms[side], f = arm.f ?? 1, ff = arm.ff ?? 1;
  const S = view === 'side' ? j.shoulder : j.arms[side].S;
  const sign = view === 'side' ? 1 : (side === 'r' ? 1 : -1);
  // flat: palm on a surface, fingers along +x; the wrist sits one hand length behind the target.
  const target = t.flat ? U.V(t.x - R.LEN.hand * ff, t.y) : U.V(t.x, t.y);
  const lower = (t.flat ? R.LEN.fore : R.LEN.fore + R.LEN.hand) * ff;
  const s = U.solve2(S, target, R.LEN.upper * f, lower, (t.bend ?? 1) * sign);
  if (!s.reach) throw new Error(`hand.${side} cannot reach (${t.x.toFixed(1)}, ${t.y.toFixed(1)}): move the contact or the body`);
  const upper = U.angleFromDown(U.sub(s.mid, S)), fore = U.angleFromDown(U.sub(s.end, s.mid));
  pose.arms[side] = view === 'side'
    ? {...arm, sh: wrap(upper + j.angles.thorax), el: wrap(fore - upper), wr: t.flat ? wrap(90 - fore) : (t.wr ?? 0)}
    : {...arm, abd: sign * (upper - (pose.lean || 0)), el: wrap(sign * (fore - upper))};
}

/** Contacts given as {from, side, dx, dy} are resolved once on the pose at `atLevel`, then held fixed. */
function resolveContacts(spec) {
  const out = {hand: {}, ankle: {}};
  for (const kind of ['hand', 'ankle']) {
    for (const [side, c] of Object.entries(spec.contacts?.[kind] ?? {})) {
      if (c.from === undefined) { out[kind][side] = c; continue; }
      const ref = anchor(spec, blendAt(spec, c.atLevel ?? 0));
      const base = point(spec.view, solve(spec.view, ref), c.from, c.fromSide ?? (c.from === 'shoulder' && spec.view === 'side' ? undefined : side));
      out[kind][side] = {...c, x: base.x + (c.dx ?? 0), y: c.y ?? base.y + (c.dy ?? 0)};
    }
  }
  return out;
}

export function makePose(spec) {
  const contacts = resolveContacts(spec);
  return (p, override) => {
    let pose = blendAt(spec, p);
    if (override) pose = R.merge(pose, override);
    pose = anchor(spec, pose);
    for (const [side, t] of Object.entries(contacts.hand)) placeHand(spec.view, pose, side, t);
    if (Object.keys(contacts.ankle).length) pose.ik = R.merge(pose.ik ?? {}, {ankle: contacts.ankle});
    pose.act = (spec.activation?.[0] ?? 0.3) + ((spec.activation?.[1] ?? 1) - (spec.activation?.[0] ?? 0.3)) * p;
    return pose;
  };
}

export {SA, R, U};
