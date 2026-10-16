import assert from 'node:assert/strict';
import test from 'node:test';
import {lessonInventory, lessonCoverage, selectedTopics} from '../build.mjs';

test('the expected inventory includes all 104 identities including seven authored lower-body lessons independently of existing specs', () => {
  const inventory = lessonInventory();
  assert.equal(inventory.length, 104);
  assert.equal(inventory.filter(r => r.topic !== 'equipment').length, 90);
  assert.equal(inventory.filter(r => r.topic === 'equipment').length, 14);
  const coverage = lessonCoverage([]);
  assert.equal(coverage.complete, false);
  assert.equal(coverage.coveredLessons, 7);
  assert.equal(coverage.missing.length, 97);
  assert.equal(coverage.authoredPages, 7);
  assert.equal(inventory.filter(r => r.id.startsWith("legs-basic-")).length, 7);
});

test('one arms page can cover two lesson IDs without counting it as two pages', () => {
  const rows = lessonInventory(['arms']);
  const shared = rows.filter(r => r.resource === 'arms-single-cable-extension.html');
  assert.equal(shared.length, 2);
  const lesson = {topic: 'arms', resource: shared[0].resource, file: 'shared.mjs', spec: {lessons: shared.map(r => r.id)}};
  const coverage = lessonCoverage([lesson], ['arms']);
  assert.equal(coverage.coveredLessons, 2);
  assert.equal(coverage.uniquePages, 1);
  assert.equal(coverage.complete, false);
  assert.throws(() => lessonCoverage([lesson, lesson], ['arms']), /multiple specs overwrite/);
  assert.throws(() => lessonCoverage([{...lesson, spec: {lessons: [shared[0].id, shared[0].id]}}], ['arms']), /duplicate spec coverage/);
});

test('unknown topics and resources cannot silently reduce the required scope', () => {
  assert.throws(() => selectedTopics(['--only', 'shoulder']), /unknown topic/);
  assert.throws(() => selectedTopics(['--only']), /needs/);
  assert.throws(() => lessonCoverage([{topic: 'equipment', resource: 'ChestPressArtwork.html',
    file: 'wrong.mjs', spec: {id: 'unknown-equipment'}}], ['equipment']), /does not match/);
  assert.deepEqual(selectedTopics(['--only=shoulders,shoulders']), ['shoulders']);
});
