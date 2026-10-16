import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve('Sources/SteadyCore/Resources/TrainingCollections/Reviewed/back');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'back-animations.json'),'utf8')).animations;
const results=[];
for(const animation of manifest) {
    const source=fs.readFileSync(path.join(root,animation.resource),'utf8');
    const config=JSON.parse(source.match(/window.BackLesson=(.+);<\/script>/)[1]);
    const walking=config.motion==='walking';
    const runtime=[...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
    const makeNode=dataset=>({dataset,hidden:false,disabled:false,value:'',textContent:'',attrs:{},handlers:{},
        addEventListener(name,handler){this.handlers[name]=handler;},
        setAttribute(name,value){this.attrs[name]=value;}});
    const nodes=new Map();
    for(const id of ['phase-title','phase-note','timeline','time','play','reduced','speed','view','side','motion','detail','mistakes'])nodes.set(id,makeNode({}));
    const steps=Array.from({length:4},(_,i)=>makeNode({step:String(i)}));
    const modes=['motion','detail','mistakes'].map(mode=>makeNode({mode}));
    const media={matches:false,addEventListener(_name,callback){this.callback=callback;}};
    const docEvents={},frames=new Map(),renders=[],messages=[];
    let frameID=0;
    const context={window:{BackLesson:config,BackMotion:{render(kind,p,options){renders.push({kind,p,options});return {kind,p};}},
        webkit:{messageHandlers:{lesson:{postMessage(message){messages.push(message);}}}}},
        document:{hidden:false,documentElement:{classList:{add(){}},dataset:{}},
            getElementById:id=>nodes.get(id),
            querySelectorAll:selector=>selector==='[data-step]'?steps:modes,
            addEventListener:(name,callback)=>{docEvents[name]=callback;}},
        matchMedia:()=>media,
        requestAnimationFrame:callback=>{frames.set(++frameID,callback);return frameID;},
        cancelAnimationFrame:id=>frames.delete(id),
        Math,Number,Boolean,String};
    vm.createContext(context);vm.runInContext(runtime,context);
    const lastMotion=()=>renders.filter(r=>!r.options.target).at(-1);
    const command=(time,revision,extra={})=>context.window.setLessonState({
        mode:'motion',playing:false,speed:1,seekTime:time,seekRevision:revision,dark:false,
        timing:{effortStart:1500,effortEnd:4500,returnStart:5500,returnEnd:9500,duration:10000},...extra});
    for(const [time,phase] of walking?[[0,0],[2500,1],[5000,2],[7500,3]]:[[0,0],[2000,1],[5000,2],[8000,3]]) {
        command(time,time);
        assert.ok(nodes.get('phase-title').textContent.includes(config.steps[phase].title));
        assert.equal(steps[phase].attrs['aria-pressed'],'true');
        assert.equal(nodes.get('phase-note').textContent,config.steps[phase].instruction);
        const p=lastMotion().p;
        if(walking)assert.equal(p,time/10000,'Walking must use the full monotonic clock');
        else assert.ok(time===0?p===0:time===5000?p===1:p>0&&p<1);
    }
    command(5000,11,{mode:'detail',side:'right',view:'side',dark:true});
    assert.equal(nodes.get('motion').hidden,true);assert.equal(nodes.get('detail').hidden,false);
    assert.ok(nodes.get('phase-note').textContent.includes(config.detail));
    assert.equal(lastMotion().options.side,'right');assert.equal(lastMotion().options.view,'side');
    assert.equal(context.document.documentElement.dataset.dark,'true');
    command(0,12,{playing:true,speed:0.5});
    const tick=now=>{const [id,callback]=frames.entries().next().value;frames.delete(id);callback(now);};
    tick(1000);tick(1100);
    assert.equal(Number(nodes.get('timeline').value),50,'0.5 speed should advance 50ms in 100ms');
    assert.equal(nodes.get('play').textContent,'暂停');
    context.window.stopLesson();assert.equal(frames.size,0);assert.equal(nodes.get('play').textContent,'播放');
    if(walking) {
        let previous=-1;
        for(let time=0;time<=10000;time+=100) {
            command(time,1000+time);
            assert.equal(lastMotion().p,time/10000);
            assert.ok(lastMotion().p>previous,'The walking clock reversed or paused within a cycle');
            assert.equal(context.window.backPreviewState.phase,Math.min(3,Math.floor(time/2500)));
            previous=lastMotion().p;
        }
        context.window.renderEquipment(.2,.8);
        assert.equal(lastMotion().p,.8,'Common renderer bridge must prefer full-cycle fraction over effort amplitude');
        command(0,20000,{playing:true,speed:0.25});tick(2000);tick(2100);
        assert.equal(Number(nodes.get('timeline').value),25,'Quarter speed must advance 25ms per 100ms');
        context.window.stopLesson();
        command(9900,20001,{playing:true});tick(3000);tick(3100);tick(3150);
        assert.equal(Number(nodes.get('timeline').value),50,'Cycle wrap must continue into the next left/right pair');
        context.window.stopLesson();
    }
    media.callback({matches:true});
    assert.equal(nodes.get('play').disabled,true);assert.equal(nodes.get('reduced').hidden,false);
    command(0,13,{playing:true});assert.equal(frames.size,0,'Reduced motion must suppress auto play');
    steps[1].handlers.click();
    assert.equal(Number(nodes.get('timeline').value),walking?2500:4400,'Manual learning must remain available');
    assert.equal(steps[1].attrs['aria-pressed'],'true');
    if(walking)for(let step=0;step<4;step++) {
        steps[step].handlers.click();
        assert.equal(Number(nodes.get('timeline').value),step*2500);
        assert.equal(context.window.backPreviewState.phase,step);
        assert.equal(lastMotion().p,step/4);
    }
    media.callback({matches:false});command(0,14,{playing:true});
    context.document.hidden=true;docEvents.visibilitychange();
    assert.equal(frames.size,0,'Hidden page must stop playback');
    assert.ok(messages.some(m=>m.event==='ready'));
    assert.ok(messages.some(m=>m.event==='progress'&&Number.isFinite(m.time)));
    results.push({lessonID:animation.lessonID,passed:true});
}
const result={passed:true,lessons:results.length,checks:['four phase/caption alignment','detail mode and side/view commands','0.5 playback rate','pause','reduced-motion manual steps','hidden-page pause','message shape','walking monotonic clock, 0.25 speed, wrap and compatible two-argument renderer'],
    scope:'Isolated playback unit checks; not WKWebView, native App or device acceptance.',results};
fs.writeFileSync('docs/coordination/back-bundled-playback-validation.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
