import test from 'node:test';import assert from 'node:assert/strict';import {specs,SA} from './specs.mjs';
// Authoring geometry is tested independently from browser drawing and visual acceptance.
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
for(const s of specs)test(`${s.id}: 101 poses preserve lengths, support and machine contacts`,()=>{
let previous;
for(let i=0;i<=100;i++){
 const p=(1-Math.cos(2*Math.PI*i/100))/2;const raw=s.makePose(p),pose=SA.rig.merge(SA.rig.defaults(s.view),raw);const solved=SA.rig.applyIK(s.view,pose,pose.ik);const j=SA.rig.joints(s.view,solved);
 for(const [side,a] of Object.entries(j.arms)){assert.ok(Math.abs(dist(a.S,a.E)-64*(solved.arms[side].f??1))<.01);assert.ok(Math.abs(dist(a.E,a.W)-50*(solved.arms[side].ff??1))<.01);}
 for(const [side,l] of Object.entries(j.legs)){assert.ok(Math.abs(dist(l.H,l.K)-87*(solved.legs[side].f??1))<.01);assert.ok(Math.abs(dist(l.K,l.A)-88*(solved.legs[side].fs??1))<.01);if(raw.ik?.ankle?.[side])assert.ok(dist(l.A,raw.ik.ankle[side])<.02,`${side} ankle misses support`);}
 if(s.key==='legpress'){assert.ok(Math.abs(j.hip.x-(-10-55*p))<.01);for(const l of Object.values(j.legs))assert.ok(Math.abs(l.sole.x-108)<.01);}
 if(s.key==='shoulderpress')for(const [side,a] of Object.entries(j.arms))assert.ok(Math.abs(dist(a.H,{x:side==='r'?35:-35,y:-265})-83)<.02,'handle leaves pivot circle');
 for(const a of Object.values(j.arms))for(const v of [a.S,a.E,a.W,a.H])assert.ok(Number.isFinite(v.x)&&Number.isFinite(v.y));
 if(previous)for(const side of Object.keys(j.arms))assert.ok(dist(j.arms[side].H,previous.arms[side].H)<15,'discontinuous hand trajectory');previous=j;
}
});
