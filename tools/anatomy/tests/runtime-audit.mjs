import {inspectCurrentRenderedLesson} from './rendered-checks.mjs';

/** Numeric differences alone cannot establish continuity if parts disappear. */
export function compareGeometry(before, after) {
  const a = Object.keys(before).sort(), b = Object.keys(after).sort();
  if (a.length !== b.length || a.some((key, i) => key !== b[i])) return {max: Infinity, problem: 'geometry topology changed'};
  let max = 0, worst;
  for (const key of a) {
    const x = before[key], y = after[key];
    if (x.length !== y.length || [...x, ...y].some(v => !Number.isFinite(v))) return {max: Infinity, problem: `invalid geometry: ${key}`};
    const delta = Math.hypot(...x.map((v, i) => v - y[i]));
    if (delta > max) { max = delta; worst = key; }
  }
  return {max, worst};
}

function jointGeometry(value, key = 'joints', points = {}) {
  if (!value || typeof value !== 'object') return points;
  if (typeof value.x === 'number' && (typeof value.y === 'number' || typeof value.h === 'number')) {
    points[key] = [value.x, value.h ?? value.y, value.z ?? 0];
  } else for (const [name, child] of Object.entries(value)) jointGeometry(child, `${key}.${name}`, points);
  return points;
}

/** Sample actual painted SVG geometry in screen coordinates, including equipment. */
function svgGeometry(root) {
  const points = {}, svg = root.document.querySelector('#motion svg');
  if (!svg) throw new Error('Missing motion SVG');
  const nodes = svg.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon');
  nodes.forEach((node, i) => {
    if (node.closest('defs') || node.closest('clipPath')) return;
    const style = root.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    const matrix = node.getScreenCTM();
    if (!matrix) throw new Error('Missing rendered SVG matrix');
    const box = node.getBBox(), local = [[box.x, box.y], [box.x + box.width, box.y + box.height]];
    if (typeof node.getTotalLength === 'function' && typeof node.getPointAtLength === 'function') {
      const length = node.getTotalLength();
      if (length > 0) for (const frac of [.15, .5, .85]) { const p = node.getPointAtLength(length * frac); local.push([p.x, p.y]); }
    }
    points[`${i}:${node.tagName}`] = local.flatMap(([x, y]) => [matrix.a * x + matrix.c * y + matrix.e, matrix.b * x + matrix.d * y + matrix.f]);
  });
  if (!Object.keys(points).length) throw new Error('No painted SVG geometry');
  return points;
}

export function captureRuntime(root) {
  if (typeof root.SteadyLessonPlaybackState !== 'function') throw new Error('Missing playback observer; regenerate the engine');
  const state = root.SteadyLessonPlaybackState();
  const rendered = root.SteadyLessonRenderedSamples();
  const check = inspectCurrentRenderedLesson(root);
  return {state, joints: jointGeometry(rendered[0]?.sample?.joints), svg: svgGeometry(root), check};
}

export function checkBoundary(before, after) {
  const joints = compareGeometry(before.joints, after.joints), svg = compareGeometry(before.svg, after.svg);
  return {joints, svg, passed: !joints.problem && !svg.problem && joints.max <= .1 && svg.max <= .35};
}

export function checkPause(before, after) {
  const joints = compareGeometry(before.joints, after.joints), svg = compareGeometry(before.svg, after.svg);
  return {timeDelta: after.state.time - before.state.time, joints, svg,
    passed: !after.state.playing && Math.abs(after.state.time - before.state.time) < .001 &&
      !joints.problem && !svg.problem && joints.max < .000001 && svg.max < .000001};
}

const frame = root => new Promise(resolve => root.requestAnimationFrame(resolve));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Real rAF playback only. No fake clock, scene.sample or time-stepping loop. */
export async function auditRuntime(root, {cancelled = () => false, progress = () => {}} = {}) {
  const spec = root.SteadyLesson, T = spec?.timing;
  if (!T || !Number.isFinite(T.duration) || T.duration <= 0) throw new Error('Invalid duration');
  const problems = new Set(), phases = [], seams = [], pauses = [], panels = [];
  let revision = 1000;
  const command = (playing, speed = 1, time = root.SteadyLessonPlaybackState().time, dark = false) =>
    root.setLessonState({mode: 'motion', playing, speed, seekTime: time, seekRevision: ++revision, dark, timing: T});
  const guarded = () => {
    if (cancelled()) throw new Error('Audit stopped');
    if (root.document.hidden) throw new Error('Runtime document became hidden; playback cannot be accepted');
  };
  const take = () => {
    guarded();
    const snapshot = captureRuntime(root);
    for (const issue of snapshot.check.problems) problems.add(issue);
    return snapshot;
  };
  async function clock(speed, loops, dark) {
    command(false, speed, 0, dark); await frame(root);
    let previous = take(), wraps = 0, advance = 0, samples = 0, lastWall = root.performance.now();
    const started = lastWall, endBy = started + (T.duration / speed * loops + 15000);
    let maxWallGap = 0, maxRegularVelocity = 0, maxRegularSVGVelocity = 0, changedFrames = 0;
    const crossings = [];
    command(true, speed, 0, dark);
    while (wraps < loops) {
      const now = await frame(root); guarded();
      if (now > endBy) throw new Error('Real playback did not complete its full cycles');
      if (now - lastWall < 28) continue;
      const current = take(), wallGap = now - lastWall;
      maxWallGap = Math.max(maxWallGap, wallGap);
      let dt = current.state.time - previous.state.time;
      const delta = compareGeometry(previous.joints, current.joints);
      const svgDelta = compareGeometry(previous.svg, current.svg);
      if (delta.problem) problems.add(delta.problem);
      if (svgDelta.problem) problems.add(svgDelta.problem);
      if (delta.max > .00001) changedFrames++;
      if (dt < 0) {
        if (!(previous.state.time > T.duration * .8 && current.state.time < T.duration * .2)) problems.add('Unexpected playback clock reset');
        dt += T.duration; wraps++;
        crossings.push({beforeTime: previous.state.time, afterTime: current.state.time, advance: dt,
          joints: delta, svg: svgDelta});
      } else if (dt > 0) {
        maxRegularVelocity = Math.max(maxRegularVelocity, delta.max / dt);
        maxRegularSVGVelocity = Math.max(maxRegularSVGVelocity, svgDelta.max / dt);
      }
      advance += dt; samples++; previous = current; lastWall = now;
      progress({speed, dark, wraps, loops, samples, time: current.state.time});
    }
    command(false, speed); await frame(root);
    const wallMs = root.performance.now() - started, observedRate = advance / wallMs;
    if (Math.abs(observedRate - speed) > speed * .1) problems.add(`Incorrect real playback rate: ${observedRate} (expected ${speed})`);
    if (samples < Math.ceil(T.duration / speed * loops / 100) || maxWallGap > 200) problems.add('Insufficient real cycle sampling density');
    for (const crossing of crossings) {
      if (crossing.svg.problem || crossing.joints.problem || crossing.joints.max / crossing.advance > maxRegularVelocity * 2 + .02 ||
          crossing.svg.max / crossing.advance > maxRegularSVGVelocity * 2 + .04)
        problems.add('Rendered geometry jumps across a live cycle seam');
    }
    const pauseBefore = take(); await wait(500); const pauseAfter = take(), pause = checkPause(pauseBefore, pauseAfter);
    pauses.push({speed, dark, waitedMs: 500, ...pause});
    if (!pause.passed) problems.add('Paused runtime time or painted geometry changed');
    phases.push({speed, dark, loops, wraps, samples, advance, wallMs, observedRate, maxWallGap, maxRegularVelocity, maxRegularSVGVelocity, changedFrames, crossings});
  }
  try {
    // Two normal cycles show a repeated live seam. Slow playback covers another complete cycle.
    await clock(1, 2, false);
    await clock(.5, 1, false);
    await clock(1, 1, true);
    for (const dark of [false, true]) {
      command(false, 1, T.duration - .001, dark); await frame(root); const before = take();
      command(false, 1, 0, dark); await frame(root); const after = take(), seam = checkBoundary(before, after);
      seams.push({dark, epsilonMilliseconds: .001, ...seam});
      if (!seam.passed) problems.add(`${dark ? 'Dark' : 'Light'} actual DOM/joints do not close at the cycle endpoint`);
    }
    for (const dark of [false, true]) for (const mode of ['detail', 'mistakes']) {
      root.setLessonState({mode, playing: false, speed: 1, seekTime: T.duration / 2, seekRevision: ++revision, dark, timing: T});
      await frame(root); guarded();
      const check = inspectCurrentRenderedLesson(root);
      panels.push({dark, mode, ...check});
      for (const issue of check.problems) problems.add(issue);
    }
    command(false, 1, 0, false); await frame(root);
    return {lessonID: spec.id, duration: T.duration, passed: !problems.size, phases, seams, pauses, panels, problems: [...problems],
      limits: ['Light: two full 1x cycles and one full 0.5x cycle. Dark: one full 1x cycle. Each phase also checks pause stability.',
        'Detail/mistake post-render geometry is checked at mid-cycle in both themes; visual accuracy, owner-specific support/contact constraints and native numbering have separate acceptance.']};
  } finally { root.stopLesson?.(); }
}
