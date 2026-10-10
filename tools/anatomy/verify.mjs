// Offline checks for the generated anatomy lessons.
//   node tools/anatomy/verify.mjs [--only shoulders,arms] [--report result.json]
//   node tools/anatomy/verify.mjs --coverage-only  → strict expected 97-lesson inventory, read-only
// Static: CSP, no network URLs, panel ids, identical engine copies, muscle ids.
// Kinematic (60 samples per cycle): finite joints, bone lengths, joint ranges, IK contacts reached, feet above ground.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {ENGINE_NAME, CSP, engineSource, loadLessons, lessonHTML, selectedTopics, lessonCoverage, coverageSummary} from './build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const only = selectedTopics(args);
const lessons = await loadLessons(only);
const coverage = lessonCoverage(lessons, only);
console.log(`coverage: ${coverageSummary(coverage)}`);
const reportFlag = args.indexOf('--report');
const reportPath = reportFlag >= 0 ? args[reportFlag + 1] : null;
if (reportFlag >= 0 && (!reportPath || reportPath.startsWith('--'))) throw new Error('--report needs a JSON output path');
const saveReport = report => { if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n'); };
if (!coverage.complete) for (const row of coverage.missing) console.error(`✗ missing spec: ${row.topic}/${row.id} → ${row.resource}`);
if (args.includes('--coverage-only')) {
  saveReport({coverage, status: coverage.complete ? 'covered' : 'incomplete',
    limits: ['Inventory only; generated pages, rendering, playback and native UI are not tested.']});
  process.exit(coverage.complete ? 0 : 1);
}

// Pure parts of the engine run without a DOM.
const ctx = {console};
ctx.globalThis = ctx; ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(engineSource(), ctx, {filename: ENGINE_NAME});
const SA = ctx.SteadyAnatomy, LEN = SA.rig.LEN;

const engine = engineSource();
let failures = coverage.missing.length, checked = 0, verifiedIdentities = 0;
const seen = new Map();
const bundleFlag = args.indexOf('--bundle');
const bundlePath = bundleFlag >= 0 ? args[bundleFlag + 1] : null;
if (bundleFlag >= 0 && (!bundlePath || bundlePath.startsWith('--'))) throw new Error('--bundle needs a built Steady.app path');
let collectionBundle;
if (bundlePath) {
  collectionBundle = fs.readdirSync(bundlePath).filter(name => name.endsWith('.bundle'))
    .map(name => path.join(bundlePath, name))
    .find(dir => fs.existsSync(path.join(dir, 'TrainingCollections', 'Reviewed')));
  if (!collectionBundle) throw new Error('built app has no SteadyCore TrainingCollections resource bundle');
}
const fail = (where, msg) => {
  const key = where + ': ' + msg.replace(/^t=\d+ms: /, '').replace(/-?\d+(\.\d+)?°/, 'N°').replace(/\(-?\d+(\.\d+)?\)/, '');
  if (!seen.has(key)) { failures++; seen.set(key, 0); console.error(`✗ ${where}: ${msg}`); }
  seen.set(key, seen.get(key) + 1);
};
const finite = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const near = (a, b, tol) => Math.hypot(a.x - b.x, a.y - b.y) <= tol;
const muscleKnown = id => { const base = id.split('@')[0]; return Object.keys(SA.MUSCLES).some(k => k === base || k.startsWith(base + '.')); };

const RANGES = {side: {el: [-8, 156], knee: [-8, 162], hip: [-45, 150], ankle: [-40, 85], lumbar: [-35, 65], thorax: [-25, 50]},
  front: {el: [-130, 175], knee: [-10, 120]}};

for (const l of lessons) {
  const where = `${l.topic}/${l.resource}`;
  const file = path.join(l.cfg.dir, l.resource);
  if (!fs.existsSync(file)) { fail(where, 'not generated (run build.mjs)'); continue; }
  const html = fs.readFileSync(file, 'utf8');
  // Same input as build.mjs, which puts the id first when it writes the page.
  if (html !== lessonHTML(Object.assign({id: l.spec.id || l.resource}, l.spec))) fail(where, 'generated page differs from current spec (run build.mjs for this topic)');
  if (!html.includes(`content="${CSP}"`)) fail(where, 'missing CSP');
  if (/(?:src|href)=["']https?:/i.test(html) || /url\(\s*['"]?https?:/i.test(html)) fail(where, 'network URL');
  for (const id of ['motion', 'detail', 'mistakes']) if (!html.includes(`id="${id}"`)) fail(where, `missing #${id}`);
  if (!html.includes(`<script src="${ENGINE_NAME}"></script>`)) fail(where, 'engine not referenced');
  const enginePath = path.join(l.cfg.dir, ENGINE_NAME);
  if (!fs.existsSync(enginePath) || fs.readFileSync(enginePath, 'utf8') !== engine) fail(where, 'engine copy missing or stale');
  if (bundlePath) {
    const builtDir = l.topic === 'equipment' ? bundlePath : path.join(collectionBundle, 'TrainingCollections', 'Reviewed', l.topic);
    const builtPage = path.join(builtDir, l.resource), builtEngine = path.join(builtDir, ENGINE_NAME);
    if (!fs.existsSync(builtPage) || fs.readFileSync(builtPage, 'utf8') !== html) fail(where, 'built app page missing or differs from source');
    if (!fs.existsSync(builtEngine) || fs.readFileSync(builtEngine, 'utf8') !== engine) fail(where, 'built app engine missing or differs from source');
  }

  const match = html.match(/window\.SteadyLesson=(\{[\s\S]*?\});<\/script>/);
  if (!match) { fail(where, 'missing embedded anatomy spec'); continue; }
  let spec;
  try { spec = JSON.parse(match[1]); } catch { fail(where, 'invalid embedded anatomy spec'); continue; }
  for (const it of spec.equipment || []) if (!SA.equipment.types[it.type]) fail(where, `unknown equipment type ${it.type}`);
  const m = spec.muscles || {};
  for (const id of [...(m.primary || []), ...(m.secondary || []), ...(m.stretch || []), ...((spec.mistake || {}).muscles ? Object.values(spec.mistake.muscles).flat() : [])])
    if (!muscleKnown(id)) fail(where, `unknown muscle ${id}`);
  if (!(m.primary || []).length && !(m.secondary || []).length && !(m.stretch || []).length) fail(where, 'no muscles marked');
  if (l.entries.length) {
    const t = l.entries[0].timingMilliseconds;
    if (t) assert.deepEqual(spec.timing, t, `${where}: timing differs from manifest`);
  }
  const view = spec.view === 'side' ? 'side' : 'front', R = RANGES[view];
  const D = spec.timing.duration;
  const check = (s, label) => {
    const j = s.joints, p = s.pose;
    const pts = view === 'side' ? [j.hip, j.shoulder, j.headTop, ...j.N, ...['near', 'far'].flatMap(k => [j.arms[k].E, j.arms[k].W, j.arms[k].H, j.legs[k].K, j.legs[k].A, j.legs[k].sole, j.legs[k].toe, j.legs[k].heel])]
      : [j.pelvis, j.neck, ...['r', 'l'].flatMap(k => [j.arms[k].S, j.arms[k].E, j.arms[k].H, j.legs[k].K, j.legs[k].A, j.legs[k].sole])];
    if (!pts.every(finite)) { fail(where, `${label}: non-finite joint`); return; }
    if (!Number.isFinite(s.act) || s.act < 0 || s.act > 1.0001) fail(where, `${label}: activation ${s.act}`);
    const sides = view === 'side' ? ['near', 'far'] : ['r', 'l'];
    for (const k of sides) {
      const a = p.arms[k], g = p.legs[k], ja = j.arms[k], jl = j.legs[k];
      const f = a.f == null ? 1 : a.f, ff = a.ff == null ? 1 : a.ff;
      const S = view === 'side' ? j.shoulder : ja.S;
      if (Math.abs(Math.hypot(ja.E.x - S.x, ja.E.y - S.y) - LEN.upper * f) > 0.5) fail(where, `${label}: upper arm length`);
      if (Math.abs(Math.hypot(ja.W.x - ja.E.x, ja.W.y - ja.E.y) - LEN.fore * ff) > 0.5) fail(where, `${label}: forearm length`);
      // A front-view upper arm drawn at under half length points at the viewer; its projected
      // elbow angle is not anatomical flexion, so only planar arms are range-checked.
      if ((view === 'side' || f >= 0.5) && (a.el < R.el[0] || a.el > R.el[1])) fail(where, `${label}: ${k} elbow ${a.el.toFixed(1)}° out of range`);
      if (g.knee < R.knee[0] || g.knee > R.knee[1]) fail(where, `${label}: ${k} knee ${g.knee.toFixed(1)}° out of range`);
      if (view === 'side') {
        if (g.hip < R.hip[0] || g.hip > R.hip[1]) fail(where, `${label}: ${k} hip ${g.hip.toFixed(1)}°`);
        if ((g.ankle || 0) < R.ankle[0] || (g.ankle || 0) > R.ankle[1]) fail(where, `${label}: ${k} ankle ${(g.ankle || 0).toFixed(1)}°`);
        for (const q of [jl.sole, jl.toe, jl.heel]) if (q.y > 1.5) fail(where, `${label}: ${k} foot below ground (${q.y.toFixed(1)})`);
      } else if (jl.sole.y > 1.5) fail(where, `${label}: ${k} foot below ground`);
    }
    if (view === 'side') {
      if (p.lumbar < R.lumbar[0] || p.lumbar > R.lumbar[1]) fail(where, `${label}: lumbar ${p.lumbar}`);
      if (p.thorax < R.thorax[0] || p.thorax > R.thorax[1]) fail(where, `${label}: thorax ${p.thorax}`);
    }
    const ik = p.ik || {};
    for (const [kind, set] of Object.entries(ik)) for (const [k, t] of Object.entries(set || {})) {
      const got = kind === 'hand' ? j.arms[k].H : (view === 'side' ? j.legs[k].A : j.legs[k].A);
      if (!near(got, t, 1.5)) fail(where, `${label}: ${kind}.${k} misses its contact by ${Math.hypot(got.x - t.x, got.y - t.y).toFixed(1)}`);
    }
  };
  for (let i = 0; i < 60; i++) { const t = D * i / 60; check(SA.scene.sample(spec, t), `t=${Math.round(t)}ms`); }
  const good = SA.scene.staticPose(spec, (spec.mistake && spec.mistake.good) || (spec.detail && spec.detail.pose) || 'peak');
  check(good, 'detail/good pose');
  if (spec.mistake && spec.mistake.pose) {
    const badPose = SA.rig.merge(SA.scene.resolve(spec, (spec.mistake.good) || (spec.detail && spec.detail.pose) || 'peak'), spec.mistake.pose);
    const solved = SA.rig.applyIK(view, badPose, badPose.ik);
    const bj = SA.rig.joints(view, solved);
    // A misplaced piece of equipment (eq state, e.g. the roller under the belly) is a mistake too.
    const moved = JSON.stringify(bj) !== JSON.stringify(good.joints) ||
      JSON.stringify(solved.eq || {}) !== JSON.stringify(good.pose.eq || {});
    if (!moved) fail(where, 'mistake pose is identical to the correct pose');
    check({pose: solved, joints: bj, act: 1}, 'mistake pose');
  } else fail(where, 'missing mistake pose');
  checked++;
  verifiedIdentities += (l.spec.lessons || [l.spec.id]).length;
}
saveReport({coverage, checkedPages: checked, checkedLessonIdentities: verifiedIdentities, samplesPerCycle: 60,
  builtApp: bundlePath || null,
  validationStages: {sceneSample: true, postEquipmentUpdate: false, physical3D: false},
  problems: failures, failures: [...seen].map(([message, occurrences]) => ({message, occurrences})),
  status: failures ? 'failed' : 'verified',
  limits: ['This command samples scene.sample; it does not execute DOM equipment.update or prove post-render geometry.',
    '3-D models require physical-coordinate bone/contact checks and SteadyLessonRenderedSamples inspection in a real browser.',
    'Visual accuracy and native playback require separate acceptance.']});
console.log(failures ? `\n${failures} problem(s); checked ${checked} pages / ${verifiedIdentities} lesson identities; expected ${coverage.expectedLessons}` :
  `✓ ${checked} pages / ${verifiedIdentities} lesson identities verified (${coverage.scope})`);
process.exit(failures ? 1 : 0);
