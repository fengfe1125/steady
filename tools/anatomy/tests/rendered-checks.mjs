/** Run this self-contained function through a real browser's page.evaluate().
 * It observes the currently displayed panels after equipment.update, not a fresh
 * scene.sample. Per-model contact constraints remain the topic owners' checks.
 */
export function inspectCurrentRenderedLesson(root = window) {
  const spec = root.SteadyLesson, SA = root.SteadyAnatomy, document = root.document;
  if (!spec || !SA || typeof root.SteadyLessonRenderedSamples !== 'function') {
    return {problems: ['Missing post-equipment rendering hook; regenerate this lesson engine'], samples: 0};
  }
  const rows = root.SteadyLessonRenderedSamples(), problems = [], LEN = SA.rig.LEN;
  let physicalSamples = 0;
  const problem = (role, message) => problems.push(`${role}: ${message}`);
  const numeric = (value, path, role) => {
    if (typeof value === 'number' && !Number.isFinite(value)) problem(role, `non-finite ${path}`);
    else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) numeric(child, `${path}.${key}`, role);
  };
  const distance = (a, b, physical) => {
    if (!a || !b) return NaN;
    const vertical = physical && Object.hasOwn(a, 'h') ? 'h' : 'y';
    return Math.hypot(a.x - b.x, a[vertical] - b[vertical], physical ? a.z - b.z : 0);
  };
  const bone = (role, label, a, b, expected, physical) => {
    const length = distance(a, b, physical);
    if (!Number.isFinite(length) || Math.abs(length - expected) > .5) problem(role, `${label} length ${length} (expected ${expected}, ${physical ? 'physical 3D' : 'rig 2D'})`);
  };
  const aboveGround = (role, label, point, physical) => {
    if (!point) { problem(role, `missing ${label}`); return; }
    const height = physical && Object.hasOwn(point, 'h') ? point.h : -point.y;
    if (!Number.isFinite(height) || height < -1.5) problem(role, `${label} below physical ground (${height})`);
  };
  for (const {role, sample} of rows) {
    const j = sample?.joints, pose = sample?.pose;
    if (!j || !pose) { problem(role, 'missing displayed joints/pose'); continue; }
    numeric(j, 'joints', role);
    const physical = j.source3D || j.physical;
    if (!physical && (pose.eq?.frog || Math.abs(pose.eq?.turn || 0) > .0001)) {
      problem(role, 'custom projected geometry has no physical coordinates');
    }
    if (physical) {
      physicalSamples++;
      for (const [side, arm] of Object.entries(physical.arms || {})) {
        bone(role, `${side} upper arm`, arm.S || physical.shoulder, arm.E, LEN.upper, true);
        bone(role, `${side} forearm`, arm.E, arm.W, LEN.fore, true);
        bone(role, `${side} hand`, arm.W, arm.H, LEN.hand, true);
      }
      for (const [side, leg] of Object.entries(physical.legs || {})) {
        bone(role, `${side} thigh`, leg.H || physical.hip, leg.K, LEN.thigh, true);
        bone(role, `${side} shin`, leg.K, leg.A, LEN.shank, true);
        if (spec.ground !== false) aboveGround(role, `${side} sole`, leg.sole, true);
      }
      if (!Object.keys(physical.arms || {}).length || !Object.keys(physical.legs || {}).length) problem(role, 'incomplete physical skeleton');
    } else {
      for (const [side, arm] of Object.entries(j.arms || {})) {
        const a = pose.arms?.[side] || {};
        bone(role, `${side} upper arm`, arm.S || j.shoulder, arm.E, LEN.upper * (a.f ?? 1), false);
        bone(role, `${side} forearm`, arm.E, arm.W, LEN.fore * (a.ff ?? 1), false);
      }
      for (const [side, leg] of Object.entries(j.legs || {})) if (spec.ground !== false) aboveGround(role, `${side} sole`, leg.sole, false);
    }
  }
  const visible = [...document.querySelectorAll('.panel:not([hidden])')];
  if (visible.length !== 1) problems.push(`Expected one visible panel, found ${visible.length}`);
  for (const panel of visible) for (const node of panel.querySelectorAll('[d],[points],[transform],[cx],[cy]')) {
    for (const name of ['d', 'points', 'transform', 'cx', 'cy']) {
      const value = node.getAttribute(name);
      if (value && /NaN|Infinity|undefined/.test(value)) problems.push(`Non-finite rendered SVG ${name}: ${value.slice(0, 80)}`);
    }
  }
  return {lessonID: spec.id, mode: visible[0]?.id, samples: rows.length, physicalSamples, problems,
    limits: ['Topic-specific support/contact invariants and visual correspondence require the owners physical tests and screenshots.']};
}
