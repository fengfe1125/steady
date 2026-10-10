import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const context = {SteadyAnatomy: {}};
vm.runInNewContext(fs.readFileSync(new URL('../engine/40-theme.js', import.meta.url), 'utf8'), context);
const css = context.SteadyAnatomy.CSS;
const rules = new Map([...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)].map(m => [m[1].trim(), m[2]]));
const palettes = [':root', 'html[data-dark="true"]'].map(selector =>
  Object.fromEntries([...rules.get(selector).matchAll(/(--[\w-]+):([^;]+)/g)].map(m => [m[1], m[2]])));
const token = (selector, property) => rules.get(selector)?.match(new RegExp(`${property}:var\\((--[\\w-]+)\\)`))?.[1];
function luminance(hex) {
  const [r, g, b] = hex.match(/[\da-f]{2}/gi).map(v => parseInt(v, 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
}
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (light + .05) / (dark + .05);
}

for (const [index, name] of ['light', 'dark'].entries()) {
  test(`${name} small artwork text has at least 4.5:1 contrast against its stage`, () => {
    const palette = palettes[index];
    for (const selector of ['.lbl', '.lbl-sub', '.callout .txt', '.verdict.good', '.verdict.bad', '.warn-text']) {
      const color = palette[token(selector, 'fill')];
      assert.ok(color, `${selector} has no theme color`);
      const ratio = contrast(color, palette['--stage']);
      assert.ok(ratio >= 4.5, `${name} ${selector}: ${ratio.toFixed(2)}:1 (${color} on ${palette['--stage']})`);
    }
    assert.ok(contrast(palette['--stage'], palette[token('.callout circle', 'fill')]) >= 4.5,
      `${name} callout numbers are not readable on their circles`);
  });
}

test('warning text and graphic marks use independent semantic colors', () => {
  assert.equal(token('.verdict.bad', 'fill'), token('.warn-text', 'fill'));
  assert.notEqual(token('.warn-text', 'fill'), token('.warn-mark', 'stroke'));
  assert.equal(palettes[0][token('.warn-mark', 'stroke')], '#d98a1c');
  assert.equal(palettes[1][token('.warn-mark', 'stroke')], '#f0aa45');
});
