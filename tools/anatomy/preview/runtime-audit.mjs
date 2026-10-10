import {auditRuntime} from '../tests/runtime-audit.mjs';

const q = new URLSearchParams(location.search), frame = document.getElementById('runtimeFrame');
const select = document.getElementById('lesson'), status = document.getElementById('progress'), output = document.getElementById('report');
const buttons = Object.fromEntries(['one', 'all', 'stop', 'export'].map(id => [id, document.getElementById(id)]));
const saved = document.getElementById('saved');
const evidenceOrigin = q.get('evidence') || 'http://127.0.0.1:8778';
if (new URL(evidenceOrigin).origin !== 'http://127.0.0.1:8778') throw new Error('Evidence must stay on the local loopback sink');
let plan, stopped = false, running = false, results = [];
function localURL(value) {
  const url = new URL(value, location.href);
  if (url.origin !== location.origin) throw new Error('Audit assets must stay on this local origin');
  return url;
}
const hash = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
function report() {
  const identities = results.filter(r => r.passed).flatMap(r => r.page.lessonIDs.map(id => `${r.page.topic}/${id}`));
  return {schema: 1, checkedAt: new Date().toISOString(), scope: plan?.coverage.scope,
    expectedIdentities: plan?.coverage.expectedLessons, expectedPages: plan?.pages.length,
    acceptedIdentities: new Set(identities).size, acceptedPages: results.filter(r => r.passed).length,
    processedPages: results.length, complete: results.length === plan?.pages.length && results.every(r => r.passed),
    memoryPolicy: 'One tab and one reused iframe; raw per-frame geometry is compared and discarded, not accumulated.',
    results};
}
function publish() { output.textContent = JSON.stringify(report(), null, 2); buttons.export.disabled = !results.length; }
async function saveEvidence(route, data) {
  const response = await fetch(`${evidenceOrigin}/${route}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
  const receipt = await response.json();
  if (!response.ok) throw new Error(receipt.error || 'Cannot save local evidence');
  saved.textContent = `证据已保存：${receipt.path} · SHA-256 ${receipt.sha256}`;
  return receipt;
}
function load(page) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Lesson load timed out')), 15000);
    frame.onload = () => {
      clearTimeout(timer);
      try {
        const root = frame.contentWindow;
        if (!root.SteadyLesson || typeof root.SteadyLessonPlaybackState !== 'function') throw new Error('Missing generated runtime observer');
        root.setLessonState({mode: 'motion', playing: false, speed: 1, seekTime: 0, seekRevision: 1, dark: false, timing: root.SteadyLesson.timing});
        resolve(root);
      } catch (error) { reject(error); }
    };
    frame.src = localURL(page.url).href;
  });
}
async function inspect(page, index, total) {
  const root = await load(page), spec = root.SteadyLesson;
  const ids = spec.lessons || [spec.id];
  if (page.lessonIDs.some(id => !ids.includes(id)) || spec.timing.duration !== page.duration) throw new Error('Loaded lesson identity/duration differs from independent audit inventory');
  const script = root.document.querySelector('script[src*="steady-anatomy.js"]');
  if (!script) throw new Error('Missing anatomy engine script');
  const engineResponse = await fetch(localURL(script.src), {cache: 'no-store'});
  if (!engineResponse.ok) throw new Error('Cannot read actual engine bytes');
  const engineSHA256 = await hash(await engineResponse.arrayBuffer()), engineSourceHash = root.SteadyAnatomy.engineSourceHash;
  if (engineSHA256 !== plan.engineSHA256 || engineSourceHash !== plan.engineSourceHash) throw new Error('Loaded/cached engine differs from frozen common source');
  let updated = 0;
  const receipt = await auditRuntime(root, {cancelled: () => stopped, progress: p => {
    if (performance.now() - updated < 500) return; updated = performance.now();
    status.textContent = `${index + 1}/${total} · ${page.topic}/${page.lessonIDs.join(',')} · ${p.speed}× · 循环 ${p.wraps}/${p.loops} · ${p.samples} 帧`;
  }});
  return {page, engineSHA256, engineSourceHash, ...receipt};
}
async function run(pages) {
  if (running) return;
  running = true; stopped = false; results = [];
  buttons.one.disabled = buttons.all.disabled = select.disabled = true; buttons.stop.disabled = false;
  try {
    for (let i = 0; i < pages.length && !stopped; i++) {
      const page = pages[i];
      status.textContent = `${i + 1}/${pages.length} · 正在打开 ${page.topic}/${page.lessonIDs.join(',')}`;
      try { results.push(await inspect(page, i, pages.length)); }
      catch (error) { frame.contentWindow?.stopLesson?.(); results.push({page, passed: false, problems: [String(error.message || error)]}); }
      publish();
      try { await saveEvidence('report', report()); }
      catch (error) { saved.textContent = `证据保存失败：${error.message}`; }
    }
    status.textContent = `${stopped ? '已停止' : '本轮完成'} · ${report().acceptedPages}/${pages.length} 页通过 · ${report().acceptedIdentities} 个身份`;
  } finally { running = false; buttons.one.disabled = buttons.all.disabled = select.disabled = false; buttons.stop.disabled = true; frame.contentWindow?.stopLesson?.(); }
}
buttons.one.onclick = () => run([plan.pages[+select.value]]);
buttons.all.onclick = () => run(plan.pages);
buttons.stop.onclick = () => { stopped = true; frame.contentWindow?.stopLesson?.(); };
buttons.export.onclick = async () => {
  try { await saveEvidence('report', report()); }
  catch (error) { saved.textContent = `证据保存失败：${error.message}`; }
};
document.getElementById('saveEvidence').onclick = async () => {
  try {
    const data = document.getElementById('evidenceData').value.trim();
    await saveEvidence(data.startsWith('{') ? 'report' : 'screenshot', data.startsWith('{') ? JSON.parse(data) : {base64: data});
  } catch (error) { saved.textContent = `证据保存失败：${error.message}`; }
};
try {
  const response = await fetch(localURL(q.get('plan') || './runtime-plan.json'), {cache: 'no-store'});
  if (!response.ok) throw new Error('采样清单尚未生成。全量清单需要收敛通知。');
  plan = await response.json();
  if (plan.schema !== 1 || !plan.coverage.complete || !plan.pages.length) throw new Error('Invalid audit inventory');
  plan.pages.forEach((page, i) => select.add(new Option(`${page.topic} · ${page.lessonIDs.join(' / ')}`, i)));
  buttons.one.disabled = buttons.all.disabled = false;
  status.textContent = `已就绪并暂停 · ${plan.coverage.expectedLessons} 个身份 / ${plan.pages.length} 页`;
  await load(plan.pages[0]);
} catch (error) { status.textContent = String(error.message || error); }
