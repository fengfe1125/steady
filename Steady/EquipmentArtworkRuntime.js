/* Native-injected playback for bundled SVG drawings. No network or storage. */
(() => {
    'use strict';
    const panels = ['motion', 'detail', 'mistakes'];
    const state = {time: 0, playing: false, speed: 1, mode: 'motion', seekRevision: -1};
    let timing = {effortStart: 600, effortEnd: 2800, returnStart: 3300, returnEnd: 5700, duration: 6000};
    let frameID = 0, last = null, lastReport = 0;
    const report = event => window.webkit.messageHandlers.lesson.postMessage({event, time: state.time});
    function progress(t) {
        if (t < timing.effortStart || t >= timing.returnEnd) return 0;
        if (t < timing.effortEnd) return (1 - Math.cos(Math.PI * (t - timing.effortStart) / (timing.effortEnd - timing.effortStart))) / 2;
        if (t < timing.returnStart) return 1;
        return (1 + Math.cos(Math.PI * (t - timing.returnStart) / (timing.returnEnd - timing.returnStart))) / 2;
    }
    // Keep effort amplitude for existing lessons; multi-stage lessons use the full cycle.
    const draw = () => window.renderEquipment(progress(state.time), state.time / timing.duration);
    function frame(now) {
        const dt = last === null ? 0 : Math.min(now - last, 100); last = now;
        if (state.playing && state.mode === 'motion' && !document.hidden) {
            state.time = (state.time + dt * state.speed) % timing.duration;
            draw();
            if (now - lastReport >= 100) { lastReport = now; report('progress'); }
        }
        frameID = state.playing ? requestAnimationFrame(frame) : 0;
    }
    window.setLessonState = command => {
        cancelAnimationFrame(frameID); frameID = 0; last = null;
        timing = command.timing;
        state.playing = command.playing && command.mode === 'motion' && !document.hidden;
        state.speed = command.speed; state.mode = command.mode;
        panels.forEach(key => { document.getElementById(key).hidden = key !== state.mode; });
        document.documentElement.dataset.dark = String(command.dark);
        if (command.seekRevision !== state.seekRevision) {
            state.time = Math.min(Math.max(command.seekTime, 0), timing.duration); state.seekRevision = command.seekRevision;
        }
        draw(); report('progress');
        if (state.playing) frameID = requestAnimationFrame(frame);
    };
    window.stopLesson = () => { state.playing = false; cancelAnimationFrame(frameID); frameID = 0; last = null; };
    document.addEventListener('visibilitychange', () => { if (document.hidden) window.stopLesson(); });
    draw(); report('ready');
})();
