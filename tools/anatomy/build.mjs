// Builds the anatomy lesson pages from tools/anatomy/engine + tools/anatomy/exercises.
//   node tools/anatomy/build.mjs              → write steady-anatomy.js copies and lesson HTML
//   node tools/anatomy/build.mjs --manifests  → also write muscle fields into the topic manifests
//   node tools/anatomy/build.mjs --only shoulders,arms
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const reviewed = path.join(repo, 'Sources/SteadyCore/Resources/TrainingCollections/Reviewed');
export const TOPICS = {
  shoulders: {dir: path.join(reviewed, 'shoulders'), manifest: 'shoulders-animations.json', course: 'tanchengyi-shoulders.json', count: 11},
  arms: {dir: path.join(reviewed, 'arms'), manifest: 'arms-animations.json', course: 'tanchengyi-arms.json', count: 8},
  'arms-extra': {dir: path.join(reviewed, 'arms-extra'), manifest: 'arms-extra-complete-animations.json', course: 'tanchengyi-arms-extra.json', count: 7},
  chest: {dir: path.join(reviewed, 'chest'), manifest: 'chest-animations.json', course: 'tanchengyi-chest.json', count: 13},
  back: {dir: path.join(reviewed, 'back'), manifest: 'back-animations.json', course: 'tanchengyi-back.json', count: 9},
  abs: {dir: path.join(reviewed, 'abs'), manifest: 'abs-animations.json', course: 'tanchengyi-abs.json', count: 10},
  legs: {dir: path.join(reviewed, 'legs'), manifest: 'legs-animations.json', course: 'tanchengyi-legs.json', count: 20},
  functional: {dir: path.join(reviewed, 'functional'), manifest: 'functional-animations.json', course: 'tanchengyi-functional-lower-limb.json', count: 12},
  equipment: {dir: path.join(repo, 'Steady'), manifest: null, count: 14}
};
export const ENGINE_NAME = 'steady-anatomy.js';
export const CSP = "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'";

export function selectedTopics(args) {
  const flag = args.find(a => a === '--only' || a.startsWith('--only='));
  if (!flag) return null;
  const value = flag.includes('=') ? flag.slice(7) : args[args.indexOf(flag) + 1];
  if (!value || value.startsWith('--')) throw new Error('--only needs a comma-separated topic list');
  const only = [...new Set(value.split(','))];
  for (const topic of only) if (!Object.hasOwn(TOPICS, topic)) throw new Error(`unknown topic: ${topic}`);
  return only;
}

const safeResource = name => typeof name === 'string' && /^[^/\\]+\.html$/.test(name) && name !== '..html';

/** The expected inventory comes from courses and native definitions, never from the specs being tested. */
export function lessonInventory(only) {
  const rows = [];
  for (const [topic, cfg] of Object.entries(TOPICS)) {
    if (only && !only.includes(topic)) continue;
    if (!cfg.manifest) {
      const source = name => fs.readFileSync(path.join(repo, 'Sources/SteadyCore', name), 'utf8')
        .replace(/#if STEADY_LEGACY_ARM_PROTOTYPE[\s\S]*?#endif/g, '');
      const cases = [...source('EquipmentLesson.swift').matchAll(/case\s+(\w+)\s*=\s*"([^"]+)"/g)];
      const definitions = new Map([...source('EquipmentLessonDefinition.swift')
        .matchAll(/Self\(id:\s*\.(\w+),\s*group:\s*"[^"]+",\s*resource:\s*"([^"]+)"/g)]
        .map(m => [m[1], m[2] + '.html']));
      if (cases.length !== cfg.count) throw new Error(`equipment: expected ${cfg.count} native lessons, found ${cases.length}`);
      for (const [, name, id] of cases) {
        const resource = definitions.get(name);
        if (!safeResource(resource)) throw new Error(`equipment/${id}: missing or unsafe native resource`);
        rows.push({topic, id, resource});
      }
      continue;
    }
    const course = JSON.parse(fs.readFileSync(path.join(cfg.dir, cfg.course), 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(path.join(cfg.dir, cfg.manifest), 'utf8'));
    const ids = course.sections.flatMap(s => s.lessons.map(l => l.id));
    const animations = manifest.animations;
    if (course.id !== manifest.collectionID || manifest.timeUnit !== 'seconds') throw new Error(`${topic}: course/manifest identity or time unit differs`);
    if (ids.length !== cfg.count || new Set(ids).size !== ids.length) throw new Error(`${topic}: expected ${cfg.count} unique course lessons, found ${ids.length}`);
    if (animations.length !== ids.length || new Set(animations.map(a => a.lessonID)).size !== ids.length ||
        animations.some(a => !ids.includes(a.lessonID))) throw new Error(`${topic}: manifest must cover the exact course lesson IDs once`);
    for (const a of animations) {
      if (!safeResource(a.resource)) throw new Error(`${topic}/${a.lessonID}: unsafe resource`);
      rows.push({topic, id: a.lessonID, resource: a.resource});
    }
  }
  return rows;
}

export function lessonCoverage(lessons, only) {
  const inventory = lessonInventory(only), covered = new Map(), pages = new Set();
  for (const l of lessons) {
    const page = `${l.topic}/${l.resource}`;
    if (pages.has(page)) throw new Error(`${page}: multiple specs overwrite the same resource; use spec.lessons for shared pages`);
    pages.add(page);
    for (const id of l.spec.lessons || [l.spec.id]) {
      const key = `${l.topic}/${id}`, expected = inventory.find(r => r.topic === l.topic && r.id === id);
      if (!expected || expected.resource !== l.resource) throw new Error(`${key}: spec does not match the native/course inventory resource`);
      if (covered.has(key)) throw new Error(`${key}: duplicate spec coverage`);
      covered.set(key, l.file);
    }
  }
  // These authored SVG lessons have their own native-compatible renderer and are
  // deliberately not regenerated by the anatomy rig builder.
  let authoredPages = 0;
  for (const row of inventory.filter(r => r.topic === 'legs' && r.id.startsWith('legs-basic-'))) {
    const file = path.join(TOPICS.legs.dir, row.resource);
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const match = html.match(/window\.SteadyBasicLesson=(.*?);<\/script>/s);
    if (!match || !html.includes('<script src="legs-basic-renderer.js"></script>') ||
        !fs.existsSync(path.join(TOPICS.legs.dir, 'legs-basic-renderer.js'))) continue;
    const spec = JSON.parse(match[1]);
    if (spec.id !== row.id || !spec.detailExplanation || !spec.mistakeExplanation) continue;
    const key = `${row.topic}/${row.id}`;
    if (covered.has(key)) throw new Error(`${key}: authored lesson duplicates a generated spec`);
    covered.set(key, file); pages.add(`${row.topic}/${row.resource}`); authoredPages++;
  }
  const missing = inventory.filter(r => !covered.has(`${r.topic}/${r.id}`));
  return {scope: only ? only.join(',') : 'all 8 collections + 14 equipment',
    expectedLessons: inventory.length, coveredLessons: covered.size, uniquePages: pages.size, authoredPages,
    complete: missing.length === 0, missing,
    topics: Object.fromEntries(Object.entries(TOPICS).filter(([t]) => !only || only.includes(t)).map(([t, cfg]) =>
      [t, {expected: cfg.count, covered: inventory.filter(r => r.topic === t && covered.has(`${t}/${r.id}`)).length}]))};
}

export function coverageSummary(coverage) {
  return `${coverage.coveredLessons}/${coverage.expectedLessons} lesson identities, ${coverage.uniquePages} unique pages (${coverage.scope})`;
}

export function engineSource() {
  const dir = path.join(here, 'engine');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
  const source = '/* Steady anatomy engine · generated by tools/anatomy/build.mjs — edit tools/anatomy/engine/*.js */\n' +
    files.map(f => `/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(dir, f), 'utf8').trim() + '\n').join('');
  const digest = createHash('sha256').update(source).digest('hex');
  return source + `\n(typeof window !== 'undefined' ? window : globalThis).SteadyAnatomy.engineSourceHash="${digest}";\n`;
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
export function lessonHTML(spec) {
  // The native equipment host reads the same pin and comparison text as the drawing.
  // It also lists the coloured muscles, which the moving picture no longer labels.
  const names = muscleNames(), m = spec.muscles || {};
  const label = list => [...new Set((list || []).map(x => names[x.split('@')[0]] || x))];
  const documentSpec = {...spec, detailExplanation: spec.detailExplanation || detailText(spec, names),
    mistakeExplanation: spec.mistakeExplanation || mistakeText(spec),
    primaryMuscles: label(m.primary), secondaryMuscles: label(m.secondary), stretchMuscles: label(m.stretch)};
  const json = JSON.stringify(documentSpec).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${esc(spec.title)}</title>
<style>html,body{margin:0;height:100%;background:transparent}.panel{width:100%;height:100%}.panel[hidden]{display:none}</style>
</head><body data-lesson="${esc(spec.id)}">
<div class="panel" id="motion"></div><div class="panel" id="detail" hidden></div><div class="panel" id="mistakes" hidden></div>
<script>window.SteadyLesson=${json};</script>
<script src="${ENGINE_NAME}"></script>
</body></html>
`;
}

/** Loads every spec, joins it with its manifest entry (resource, timing, steps). */
export async function loadLessons(only) {
  const out = [];
  for (const [topic, cfg] of Object.entries(TOPICS)) {
    if (only && !only.includes(topic)) continue;
    const specDir = path.join(here, 'exercises', topic);
    if (!fs.existsSync(specDir)) continue;
    const manifest = cfg.manifest ? JSON.parse(fs.readFileSync(path.join(cfg.dir, cfg.manifest), 'utf8')) : null;
    for (const file of fs.readdirSync(specDir).filter(f => f.endsWith('.mjs')).sort()) {
      const spec = structuredClone((await import(pathToFileURL(path.join(specDir, file)).href)).default);
      let resource = spec.resource, entries = [];
      if (manifest) {
        const ids = spec.lessons || [spec.id];
        entries = ids.map(id => manifest.animations.find(a => a.lessonID === id));
        if (entries.some(e => !e)) throw new Error(`${topic}/${file}: lesson not in manifest`);
        resource = entries[0].resource;
        if (entries.some(e => e.resource !== resource)) throw new Error(`${topic}/${file}: lessons do not share one resource`);
        const e = entries[0];
        spec.timing = e.timingMilliseconds || {effortStart: 600, effortEnd: 2800, returnStart: 3300, returnEnd: 5700, duration: 6000};
        spec.steps = e.steps.map(s => ({title: s.title, start: s.startSeconds * 1000, end: s.endSeconds * 1000}));
      }
      if (!resource) throw new Error(`${topic}/${file}: missing resource`);
      if (!safeResource(resource)) throw new Error(`${topic}/${file}: unsafe resource`);
      if (!manifest) spec.timing ||= {effortStart: 600, effortEnd: 2800, returnStart: 3300, returnEnd: 5700, duration: 6000};
      checkSpec(topic, file, spec);
      out.push({topic, cfg, file, spec, resource, entries});
    }
  }
  return out;
}

function checkSpec(topic, file, spec) {
  const where = `${topic}/${file}`;
  if (!['side', 'front', 'back'].includes(spec.view)) throw new Error(`${where}: view must be side/front/back`);
  if (!spec.title) throw new Error(`${where}: missing title`);
  if (!spec.id || !Array.isArray(spec.lessons || [spec.id]) || !(spec.lessons || [spec.id]).length)
    throw new Error(`${where}: missing lesson identity`);
  const T = spec.timing;
  if (!T || ![T.effortStart, T.effortEnd, T.returnStart, T.returnEnd, T.duration].every(Number.isFinite) ||
      !(0 <= T.effortStart && T.effortStart < T.effortEnd && T.effortEnd <= T.returnStart &&
        T.returnStart < T.returnEnd && T.returnEnd <= T.duration)) throw new Error(`${where}: invalid playback timing`);
  if (topic === 'equipment' && T.duration !== 6000) throw new Error(`${where}: native equipment cycle must remain 6000 ms`);
  for (const name of Object.keys(spec.poses || {})) {
    const seen = new Set();
    for (let key = name; key; key = spec.poses[key].from) {
      if (!spec.poses[key]) throw new Error(`${where}: unknown inherited pose ${key}`);
      if (seen.has(key)) throw new Error(`${where}: cyclic inherited pose ${key}`);
      seen.add(key);
    }
  }
  const keys = spec.track && spec.track.keys;
  if (keys) {
    const D = spec.timing.duration;
    keys.forEach((k, i) => {
      if (!(k.t >= 0 && k.t < D)) throw new Error(`${where}: key ${i} outside duration`);
      if (i && k.t <= keys[i - 1].t) throw new Error(`${where}: keys must increase`);
      if (!(spec.poses || {})[k.pose]) throw new Error(`${where}: unknown pose ${k.pose}`);
    });
  } else if (!spec.poses || !spec.poses.start || !spec.poses.peak) throw new Error(`${where}: needs start and peak poses`);
}

async function main() {
  const args = process.argv.slice(2);
  const only = selectedTopics(args);
  const lessons = await loadLessons(only);
  const coverage = lessonCoverage(lessons, only);
  if (!coverage.complete && ((!only && !args.includes('--allow-partial')) || args.includes('--require-complete'))) {
    throw new Error(`incomplete anatomy inventory: ${coverageSummary(coverage)}; missing ${coverage.missing.map(r => `${r.topic}/${r.id}`).join(', ')}`);
  }
  const engine = engineSource();
  const dirs = new Set();
  for (const l of lessons) {
    fs.writeFileSync(path.join(l.cfg.dir, l.resource), lessonHTML(Object.assign({id: l.spec.id || l.resource}, l.spec)));
    dirs.add(l.cfg.dir);
  }
  for (const d of dirs) fs.writeFileSync(path.join(d, ENGINE_NAME), engine);
  fs.writeFileSync(path.join(here, 'preview', ENGINE_NAME), engine);
  if (args.includes('--manifests')) writeManifests(lessons);
  console.log(`built ${lessons.length} lesson page(s) in ${dirs.size} folder(s); coverage: ${coverageSummary(coverage)}`);
  if (!coverage.complete) console.warn(`PARTIAL: ${coverage.missing.length} expected lesson(s) have no spec`);
}

/** Muscle names are copied into the manifest so the native screen can describe them. */
function writeManifests(lessons) {
  const byTopic = new Map();
  for (const l of lessons) if (l.cfg.manifest) {
    if (!byTopic.has(l.topic)) byTopic.set(l.topic, []);
    byTopic.get(l.topic).push(l);
  }
  const names = muscleNames();
  for (const [topic, list] of byTopic) {
    const file = path.join(TOPICS[topic].dir, TOPICS[topic].manifest);
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const l of list) for (const id of (l.spec.lessons || [l.spec.id])) {
      const entry = manifest.animations.find(a => a.lessonID === id), m = l.spec.muscles || {};
      const label = list0 => [...new Set((list0 || []).map(x => names[x.split('@')[0]] || x))];
      entry.primaryMuscles = label(m.primary);
      entry.secondaryMuscles = label(m.secondary);
      delete entry.injectedRuntimeResource;
      delete entry.documentLayout;
      if ((m.stretch || []).length) entry.stretchMuscles = label(m.stretch); else delete entry.stretchMuscles;
      for (const k of l.spec.dropManifestKeys || []) delete entry[k];
      entry.detailExplanation = l.spec.detailExplanation || detailText(l.spec, names);
      entry.mistakeExplanation = l.spec.mistakeExplanation || mistakeText(l.spec);
    }
    fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
  }
}

const NUM = ['①', '②', '③', '④', '⑤', '⑥'];
/** Native text under 细节图解: the numbered pins in the drawing, then how to read the colours. */
export function detailText(spec, names) {
  const d = spec.detail || {}, lines = (d.callouts || []).map(c => `${NUM[c.n - 1] || c.n} ${c.text}`);
  const m = spec.muscles || {}, nm = list => [...new Set((list || []).map(x => names[x.split('@')[0]] || x))].join('、');
  const parts = [];
  if (lines.length) parts.push('图中编号\n' + lines.join('\n'));
  const who = [];
  if ((m.primary || []).length) who.push(`红色 · 主要发力：${nm(m.primary)}`);
  if ((m.stretch || []).length) who.push(`红色斜线 · 拉伸部位：${nm(m.stretch)}`);
  if ((m.secondary || []).length) who.push(`浅红 · 协同：${nm(m.secondary)}`);
  if (who.length) parts.push(who.join('\n'));
  parts.push('虚线人形：起始姿势 · 绿色箭头：动作方向');
  return parts.join('\n\n');
}
/** Native text under 错误对照, matching the left/right layout of the drawing. */
export function mistakeText(spec) {
  const k = spec.mistake || {};
  return [`左图 · 正确示范：${k.goodText || '保持动作要点'}`, `右图 · 错误示范：${k.text || ''}`,
    k.fix ? `调整方法：${k.fix}` : '', '琥珀色圈 / 箭头 / 叉号：需要避免的位置；右图红色为此时被迫发力的肌肉'].filter(Boolean).join('\n\n');
}

export function muscleNames() {
  const src = fs.readFileSync(path.join(here, 'engine', '40-theme.js'), 'utf8');
  const block = src.slice(src.indexOf('SA.MUSCLES = {') + 13, src.indexOf('};', src.indexOf('SA.MUSCLES = {')) + 1);
  return Function('return ' + block)();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
