import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, DETAIL, CARVED, UPSTREAM } from './build.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const bundled = join(here, '..', '..', 'Sources/SteadyCore/Resources/MuscleMap/muscle-map.v1.json')

test('the bundled map is reproducible from the pinned MuscleMap files', () => {
  assert.equal(readFileSync(bundled, 'utf8'), JSON.stringify(build()) + '\n')
})

test('source is MuscleMap MIT at a pinned commit and nothing else', () => {
  const map = build()
  assert.equal(map.source.repository, 'https://github.com/melihcolpan/MuscleMap')
  assert.match(UPSTREAM.commit, /^[0-9a-f]{40}$/)
  assert.ok(map.source.licenseText.startsWith('MIT License'))
  assert.doesNotMatch(readFileSync(bundled, 'utf8'), /opengym|gymvisual/i)
})

test('every region has paths and detail or carved hosts exist on the same side', () => {
  for (const view of build().views) {
    const ids = new Set(view.regions.map((r) => r.id))
    for (const region of view.regions) {
      assert.ok(region.paths.every((d) => /^[Mm]/.test(d)), `${view.side} ${region.id}`)
      if (DETAIL[region.id]) assert.ok(ids.has(region.parent))
      if (CARVED[region.id]) assert.ok(ids.has(region.inherits))
    }
  }
})
