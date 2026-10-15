/* Offline video-derived lesson; same native millisecond bridge as existing artwork. */
(()=>{'use strict';const SA=window.SteadyAnatomy,spec=window.SteadyReferenceLesson;
if(!spec)return;
const style=document.createElement('style');style.textContent=SA.CSS+'#detail{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(2,minmax(0,1fr));gap:4px}#detail[hidden]{display:none}figure{margin:0;min-width:0;min-height:0}figure svg{width:100%;height:calc(100% - 30px)}figcaption{color:var(--label);font-size:12px;text-align:center;height:30px}';document.head.append(style);
const svg=(host,label)=>SA.util.el('svg',{viewBox:'0 0 400 400',role:'img','aria-label':label},host);
const motion=SA.scene.MotionPanel(svg(document.getElementById('motion'),spec.title),spec,'reference-motion');
const renderers={motion};const samples={};let modeBuilt=new Set();
function ensure(mode){if(modeBuilt.has(mode))return;
if(mode==='detail'){for(const [i,k] of spec.referenceFrames.entries()){const f=document.createElement('figure');document.getElementById('detail').append(f);const render=SA.scene.MotionPanel(svg(f,k.caption),spec,`reference-detail-${i}`);render(k.time);const c=document.createElement('figcaption');c.textContent=`${i+1}. ${k.caption}`+(k.sourceSeconds==null?'':` · 原片 ${k.sourceSeconds.toFixed(2)}s`);f.append(c);}}
if(mode==='mistakes') samples.mistakes=SA.scene.MistakePanel(svg(document.getElementById('mistakes'),'正确与错误教学示意'),spec,'reference-mistakes');
modeBuilt.add(mode);}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');const state={mode:'motion',playing:false,time:0,speed:1,seekRevision:-1};let raf=0,last=null,lastReport=0;
const report=event=>window.webkit?.messageHandlers?.lesson?.postMessage({event,time:state.time});
function draw(){samples.motion=motion(state.time);}
function cancel(){cancelAnimationFrame(raf);raf=0;last=null;}
function stop(){cancel();state.playing=false;report('progress');}
function frame(now){if(!state.playing||document.hidden||reduced.matches){stop();return;}if(last!==null)state.time=(state.time+Math.min(now-last,100)*state.speed)%spec.timing.duration;last=now;draw();if(now-lastReport>100){report('progress');lastReport=now;}raf=requestAnimationFrame(frame);}
window.setLessonState=c=>{cancel();state.mode=['motion','detail','mistakes'].includes(c.mode)?c.mode:'motion';state.speed=Number.isFinite(c.speed)&&c.speed>0?Math.min(c.speed,2):1;
if(c.seekRevision!==undefined&&c.seekRevision!==state.seekRevision){state.time=Number.isFinite(c.seekTime)?Math.max(0,Math.min(c.seekTime,spec.timing.duration)):0;state.seekRevision=c.seekRevision;}
document.documentElement.dataset.dark=String(!!c.dark);ensure(state.mode);for(const mode of ['motion','detail','mistakes'])document.getElementById(mode).hidden=state.mode!==mode;
state.playing=!!c.playing&&state.mode==='motion'&&!document.hidden&&!reduced.matches;draw();report('progress');if(state.playing)raf=requestAnimationFrame(frame);};
window.stopLesson=stop;document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});reduced.addEventListener('change',()=>{if(reduced.matches)stop();});
window.SteadyLessonSample=t=>SA.scene.sample(spec,t);window.SteadyLessonPlaybackState=()=>({...state,duration:spec.timing.duration});window.SteadyLessonRenderedSamples=()=>state.mode==='mistakes'?samples.mistakes:[{role:state.mode,sample:samples.motion}];
draw();report('ready');})();
