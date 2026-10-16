#!/usr/bin/env node
// Builds Steady's bundled body map from the MIT-licensed muscle path data of
// melihcolpan/MuscleMap. Only the male front/back SVG path strings are used;
// MuscleMap's views, renderer, styles and localizations are not vendored.
//
//   node tools/muscle-map/build.mjs --refresh <path/to/MuscleMap checkout>
//       Copy the pinned upstream data files and LICENSE into source/.
//   node tools/muscle-map/build.mjs            Rebuild the bundled map.
//   node tools/muscle-map/build.mjs --check    Fail if the bundle is stale.
import { createHash } from 'node:crypto'
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const resources = join(root, 'Sources/SteadyCore/Resources/MuscleMap')
export const UPSTREAM = {
  repository: 'https://github.com/melihcolpan/MuscleMap',
  tag: '1.9.0',
  commit: '3aa662bd5147463b20d523f95d74e1a12c7c8b2e',
  files: {
    LICENSE: 'b008022459fbfd5fb6366cc64821c0083b792b15c80d061d51ceda1a45a8d296',
    'Sources/MuscleMap/Data/MaleFrontPaths.swift': '39029bad327642b5ee8eb9991674dc42790549f49adb98bfb713153eaa7763a0',
    'Sources/MuscleMap/Data/MaleBackPaths.swift': 'be440e303e3f230f9270d13751a880baf7aeb5cb8d4d9a8753618db188c71f13',
  },
}
// Upstream BodyViewBox.maleFront / .maleBack: both views share one canvas, offset horizontally.
export const VIEWS = [
  { side: 'front', file: 'MaleFrontPaths.swift', viewBox: [0, 95, 727, 1280] },
  { side: 'back', file: 'MaleBackPaths.swift', viewBox: [718, 95, 727, 1280] },
]
// Regions MuscleMap draws on top of a larger muscle only while they are highlighted
// (its sub-groups and overlay regions). Everything else is part of the always-drawn body.
export const DETAIL = {
  'upper-chest': 'chest', 'lower-chest': 'chest',
  'inner-quad': 'quadriceps', 'outer-quad': 'quadriceps', 'hip-flexors': 'quadriceps',
  'upper-abs': 'abs', 'lower-abs': 'abs',
  'front-deltoid': 'deltoids', 'rear-deltoid': 'deltoids',
  'upper-trapezius': 'trapezius', 'lower-trapezius': 'trapezius',
  serratus: 'obliques', rhomboids: 'trapezius',
}
// Cut out of a larger muscle and always drawn; it takes the host's highlight when it has none.
export const CARVED = { 'rotator-cuff': 'upper-back' }
// Drawn as part of the figure but never highlighted.
export const COSMETIC = ['head', 'hair', 'knees']

const output = join(resources, 'muscle-map.v1.json')
const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const fail = (message) => { throw new Error(message) }
const kebab = (name) => name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())

function refresh(checkout) {
  for (const [file, hash] of Object.entries(UPSTREAM.files)) {
    const path = join(checkout, file)
    if (sha256(readFileSync(path)) !== hash) fail(`upstream hash mismatch for ${file}; update UPSTREAM only after reviewing the new commit`)
    copyFileSync(path, join(here, 'source', file.split('/').pop()))
  }
  console.log(`copied ${Object.keys(UPSTREAM.files).length} files from MuscleMap ${UPSTREAM.tag}`)
}

/// Extracts `BodyPartPathData(slug: .x, common/left/right: ["..."])` blocks in source order.
export function parseRegions(swift) {
  const regions = []
  for (const block of swift.split('BodyPartPathData(').slice(1)) {
    const slug = block.match(/^\s*slug:\s*\.(\w+)/)?.[1] ?? fail('block without slug')
    const paths = [...block.matchAll(/"([^"]*)"/g)].map((m) => m[1])
    if (!paths.length) fail(`${slug} has no paths`)
    const id = kebab(slug)
    if (regions.some((r) => r.id === id)) fail(`duplicate region ${id}`)
    const region = { id, layer: DETAIL[id] ? 'detail' : COSMETIC.includes(id) ? 'cosmetic' : 'base' }
    if (DETAIL[id]) region.parent = DETAIL[id]
    if (CARVED[id]) region.inherits = CARVED[id]
    regions.push({ ...region, paths })
  }
  return regions
}

export function build() {
  const license = readFileSync(join(here, 'source', 'LICENSE'), 'utf8')
  for (const [file, hash] of Object.entries(UPSTREAM.files)) {
    if (sha256(readFileSync(join(here, 'source', file.split('/').pop()))) !== hash) fail(`source/${file.split('/').pop()} differs from the pinned upstream file`)
  }
  const views = VIEWS.map(({ side, file, viewBox }) => {
    const regions = parseRegions(readFileSync(join(here, 'source', file), 'utf8'))
    const ids = new Set(regions.map((r) => r.id))
    for (const r of regions) for (const host of [r.parent, r.inherits]) if (host && !ids.has(host)) fail(`${side} ${r.id} refers to missing ${host}`)
    return { side, viewBox, regions }
  })
  return {
    schemaVersion: 1,
    source: {
      title: 'MuscleMap — SwiftUI 人体肌肉图',
      repository: UPSTREAM.repository,
      tag: UPSTREAM.tag,
      commit: UPSTREAM.commit,
      license: 'MIT',
      licenseText: license,
      scope: '仅使用男性正面与背面的肌肉轮廓路径数据；绘制、配色和中文名称由 Steady 自己实现。',
    },
    views,
  }
}

const args = process.argv.slice(2)
if (import.meta.url === `file://${process.argv[1]}`) {
  if (args[0] === '--refresh') refresh(args[1] ?? fail('usage: --refresh <MuscleMap checkout>'))
  const json = JSON.stringify(build()) + '\n'
  if (args[0] === '--check') {
    if (readFileSync(output, 'utf8') !== json) fail('muscle-map.v1.json is stale; run node tools/muscle-map/build.mjs')
    if (readFileSync(join(resources, 'LICENSE'), 'utf8') !== readFileSync(join(here, 'source', 'LICENSE'), 'utf8')) fail('Resources/MuscleMap/LICENSE differs from source/LICENSE')
    console.log('muscle map is up to date')
  } else {
    writeFileSync(output, json)
    copyFileSync(join(here, 'source', 'LICENSE'), join(resources, 'LICENSE'))
    const counts = build().views.map((v) => `${v.side} ${v.regions.length} regions`).join(', ')
    console.log(`wrote ${output} (${counts})`)
  }
}
