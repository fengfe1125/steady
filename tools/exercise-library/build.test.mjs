import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { build, FORBIDDEN_KEYS, UPSTREAM } from './build.mjs'

const bundled = readFileSync(new URL('../../Sources/SteadyCore/Resources/TrainingCollections/exercise-library.v1.json', import.meta.url), 'utf8')
const library = JSON.parse(bundled)
const catalog = JSON.parse(readFileSync(new URL('../../Sources/SteadyCore/Resources/TrainingCollections/exercise-catalog.v2.json', import.meta.url), 'utf8'))

test('bundled library matches a fresh build', () => {
  assert.equal(bundled, JSON.stringify(build()) + '\n')
})

test('every exercise is complete and uniquely identified', () => {
  assert.equal(library.exercises.length, 1324)
  const ids = new Set(library.exercises.map((e) => e.id))
  assert.equal(ids.size, library.exercises.length)
  const bodyParts = new Set(library.bodyParts.map((b) => b.id))
  const equipment = new Set(library.equipment.map((b) => b.id))
  const muscles = new Set(library.muscles.map((b) => b.id))
  for (const e of library.exercises) {
    assert.match(e.id, /^edb-\d{4}$/)
    assert.ok(e.name.length > 0 && e.name.length <= 100, e.id)
    assert.ok(/[一-鿿]/.test(e.name), `${e.id} needs a Chinese name`)
    assert.ok(e.steps.length > 0 && e.englishSteps.length > 0, e.id)
    assert.ok(bodyParts.has(e.bodyPart) && equipment.has(e.equipment), e.id)
    for (const m of [e.target, ...e.secondaryMuscles]) assert.ok(muscles.has(m), `${e.id}: ${m}`)
    assert.ok(['weightReps', 'reps', 'duration'].includes(e.metric), e.id)
  }
  assert.equal(new Set(library.exercises.map((e) => e.name)).size, library.exercises.length, 'Chinese names must be distinct')
})

test('only MIT text fields are bundled, never media or openGym-authored text', () => {
  const walk = (value, path) => {
    if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${path}[${i}]`))
    if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) {
      assert.ok(!FORBIDDEN_KEYS.includes(k), `${path}.${k} is not allowed`)
      walk(v, `${path}.${k}`)
    }
    if (typeof value === 'string') assert.doesNotMatch(value, /\.(gif|mp4|webp|jpe?g|png)\b|gymvisual|opengym/i, path)
  }
  walk(library.exercises, 'exercises')
  assert.equal(library.source.commit, UPSTREAM.commit)
  assert.equal(library.source.license, 'MIT')
  assert.match(library.source.licenseText, /^MIT License/)
})

test('catalog equivalents point at real reviewed entries', () => {
  const catalogIDs = new Set(catalog.exercises.map((e) => e.id))
  const linked = library.exercises.filter((e) => e.catalogEquivalents.length)
  assert.ok(linked.length >= 25)
  for (const e of linked) for (const id of e.catalogEquivalents) assert.ok(catalogIDs.has(id), id)
})

test('metric inference keeps loaded lifts, bodyweight work and holds apart', () => {
  const byID = Object.fromEntries(library.exercises.map((e) => [e.id, e]))
  assert.equal(byID['edb-0025'].metric, 'weightReps') // barbell bench press
  assert.equal(byID['edb-0662'].metric, 'reps') // push-up
  assert.equal(byID['edb-1511'].metric, 'duration') // hamstring stretch
  assert.equal(byID['edb-0471'].metric, 'reps') // handstand push-up is not a hold
  assert.equal(byID['edb-0541'].perSide, true) // kettlebell one arm row
})
