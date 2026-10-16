import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync('Steady/TrainingAnimationArtwork.swift', 'utf8');
const script = source.match(/static let documentLayoutScript = """\n([\s\S]*?)\n    """/)[1];
let height = 742.4, resize, observed, style;
const messages = [];
const page = {getBoundingClientRect: () => ({height})};
vm.runInNewContext(script, {
 document: {createElement: () => ({}), head: {appendChild: s => {style = s.textContent;}}, querySelector: () => page},
 window: {addEventListener: (_, f) => {resize = f;}, webkit: {messageHandlers: {lesson: {postMessage: m => messages.push(m)}}}},
 ResizeObserver: class {constructor(f) {observed = f;} observe(p) {assert.equal(p, page);}},
});
assert.equal(messages.at(-1).height, 743);
observed(); assert.equal(messages.length, 1);
height = 190; observed(); assert.equal(messages.at(-1).height, 190); // shorter details must shrink
height = 1080.1; resize(); assert.equal(messages.at(-1).height, 1081); // wrapping notes must grow
for (const invalid of [NaN, Infinity, 0, -1]) {height = invalid; observed();}
assert.equal(messages.length, 3);
assert.match(style, /height:300px/); assert.doesNotMatch(style, /vh/);
console.log('PASS content growth, shrink, duplicate suppression, invalid height and viewport independence; DOM contract only, not native layout acceptance');
