/* Poses over time, camera fitting, and the three teaching panels. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy;
  const U = SA.util, R = SA.rig, {V, add, sub, mul, el, smooth, mix, clamp01, lerpV, unit} = U;

  /* -------------------------------------------------------------- motion */
  const DEFAULT_TIMING = {effortStart: 600, effortEnd: 2800, returnStart: 3300, returnEnd: 5700, duration: 6000};
  function effort(t, T) {
    if (t < T.effortStart || t >= T.returnEnd) return 0;
    if (t < T.effortEnd) return (1 - Math.cos(Math.PI * (t - T.effortStart) / (T.effortEnd - T.effortStart))) / 2;
    if (t < T.returnStart) return 1;
    return (1 + Math.cos(Math.PI * (t - T.returnStart) / (T.returnEnd - T.returnStart))) / 2;
  }
  const rigView = spec => spec.view === 'side' ? 'side' : 'front';
  function resolve(spec, name) {
    const poses = spec.poses || {};
    let p = R.merge(R.defaults(rigView(spec)), poses.base || {});
    if (typeof name === 'string') {
      const chain = [];
      for (let n = name; n && poses[n]; n = poses[n].from) chain.unshift(poses[n]);
      chain.forEach(q => { p = R.merge(p, q); });
    } else if (name) p = R.merge(p, name);
    return p;
  }
  /** Pose and activation at time t (ms). */
  function sample(spec, t) {
    const T = spec.timing || DEFAULT_TIMING;
    let pose, p;
    const keys = spec.track && spec.track.keys;
    if (keys && keys.length) {
      const D = T.duration, tt = ((t % D) + D) % D;
      let i = keys.length - 1;
      for (let k = 0; k < keys.length; k++) if (keys[k].t <= tt) i = k;
      const a = keys[i], b = keys[(i + 1) % keys.length];
      const t0 = a.t, t1 = b.t > t0 ? b.t : b.t + D;
      const e = U.ease((tt - t0) / ((t1 - t0) || 1));
      pose = R.blend(resolve(spec, a.pose), resolve(spec, b.pose), e);
      p = mix(a.p == null ? 0 : a.p, b.p == null ? 0 : b.p, e);
    } else {
      p = effort(t, T);
      pose = R.blend(resolve(spec, 'start'), resolve(spec, 'peak'), p);
    }
    const act = pose.act == null ? mix(0.22, 1, p) : pose.act;
    const solved = R.applyIK(rigView(spec), pose, pose.ik);
    return {pose: solved, p, act, joints: R.joints(rigView(spec), solved)};
  }
  const staticPose = (spec, name) => {
    const pose = resolve(spec, name);
    const solved = R.applyIK(rigView(spec), pose, pose.ik);
    return {pose: solved, p: 1, act: pose.act == null ? 1 : Math.max(0.85, pose.act), joints: R.joints(rigView(spec), solved)};
  };
  /** "arms.r.H", "shoulder", "legs.near.K" … */
  function jointAt(j, path) {
    let v = j;
    for (const k of path.split('.')) { if (v == null) return null; v = v[k]; }
    return v && typeof v.x === 'number' ? v : null;
  }

  /* -------------------------------------------------------------- camera */
  function jointPoints(j, view) {
    const pts = [];
    if (view === 'side') {
      pts.push(j.headTop, j.headPivot, j.shoulder, ...j.N);
      for (const s of ['near', 'far']) { const a = j.arms[s], l = j.legs[s]; pts.push(a.E, a.W, a.H, l.K, l.A, l.sole, l.heel, l.toe); }
    } else {
      pts.push(j.pelvis, j.neck, add(j.headPivot, mul(j.up, 40)));
      for (const s of ['r', 'l']) { const a = j.arms[s], l = j.legs[s]; pts.push(a.S, a.E, a.W, a.H, l.H, l.K, l.A, l.sole); }
    }
    return pts;
  }
  /** rotate (degrees) turns the whole scene, e.g. 90 lays a back-view figure flat as seen from above. */
  function fit(points, box, pad, mirror, rotate) {
    const a = (rotate || 0) * U.RAD, ca = Math.cos(a), sa = Math.sin(a);
    const turn = p => rotate ? V(p.x * ca - p.y * sa, p.x * sa + p.y * ca) : p;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    points.forEach(p0 => { if (!p0) return; const p = turn(p0); x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    x0 -= pad.side; x1 += pad.side; y0 -= pad.head; y1 += 2;
    const bx = box.x + pad.l, by = box.y + pad.t, bw = box.w - pad.l - pad.r, bh = box.h - pad.t - pad.b;
    const s = Math.min(bw / (x1 - x0), bh / (y1 - y0), pad.max || 1.05);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const tx = bx + bw / 2, ty = by + bh / 2 + (bh - (y1 - y0) * s) / 2 * (pad.floor ? 1 : 0);
    const k = mirror ? -s : s;
    return {s, k, cx, cy, tx, ty, toScreen: p0 => { const p = turn(p0); return V(tx + (p.x - cx) * k, ty + (p.y - cy) * s); },
      transform: `translate(${U.n1(tx)} ${U.n1(ty)}) scale(${+k.toFixed(4)} ${+s.toFixed(4)}) translate(${U.n1(-cx)} ${U.n1(-cy)})` +
        (rotate ? ` rotate(${rotate})` : '')};
  }

  const FOCUS = {
    upper: {front: ['arms.r.H', 'arms.l.H', 'arms.r.E', 'arms.l.E', 'headPivot', 'pelvis'], side: ['headTop', 'arms.near.H', 'arms.far.H', 'arms.near.E', 'hip', 'shoulder']},
    trunk: {front: ['arms.r.S', 'arms.l.S', 'headPivot', 'pelvis', 'legs.r.K', 'legs.l.K'], side: ['headTop', 'hip', 'shoulder', 'legs.near.K', 'N.4']}
  };
  /** Camera that fits the sampled poses (or a focus set of joints) into a box. */
  function cameraFor(spec, opts, items) {
    const view = spec.view, camSpec = Object.assign({side: view === 'side' ? 34 : 26, head: 8, l: 14, r: 14, t: opts.top == null ? 64 : opts.top, b: 12, max: 1.05},
      spec.camera || {}, opts.camera || {});
    if (opts.scale) camSpec.max = Math.min(camSpec.max, opts.scale);
    const pts = [], focus = camSpec.focus && (FOCUS[camSpec.focus] ? FOCUS[camSpec.focus][view === 'side' ? 'side' : 'front'] : camSpec.focus);
    const take = j => focus ? focus.map(f => jointAt(j, f)).filter(Boolean) : jointPoints(j, view);
    const ctx = {view, joints: null, eq: null};
    opts.samples.forEach(s => { pts.push(...take(s.joints)); ctx.joints = s.joints; ctx.eq = s.pose.eq;
      if (!focus || camSpec.withEquipment) (items || spec.equipment || []).forEach(it => pts.push(...SA.equipment.types[it.type].bounds(ctx, it))); });
    if (opts.ghostSample) pts.push(...take(opts.ghostSample.joints));
    return fit(pts, opts.box, camSpec, !!spec.mirror, spec.rotate);
  }
  /* -------------------------------------------------------------- stage */
  function defs(svg, prefix) {
    const d = el('defs', null, svg);
    const pat = el('pattern', {id: prefix + '-hatch', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(40)'}, d);
    el('rect', {width: 5, height: 5, fill: 'var(--skin)'}, pat);
    el('rect', {width: 2.2, height: 5, fill: 'var(--p)'}, pat);
    for (const [id, cls] of [['arrow', 'guide'], ['warn', 'warn']]) {
      const m = el('marker', {id: `${prefix}-${id}`, markerWidth: 10, markerHeight: 10, refX: 5.5, refY: 5, orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse'}, d);
      el('path', {d: 'M1,1L8,5L1,9', fill: 'none', stroke: cls === 'warn' ? 'var(--warn)' : 'var(--guide)', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'}, m);
    }
  }

  /** One drawn body with its equipment inside a box of the SVG. */
  function Stage(svg, spec, opts) {
    const view = spec.view, mirror = !!spec.mirror;
    const clipId = opts.prefix + '-clip';
    const cp = el('clipPath', {id: clipId}, svg.querySelector('defs') || el('defs', null, svg));
    el('rect', {x: opts.box.x, y: opts.box.y, width: opts.box.w, height: opts.box.h, rx: 22}, cp);
    const g = el('g', {class: 'stage-box', 'clip-path': `url(#${clipId})`}, svg);
    const groundLayer = el('g', null, g), cam = el('g', null, g);
    const back = el('g', {class: 'eq-back'}, cam), ghostLayer = el('g', null, cam), figLayer = el('g', null, cam), front = el('g', {class: 'eq-front'}, cam);
    const overlay = el('g', {class: 'overlay'}, g);
    const muscles = opts.muscles || spec.muscles;
    const ghost = opts.ghostPose ? SA.Figure(ghostLayer, {view, muscles: {}, prefix: opts.prefix, hands: spec.hands, behind: spec.behind, ghost: true}) : null;
    const figure = SA.Figure(figLayer, {view, muscles, prefix: opts.prefix, hands: spec.hands, behind: spec.behind});
    const items = (spec.equipment || []).map(e => Object.assign({}, e));
    const ctx = {view, figure, joints: null, eq: null};
    // equipment needs joints for hand-attached parts: prime with the first sample
    const first = opts.samples[0];
    ctx.joints = first.joints; ctx.eq = first.pose.eq; figure.update(first.joints);
    items.forEach(it => SA.equipment.types[it.type].build({back, front}, ctx, it));
    // camera fitted to every sampled pose plus equipment
    const camera = cameraFor(spec, opts, items);
    cam.setAttribute('transform', camera.transform);
    // ground line across the box
    if (spec.ground !== false) {
      const gy = camera.toScreen(V(0, 0)).y;
      if (gy < opts.box.y + opts.box.h - 2) el('path', {d: `M${opts.box.x + 10},${U.n1(gy)}H${opts.box.x + opts.box.w - 10}`, class: 'ground'}, groundLayer);
    }
    if (ghost) ghost.update(opts.ghostSample.joints);
    function update(sample) {
      ctx.joints = sample.joints; ctx.eq = sample.pose.eq;
      figure.update(sample.joints);
      items.forEach(it => SA.equipment.types[it.type].update(ctx, it));
      return ctx.joints;
    }
    return {g, cam, overlay, figure, camera, update, ctx};
  }

  /** Path of a joint across the effort (or between two keys), pushed away from a pivot. */
  function guidePath(spec, stage, g) {
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const p = mix(g.from == null ? 0.08 : g.from, g.to == null ? 0.96 : g.to, i / 28);
      const pose = R.blend(resolve(spec, g.a || 'start'), resolve(spec, g.b || 'peak'), p);
      const j = R.joints(rigView(spec), R.applyIK(rigView(spec), pose, pose.ik));
      let q = jointAt(j, g.joint); if (!q) continue;
      if (g.pivot) { const c = jointAt(j, g.pivot), d = sub(q, c); q = add(q, mul(unit(d), (g.push == null ? 16 : g.push))); }
      else if (g.offset) q = add(q, V(g.offset[0], g.offset[1]));
      pts.push(stage.camera.toScreen(q));
    }
    return pts.length > 1 ? smooth(pts, false) : '';
  }

  /* -------------------------------------------------------------- panels */
  const BOX = {x: 0, y: 0, w: 400, h: 400};
  function stageRect(svg, box) { el('rect', {x: box.x, y: box.y, width: box.w, height: box.h, rx: 22, class: 'stage'}, svg); }

  function MotionPanel(svg, spec, prefix) {
    defs(svg, prefix); stageRect(svg, BOX);
    const T0 = spec.timing || DEFAULT_TIMING, samples = [];
    for (let i = 0; i < 36; i++) samples.push(sample(spec, T0.duration * i / 36));
    // No corner labels in the moving picture: their leader lines crossed the body and the
    // equipment. The native screen lists the coloured muscles under the animation instead.
    const stage = Stage(svg, spec, {prefix, box: BOX, samples, camera: {t: 22}});
    // motionGuide:false keeps the trajectory for the detail arrow only, where it
    // would otherwise cross the head or trunk in the moving picture.
    const guides = (spec.motionGuide === false ? [] : spec.guides || (spec.guide ? [spec.guide] : [])).map(g => {
      const node = el('path', {d: guidePath(spec, stage, g), class: 'guide'}, stage.overlay);
      return {g, node};
    });
    return function render(t) {
      const T = spec.timing || DEFAULT_TIMING, s = sample(spec, t);
      s.joints = stage.update(s);
      svg.style.setProperty('--act', s.act.toFixed(3));
      svg.style.setProperty('--act2', (0.18 + 0.55 * s.act).toFixed(3));
      const up = !(spec.track && spec.track.keys) && t >= T.effortStart && t < T.effortEnd;
      const down = !(spec.track && spec.track.keys) && t >= T.returnStart && t < T.returnEnd;
      guides.forEach(({node}) => {
        node.removeAttribute('marker-end'); node.removeAttribute('marker-start');
        if (up) node.setAttribute('marker-end', `url(#${prefix}-arrow)`);
        if (down) node.setAttribute('marker-start', `url(#${prefix}-arrow)`);
        node.style.opacity = up || down ? 1 : 0.5;
      });
      return s;
    };
  }

  function DetailPanel(svg, spec, prefix) {
    defs(svg, prefix); stageRect(svg, BOX);
    const d = spec.detail || {}, main = staticPose(spec, d.pose || 'peak');
    const ghostSample = d.ghost === null ? null : staticPose(spec, d.ghost || 'start');
    const stage = Stage(svg, spec, {prefix, box: BOX, samples: [main], ghostPose: !!ghostSample, ghostSample, top: 22});
    main.joints = stage.update(main);
    svg.style.setProperty('--act', 1); svg.style.setProperty('--act2', 0.75);
    (d.arrows || (spec.guide ? [Object.assign({}, spec.guide, {from: 0.05, to: 0.97})] : [])).forEach(a => {
      el('path', {d: guidePath(spec, stage, Object.assign({push: 0}, a)), class: 'arrow', 'marker-end': `url(#${prefix}-arrow)`}, stage.overlay);
    });
    const callouts = d.callouts || [];
    callouts.forEach(c => {
      const at = jointAt(main.joints, c.at); if (!at) return;
      const p = stage.camera.toScreen(at), q = add(p, V(c.dx || 0, c.dy || 0));
      const g = el('g', {class: 'callout'}, stage.overlay);
      if (c.dx || c.dy) { el('path', {d: `M${U.pt(p)}L${U.pt(q)}`, class: 'leader'}, g); el('circle', {cx: U.n1(p.x), cy: U.n1(p.y), r: 2.2, class: 'pin'}, g); }
      el('circle', {cx: U.n1(q.x), cy: U.n1(q.y), r: 8.5}, g);
      el('text', {x: U.n1(q.x), y: U.n1(q.y + 4), class: 'num'}, g).textContent = String(c.n);
    });
    // The numbered list and the muscle colours are listed natively under the picture;
    // drawn here they covered the legs, seat and machine.
    return [{role: 'detail', sample: main}];
  }

  function MistakePanel(svg, spec, prefix) {
    defs(svg, prefix); stageRect(svg, BOX);
    const mk = spec.mistake || {};
    const goodName = mk.good || (spec.detail && spec.detail.pose) || 'peak';
    const good = staticPose(spec, goodName);
    const badPose = R.merge(R.merge(resolve(spec, goodName), {}), mk.pose || {});
    const badSolved = R.applyIK(rigView(spec), badPose, badPose.ik);
    const bad = {pose: badSolved, p: 1, act: 1, joints: R.joints(rigView(spec), badSolved)};
    const divider = el('path', {d: 'M200,58V384', class: 'divider'}, svg);
    // Header strip in the stage colour: tall equipment ended under the captions.
    const header = el('g', null, svg);
    el('path', {d: 'M0,22A22,22 0 0 1 22,0H378A22,22 0 0 1 400,22V58H0Z', class: 'stage'}, header);
    svg.style.setProperty('--act', 1); svg.style.setProperty('--act2', 0.75);
    const halves = [[good, {x: 0, y: 0, w: 200, h: 400}, spec.muscles, '✓ 正确', 'good'],
      [bad, {x: 200, y: 0, w: 200, h: 400}, mk.muscles || spec.muscles, '✗ 错误', 'bad']];
    const camOpts = {l: 10, r: 10};
    Object.assign(camOpts, mk.camera || {});
    const scale = Math.min(...halves.map(([s, box]) => cameraFor(spec, {box, samples: [s], top: 70, camera: camOpts}).s));
    halves.forEach(([s, box, muscles, title, kind], i) => {
      const st = Stage(svg, spec, {prefix: prefix + '-' + i, box, samples: [s], muscles, top: 70, camera: camOpts, scale});
      s.joints = st.update(s);
      el('text', {x: box.x + box.w / 2, y: 30, class: 'verdict ' + kind, 'text-anchor': 'middle'}, header).textContent = title;
      const caption = kind === 'good' ? (mk.goodText || '') : (mk.text || '');
      if (caption) el('text', {x: box.x + box.w / 2, y: 50, class: kind === 'good' ? 'lbl-sub' : 'warn-text', 'text-anchor': 'middle'}, header).textContent = caption;
      if (kind === 'bad') (mk.marks || []).forEach(m => {
        const at = jointAt(s.joints, m.at); if (!at) return;
        const p = st.camera.toScreen(m.off ? add(at, V(m.off[0], m.off[1])) : at);
        if (m.type === 'arrow') {
          const q = add(p, V(m.dx || 0, m.dy || -26));
          el('path', {d: `M${U.pt(q)}L${U.pt(p)}`, class: 'warn-mark', 'marker-end': `url(#${prefix}-warn)`}, st.overlay);
        } else if (m.type === 'x') {
          const r = 7;
          el('path', {d: `M${p.x - r},${p.y - r}L${p.x + r},${p.y + r}M${p.x + r},${p.y - r}L${p.x - r},${p.y + r}`, class: 'warn-mark'}, st.overlay);
        } else el('circle', {cx: U.n1(p.x), cy: U.n1(p.y), r: m.r || 16, class: 'warn-mark'}, st.overlay);
      });
    });
    svg.appendChild(divider); svg.appendChild(header);
    return halves.map(([sample, , , , role]) => ({role, sample}));
  }

  SA.scene = {DEFAULT_TIMING, effort, resolve, sample, staticPose, jointAt, fit, MotionPanel, DetailPanel, MistakePanel};
})(typeof window !== 'undefined' ? window : globalThis);
