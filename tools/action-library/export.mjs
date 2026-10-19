// Export approved action-library specs into the App bundle.
//   node tools/action-library/export.mjs --part chest
// Writes Sources/SteadyCore/Resources/TrainingCollections/ActionLibrary/<part>/:
//   <sourceID>.html          one self-contained lesson page (same runtime as VideoReferences)
//   video-reference-runtime.js
//   library.json             [{id, title, group, equipment, lesson, animation}] read by ActionLibrary.swift
// App copy never mentions the source videos: reference frames carry no source time, and
// explanations are rewritten without "原片".
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {lesson} from './build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const part = process.argv[process.argv.indexOf('--part') + 1];
if (!part || part.startsWith('--')) throw new Error('usage: export.mjs --part <part>');
const specsDir = path.join(here, 'specs', part);
const out = path.join(root, 'Sources/SteadyCore/Resources/TrainingCollections/ActionLibrary', part);
const reviews = JSON.parse(fs.readFileSync(path.join(here, 'reviews', `${part}.json`), 'utf8'));

const GROUPS = ['俯卧撑', '其他徒手', '哑铃与壶铃', '杠铃', '器械与绳索', '弹力带与悬挂带', '球与小器材', '拉伸放松'];
const EQUIPMENT_NAMES = {
  bench: '训练凳', dumbbell: '哑铃', library_dumbbell: '哑铃', library_goblet: '哑铃', kettlebell: '壶铃', roller: '泡沫轴',
  band: '弹力带', trx: '悬挂带', chest_wall: '墙面', wall_back: '墙面', barbell: '杠铃', smith: '史密斯机', bosu: '波速球',
  ring: '普拉提圈', pushup_bars: '俯卧撑支架', box: '垫高物', chest_parallelBars: '双杠', reference_press: '推胸器械',
  library_chestPress: '推胸器械', lever: '推胸器械', vipr: 'VIPR 训练管', sandbag: '牛角包', massage_gun: '筋膜枪',
};

function equipmentName(e) {
  if (e.type === 'ball' || (e.type === 'top' && e.kind === 'ball')) return e.kind === 'medicine' ? '药球' : (e.r ?? 60) < 12 ? '筋膜球' : '健身球';
  if (e.type === 'top') return {bench: '训练凳', bosu: '波速球'}[e.kind] ?? null;
  if (e.type === 'cable') return e.style === 'band' ? '弹力绳' : '绳索';
  return EQUIPMENT_NAMES[e.type] ?? null;
}

function group(spec) {
  if (/拉伸|放松/.test(spec.title)) return '拉伸放松';
  const types = new Set((spec.equipment ?? []).map(e => e.type === 'cable' && e.style === 'band' ? 'band' : e.type));
  const has = (...t) => t.some(x => types.has(x));
  if (has('lever', 'library_chestPress', 'reference_press', 'smith', 'chest_parallelBars', 'cable')) return '器械与绳索';
  if (has('barbell')) return '杠铃';
  if (has('dumbbell', 'kettlebell', 'library_dumbbell', 'library_goblet')) return '哑铃与壶铃';
  if (has('band', 'trx')) return '弹力带与悬挂带';
  if (has('ball', 'bosu', 'ring', 'vipr', 'sandbag', 'roller', 'pushup_bars', 'box', 'massage_gun')
      || (spec.equipment ?? []).some(e => e.type === 'top' && e.kind !== 'mat' && e.kind !== 'bench')) return '球与小器材';
  return /俯卧撑|俯撑/.test(spec.title) ? '俯卧撑' : '其他徒手';
}

// Pose data dominates file size; 0.1 unit is far below a pixel at any display size.
const round = (k, v) => typeof v === 'number' ? Math.round(v * 10) / 10 : v;

function appLesson(spec) {
  const data = lesson(spec);
  const id = `${part}-${spec.sourceID}`;
  data.id = id;
  data.referenceFrames = data.referenceFrames.map(({sourceSeconds, ...f}) => f);
  data.detailExplanation = spec.cue + '\n四幅图依次是起始、移动中、终点和返回。红色仅为主要肌群示意。';
  data.mistakeExplanation = '左：正确姿势。右：' + spec.mistake.title + '。\n' + spec.mistake.fix + '\n错误姿势为教学示意。';
  return {id, data};
}

function record(spec, id, data) {
  const t = spec.times.map(s => s - spec.times[0]), duration = t.at(-1);
  const steps = [
    ['起始', '摆好起始姿势，保持支撑稳定。'],
    ['发力', spec.cue],
    ['到位', '在动作终点稍作控制，保持姿势稳定。'],
    ['还原', '沿原路线缓慢还原，不要借惯性。'],
    ['回到起点', '回到起始姿势，准备下一次。'],
  ].map(([title, instruction], i) => ({
    title, instruction, startSeconds: t[i], endSeconds: i === 4 ? duration : t[i + 1], previewTimeSeconds: t[i],
  }));
  const equipment = [...new Set((spec.equipment ?? []).map(equipmentName).filter(Boolean))];
  const summary = spec.variant.replace(/\s*·\s*(侧面|正面|俯视)示范\s*$/, '');
  return {
    id: spec.sourceID, title: spec.title, group: group(spec), equipment,
    lesson: {
      id, title: spec.title, summary, equipment: equipment.length ? equipment.join('、') : '无需器械', origin: 'supplemental',
      dosage: '本页用于动作学习；组数和次数按你的计划。', frames: [], preparation: [],
      steps: [{title: '动作要点', detail: spec.cue}], cues: [],
      mistakes: [{title: spec.mistake.title, detail: spec.mistake.fix}],
      supplements: [], checks: [], references: [],
    },
    animation: {
      // Exactly the animation's own timing, so the loader's duration/timing consistency check holds.
      lessonID: id, resource: `${spec.sourceID}.html`, durationSeconds: data.timing.duration / 1000, steps,
      timingMilliseconds: data.timing, detailExplanation: data.detailExplanation, mistakeExplanation: data.mistakeExplanation,
      primaryMuscles: spec.primaryNames,
    },
  };
}

const approved = Object.entries(reviews).filter(([, v]) => v.status === 'approved').map(([id]) => id);
const ids = approved.filter(id => fs.existsSync(path.join(specsDir, `${id}.json`))).sort();
fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(out, {recursive: true});
fs.copyFileSync(path.join(root, 'build/action-library/video-reference-runtime.js'), path.join(out, 'video-reference-runtime.js'));
const rows = [];
for (const sid of ids) {
  const spec = JSON.parse(fs.readFileSync(path.join(specsDir, `${sid}.json`), 'utf8'));
  const {id, data} = appLesson(spec);
  const json = JSON.stringify(data, round).replace(/</g, '\\u003c');
  fs.writeFileSync(path.join(out, `${sid}.html`), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'"><title>${spec.title}</title></head><body><main id="motion" class="panel"></main><main id="detail" class="panel" hidden></main><main id="mistakes" class="panel" hidden></main><script>window.SteadyReferenceLesson=${json};</script><script src="video-reference-runtime.js"></script></body></html>`);
  rows.push(record(spec, id, data));
}
rows.sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.title.localeCompare(b.title, 'zh'));
const text = JSON.stringify(rows, null, 1);
if (/原片|视频|Keep/.test(text)) throw new Error('library.json mentions the source videos');
fs.writeFileSync(path.join(out, 'library.json'), text + '\n');
const counts = Object.fromEntries(GROUPS.map(g => [g, rows.filter(r => r.group === g).length]));
console.log(`exported ${rows.length} ${part} lessons to ${path.relative(root, out)}`, counts);
