/* Local playback for the original leg drawings. Compatible with the native lesson bridge. */
(() => {
  'use strict';
  const instructionMap = {"general":[{"title":"准备","detail":"以能轻松说话的速度开始。"},{"title":"轻抬脚","detail":"交替抬起双脚，手臂自然摆动。"},{"title":"轻抬短停","detail":"轻抬脚时保持身体稳定，不追求高抬腿。"},{"title":"轻轻落地","detail":"脚掌平稳落回，再换另一侧轻步走动。"}],"frog-rock":[{"title":"准备","detail":"维持宽跪与前臂支撑，躯干保持稳定。"},{"title":"臀部后移","detail":"臀部缓慢向后坐，骨盆保持作者示范的前倾方向。"},{"title":"停在可控处","detail":"出现拉伸感后短停，不继续后移到骨盆翻转。"},{"title":"髋部前移","detail":"控制前移并调整骨盆，再进入下一次往返。"}],"hip-rotation":[{"title":"准备","detail":"固定双膝与上肢支撑，保持舒适张力。"},{"title":"双脚同时抬转","detail":"以双膝为支撑，让两侧小腿和脚同时轻抬轻转。"},{"title":"保持躯干","detail":"在可控终点停住，脊柱不随脚转动。"},{"title":"缓慢回落","detail":"两脚同时回到起始方向，再重复。"}],"lunge-rotation":[{"title":"准备","detail":"进入低弓步，用与前腿相反侧的手撑地。"},{"title":"胸廓打开","detail":"转动胸廓，另一臂向上延长并向后打开。"},{"title":"跟随手指","detail":"眼睛看向抬起手的指尖，停在舒适旋转范围。"},{"title":"回到支撑","detail":"控制手臂回落，重复后换另一侧。"}],"90-90-switch":[{"title":"准备","detail":"坐稳，双腿落在一侧的 90/90 位置。"},{"title":"双膝抬起","detail":"双膝逐渐抬起，通过髋部旋转准备换向。"},{"title":"换到另一侧","detail":"控制膝盖落向另一侧，保持舒适范围。"},{"title":"回到起始侧","detail":"以同样路径换回，不急着做进阶。"}],"90-90-hip-rise":[{"title":"准备","detail":"在 90/90 坐姿中确认膝部能稳定支撑。"},{"title":"顶起髋部","detail":"由髋部带动躯干向上，双膝仍承重，不让整个身体漂离地面。"},{"title":"稳定跪姿","detail":"在顶髋位置保持躯干和骨盆可控。"},{"title":"控制坐回","detail":"臀部缓慢坐回，随后可做基础换边。"}],"90-90-leg-extension":[{"title":"准备","detail":"从 90/90 坐姿稳定顶髋，进入双膝承重位置。"},{"title":"抬腿跨前","detail":"一侧腿抬起并跨向身体前方，脚掌落地形成半跪弓步。"},{"title":"稳定半跪","detail":"前脚与后膝支撑，髋部轻向前顶，保持躯干可控。"},{"title":"回到坐姿","detail":"控制腿回到跪姿，再缓慢坐回 90/90 位置。"}],"calf-raise":[{"title":"准备","detail":"身体直立，前脚掌踩稳，膝盖自然伸展。"},{"title":"脚跟上提","detail":"通过踝关节动作抬起脚跟，身体随之升高。"},{"title":"保持顶部","detail":"短停时前脚掌仍抓地，躯干不前冲。"},{"title":"控制下放","detail":"缓慢降回地面，避免前掌或脚趾翘起。"}],"hip-adduction":[{"title":"准备","detail":"靠稳靠背，设置能控制的起始开合范围。"},{"title":"双腿合拢","detail":"大腿带动器械摆臂向身体中线内收，保持与腿垫接触。"},{"title":"稳定收紧","detail":"在可控终点短停，腰背继续贴垫。"},{"title":"缓慢打开","detail":"控制双腿回到起始范围，避免突然被负重拉开。"}],"bulgarian-split-squat":[{"title":"准备","detail":"前后分腿站稳，后脚保持支撑，躯干稳定。"},{"title":"控制下蹲","detail":"屈髋屈膝降低身体，前脚整掌接触地面。"},{"title":"停在可控处","detail":"不强求蹲得很深，避免前脚失稳或后腿拉扯过强。"},{"title":"以前腿起身","detail":"通过前腿支撑升起身体，避免借后腿弹起。"}],"dumbbell-rdl":[{"title":"准备","detail":"握稳哑铃，保持躯干与脚下支撑。"},{"title":"臀部后移","detail":"髋部向后折叠，躯干随髋前倾，哑铃靠近腿部下行。"},{"title":"可控终点","detail":"到大腿后侧有张力且腰背可控的位置停住，不以弯腰换深度。"},{"title":"收臀起身","detail":"由髋部带动起身，避免向前顶腰或过度后仰。"}],"hip-flexion":[{"title":"准备","detail":"抓稳把手，双腿就位，稳定上身。"},{"title":"由髋抬腿","detail":"固定上身，由髋关节抬高大腿，同时膝盖逐步伸展，滚垫随下肢上移。"},{"title":"稳定顶位","detail":"停在能保持躯干稳定的位置，不靠弯腰追求抬得更高。"},{"title":"控制回落","detail":"控制大腿回落，让膝盖重新弯曲，握稳把手并保持上身稳定。"}],"prone-leg-curl":[{"title":"准备","detail":"收住核心，保持大腿与骨盆支撑，脚踝勾起。"},{"title":"屈膝弯举","detail":"脚跟朝臀部靠近，小腿带动滚垫移动。"},{"title":"保持顶位","detail":"保持躯干稳定，不依赖髋部抬起带动滚垫。"},{"title":"控制回落","detail":"缓慢放下小腿，停在滚垫仍贴合、腿后侧保持张力的位置。"}]};
  const panels = ['motion', 'detail', 'mistakes'];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const defaultTiming = {effortStart: 1000, effortEnd: 3000, returnStart: 3500, returnEnd: 6000, duration: 6000};
  let timing = {...defaultTiming};
  const state = {time: 0, playing: false, speed: 1, mode: 'motion', seekRevision: -1, reducedMotion: reduced.matches};
  let frameID = 0, last = null, lastReport = 0;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const report = event => window.webkit?.messageHandlers?.lesson?.postMessage({event, time: state.time});
  const stepStarts = () => {
    const activity = document.body.dataset.exercise === '90-90-leg-extension'
      ? timing.effortStart + (timing.effortEnd - timing.effortStart) * 2 / 3
      : (timing.effortStart + timing.effortEnd) / 2;
    return [0, activity, timing.effortEnd, (timing.returnStart + timing.returnEnd) / 2];
  };
  const stepIndex = t => t < timing.effortStart ? 0 : t < timing.effortEnd ? 1 : t < timing.returnStart ? 2 : 3;
  function progress(t) {
    if (t < timing.effortStart || t >= timing.returnEnd) return 0;
    if (t < timing.effortEnd) return (1 - Math.cos(Math.PI * (t - timing.effortStart) / (timing.effortEnd - timing.effortStart))) / 2;
    if (t < timing.returnStart) return 1;
    return (1 + Math.cos(Math.PI * (t - timing.returnStart) / (timing.returnEnd - timing.returnStart))) / 2;
  }
  function draw() {
    const pose = window.renderEquipment(progress(state.time));
    const index = stepIndex(state.time);
    document.querySelectorAll('[data-step]').forEach((el, i) => {
      el.setAttribute('data-active', String(i === index));
      el.closest('.step')?.classList.toggle('current', i === index);
    });
    const phase = document.getElementById('phase');
    if (phase) phase.textContent = ['准备', '活动', '短停', '还原'][index];
    const seek = document.querySelector('[data-control="seek"]');
    if (seek) { seek.max = String(timing.duration); seek.value = String(state.time); }
    const position = document.getElementById('leg-playback-position');
    if (position) position.textContent = `${(state.time / 1000).toFixed(1)} / ${(timing.duration / 1000).toFixed(1)} 秒`;
    document.querySelector('[data-control="play"]')?.setAttribute('aria-pressed', String(state.playing));
    document.querySelector('[data-control="slow"]')?.setAttribute('aria-pressed', String(state.speed === 0.5));
    return pose;
  }
  function stop() {
    state.playing = false; cancelAnimationFrame(frameID); frameID = 0; last = null; draw();
  }
  function frame(now) {
    const dt = last === null ? 0 : clamp(now - last, 0, 100); last = now;
    if (state.playing && state.mode === 'motion' && !document.hidden && !state.reducedMotion) {
      state.time = (state.time + dt * state.speed) % timing.duration;
      draw();
      if (now - lastReport >= 100) { lastReport = now; report('progress'); }
      frameID = requestAnimationFrame(frame);
    } else { frameID = 0; }
  }
  window.setLessonState = command => {
    cancelAnimationFrame(frameID); frameID = 0; last = null;
    if (command.timing) timing = {...defaultTiming, ...command.timing};
    if (panels.includes(command.mode)) state.mode = command.mode;
    if (command.speed !== undefined) state.speed = command.speed === 0.5 ? 0.5 : 1;
    state.reducedMotion = reduced.matches || command.reduceMotion === true;
    state.playing = command.playing === true && state.mode === 'motion' && !document.hidden && !state.reducedMotion;
    panels.forEach(key => { const panel = document.getElementById(key); if (panel) panel.hidden = key !== state.mode; });
    document.querySelectorAll('[data-mode]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.mode === state.mode)));
    if (command.dark !== undefined) document.documentElement.dataset.dark = String(command.dark);
    if (command.seekTime !== undefined && (command.seekRevision === undefined || command.seekRevision !== state.seekRevision)) {
      state.time = clamp(Number(command.seekTime) || 0, 0, timing.duration);
      state.seekRevision = command.seekRevision ?? state.seekRevision + 1;
    }
    draw(); report('progress');
    if (state.playing) frameID = requestAnimationFrame(frame);
  };
  window.stopLesson = stop;
  window.legsPlayback = {
    state: () => ({...state, timing: {...timing}, progress: progress(state.time), stepIndex: stepIndex(state.time)}),
    seek: time => window.setLessonState({playing: false, seekTime: time}),
    step: index => window.setLessonState({playing: false, seekTime: stepStarts()[clamp(index, 0, 3)]}),
  };
  function initialize() {
    const instructions = instructionMap[document.body.dataset.exercise] || [];
    const motion = document.getElementById('motion');
    if (motion && !document.querySelector('[data-step]')) {
      const list = document.createElement('div'); list.className = 'steps';
      list.style.cssText = 'display:grid;gap:10px;margin:14px 0';
      instructions.forEach((step, index) => {
        const item = document.createElement('div'); item.className = 'step';
        item.style.cssText = 'padding:9px 11px;border-radius:12px;border:1px solid #b7c9b3';
        const title = document.createElement('b'); title.textContent = `${index + 1} · ${step.title}`;
        const text = document.createElement('span'); text.dataset.step = String(index); text.textContent = step.detail;
        text.style.cssText = 'display:block;font-size:13px'; item.append(title, text); list.append(item);
      });
      motion.append(list);
    }
    document.querySelectorAll('[data-step]').forEach((el, index) => {
      if (instructions[index]) {
        el.textContent = instructions[index].detail;
        const title = el.closest('.step')?.querySelector('b');
        if (title) title.textContent = `${index + 1} · ${instructions[index].title}`;
      }
    });
    const listener = (name, fn) => document.querySelector(`[data-control="${name}"]`)?.addEventListener('click', fn);
    listener('play', () => {
      if (state.reducedMotion) window.legsPlayback.step((stepIndex(state.time) + 1) % 4);
      else window.setLessonState({playing: true});
    });
    listener('pause', stop);
    listener('slow', () => {
      window.setLessonState({playing: state.playing, speed: state.speed === 1 ? 0.5 : 1});
      const speed = document.getElementById('speed'); if (speed) speed.textContent = `${state.speed}×`;
    });
    listener('step', () => window.legsPlayback.step((stepIndex(state.time) + 1) % 4));
    document.querySelectorAll('[data-mode]').forEach(el => el.addEventListener('click', () => window.setLessonState({mode: el.dataset.mode, playing: false})));
    document.querySelectorAll('[data-step]').forEach((el, i) => {
      const target = el.closest('.step') || el;
      target.tabIndex = 0; target.setAttribute('role', 'button');
      target.addEventListener('click', () => window.legsPlayback.step(i));
      target.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.legsPlayback.step(i); } });
    });
    const toolbar = document.querySelector('.controls, .toolbar[aria-label="播放控制"]');
    if (toolbar && !document.querySelector('[data-control="seek"]')) {
      const label = document.createElement('label'); label.style.cssText = 'width:100%;display:flex;gap:8px;align-items:center;font-size:12px';
      label.innerHTML = '<span>进度</span><input data-control="seek" type="range" aria-label="动画进度" min="0" max="6000" step="10" value="0" style="flex:1;min-width:60px"><output id="leg-playback-position">0.0 / 6.0 秒</output>';
      toolbar.append(label);
    }
    document.querySelector('[data-control="seek"]')?.addEventListener('input', e => window.legsPlayback.seek(Number(e.target.value)));
    const style = document.createElement('style');
    style.textContent = '.step.current{outline:2px solid #4d936d;outline-offset:2px}.step[role=button]{cursor:pointer}.step:focus-visible{outline:3px solid #176b50}';
    document.head.append(style);
    draw(); report('ready');
  }
  reduced.addEventListener('change', () => { state.reducedMotion = reduced.matches; if (state.reducedMotion) stop(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once: true}); else initialize();
})();
