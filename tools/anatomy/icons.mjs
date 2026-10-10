// Renders the equipment library row icons from the lesson artwork itself, so each icon
// shows the named exercise at its working position.
//   PLAYWRIGHT_DIR=/path/containing/node_modules node tools/anatomy/icons.mjs
// Writes Steady/Assets.xcassets/EquipmentIcons/equipment-<lesson id>.imageset (light + dark, 3×).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {loadLessons} from './build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const require = createRequire(process.env.PLAYWRIGHT_DIR ? path.join(process.env.PLAYWRIGHT_DIR, 'node_modules/') : import.meta.url);
const {chromium} = require('playwright');
const out = path.join(repo, 'Steady/Assets.xcassets/EquipmentIcons');
const POINTS = 52;

const server = http.createServer((req, res) => {
  const file = path.join(repo, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(repo + path.sep) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, {'content-type': file.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8'});
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: POINTS, height: POINTS}, deviceScaleFactor: 3});
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'Contents.json'), JSON.stringify({info: {author: 'xcode', version: 1}}, null, 2) + '\n');
const lessons = (await loadLessons(['equipment'])).sort((a, b) => a.spec.id.localeCompare(b.spec.id));
for (const l of lessons) {
  const set = path.join(out, `equipment-${l.spec.id}.imageset`);
  fs.mkdirSync(set, {recursive: true});
  for (const dark of [false, true]) {
    await page.addInitScript(() => { window.SteadyPreviewManual = true; });
    await page.goto(base + 'Steady/' + l.resource);
    await page.waitForFunction(() => typeof window.setLessonState === 'function');
    await page.evaluate(dark => {
      const T = window.SteadyLesson.timing;
      // The held end of the effort phase: the most recognisable working position.
      window.setLessonState({mode: 'motion', playing: false, speed: 1, seekTime: (T.effortEnd + T.returnStart) / 2, seekRevision: 1, dark, timing: T});
      const svg = document.querySelector('#motion svg');
      svg.querySelectorAll('.stage, .ground, .guide').forEach(n => n.setAttribute('display', 'none'));
      // Frame the person (the weight stack would take half the tile); nearby machine parts stay in view.
      const figure = svg.querySelector('.figure:not(.ghost)'), box = figure.getBBox();
      const m = svg.getScreenCTM().inverse().multiply(figure.getScreenCTM());
      const a = new DOMPoint(box.x, box.y).matrixTransform(m), b = new DOMPoint(box.x + box.width, box.y + box.height).matrixTransform(m);
      Object.assign(box, {x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y)});
      const side = Math.max(box.width, box.height) * 1.12;
      svg.setAttribute('viewBox', [box.x + box.width / 2 - side / 2, box.y + box.height / 2 - side / 2, side, side].join(' '));
    }, dark);
    await page.screenshot({path: path.join(set, dark ? 'dark.png' : 'light.png'), omitBackground: true});
  }
  fs.writeFileSync(path.join(set, 'Contents.json'), JSON.stringify({
    images: [{filename: 'light.png', idiom: 'universal', scale: '3x'},
      {appearances: [{appearance: 'luminosity', value: 'dark'}], filename: 'dark.png', idiom: 'universal', scale: '3x'}],
    info: {author: 'xcode', version: 1}}, null, 2) + '\n');
}
await browser.close();
server.close();
console.log(`wrote ${lessons.length} icon sets to ${path.relative(repo, out)}`);
