// Self-check for one cloud lane: run the automatic gate on every action JSON, build its lesson and, when a
// Chrome/Chromium is available, render the detail and mistake panels next to the JSON for a visual check.
//   node tools/action-library/lane.mjs lanes/lane-07            (all actions in the lane)
//   node tools/action-library/lane.mjs lanes/lane-07/03_对握下拉  (one action)
// Writes 自检.md in each action folder. Exit code 1 if any JSON fails. CHROME=<path> overrides browser discovery.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

function browser() {
  const found = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium',
    '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean).find(p => fs.existsSync(p));
  if (found) return found;
  const which = spawnSync('sh', ['-c', 'command -v chromium || command -v chromium-browser || command -v google-chrome'], {encoding: 'utf8'});
  return which.stdout.trim() || null;
}

function shot(chrome, page, out) {
  spawnSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--window-size=800,800', '--virtual-time-budget=3000', '--allow-file-access-from-files', `--screenshot=${out}`, page], {stdio: 'ignore'});
  return fs.existsSync(out);
}

const target = path.resolve(process.argv[2] ?? '');
if (!process.argv[2] || !fs.existsSync(target)) {
  console.error('usage: node tools/action-library/lane.mjs <lane folder | action folder>');
  process.exit(2);
}
const folders = fs.existsSync(path.join(target, 'input.md')) ? [target]
  : fs.readdirSync(target).map(n => path.join(target, n)).filter(d => fs.existsSync(path.join(d, 'input.md'))).sort();
const chrome = browser();
if (!chrome) console.log('未找到 Chrome/Chromium：只做自动检查，不渲染预览图（可设置 CHROME=<路径>）。');

let failed = 0;
for (const dir of folders) {
  const sid = /sourceID：`(\w+)`/.exec(fs.readFileSync(path.join(dir, 'input.md'), 'utf8'))[1];
  const file = path.join(dir, sid + '.json'), name = path.basename(dir);
  if (!fs.existsSync(file)) { console.log(`- ${name}: 还没有 ${sid}.json`); continue; }
  const r = spawnSync('node', [path.join(here, 'check.mjs'), file], {encoding: 'utf8', cwd: root});
  const lines = (r.stdout + r.stderr).split('\n').map(l => l.trim()).filter(l => l.startsWith('error:') || l.startsWith('warn:'));
  const ok = r.status === 0;
  const report = [`# ${ok ? '✓ 通过自动检查' : '✗ 未通过自动检查'}`, '', ...lines.map(l => `- ${l}`)];
  for (const old of ['preview-detail.png', 'preview-mistakes.png']) fs.rmSync(path.join(dir, old), {force: true});
  if (ok) {
    spawnSync('node', [path.join(here, 'build.mjs'), file], {cwd: root, stdio: 'ignore'});
    const page = 'file://' + path.join(root, 'build/action-library', sid, 'lesson.html');
    if (chrome) {
      const done = ['detail', 'mistakes'].filter(p => shot(chrome, `${page}#${p}`, path.join(dir, `preview-${p}.png`)));
      report.push('', done.length === 2
        ? '预览图：`preview-detail.png`（四个关键姿态）、`preview-mistakes.png`（正确/错误对照）。请和帧图逐一比对。'
        : '预览图渲染失败：检查 Chrome/Chromium 是否可用。');
    }
  } else failed++;
  fs.writeFileSync(path.join(dir, '自检.md'), report.join('\n') + '\n');
  console.log(`${ok ? '✓' : '✗'} ${name}${lines.length ? '\n    ' + lines.join('\n    ') : ''}`);
}
console.log(`${folders.length - failed} 个通过或未开始，${failed} 个未通过`);
process.exit(failed ? 1 : 0);
