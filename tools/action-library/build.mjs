// Build review lessons from action specs into build/action-library/<sourceID>/lesson.html.
//   node tools/action-library/build.mjs specs/chest/<id>.json [...]   or   --part chest
// Output reuses the phase-1 lesson shape (tools/video-svg/runtime.js) so App integration stays the same.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makePose} from './pose.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const out = path.join(root, 'build/action-library');

export function specFiles(args) {
  const i = args.indexOf('--part');
  if (i >= 0) {
    const dir = path.join(here, 'specs', args[i + 1]);
    return fs.readdirSync(dir).filter(n => n.endsWith('.json')).sort().map(n => path.join(dir, n));
  }
  if (!args.length) throw new Error('Pass spec files or --part <part>');
  return args.map(a => path.resolve(a));
}

// Monotone cubic through the authored (time, level) samples: no overshoot past 0 or 1.
export function progress(times, values, t) {
  let i = 0;
  while (i < times.length - 2 && times[i + 1] < t) i++;
  const slopes = times.slice(1).map((x, k) => (values[k + 1] - values[k]) / (x - times[k]));
  const slope = k => k === 0 || k === times.length - 1 ? 0 : slopes[k - 1] * slopes[k] <= 0 ? 0 : 2 / (1 / slopes[k - 1] + 1 / slopes[k]);
  const h = times[i + 1] - times[i], u = Math.max(0, Math.min(1, (t - times[i]) / h));
  return (2 * u ** 3 - 3 * u * u + 1) * values[i] + (u ** 3 - 2 * u * u + u) * h * slope(i) + (-2 * u ** 3 + 3 * u * u) * values[i + 1] + (u ** 3 - u * u) * h * slope(i + 1);
}

export function lesson(spec) {
  const pose = makePose(spec), times = spec.times.map(t => (t - spec.times[0]) * 1000), duration = times.at(-1);
  const poses = {start: pose(0), peak: pose(1)}, keys = [];
  for (let t = 0; t < duration; t += 20) {
    const p = progress(times, spec.levels, t);
    poses['f' + t] = pose(p);
    keys.push({t, pose: 'f' + t, p});
  }
  keys.push({t: duration - 0.001, pose: 'start', p: 0});
  const m = spec.mistake;
  return {
    id: 'library-' + spec.sourceID, title: spec.title, view: spec.view, mirror: spec.mirror,
    // Lying moves whose arms open sideways are drawn from above: a front-view figure turned 90°.
    ...(spec.rotate ? {rotate: spec.rotate, ground: false} : {}),
    hands: spec.hands, motionGuide: false, equipment: spec.equipment ?? [], muscles: spec.muscles, poses, track: {keys},
    timing: {effortStart: times[1], effortEnd: times[3], returnStart: times[3], returnEnd: times[5] - 1, duration},
    referenceFrames: [0, 2, 3, 4].map((i, k) => ({time: times[i], sourceSeconds: spec.times[i], caption: ['起始', '移动中', '终点', '返回'][k]})),
    source: {id: spec.sourceID, variant: spec.variant},
    detailExplanation: spec.cue + '\n四幅图分别对应原片中的起始、移动中、终点和返回。红色仅为主要肌群示意。',
    mistakeExplanation: '左：正确姿势。右：' + m.title + '。\n' + m.fix + '\n错误姿势为补充教学示意，不是原视频中的错误。',
    primaryMuscles: spec.primaryNames,
    mistake: {good: (m.level ?? 1) < 0.5 ? 'start' : 'peak', pose: pose(m.level ?? 1, m.override), goodText: '正确示范', text: '错误示意', fix: m.fix, marks: [], camera: {side: 18}},
  };
}

function runtime() {
  const engine = path.join(root, 'tools/anatomy/engine');
  const core = fs.readdirSync(engine).filter(n => /^\d.*\.js$/.test(n) && n !== '70-lesson.js').sort()
    .map(n => fs.readFileSync(path.join(engine, n), 'utf8')).join('\n');
  return [core, fs.readFileSync(path.join(root, 'tools/video-svg/equipment.js'), 'utf8'),
    fs.readFileSync(path.join(root, 'tools/video-svg/runtime.js'), 'utf8')].join('\n');
}

// Review-only hook: lesson.html#detail opens a panel without the native bridge.
const reviewHook = `<script>addEventListener('load',()=>{const m=location.hash.slice(1)||'motion';setLessonState({mode:m,playing:false,dark:m.endsWith('-dark'),seekRevision:1,seekTime:0});});</script>`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(out, {recursive: true});
  fs.writeFileSync(path.join(out, 'video-reference-runtime.js'), runtime());
  for (const file of specFiles(process.argv.slice(2))) {
    const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
    const data = lesson(spec), dir = path.join(out, spec.sourceID);
    fs.mkdirSync(dir, {recursive: true});
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    fs.writeFileSync(path.join(dir, 'lesson.html'), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${spec.title}</title></head><body><main id="motion" class="panel"></main><main id="detail" class="panel" hidden></main><main id="mistakes" class="panel" hidden></main><script>window.SteadyReferenceLesson=${json};</script><script src="../video-reference-runtime.js"></script>${reviewHook}</body></html>`);
    console.log('built', spec.sourceID, spec.title);
  }
}
