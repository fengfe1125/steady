// Automatic gate for action specs. Prints one line per problem; exit code 1 if any spec fails.
//   node tools/action-library/check.mjs --part chest      or      node tools/action-library/check.mjs <spec.json> [...]
// Passing here is necessary, not sufficient: every spec is still reviewed against its comparison sheet.
import fs from 'node:fs';
import path from 'node:path';
import {makePose, solve, point, R} from './pose.mjs';
import {specFiles, progress} from './build.mjs';

const MUSCLES = new Set(['abs', 'adductors', 'biceps', 'brachialis', 'brachioradialis', 'deltoid.ant', 'deltoid.lat', 'deltoid.post', 'erectors', 'forearm.ext', 'forearm.flex', 'gastrocnemius', 'glute.max', 'glute.med', 'hamstrings', 'iliopsoas', 'infraspinatus', 'lats', 'obliques', 'pec.lower', 'pec.upper', 'quads.rf', 'quads.vl', 'quads.vm', 'rhomboid', 'serratus', 'soleus', 'teres', 'tfl', 'tibialis', 'trap.lower', 'trap.mid', 'trap.upper', 'triceps.lat', 'triceps.long']);
const EQUIPMENT = new Set(['mat', 'bench', 'dumbbell', 'roller', 'band', 'trx', 'chest_wall', 'wall_back', 'library_dumbbell', 'library_goblet', 'barbell', 'smith', 'ball', 'bosu', 'ring', 'kettlebell', 'pushup_bars', 'box', 'cable', 'chest_parallelBars', 'reference_press', 'library_chestPress', 'lever', 'top', 'vipr', 'sandbag', 'massage_gun', 'pullup_bar', 'pulldown']);
const TEXT = ['title', 'variant', 'cue', 'observation'];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function sourceText(id, file) {
  // Cloud lanes carry no source library: the description is the last section of input.md beside the JSON.
  const pack = path.join(path.dirname(file), 'input.md');
  if (fs.existsSync(pack)) return fs.readFileSync(pack, 'utf8').split('禁止原句照抄进输出）').at(-1);
  const lib = process.env.ACTION_LIBRARY ?? '/Volumes/Developer/Projects/keep/action-library';
  if (!fs.existsSync(path.join(lib, 'actions'))) return null;
  const dir = fs.readdirSync(path.join(lib, 'actions')).find(n => n.startsWith(id + '_'));
  if (!dir) return null;
  const d = JSON.parse(fs.readFileSync(path.join(lib, 'actions', dir, 'detail.json'), 'utf8'));
  return (d.description ?? '').replace(/<[^>]+>/g, '');
}

// Long verbatim runs from the source description must not reach the App.
function copied(text, source) {
  if (!source) return null;
  for (let i = 0; i + 12 <= text.length; i++) if (source.includes(text.slice(i, i + 12))) return text.slice(i, i + 12);
  return null;
}

export function check(spec, file, withSource = true) {
  const errors = [], warn = [];
  const fail = m => errors.push(m);
  if (path.basename(file, '.json') !== spec.sourceID) fail('file name must equal sourceID');
  if (!['side', 'front', 'back'].includes(spec.view)) fail('view must be "side", "front" or "back"');
  if (typeof spec.mirror !== 'boolean') fail('mirror must be true or false');
  for (const k of TEXT) if (typeof spec[k] !== 'string' || !spec[k].trim()) fail(`missing text: ${k}`);
  const t = spec.times, l = spec.levels;
  if (!Array.isArray(t) || t.length !== 6 || t.some((x, i) => i && x <= t[i - 1])) fail('times: exactly 6 strictly increasing seconds');
  else if (t.at(-1) - t[0] < 0.8 || t.at(-1) - t[0] > 12) fail('times: one repetition should last 0.8–12 s');
  if (!Array.isArray(l) || l.length !== 6 || l[0] !== 0 || l[5] !== 0 || Math.max(...l) !== 1 || l.some(x => x < 0 || x > 1)) fail('levels: 6 values in [0,1], first and last 0, peak exactly 1');
  for (const m of [...(spec.muscles?.primary ?? []), ...(spec.muscles?.secondary ?? [])]) if (!MUSCLES.has(m) && ![...MUSCLES].some(k => k.startsWith(m + '.'))) fail(`unknown muscle key: ${m}`);
  if (!spec.muscles?.primary?.length) fail('muscles.primary is empty');
  for (const e of spec.equipment ?? []) if (!EQUIPMENT.has(e.type)) fail(`unknown equipment type: ${e.type}`);
  if (!spec.mistake?.title || !spec.mistake?.fix || !spec.mistake?.basis) fail('mistake needs title, fix, basis');
  // scapE only exists on front-view figures; in a side view it silently blanks the mistake panel.
  if (spec.view === 'side' && JSON.stringify(spec.mistake?.override ?? {}).includes('scapE')) fail('mistake.override: scapE only works in front view; for a side-view shrug use neck/head/thorax (e.g. {"neck": 4, "head": 10, "thorax": 6})');
  const source = withSource ? sourceText(spec.sourceID, file) : null;
  for (const k of ['cue', 'variant', 'title']) { const c = typeof spec[k] === 'string' && copied(spec[k], source); if (c) fail(`${k} copies the source description verbatim ("${c}…"): rewrite it`); }
  for (const k of ['title', 'fix']) { const c = spec.mistake?.[k] && copied(spec.mistake[k], source); if (c) fail(`mistake.${k} copies the source verbatim ("${c}…"): rewrite it`); }
  if (errors.length) return {errors, warn};

  let pose;
  try { pose = makePose(spec); } catch (e) { return {errors: [e.message], warn}; }
  const ankleTargets = spec.contacts?.ankle ?? {};
  let previous, fingerprint = [];
  for (let i = 0; i <= 100; i++) {
    const p = (1 - Math.cos(2 * Math.PI * i / 100)) / 2;
    let q, j;
    try { q = pose(p); j = solve(spec.view, q); } catch (e) { fail(`p=${p.toFixed(2)}: ${e.message}`); break; }
    const pts = [j.headTop, ...Object.values(j.arms).flatMap(a => [a.E, a.W, a.H]), ...Object.values(j.legs).flatMap(g => [g.K, g.A, g.sole])];
    if (pts.some(v => !Number.isFinite(v.x) || !Number.isFinite(v.y))) { fail(`p=${p.toFixed(2)}: non-finite joint`); break; }
    const low = pts.find(v => v.y > 1);
    if (low) { fail(`p=${p.toFixed(2)}: a joint is below the floor (y=${low.y.toFixed(1)}); check bend signs and ankle values`); break; }
    const out = pts.find(v => Math.abs(v.x) > 230 || v.y < -470);
    if (out) { fail(`p=${p.toFixed(2)}: body leaves the stage (${out.x.toFixed(0)}, ${out.y.toFixed(0)}); move anchor.at`); break; }
    for (const [side, c] of Object.entries(spec.contacts?.hand ?? {})) {
      const target = c.from === undefined ? c : null, H = j.arms[side].H;
      if (target && dist(H, target) > 1) { fail(`p=${p.toFixed(2)}: hand.${side} slips off its contact`); break; }
    }
    for (const [side, c] of Object.entries(ankleTargets)) if (dist(j.legs[side].A, c) > 1) { fail(`p=${p.toFixed(2)}: ankle.${side} cannot reach (${c.x}, ${c.y})`); break; }
    if (spec.anchor) { const a = point(spec.view, j, spec.anchor.point, spec.anchor.side); if (dist(a, spec.anchor.at) > 0.5) fail(`p=${p.toFixed(2)}: anchor drifts`); }
    if (previous) {
      for (const k of Object.keys(j.arms)) if (dist(j.arms[k].H, previous.arms[k].H) > 15) { fail(`p=${p.toFixed(2)}: hand.${k} jumps (a pose angle wraps around ±180°?)`); break; }
      if (dist(j.headTop, previous.headTop) > 15) fail(`p=${p.toFixed(2)}: head jumps`);
    }
    previous = j;
    if (i % 10 === 0) fingerprint.push(...pts.map(v => [v.x, v.y]).flat());
    if (errors.length) break;
  }
  if (errors.length) return {errors, warn};
  // A cycle that hardly moves is almost always a copied pose with a new title.
  const j0 = solve(spec.view, pose(0)), j1 = solve(spec.view, pose(1));
  const travel = Math.max(...Object.keys(j0.arms).map(k => dist(j0.arms[k].H, j1.arms[k].H)), dist(j0.headTop, j1.headTop),
    ...Object.keys(j0.legs).map(k => dist(j0.legs[k].A, j1.legs[k].A)), dist(j0.hip ?? j0.pelvis, j1.hip ?? j1.pelvis));
  if (travel < 12) warn.push(`start and peak differ by only ${travel.toFixed(1)} units; is this a static hold?`);
  try {
    const j = solve(spec.view, pose(spec.mistake.level ?? 1, spec.mistake.override));
    const low = [j.headTop, ...Object.values(j.arms).flatMap(a => [a.E, a.W, a.H]), ...Object.values(j.legs).flatMap(g => [g.K, g.A, g.sole])].find(v => v.y > 1);
    if (low) fail(`mistake pose: a joint is below the floor (y=${low.y.toFixed(1)}); make the override smaller`);
  } catch (e) { fail('mistake pose: ' + e.message); }
  return {errors, warn, fingerprint};
}

const handDx = s => JSON.stringify(Object.values(s.contacts?.hand ?? {}).map(h => h.dx));
// Grip counts as equipment: a V handle and a rope on the same machine are different variants.
const kit = s => (s.equipment ?? []).map(e => e.type + (e.grip ? ':' + e.grip : '')).sort().join(',');
const span = s => Math.max(0.1, (s.times?.at(-1) ?? 1) - (s.times?.[0] ?? 0));
const rms = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) / a.length);
const fingerprints = new Map();
// Sampled skeletons of every other spec in the same part folder, for the copy check.
function neighbours(file) {
  const dir = path.dirname(file);
  if (!fingerprints.has(dir)) {
    const all = [];
    for (const n of fs.readdirSync(dir).filter(n => n.endsWith('.json'))) {
      try { const s = JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')); const r = check(s, path.join(dir, n), false); if (r.fingerprint) all.push({id: s.sourceID, title: s.title, fp: r.fingerprint, kit: kit(s), span: span(s), times: s.times, dx: handDx(s)}); } catch {}
    }
    fingerprints.set(dir, all);
  }
  return fingerprints.get(dir);
}

const results = [];
let failed = 0;
for (const file of specFiles(process.argv.slice(2))) {
  let spec;
  try { spec = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.log(`✗ ${path.basename(file)}: invalid JSON: ${e.message}`); failed++; continue; }
  const r = check(spec, file);
  if (r.fingerprint) for (const o of neighbours(file)) {
    if (o.id === spec.sourceID || o.fp.length !== r.fingerprint.length) continue;
    const d = rms(o.fp, r.fingerprint);
    // Same skeleton path is legitimate when the equipment or the tempo differs (bodyweight vs dumbbell press, fast vs slow reps).
    const distinct = o.kit !== kit(spec) || JSON.stringify(o.times) !== JSON.stringify(spec.times) || o.dx !== handDx(spec);
    if (d < 1.5 && !distinct) r.errors.push(`moves exactly like ${o.id} (${o.title}); a different variant must differ in hand width, support height or body angle`);
    else if (d < 1.5) r.warn.push(`moves exactly like ${o.id} (${o.title}) but differs in equipment, timing or hand placement; reviewer will compare them`);
    else if (d < 4) r.warn.push(`moves almost like ${o.id} (${o.title}), rms ${d.toFixed(1)}; reviewer will compare them`);
  }
  results.push(r);
  if (r.errors.length) failed++;
  console.log(`${r.errors.length ? '✗' : '✓'} ${spec.sourceID} ${spec.title ?? ''}`);
  for (const e of r.errors) console.log('    error: ' + e);
  for (const w of r.warn) console.log('    warn:  ' + w);
}
console.log(`${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
