#!/usr/bin/env node
// Builds Steady's bundled exercise library from the MIT-licensed text of
// hasaneyldrm/exercises-dataset (ExerciseDB v1). Only names, muscles,
// equipment and instruction steps are used; the Gym visual media in that
// repository is not MIT and is never read or referenced.
//
//   node tools/exercise-library/build.mjs --refresh <path/to/exercises.json>
//       Trim a pinned upstream download into source/exercises.mit.json.
//   node tools/exercise-library/build.mjs            Rebuild the bundled library.
//   node tools/exercise-library/build.mjs --check    Fail if the bundle is stale.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const paths = {
  snapshot: join(here, 'source', 'exercises.mit.json'),
  license: join(here, 'source', 'LICENSE'),
  names: join(here, 'names.zh.tsv'),
  vocab: join(here, 'vocab.json'),
  equivalents: join(here, 'equivalents.json'),
  catalog: join(root, 'Sources/SteadyCore/Resources/TrainingCollections/exercise-catalog.v2.json'),
  output: join(root, 'Sources/SteadyCore/Resources/TrainingCollections/exercise-library.v1.json'),
}
export const UPSTREAM = {
  repository: 'https://github.com/hasaneyldrm/exercises-dataset',
  commit: '7455efae41b330c265e7cd4b78dfa848e7ce5ebd',
  file: 'data/exercises.json',
  sha256: '656634224b8977b99a6d765470ee123260d4979715eaa4e7c0b7c8bb0d79f93d',
}
export const FORBIDDEN_KEYS = ['image', 'gif', 'gif_url', 'media', 'media_id', 'video', 'videos', 'images', 'description', 'muscleMap']

const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const clean = (s) => s.replace(/[​‌‍﻿]/g, '').replace(/в°/g, '°').replace(/\s+/g, ' ').trim()
const fail = (message) => { throw new Error(message) }

function refresh(sourcePath) {
  const raw = readFileSync(sourcePath)
  if (sha256(raw) !== UPSTREAM.sha256) fail(`upstream hash mismatch for ${sourcePath}; update UPSTREAM only after reviewing the new commit`)
  const rows = JSON.parse(raw.toString('utf8')).map((e) => ({
    id: e.id,
    name: clean(e.name),
    bodyPart: e.body_part,
    equipment: e.equipment,
    target: e.target,
    secondaryMuscles: e.secondary_muscles,
    steps: { en: e.instruction_steps.en.map(clean), zh: e.instruction_steps.zh.map(clean) },
  })).sort((a, b) => a.id.localeCompare(b.id))
  writeFileSync(paths.snapshot, JSON.stringify({ upstream: UPSTREAM, exercises: rows }, null, 1) + '\n')
  console.log(`trimmed ${rows.length} exercises into ${paths.snapshot}`)
}

function readNames() {
  const names = new Map()
  for (const [index, line] of readFileSync(paths.names, 'utf8').split('\n').entries()) {
    if (!line.trim()) continue
    const [id, name, extra] = line.split('\t')
    if (!id || !name || extra !== undefined) fail(`names.zh.tsv line ${index + 1} must be "id<TAB>name"`)
    if (names.has(id)) fail(`names.zh.tsv repeats ${id}`)
    names.set(id, name.trim())
  }
  return names
}

export function build() {
  const snapshot = JSON.parse(readFileSync(paths.snapshot, 'utf8'))
  const vocab = JSON.parse(readFileSync(paths.vocab, 'utf8'))
  const names = readNames()
  const { _note, ...equivalents } = JSON.parse(readFileSync(paths.equivalents, 'utf8'))
  const catalogIDs = new Set(JSON.parse(readFileSync(paths.catalog, 'utf8')).exercises.map((e) => e.id))
  const duration = new RegExp(vocab.durationPattern, 'i')
  const perSide = new RegExp(vocab.perSidePattern, 'i')
  const durationExceptions = new Set(vocab.durationExceptions)
  const known = new Set(snapshot.exercises.map((e) => e.id))

  const byLibrary = new Map()
  for (const [catalogID, sourceID] of Object.entries(equivalents)) {
    if (!catalogIDs.has(catalogID)) fail(`equivalents.json names unknown catalog exercise ${catalogID}`)
    if (!known.has(sourceID)) fail(`equivalents.json names unknown library exercise ${sourceID}`)
    byLibrary.set(sourceID, [...(byLibrary.get(sourceID) ?? []), catalogID].sort())
  }

  const exercises = snapshot.exercises.map((e) => {
    const name = names.get(e.id) ?? fail(`names.zh.tsv has no name for ${e.id} (${e.name})`)
    if (!vocab.bodyParts[e.bodyPart]) fail(`${e.id}: unmapped body part "${e.bodyPart}"`)
    const equipment = vocab.equipment[e.equipment] ?? fail(`${e.id}: unmapped equipment "${e.equipment}"`)
    for (const m of [e.target, ...e.secondaryMuscles]) if (!vocab.muscles[m]) fail(`${e.id}: unmapped muscle "${m}"`)
    if (!e.steps.zh.length || !e.steps.en.length) fail(`${e.id}: missing instruction steps`)
    const timed = !durationExceptions.has(e.id) && (duration.test(e.name) || e.bodyPart === 'cardio')
    return {
      id: `edb-${e.id}`,
      name,
      englishName: e.name,
      bodyPart: e.bodyPart,
      equipment: e.equipment,
      target: e.target,
      secondaryMuscles: [...new Set(e.secondaryMuscles.filter((m) => vocab.muscles[m] !== vocab.muscles[e.target]))],
      metric: timed ? 'duration' : (equipment.load ? 'weightReps' : 'reps'),
      perSide: perSide.test(e.name),
      steps: e.steps.zh,
      englishSteps: e.steps.en,
      catalogEquivalents: byLibrary.get(e.id) ?? [],
    }
  })
  for (const id of names.keys()) if (!known.has(id)) fail(`names.zh.tsv names unknown exercise ${id}`)

  const count = (key, value) => exercises.filter((e) => e[key] === value).length
  return {
    schemaVersion: 1,
    libraryVersion: 1,
    source: {
      title: 'ExerciseDB v1 via exercises-dataset',
      ...snapshot.upstream,
      license: 'MIT',
      licenseText: readFileSync(paths.license, 'utf8').trim(),
      scope: '仅使用动作名称（英文）、部位、器材、肌群与步骤文字；不包含原数据集中的图片和动画。',
      translation: '中文动作名由 Steady 机器翻译，中文步骤来自原数据集，均未经人工审核。',
    },
    bodyParts: Object.entries(vocab.bodyParts).map(([id, name]) => ({ id, name, count: count('bodyPart', id) })),
    equipment: Object.entries(vocab.equipment).map(([id, v]) => ({ id, name: v.name, count: count('equipment', id) })),
    muscles: Object.entries(vocab.muscles).map(([id, name]) => ({ id, name })),
    exercises,
  }
}

const serialize = (library) => JSON.stringify(library) + '\n'

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  if (args[0] === '--refresh') refresh(args[1] ?? fail('--refresh needs the downloaded exercises.json path'))
  const text = serialize(build())
  if (args.includes('--check')) {
    let current = ''
    try { current = readFileSync(paths.output, 'utf8') } catch {}
    if (current !== text) { console.error('exercise-library.v1.json is stale; run node tools/exercise-library/build.mjs'); process.exit(1) }
    console.log(JSON.stringify({ mode: 'check', exercises: build().exercises.length, sha256: sha256(text) }))
  } else {
    writeFileSync(paths.output, text)
    console.log(JSON.stringify({ mode: 'write', exercises: build().exercises.length, bytes: Buffer.byteLength(text), sha256: sha256(text) }))
  }
}
