import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ROOT, CATALOG, TYPESCRIPT, REPORT, currentInventory, validateCatalog, renderTypescript, teachingKey, catalogTeachings, historicalCatalog, CATALOG_V2, TYPESCRIPT_V2, REPORT_V2, V1_HASH, validateLineage, estimatedSeconds, NEW_LOWER_BODY_IDS, REOPENED_LOWER_BODY_IDS} from './export-exercise-catalog.mjs';

const raw = fs.readFileSync(path.join(ROOT, CATALOG));
const catalog = JSON.parse(raw.toString('utf8'));
const inventory = catalogTeachings(historicalCatalog());
const copy = () => structuredClone(catalog);
const byID = (document, id) => document.exercises.find(item => item.id === id);
const candidate = (document, equipment, experience, role) => document.exercises.filter(item => item.status === 'approved'
  && item.experiences.includes(experience) && item.equipment.every(id => equipment.includes(id))
  && item.templates.some(template => template.role === role && template.experiences.includes(experience)));

test('every original lesson has exactly one classification, including all fourteen machine lessons', () => {
  const summary = validateCatalog(catalog, inventory);
  assert.equal(summary.teachingIdentities, 97);
  assert.equal(inventory.filter(ref => ref.kind === 'collection').length, 83);
  assert.equal(inventory.filter(ref => ref.kind === 'equipment').length, 14);
  assert.equal(summary.approvedExercises + summary.learningOnlyExercises, summary.canonicalExercises);
});

test('unknown, repeated or missing teaching references fail closed', () => {
  const unknown = copy(); unknown.exercises[0].defaultTeaching.lessonID = 'imaginary-movement';
  assert.throws(() => validateCatalog(unknown, inventory), /unknown teaching/);
  const duplicate = copy(); duplicate.exercises[1].otherTeachings.push(duplicate.exercises[0].defaultTeaching);
  assert.throws(() => validateCatalog(duplicate, inventory), /duplicate teaching/);
  const missing = copy(); missing.learningOnly.pop();
  assert.throws(() => validateCatalog(missing, inventory), /coverage incomplete/);
});

test('only existing, explicitly confirmed equipment can qualify an exercise', () => {
  const bad = copy(); bad.exercises[0].equipment.push('entire-gym');
  assert.throws(() => validateCatalog(bad, inventory), /equipment: unknown value/);
  assert.deepEqual(candidate(catalog, [], '初学者', 'main'), []);
  assert.deepEqual(candidate(catalog, ['dumbbells'], '初学者', 'main'), []);
  assert(candidate(catalog, ['wall'], '初学者', 'main').some(item => item.id === 'wall-push-up'));
  assert(!candidate(catalog, ['wall'], '初学者', 'main').some(item => item.id === 'chest-flat-press'));
});

test('an approved exercise has one deterministic template per eligible experience and role', () => {
  const overlap = copy(); const item = byID(overlap, 'wall-push-up');
  item.templates.push({...structuredClone(item.templates[0]), id: 'duplicate-role-template'});
  assert.throws(() => validateCatalog(overlap, inventory), /multiple templates for role and experience/);
  const absent = copy(); byID(absent, 'wall-push-up').templates[0].experiences = ['规律运动'];
  assert.throws(() => validateCatalog(absent, inventory), /approved experience has no template/);
  const outside = copy(); byID(outside, 'back-bent-arm-pulldown').templates[0].experiences = ['初学者'];
  assert.throws(() => validateCatalog(outside, inventory), /experiences: unknown value/);
});

test('unreviewed lessons cannot acquire a runnable template and approval cannot omit one', () => {
  const learning = copy(); byID(learning, 'dumbbell-goblet-squat').templates.push(structuredClone(byID(learning, 'wall-push-up').templates[0]));
  assert.throws(() => validateCatalog(learning, inventory), /status\/template mismatch/);
  const approved = copy(); byID(approved, 'wall-push-up').templates = [];
  assert.throws(() => validateCatalog(approved, inventory), /status\/template mismatch/);
  const noBasis = copy(); byID(noBasis, 'wall-push-up').review.basis = '';
  assert.throws(() => validateCatalog(noBasis, inventory), /review.basis: empty text/);
});

test('dose units and scheduling allocations reject impossible values', () => {
  const both = copy(); byID(both, 'wall-push-up').templates[0].durationSeconds = 30;
  assert.throws(() => validateCatalog(both, inventory), /repetitions OR duration/);
  const fractional = copy(); byID(fractional, 'wall-push-up').templates[0].sets = 1.5;
  assert.throws(() => validateCatalog(fractional, inventory), /sets: out of range/);
  const noRestBudget = copy(); byID(noRestBudget, 'back-one-arm-row').templates[0].estimatedSeconds = 60;
  assert.throws(() => validateCatalog(noRestBudget, inventory), /time budget omits prescribed work or rest/);
  const badSide = copy(); byID(badSide, 'wall-push-up').templates[0].perSide = 'both';
  assert.throws(() => validateCatalog(badSide, inventory), /perSide must be boolean/);
});

test('known complete equipment conditions have warmup, main and cooldown candidates', () => {
  for (const experience of ['初学者', '偶尔运动', '规律运动']) {
    for (const role of ['warmup', 'main', 'cooldown']) assert(candidate(catalog, ['wall'], experience, role).length > 0);
  }
  const warmup = byID(catalog, 'march-in-place').templates.find(t => t.role === 'warmup');
  const main = byID(catalog, 'wall-push-up').templates.find(t => t.role === 'main');
  const cooldown = byID(catalog, 'walk').templates.find(t => t.role === 'cooldown');
  assert(warmup.estimatedSeconds + main.estimatedSeconds + cooldown.estimatedSeconds <= 15 * 60);
  assert(byID(catalog, 'seated-chest-press').templates.every(t => t.role === 'warmup'));
});

test('confirmed same movements merge while uncertain and mechanically different variants remain separate', () => {
  const owner = new Map();
  for (const item of catalog.exercises) for (const ref of [item.defaultTeaching, ...item.otherTeachings]) owner.set(ref.lessonID, item.id);
  assert.equal(owner.get('arms-warmup-triceps'), owner.get('arms-single-cable-extension'));
  assert.equal(owner.get('arms-seated-cable-curl'), owner.get('arms-extra-seated-cable-curl'));
  assert.equal(owner.get('back-seated-row'), owner.get('seated-cable-row'));
  assert.notEqual(owner.get('arms-single-cable-extension'), owner.get('arms-extra-cable-pushdown'));
  assert.notEqual(owner.get('back-neutral-pulldown'), owner.get('lat-pulldown'));
  assert.notEqual(owner.get('chest-flat-press'), owner.get('seated-chest-press'));
  assert.notEqual(owner.get('functional-dumbbell-romanian-deadlift'), owner.get('legs-dumbbell-deadlift'));
});

test('assisted, complex and setup-only teaching is not silently converted to main work', () => {
  for (const id of ['chest-parallel-bar-dip', 'functional-single-leg-hip-thrust', 'functional-dumbbell-lunge-press', 'legs-90-90-leg-extension', 'dumbbell-goblet-squat']) {
    assert.equal(byID(catalog, id).status, 'learningOnly'); assert.deepEqual(byID(catalog, id).templates, []);
  }
  assert(catalog.learningOnly.some(item => item.teaching.lessonID === 'shoulders-single-dumbbell-press'));
  assert(catalog.learningOnly.some(item => item.teaching.lessonID === 'arms-extra-warmup-rehearsal'));
});

test('ambiguous aliases cannot silently route a legacy exercise to an arbitrary variant', () => {
  const ambiguous = copy(); ambiguous.exercises[1].aliases.push(ambiguous.exercises[0].name);
  assert.throws(() => validateCatalog(ambiguous, inventory), /ambiguous legacy name/);
});

test('cloud output and review manifest carry the SHA-256 of exact source JSON bytes', () => {
  const expected = createHash('sha256').update(raw).digest('hex');
  assert.equal(fs.readFileSync(path.join(ROOT, TYPESCRIPT), 'utf8'), renderTypescript(raw));
  const review = JSON.parse(fs.readFileSync(path.join(ROOT, REPORT), 'utf8'));
  assert.equal(review.catalogHash, expected);
  assert(renderTypescript(raw).includes(`exerciseCatalogHash = "${expected}"`));
  assert.notEqual(renderTypescript(Buffer.concat([raw, Buffer.from('\n')])), renderTypescript(raw));
  // Historical source hashes describe the original review, not subsequently expanded teachings.
  assert.equal(expected, V1_HASH);
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(ROOT, REPORT))).digest('hex'), '16a08d42a867e8c94de29684050506f62bbab578dc7ccecb0097993bfe450e84');
  assert.equal(new Set(inventory.map(teachingKey)).size, 97);
});

const rawV2 = fs.readFileSync(path.join(ROOT, CATALOG_V2));
const v2 = JSON.parse(rawV2.toString('utf8'));
const inventoryV2 = currentInventory();
const copyV2 = () => structuredClone(v2);
const mainV2 = id => byID(v2, id).templates;

test('v2 adds seven teachings to the frozen inventory and preserves all unrelated exercise semantics', () => {
  const lineage = validateLineage(catalog, v2), summary = validateCatalog(v2, inventoryV2);
  assert.deepEqual(lineage, {historicalTeachingIdentities: inventory.length, addedTeachingIdentities: NEW_LOWER_BODY_IDS.length});
  assert.equal(summary.teachingIdentities, inventory.length + NEW_LOWER_BODY_IDS.length);
  assert.equal(inventoryV2.filter(ref => ref.kind === 'equipment').length, inventory.filter(ref => ref.kind === 'equipment').length);
  assert.equal(summary.lowerBodyExercises, NEW_LOWER_BODY_IDS.length + REOPENED_LOWER_BODY_IDS.length);
  assert.equal(summary.approvedExercises, 39); assert.equal(summary.templates, 42); assert.equal(summary.conditions, 15);
  const changedUpper = copyV2(); byID(changedUpper, 'wall-push-up').templates[0].prescription += ' changed';
  assert.throws(() => validateLineage(catalog, changedUpper), /changed inherited exercise/);
  const removed = copyV2(); removed.exercises = removed.exercises.filter(e => e.id !== 'floor-glute-bridge');
  assert.throws(() => validateLineage(catalog, removed), /new teaching references differ/);
});

test('v2 conditions have distinct IDs, current versions and resolvable teaching, without duplicating classification', () => {
  const duplicate = copyV2(); duplicate.conditions.push(duplicate.conditions[0]);
  assert.throws(() => validateCatalog(duplicate, inventoryV2), /condition IDs: duplicate/);
  const version = copyV2(); version.conditions[0].version = 0;
  assert.throws(() => validateCatalog(version, inventoryV2), /unsupported version/);
  const reference = copyV2(); reference.conditions[0].teaching.lessonID = 'missing-tutorial';
  assert.throws(() => validateCatalog(reference, inventoryV2), /unknown teaching/);
  const unknown = copyV2(); byID(unknown, 'floor-glute-bridge').requiredConditions.push('experience-is-enough');
  assert.throws(() => validateCatalog(unknown, inventoryV2), /requiredConditions: unknown value/);
  const noGate = copyV2(); byID(noGate, 'floor-glute-bridge').requiredConditions = [];
  assert.throws(() => validateCatalog(noGate, inventoryV2), /requiredConditions: invalid array/);
  assert.deepEqual(byID(v2, 'dumbbell-goblet-squat').requiredConditions, ['basic-squat', 'dumbbell-control']);
  assert.deepEqual(byID(v2, 'functional-dumbbell-romanian-deadlift').requiredConditions, ['hip-hinge', 'dumbbell-control']);
  assert.deepEqual(byID(v2, 'legs-bulgarian-split-squat').requiredConditions, ['split-stance', 'rear-support-stable']);
  assert.deepEqual(byID(v2, 'legs-bulgarian-split-squat').experiences, ['偶尔运动', '规律运动']);
});

test('the seven new identities use separate teaching routes and preserve concrete equipment requirements', () => {
  for (const id of NEW_LOWER_BODY_IDS) {
    assert.deepEqual(byID(v2, id).defaultTeaching, {kind: 'collection', topic: 'legs', lessonID: `legs-basic-${id}`});
  }
  for (const id of ['floor-glute-bridge', 'side-lying-hip-abduction']) {
    assert.deepEqual(byID(v2, id).equipment, []); assert.deepEqual(byID(v2, id).requiredConditions, ['floor-access']);
  }
  assert.deepEqual(byID(v2, 'chair-sit-to-stand').equipment, ['stable-chair']);
  for (const id of ['supported-calf-raise', 'supported-split-squat']) assert.deepEqual(byID(v2, id).equipment, ['fixed-support']);
  for (const id of ['stable-chair', 'fixed-support']) assert.deepEqual(v2.equipment.find(e => e.id === id).scenes, ['自重', '哑铃', '健身房']);
  assert(!byID(v2, 'supported-calf-raise').equipment.includes('stable-chair'));
});

test('v2 lower-body dose is deterministic and preparation cannot become main work', () => {
  const novice = ['chair-sit-to-stand', 'supported-calf-raise'];
  const lower = v2.exercises.filter(e => e.trainingSlot);
  for (const e of lower) {
    for (const experience of e.experiences) {
      const matches = e.templates.filter(t => t.experiences.includes(experience)); assert.equal(matches.length, 1, `${e.id}/${experience}`);
      const t = matches[0]; assert.equal(t.role, e.trainingSlot === 'preparation' ? 'warmup' : 'main');
      assert.equal(t.sets, e.trainingSlot === 'preparation' ? 1 : 2);
      assert.equal(t.reps, e.trainingSlot === 'preparation' ? 10 : novice.includes(e.id) && experience === '初学者' ? 5 : 8);
    }
  }
  const hinge = copyV2(); byID(hinge, 'unloaded-hip-hinge').templates[0].role = 'main';
  assert.throws(() => validateCatalog(hinge, inventoryV2), /training slot\/role mismatch/);
  assert.equal(mainV2('unloaded-hip-hinge')[0].restSeconds, 0);
  const repeated = copyV2(); const chair = byID(repeated, 'chair-sit-to-stand');
  chair.templates[1].experiences.push('初学者');
  assert.throws(() => validateCatalog(repeated, inventoryV2), /multiple templates for role and experience/);
});

test('v2 time estimates include both sides, one rest per round and the correct setup class', () => {
  const expected = {'functional-dumbbell-romanian-deadlift': [214], 'dumbbell-goblet-squat': [214], 'seated-leg-press': [244],
    'seated-leg-curl': [214], 'legs-prone-leg-curl': [214], 'seated-leg-extension': [214], 'legs-hip-adduction': [214],
    'legs-calf-raise': [154], 'legs-bulgarian-split-squat': [278], 'chair-sit-to-stand': [130,154], 'floor-glute-bridge': [154],
    'supported-calf-raise': [130,154], 'bodyweight-squat': [184], 'supported-split-squat': [278], 'side-lying-hip-abduction': [248], 'unloaded-hip-hinge': [70]};
  for (const [id, times] of Object.entries(expected)) {
    assert.deepEqual(mainV2(id).map(t => t.estimatedSeconds), times, id);
    for (const t of mainV2(id)) assert.equal(t.estimatedSeconds, estimatedSeconds(t));
  }
  const doubledRest = copyV2(); byID(doubledRest, 'supported-split-squat').templates[0].estimatedSeconds += 90;
  assert.throws(() => validateCatalog(doubledRest, inventoryV2), /differs from formula/);
  const missing = copyV2(); delete byID(missing, 'floor-glute-bridge').templates[0].estimate;
  assert.throws(() => validateCatalog(missing, inventoryV2), /requires estimate/);
  const unsupported = copyV2(); byID(unsupported, 'floor-glute-bridge').templates[0].estimate.repSeconds = 1;
  assert.throws(() => validateCatalog(unsupported, inventoryV2), /unsupported estimate parameters/);
  const setupClass = copyV2(); const t = byID(setupClass, 'floor-glute-bridge').templates[0]; t.estimate.setupSeconds = 60; t.estimatedSeconds = estimatedSeconds(t);
  assert.throws(() => validateCatalog(setupClass, inventoryV2), /setup class differs from equipment/);
});

test('replacement groups are complete, symmetric and never substitute knee extension for knee-dominant work', () => {
  const groups = [
    ['chair-sit-to-stand', 'bodyweight-squat', 'dumbbell-goblet-squat', 'seated-leg-press', 'supported-split-squat', 'legs-bulgarian-split-squat'],
    ['functional-dumbbell-romanian-deadlift', 'floor-glute-bridge'], ['seated-leg-curl', 'legs-prone-leg-curl'], ['legs-calf-raise', 'supported-calf-raise'],
  ];
  for (const group of groups) for (const id of group) assert.deepEqual([...byID(v2, id).replacementIDs].sort(), group.filter(other => other !== id).sort());
  for (const id of ['seated-leg-extension', 'legs-hip-adduction', 'side-lying-hip-abduction', 'unloaded-hip-hinge']) assert.deepEqual(byID(v2, id).replacementIDs, []);
  const crossed = copyV2(); byID(crossed, 'seated-leg-extension').replacementIDs.push('bodyweight-squat');
  assert.throws(() => validateCatalog(crossed, inventoryV2), /replacement changes training slot/);
  const asymmetric = copyV2(); byID(asymmetric, 'floor-glute-bridge').replacementIDs = [];
  assert.throws(() => validateCatalog(asymmetric, inventoryV2), /asymmetric replacement/);
  const self = copyV2(); byID(self, 'legs-hip-adduction').replacementIDs.push('legs-hip-adduction');
  assert.throws(() => validateCatalog(self, inventoryV2), /self replacement/);
});

test('only the approved lower-body additions are promoted; complex existing variants stay learning-only', () => {
  for (const id of ['functional-single-leg-hip-thrust', 'functional-dumbbell-lunge-press', 'legs-90-90-leg-extension', 'legs-dumbbell-deadlift']) {
    assert.equal(byID(v2, id).status, 'learningOnly'); assert.deepEqual(byID(v2, id).templates, []);
  }
  for (const e of v2.exercises.filter(e => e.trainingSlot)) {
    assert(e.review.basis.includes('docs/lower-body-evidence.md'));
    assert(e.review.reason.includes('supplemental'));
    assert(e.review.reason.includes('临床验证'));
  }
});

test('v2 generated output and current source review match exact bytes while v1 remains frozen', () => {
  const expected = createHash('sha256').update(rawV2).digest('hex');
  assert.equal(fs.readFileSync(path.join(ROOT, TYPESCRIPT_V2), 'utf8'), renderTypescript(rawV2));
  const review = JSON.parse(fs.readFileSync(path.join(ROOT, REPORT_V2), 'utf8'));
  assert.equal(review.catalogHash, expected); assert.equal(review.historicalCatalogHash, V1_HASH);
  for (const [file, digest] of Object.entries(review.sourceHashes)) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex'), digest, `teaching source changed: ${file}`);
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(ROOT, CATALOG))).digest('hex'), V1_HASH);
});
