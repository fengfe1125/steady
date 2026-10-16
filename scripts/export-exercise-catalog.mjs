#!/usr/bin/env node
// JSON is the sole edit source. Historical v1 bytes and artifacts are frozen.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {lessonInventory, TOPICS} from '../tools/anatomy/build.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CATALOG = 'Sources/SteadyCore/Resources/TrainingCollections/exercise-catalog.v1.json';
export const TYPESCRIPT = 'supabase/functions/_shared/generated/exercise-catalog.ts';
export const REPORT = 'docs/exercise-catalog-review.v1.json';
export const CATALOG_V2 = 'Sources/SteadyCore/Resources/TrainingCollections/exercise-catalog.v2.json';
export const TYPESCRIPT_V2 = 'supabase/functions/_shared/generated/exercise-catalog-v2.ts';
export const REPORT_V2 = 'docs/exercise-catalog-review.v2.json';
export const V1_HASH = '86292e526103697d6e9ac58f4199062b325fddbd214183ca7b7517ae251207d4';
const V1_REPORT_HASH = '16a08d42a867e8c94de29684050506f62bbab578dc7ccecb0097993bfe450e84';
const EXPERIENCES = ['初学者', '偶尔运动', '规律运动'];
const SCENES = ['自重', '哑铃', '健身房'];
const ROLES = ['warmup', 'main', 'cooldown'];
const SLOTS = ['kneeDominant', 'hipDominant', 'kneeFlexion', 'calf', 'hipAdduction', 'hipAbduction', 'kneeExtension', 'preparation'];
export const NEW_LOWER_BODY_IDS = ['chair-sit-to-stand', 'floor-glute-bridge', 'supported-calf-raise', 'bodyweight-squat', 'supported-split-squat', 'side-lying-hip-abduction', 'unloaded-hip-hinge'];
export const REOPENED_LOWER_BODY_IDS = ['dumbbell-goblet-squat', 'functional-dumbbell-romanian-deadlift', 'seated-leg-press', 'seated-leg-curl', 'legs-prone-leg-curl', 'legs-calf-raise', 'legs-bulgarian-split-squat', 'legs-hip-adduction', 'seated-leg-extension'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function assert(value, message) { if (!value) throw new Error(message); }
function object(value, required, optional, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label}: expected object`);
  assert(required.every(key => Object.hasOwn(value, key)), `${label}: missing field`);
  assert(Object.keys(value).every(key => required.includes(key) || optional.includes(key)), `${label}: unknown field`);
}
function text(value, label) { assert(typeof value === 'string' && value.trim().length > 0, `${label}: empty text`); }
function id(value, label) { text(value, label); assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), `${label}: invalid ID`); }
function list(value, label, allowEmpty = false) { assert(Array.isArray(value) && (allowEmpty || value.length > 0), `${label}: invalid array`); }
function unique(values, label) { assert(new Set(values).size === values.length, `${label}: duplicate`); }
function memberList(values, allowed, label, allowEmpty = false) {
  list(values, label, allowEmpty); unique(values, label);
  assert(values.every(value => allowed.includes(value)), `${label}: unknown value`);
}
function integer(value, low, high, label) { assert(Number.isInteger(value) && value >= low && value <= high, `${label}: out of range`); }
export function teachingKey(ref) { return `${ref.kind}/${ref.topic ?? 'equipment'}/${ref.lessonID}`; }
export function catalogTeachings(catalog) {
  return [...catalog.exercises.flatMap(e => [e.defaultTeaching, ...e.otherTeachings]), ...catalog.learningOnly.map(e => e.teaching)];
}
export function historicalCatalog() {
  const raw = fs.readFileSync(path.join(ROOT, CATALOG));
  assert(hash(raw) === V1_HASH, 'historical v1 catalog bytes changed; create a new version instead');
  return JSON.parse(raw.toString('utf8'));
}
export function currentInventory() {
  // Read-only: the imported inventory routine never builds or writes teaching resources.
  return lessonInventory().map(row => ({kind: row.topic === 'equipment' ? 'equipment' : 'collection',
    ...(row.topic === 'equipment' ? {} : {topic: row.topic}), lessonID: row.id}));
}
export function estimatedSeconds(template) {
  const e = template.estimate;
  return template.sets * template.reps * e.repSeconds * (template.perSide ? 2 : 1)
    + Math.max(0, template.sets - 1) * template.restSeconds + e.setupSeconds
    + (template.perSide ? template.sets * e.sideSwitchSeconds : 0);
}
export function validateCatalog(catalog, inventory) {
  const v2 = catalog.schemaVersion === 2;
  object(catalog, ['schemaVersion', 'catalogVersion', 'equipment', 'exercises', 'learningOnly', ...(v2 ? ['conditions'] : [])], [], 'catalog');
  assert(catalog.schemaVersion === catalog.catalogVersion && [1, 2].includes(catalog.schemaVersion), 'catalog: unsupported version');
  inventory ??= v2 ? currentInventory() : catalogTeachings(historicalCatalog());
  list(catalog.equipment, 'equipment'); list(catalog.exercises, 'exercises'); list(catalog.learningOnly, 'learningOnly', true);
  unique(catalog.equipment.map(x => x.id), 'equipment IDs'); unique(catalog.exercises.map(x => x.id), 'exercise IDs');
  const equipmentIDs = catalog.equipment.map(x => x.id);
  for (const item of catalog.equipment) {
    object(item, ['id', 'name', 'scenes'], [], 'equipment'); id(item.id, 'equipment.id'); text(item.name, 'equipment.name');
    memberList(item.scenes, SCENES, `equipment ${item.id} scenes`);
  }
  const expected = new Set(inventory.map(teachingKey));
  assert(expected.size === inventory.length, 'source inventory: duplicate identity');
  const assigned = new Set(), templateIDs = new Set(), aliases = new Map();
  function teaching(ref, owner, classify = true) {
    object(ref, ['kind', 'lessonID'], ['topic'], `${owner} teaching`); id(ref.lessonID, 'teaching.lessonID');
    assert(['collection', 'equipment'].includes(ref.kind), `${owner}: unknown teaching kind`);
    assert(ref.kind === 'collection' ? typeof ref.topic === 'string' && ref.topic !== 'equipment' : ref.topic === undefined, `${owner}: invalid teaching topic`);
    const key = teachingKey(ref); assert(expected.has(key), `${owner}: unknown teaching ${key}`);
    if (classify) { assert(!assigned.has(key), `${owner}: duplicate teaching ${key}`); assigned.add(key); }
  }
  const conditionIDs = v2 ? catalog.conditions.map(c => c.id) : [];
  if (v2) {
    list(catalog.conditions, 'conditions'); unique(conditionIDs, 'condition IDs');
    for (const c of catalog.conditions) {
      object(c, ['id', 'version', 'title', 'detail', 'teaching'], [], 'condition');
      id(c.id, 'condition.id'); assert(c.version === 1, `condition ${c.id}: unsupported version`);
      text(c.title, `condition ${c.id}.title`); text(c.detail, `condition ${c.id}.detail`); teaching(c.teaching, `condition ${c.id}`, false);
    }
  }
  for (const item of catalog.exercises) {
    const label = `exercise ${item.id}`;
    object(item, ['id', 'name', 'aliases', 'pattern', 'equipment', 'experiences', 'status', 'review', 'defaultTeaching', 'otherTeachings', 'templates'], v2 ? ['requiredConditions', 'trainingSlot', 'replacementIDs'] : [], label);
    id(item.id, `${label}.id`); text(item.name, `${label}.name`); text(item.pattern, `${label}.pattern`);
    list(item.aliases, `${label}.aliases`, true); unique(item.aliases, `${label}.aliases`);
    for (const name of [item.name, ...item.aliases]) {
      text(name, `${label}.alias`); const key = name.trim().toLowerCase();
      assert(!aliases.has(key) || aliases.get(key) === item.id, `${label}: ambiguous legacy name ${name}`); aliases.set(key, item.id);
    }
    memberList(item.equipment, equipmentIDs, `${label}.equipment`, true); memberList(item.experiences, EXPERIENCES, `${label}.experiences`);
    assert(['approved', 'learningOnly'].includes(item.status), `${label}: invalid status`);
    object(item.review, ['basis', 'reason'], [], `${label}.review`); text(item.review.basis, `${label}.review.basis`); text(item.review.reason, `${label}.review.reason`);
    list(item.otherTeachings, `${label}.otherTeachings`, true); teaching(item.defaultTeaching, label);
    for (const ref of item.otherTeachings) teaching(ref, label);
    if (item.requiredConditions !== undefined) memberList(item.requiredConditions, conditionIDs, `${label}.requiredConditions`, true);
    if (item.trainingSlot !== undefined) {
      assert(SLOTS.includes(item.trainingSlot), `${label}: unknown trainingSlot`);
      memberList(item.requiredConditions, conditionIDs, `${label}.requiredConditions`);
      memberList(item.replacementIDs, catalog.exercises.map(e => e.id), `${label}.replacementIDs`, true);
      assert(item.status === 'approved', `${label}: lower-body slot is not approved`);
    } else assert(item.replacementIDs === undefined, `${label}: replacements require a slot`);
    list(item.templates, `${label}.templates`, true);
    assert(item.status === 'approved' ? item.templates.length > 0 : item.templates.length === 0, `${label}: status/template mismatch`);
    const roleExperience = new Set(), coveredExperiences = new Set();
    for (const template of item.templates) {
      const t = `${label} template ${template.id}`;
      object(template, ['id', 'role', 'experiences', 'perSide', 'restSeconds', 'estimatedSeconds', 'prescription'], ['sets', 'reps', 'durationSeconds', ...(v2 ? ['estimate'] : [])], t);
      id(template.id, `${t}.id`); assert(!templateIDs.has(template.id), `${t}: duplicate template ID`); templateIDs.add(template.id);
      assert(ROLES.includes(template.role), `${t}: unknown role`); memberList(template.experiences, item.experiences, `${t}.experiences`);
      assert(typeof template.perSide === 'boolean', `${t}: perSide must be boolean`);
      integer(template.sets ?? 1, 1, 10, `${t}.sets`); integer(template.restSeconds, 0, 600, `${t}.restSeconds`);
      integer(template.estimatedSeconds, 1, 5400, `${t}.estimatedSeconds`); text(template.prescription, `${t}.prescription`);
      assert((template.reps !== undefined) !== (template.durationSeconds !== undefined), `${t}: specify repetitions OR duration`);
      if (template.reps !== undefined) integer(template.reps, 1, 100, `${t}.reps`);
      if (template.durationSeconds !== undefined) integer(template.durationSeconds, 1, 1800, `${t}.durationSeconds`);
      if (item.trainingSlot) assert(template.estimate !== undefined, `${t}: lower-body template requires estimate`);
      if (template.estimate !== undefined) {
        object(template.estimate, ['repSeconds', 'setupSeconds', 'sideSwitchSeconds'], [], `${t}.estimate`);
        assert(template.sets !== undefined && template.reps !== undefined && template.durationSeconds === undefined, `${t}: estimate requires sets and reps`);
        assert(template.estimate.repSeconds === 4 && template.estimate.sideSwitchSeconds === 15 && [30, 60, 90].includes(template.estimate.setupSeconds), `${t}: unsupported estimate parameters`);
        assert(template.estimatedSeconds === estimatedSeconds(template), `${t}: estimatedSeconds differs from formula`);
        if (item.trainingSlot) {
          const setup = item.equipment.some(id => id.endsWith('-machine')) ? 90 : item.equipment.includes('dumbbells') ? 60 : 30;
          assert(template.estimate.setupSeconds === setup, `${t}: setup class differs from equipment`);
        }
      } else {
        const sets = template.sets ?? 1, sides = template.perSide ? 2 : 1;
        const minimum = sides * (sets * (template.durationSeconds ?? template.reps) + Math.max(0, sets - 1) * template.restSeconds);
        assert(template.estimatedSeconds >= minimum, `${t}: time budget omits prescribed work or rest`);
      }
      if (item.trainingSlot) assert(template.role === (item.trainingSlot === 'preparation' ? 'warmup' : 'main'), `${t}: training slot/role mismatch`);
      for (const experience of template.experiences) {
        const key = `${template.role}/${experience}`;
        assert(!roleExperience.has(key), `${t}: multiple templates for role and experience ${key}`);
        roleExperience.add(key); coveredExperiences.add(experience);
      }
    }
    if (item.status === 'approved') assert(item.experiences.every(x => coveredExperiences.has(x)), `${label}: approved experience has no template`);
  }
  if (v2) for (const item of catalog.exercises) for (const replacementID of item.replacementIDs ?? []) {
    const other = catalog.exercises.find(e => e.id === replacementID);
    assert(other.id !== item.id, `${item.id}: self replacement`);
    assert(other.trainingSlot === item.trainingSlot && item.trainingSlot !== 'preparation', `${item.id}: replacement changes training slot`);
    assert(other.replacementIDs?.includes(item.id), `${item.id}: asymmetric replacement ${other.id}`);
    const group = new Set([item.id, ...item.replacementIDs]);
    assert(other.replacementIDs.length + 1 === group.size && [other.id, ...other.replacementIDs].every(id => group.has(id)), `${item.id}: replacement group is not complete`);
  }
  for (const item of catalog.learningOnly) {
    object(item, ['teaching', 'reason'], [], 'learning-only teaching'); text(item.reason, 'learning-only reason'); teaching(item.teaching, 'learning-only');
  }
  assert(assigned.size === expected.size, `teaching coverage incomplete: ${[...expected].filter(key => !assigned.has(key)).join(', ')}`);
  const approved = catalog.exercises.filter(item => item.status === 'approved');
  for (const role of ROLES) assert(approved.some(item => item.templates.some(t => t.role === role)), `catalog has no approved ${role}`);
  return {teachingIdentities: assigned.size, canonicalExercises: catalog.exercises.length, approvedExercises: approved.length,
    learningOnlyExercises: catalog.exercises.length - approved.length, learningOnlyTeachings: catalog.learningOnly.length,
    equipment: catalog.equipment.length, templates: templateIDs.size, ...(v2 ? {conditions: conditionIDs.length, lowerBodyExercises: catalog.exercises.filter(e => e.trainingSlot).length} : {})};
}
export function validateLineage(previous, current) {
  const oldRefs = catalogTeachings(previous).map(teachingKey), newRefs = catalogTeachings(current).map(teachingKey);
  assert(oldRefs.every(ref => newRefs.includes(ref)), 'v2 removed historical teaching reference');
  const added = newRefs.filter(ref => !oldRefs.includes(ref)).sort();
  const expected = NEW_LOWER_BODY_IDS.map(id => `collection/legs/legs-basic-${id}`).sort();
  assert(JSON.stringify(added) === JSON.stringify(expected), 'v2 new teaching references differ from approved additions');
  for (const old of previous.exercises) {
    const now = current.exercises.find(e => e.id === old.id); assert(now, `v2 removed historical exercise ${old.id}`);
    if (!REOPENED_LOWER_BODY_IDS.includes(old.id)) assert(JSON.stringify(now) === JSON.stringify(old), `v2 changed inherited exercise ${old.id}`);
    else {
      assert(JSON.stringify([now.defaultTeaching, ...now.otherTeachings]) === JSON.stringify([old.defaultTeaching, ...old.otherTeachings]), `v2 changed historical teaching ${old.id}`);
      assert(now.templates.every(t => !old.templates.some(prior => prior.id === t.id)), `v2 reused changed template ID ${old.id}`);
    }
  }
  assert(JSON.stringify(previous.learningOnly) === JSON.stringify(current.learningOnly), 'v2 changed teaching-only classifications');
  assert(current.exercises.length === previous.exercises.length + NEW_LOWER_BODY_IDS.length, 'v2 exercise additions differ');
  const lower = current.exercises.filter(e => e.trainingSlot).map(e => e.id).sort();
  assert(JSON.stringify(lower) === JSON.stringify([...NEW_LOWER_BODY_IDS, ...REOPENED_LOWER_BODY_IDS].sort()), 'v2 lower-body target set differs');
  return {historicalTeachingIdentities: oldRefs.length, addedTeachingIdentities: added.length};
}
function sourceHashes() {
  const files = new Set(['Sources/SteadyCore/EquipmentLesson.swift', 'Sources/SteadyCore/EquipmentLessonDefinition.swift']);
  for (const cfg of Object.values(TOPICS)) if (cfg.course) {
    files.add(path.relative(ROOT, path.join(cfg.dir, cfg.course))); files.add(path.relative(ROOT, path.join(cfg.dir, cfg.manifest)));
  }
  for (const row of lessonInventory()) files.add(path.relative(ROOT, path.join(TOPICS[row.topic].dir, row.resource)));
  const renderer = 'Sources/SteadyCore/Resources/TrainingCollections/Reviewed/legs/legs-basic-renderer.js';
  if (fs.existsSync(path.join(ROOT, renderer))) files.add(renderer);
  return Object.fromEntries([...files].sort().map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
}
export function renderTypescript(raw) {
  const document = JSON.parse(raw.toString('utf8')), source = document.catalogVersion === 1 ? CATALOG : CATALOG_V2;
  return `// Generated from ${source}. Do not edit.\nexport const exerciseCatalogHash = "${hash(raw)}";\nexport const exerciseCatalog = ${JSON.stringify(document, null, 2)};\n`;
}
export function reviewReport(catalog, raw, counts, lineage = validateLineage(historicalCatalog(), catalog)) {
  const summarize = item => ({id: item.id, name: item.name, roles: [...new Set(item.templates.map(t => t.role))],
    experiences: item.experiences, equipment: item.equipment, ...(item.trainingSlot ? {trainingSlot: item.trainingSlot, requiredConditions: item.requiredConditions, replacementIDs: item.replacementIDs} : {}),
    templates: item.templates.map(t => ({id: t.id, role: t.role, experiences: t.experiences, estimatedSeconds: t.estimatedSeconds})),
    teachingCount: 1 + item.otherTeachings.length, basis: item.review.basis, reason: item.review.reason});
  return {schemaVersion: 2, catalogVersion: catalog.catalogVersion, catalogHash: hash(raw), counts, lineage,
    historicalCatalogHash: V1_HASH, editSource: CATALOG_V2,
    exportCommand: 'node scripts/export-exercise-catalog.mjs', verifyCommand: 'node scripts/export-exercise-catalog.mjs --check', testCommand: 'node --test scripts/exercise-catalog.test.mjs',
    scope: 'The historical catalog is retained byte-for-byte. Sixteen lower-body identities are condition-gated, including seven new supplemental teachings. Fifteen have main templates; the unloaded hinge is preparation only.',
    dosagePolicy: 'Public exercise teaching plus general beginner guidance supports a product-derived supplemental starting template, not expert personal review or clinical validation. Dose and setup estimates are not animation timing.',
    estimatePolicy: 'sets * reps * 4 * sides + (sets - 1) * rest + setup + (perSide ? sets * 15 : 0). Each round completes both sides before rest. The plan engine separately adds 30 seconds between exercises.',
    conditions: catalog.conditions,
    knownGaps: ['Readiness is self-confirmed, not an observed technique assessment.', 'Replacement compatibility never bypasses equipment, experience, readiness, programme structure or time validation.', 'The lowerBodyBasics programme must select its main work only from lower-body slots; the inherited upper-body approval is not eligibility for that programme.', 'Actual pace, additional rest or setup can make a session longer than its planning estimate.', 'This catalogue is not an injury rehabilitation prescription, full-body programme or guaranteed individual result.'],
    approved: catalog.exercises.filter(e => e.status === 'approved').map(summarize), learningOnly: catalog.exercises.filter(e => e.status === 'learningOnly').map(summarize),
    teachingOnly: catalog.learningOnly, sourceHashes: sourceHashes()};
}
export function run(check = false) {
  const oldRaw = fs.readFileSync(path.join(ROOT, CATALOG)), old = historicalCatalog();
  const historicalCounts = validateCatalog(old, catalogTeachings(old));
  assert(fs.readFileSync(path.join(ROOT, TYPESCRIPT), 'utf8') === renderTypescript(oldRaw), 'historical v1 TypeScript changed');
  assert(hash(fs.readFileSync(path.join(ROOT, REPORT))) === V1_REPORT_HASH, 'historical v1 review report changed');
  const raw = fs.readFileSync(path.join(ROOT, CATALOG_V2)), catalog = JSON.parse(raw.toString('utf8'));
  const counts = validateCatalog(catalog), lineage = validateLineage(old, catalog);
  const outputs = [[TYPESCRIPT_V2, renderTypescript(raw)], [REPORT_V2, JSON.stringify(reviewReport(catalog, raw, counts, lineage), null, 2) + '\n']];
  for (const [relative, content] of outputs) {
    const output = path.join(ROOT, relative);
    if (check) assert(fs.existsSync(output) && fs.readFileSync(output, 'utf8') === content, `${relative}: stale or missing; run node scripts/export-exercise-catalog.mjs`);
    else { fs.mkdirSync(path.dirname(output), {recursive: true}); fs.writeFileSync(output, content); }
  }
  console.log(JSON.stringify({mode: check ? 'check' : 'export', historical: {catalogHash: hash(oldRaw), ...historicalCounts}, current: {catalogHash: hash(raw), ...counts}, lineage}));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert(args.length === 0 || args.length === 1 && args[0] === '--check', 'Usage: node scripts/export-exercise-catalog.mjs [--check]'); run(args.includes('--check'));
}
