// Run with: ego-browser nodejs < tools/video-svg/browser-check.mjs
const task=await taskSpace(2),page=task.page('p1');
const fs=await import('node:fs/promises');const root='/Volumes/Developer/Projects/steady';
const base='http://127.0.0.1:8766/Sources/SteadyCore/Resources/TrainingCollections/VideoReferences/';
const records=JSON.parse(await fs.readFile(root+'/Sources/SteadyCore/Resources/TrainingCollections/VideoReferences/lessons.json','utf8'));const results=[];
for(const r of records){await page.goto(base+r.animation.resource);await page.waitForFunction(()=>typeof window.setLessonState==='function');
const result=await page.evaluate(()=>{const s=window.SteadyReferenceLesson,SA=window.SteadyAnatomy,D=s.timing.duration;const errors=[];let prev;let maxContact=0;const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
for(let i=0;i<=100;i++){setLessonState({mode:'motion',playing:false,seekRevision:i,seekTime:D*i/100});const a=SteadyLessonRenderedSamples()[0].sample;const j=a.joints;
for(const [side,l] of Object.entries(j.legs)){const target=a.pose.ik?.ankle?.[side];if(target){const d=dist(l.A,target);maxContact=Math.max(maxContact,d);if(d>.25)errors.push('contact '+i);}}
for(const [side,arm] of Object.entries(j.arms)){const L=64*(a.pose.arms[side].f??1);if(Math.abs(dist(arm.S,arm.E)-L)>.1)errors.push('arm length '+i);if(prev&&dist(arm.H,prev.arms[side].H)>18)errors.push('jump '+i);}
const outer=document.querySelector('#motion svg').getBoundingClientRect();for(const p of document.querySelectorAll('#motion .figure path')){const b=p.getBoundingClientRect();if(b.width&&b.height&&(b.left<outer.left-3||b.top<outer.top-3||b.right>outer.right+3||b.bottom>outer.bottom+3))errors.push('clipped '+i);}
prev=j;}
const first=SteadyLessonSample(0).joints,last=SteadyLessonSample(D-.01).joints;for(const side of Object.keys(first.arms))if(dist(first.arms[side].H,last.arms[side].H)>.1)errors.push('seam');
setLessonState({mode:'detail',playing:true});if(SteadyLessonPlaybackState().playing)errors.push('detail playing');if(document.querySelectorAll('#detail figure').length!==4)errors.push('detail count');
setLessonState({mode:'mistakes',playing:true});if(SteadyLessonPlaybackState().playing)errors.push('mistake playing');
return {id:s.id,samples:101,maxContact,errors:[...new Set(errors)]};});
for(const mode of ['motion','detail','mistakes']){await page.evaluate(({mode})=>setLessonState({mode,playing:false,seekRevision:201,seekTime:SteadyReferenceLesson.timing.effortEnd}),{mode});}
const startPlayback=async(speed,rev)=>{await page.evaluate(({speed,rev})=>setLessonState({mode:'motion',playing:true,speed,seekTime:0,seekRevision:rev}),{speed,rev});await page.waitForTimeout(500);return await page.evaluate(()=>SteadyLessonPlaybackState().time);};
const full=await startPlayback(1,301);await page.evaluate(()=>setLessonState({mode:'motion',playing:false}));const paused=await page.evaluate(()=>SteadyLessonPlaybackState().time);await page.waitForTimeout(200);const stopped=await page.evaluate(t=>SteadyLessonPlaybackState().time===t,paused);const half=await startPlayback(.5,302);await page.evaluate(()=>stopLesson());result.playback={full,half,stopped,ok:full>150&&half>60&&half<full*.8&&stopped};

await page.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});result.reducedMotion=await page.evaluate(()=>{setLessonState({mode:'motion',playing:true});return !SteadyLessonPlaybackState().playing;});await page.cdp('Emulation.setEmulatedMedia',{features:[]});
await page.evaluate(()=>setLessonState({mode:'detail',dark:true,playing:false}));results.push(result);console.log(JSON.stringify(result));}
await fs.writeFile(root+'/docs/verification/video-svg-phase1/browser-checks.json',JSON.stringify(results,null,2));
if(results.some(r=>r.errors.length||!r.playback.ok||!r.reducedMotion))throw Error('Browser acceptance failed');
