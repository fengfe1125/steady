// Writes inventory for the one-frame browser auditor; does not generate artwork.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {TOPICS, selectedTopics, loadLessons, lessonCoverage, engineSource} from './build.mjs';

export async function auditPlan(only) {
  const lessons = await loadLessons(only), coverage = lessonCoverage(lessons, only), engine = engineSource();
  if (!coverage.complete) throw new Error('Runtime audit requires complete coverage for its selected scope');
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  return {schema: 1, createdAt: new Date().toISOString(), coverage,
    engineSHA256: createHash('sha256').update(engine).digest('hex'),
    engineSourceHash: engine.match(/engineSourceHash="([a-f0-9]{64})"/)[1],
    pages: lessons.map(l => ({topic: l.topic, lessonIDs: l.spec.lessons || [l.spec.id],
      resource: l.resource, duration: l.spec.timing.duration,
      url: '/' + path.relative(repo, path.join(TOPICS[l.topic].dir, l.resource)).split(path.sep).join('/')}))};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), output = args[args.indexOf('--out') + 1];
  if (!args.includes('--out') || !output || output.startsWith('--')) throw new Error('--out <JSON file> is required');
  const plan = await auditPlan(selectedTopics(args));
  fs.mkdirSync(path.dirname(path.resolve(output)), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(plan, null, 2) + '\n');
  console.log(`runtime plan: ${plan.coverage.coveredLessons} identities / ${plan.pages.length} pages; ${path.resolve(output)}`);
}
