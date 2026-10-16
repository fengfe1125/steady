// Renders the action-library row icons from each exported lesson, at its working position.
//   PLAYWRIGHT_DIR=/path/containing/node_modules node tools/action-library/icons.mjs --part chest
// Reads Sources/SteadyCore/Resources/TrainingCollections/ActionLibrary/<part>/library.json and writes
// Steady/Assets.xcassets/ActionLibraryIcons/action-<sourceID>.imageset (light + dark, 3×).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const part = process.argv[process.argv.indexOf('--part') + 1];
if (!part || part.startsWith('--')) throw new Error('usage: icons.mjs --part <part>');
const require = createRequire(process.env.PLAYWRIGHT_DIR ? path.join(process.env.PLAYWRIGHT_DIR, 'node_modules/') : import.meta.url);
const {chromium} = require('playwright');
const lessons = path.join(repo, 'Sources/SteadyCore/Resources/TrainingCollections/ActionLibrary', part);
const out = path.join(repo, 'Steady/Assets.xcassets/ActionLibraryIcons');
const POINTS = 52;

const server = http.createServer((req, res) => {
  const file = path.join(lessons, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(lessons + path.sep) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, {'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8'});
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const rows = JSON.parse(fs.readFileSync(path.join(lessons, 'library.json'), 'utf8')).filter(r => !only || only.has(r.id));
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: POINTS, height: POINTS}, deviceScaleFactor: 3});
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'Contents.json'), JSON.stringify({info: {author: 'xcode', version: 1}}, null, 2) + '\n');
for (const row of rows) {
  const set = path.join(out, `action-${row.id}.imageset`);
  fs.mkdirSync(set, {recursive: true});
  for (const dark of [false, true]) {
    await page.goto(base + row.animation.resource);
    await page.waitForFunction(() => typeof window.setLessonState === 'function');
    await page.evaluate(dark => {
      const T = window.SteadyReferenceLesson.timing;
      // The held end of the effort phase: the most recognisable working position.
      window.setLessonState({mode: 'motion', playing: false, speed: 1, seekTime: (T.effortEnd + T.returnStart) / 2, seekRevision: 1, dark, timing: T});
      const svg = document.querySelector('#motion svg');
      svg.querySelectorAll('.stage, .ground, .guide').forEach(n => n.setAttribute('display', 'none'));
      // Frame the person and whatever equipment they hold or lie on.
      const parts = [svg.querySelector('.figure:not(.ghost)'), ...svg.querySelectorAll('.eq')].filter(Boolean);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const n of parts) {
        const b = n.getBBox(); if (!b.width && !b.height) continue;
        const m = svg.getScreenCTM().inverse().multiply(n.getScreenCTM());
        for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]) {
          const p = new DOMPoint(x, y).matrixTransform(m);
          x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
        }
      }
      const side = Math.max(x1 - x0, y1 - y0) * 1.08;
      svg.setAttribute('viewBox', [(x0 + x1) / 2 - side / 2, (y0 + y1) / 2 - side / 2, side, side].join(' '));
      svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
      Object.assign(document.body.style, {margin: 0, background: 'transparent'});
    }, dark);
    await page.locator('#motion svg').screenshot({path: path.join(set, dark ? 'dark.png' : 'light.png'), omitBackground: true});
  }
  fs.writeFileSync(path.join(set, 'Contents.json'), JSON.stringify({
    images: [{filename: 'light.png', idiom: 'universal', scale: '3x'},
      {appearances: [{appearance: 'luminosity', value: 'dark'}], filename: 'dark.png', idiom: 'universal', scale: '3x'}],
    info: {author: 'xcode', version: 1}}, null, 2) + '\n');
}
await browser.close();
server.close();
console.log(`wrote ${rows.length} icon sets to ${path.relative(repo, out)}`);
