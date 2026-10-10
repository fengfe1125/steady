/* Lesson page runtime: builds the three panels and speaks the app's WKWebView protocol.
   Swift → JS: window.setLessonState({mode, playing, speed, seekTime, seekRevision, dark, timing, ...}).
   JS → Swift: {event:'ready'} once, {event:'progress', time} while playing and after every command. */
(function (root) {
  'use strict';
  const SA = root.SteadyAnatomy, doc = root.document;
  const spec = root.SteadyLesson;
  if (!spec || !doc) return;

  const style = doc.createElement('style');
  style.textContent = SA.CSS;
  doc.head.appendChild(style);

  const panels = ['motion', 'detail', 'mistakes'];
  const prefix = 'sa-' + (spec.id || 'lesson').replace(/[^a-z0-9]+/gi, '-');
  function svgIn(id, label) {
    const host = doc.getElementById(id);
    const svg = SA.util.el('svg', {viewBox: '0 0 400 400', role: 'img', 'aria-label': label, preserveAspectRatio: 'xMidYMid meet'}, host);
    return svg;
  }
  const title = spec.title || '';
  const render = SA.scene.MotionPanel(svgIn('motion', title + '动作动画'), spec, prefix + '-m');
  const built = {detail: null, mistakes: null};
  function ensure(mode) {
    if (mode === 'detail' && !built.detail) built.detail = SA.scene.DetailPanel(svgIn('detail', title + '细节图解'), spec, prefix + '-d');
    if (mode === 'mistakes' && !built.mistakes) built.mistakes = SA.scene.MistakePanel(svgIn('mistakes', title + '错误对照'), spec, prefix + '-x');
  }

  const state = {time: 0, playing: false, speed: 1, mode: 'motion', seekRevision: -1};
  let timing = spec.timing || SA.scene.DEFAULT_TIMING, frameID = 0, last = null, lastReport = 0;
  const handler = root.webkit && root.webkit.messageHandlers && root.webkit.messageHandlers.lesson;
  const report = event => { if (handler) handler.postMessage({event, time: state.time}); };
  let lastRenderedSample;
  const draw = () => { lastRenderedSample = render(state.time); };

  function frame(now) {
    const dt = last === null ? 0 : Math.min(now - last, 100); last = now;
    if (state.playing && state.mode === 'motion' && !doc.hidden) {
      state.time = (state.time + dt * state.speed) % timing.duration;
      draw();
      if (now - lastReport >= 100) { lastReport = now; report('progress'); }
    }
    frameID = state.playing ? root.requestAnimationFrame(frame) : 0;
  }
  root.setLessonState = command => {
    root.cancelAnimationFrame(frameID); frameID = 0; last = null;
    if (command.timing && command.timing.duration > 0) { timing = command.timing; spec.timing = timing; }
    state.mode = panels.includes(command.mode) ? command.mode : 'motion';
    state.speed = command.speed > 0 ? command.speed : 1;
    state.playing = !!command.playing && state.mode === 'motion' && !doc.hidden;
    ensure(state.mode);
    panels.forEach(key => { doc.getElementById(key).hidden = key !== state.mode; });
    doc.documentElement.dataset.dark = String(!!command.dark);
    if (command.seekRevision !== state.seekRevision) {
      state.time = Math.min(Math.max(+command.seekTime || 0, 0), timing.duration);
      state.seekRevision = command.seekRevision;
    }
    draw(); report('progress');
    if (state.playing) frameID = root.requestAnimationFrame(frame);
  };
  root.stopLesson = () => { state.playing = false; root.cancelAnimationFrame(frameID); frameID = 0; last = null; };
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) root.stopLesson(); });

  // Geometry hook for offline verification and previews.
  root.SteadyLessonSample = t => SA.scene.sample(spec, t);
  root.SteadyLessonPlaybackState = () => ({...state, duration: timing.duration});
  // Observe what equipment.update actually passed to Figure, including 3-D projections.
  // The pure hook above remains a rig sample and must not stand in for this stage.
  root.SteadyLessonRenderedSamples = () => JSON.parse(JSON.stringify(state.mode === 'motion' ?
    [{role: 'motion', sample: lastRenderedSample}] : built[state.mode] || []));
  draw();
  report('ready');
  if (!handler && !root.SteadyPreviewManual) {
    const dark = root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setLessonState({mode: 'motion', playing: true, speed: 1, seekTime: 0, seekRevision: 0, dark, timing});
  }
})(typeof window !== 'undefined' ? window : globalThis);
