/* Offline vector motion geometry for the arms-extra lessons. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const point = (x, y) => ({ x, y });
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const line = (id, a, b) => $(id).setAttribute('d', `M${a.x} ${a.y}L${b.x} ${b.y}`);
  const place = (id, p, angle = 0) => $(id).setAttribute('transform', `translate(${p.x},${p.y}) rotate(${angle})`);
  const chain = (prefix, root, elbow, wrist, upper, fore, sleeve = true) => {
    line(prefix + 'Upper', root, elbow);
    line(prefix + 'Fore', elbow, wrist);
    if (sleeve) line(prefix + 'Sleeve', root, point(root.x + (elbow.x-root.x)*.35, root.y + (elbow.y-root.y)*.35));
    return { root, joint: elbow, end: wrist, lengths: [upper, fore] };
  };
  const arcPoint = (elbow, length, degrees, offset = point(0, 0)) => {
    const r = degrees * Math.PI / 180;
    return point(elbow.x + length * Math.cos(r) + offset.x, elbow.y + length * Math.sin(r) + offset.y);
  };
  const common = p => Math.max(0, Math.min(1, Number(p) || 0));
  const showCable = (from, to, stackY) => {
    line('cable', from, to);
    $('stack').setAttribute('transform', `translate(0,${stackY})`);
    return { cables: [{ id: 'cable', a: from, b: to }], stacks: [{ id: 'stack', y: 299 + stackY }] };
  };
  const barTransform = (id, center) => place(id, center);

  function cablePushdown(p) {
    const shoulder = point(280, 132), elbow = point(286, 178), fore = 72;
    const theta = (-56 + 138 * p) * Math.PI / 180;
    const wrist = point(elbow.x + fore * Math.cos(theta), elbow.y + fore * Math.sin(theta));
    const arm = chain('arm', shoulder, elbow, wrist, distance(shoulder, elbow), fore);
    const angle = theta * 180 / Math.PI;
    place('hand', wrist, angle); place('handle', wrist, angle);
    // The outlet sits on a visible adjustable track and below the shoulder line.
    // The video warns against a cable path that crosses the chest; the exact grip is unconfirmed.
    const hardware = showCable(point(391, 156), wrist, -34 * p);
    return { kind: 'arms-extra-cable-pushdown', chains: [arm], contacts: [{ a: wrist, b: wrist }], anchors: [shoulder, elbow, point(222, 358), point(324, 358)], supports: [{ id: 'floor', at: point(38, 358), kind: 'floor' }, { id: 'leftShoe', at: point(222, 358), kind: 'foot' }, { id: 'rightShoe', at: point(324, 358), kind: 'foot' }], stacks: hardware.stacks, cables: hardware.cables, hands: [{ id: 'hand', at: wrist, handle: 'handle' }], motionAxis: 'down', pelvis: point(256, 226) };
  }

  function seatedCableCurl(p) {
    const shoulderA = point(215, 213), shoulderB = point(255, 213);
    const elbowA = point(215, 255), elbowB = point(255, 255), fore = 66;
    const degrees = 10 - 45 * p;
    const center = arcPoint(point(235, 255), fore, degrees);
    const left = arcPoint(elbowA, fore, degrees), right = arcPoint(elbowB, fore, degrees);
    const armA = chain('farArm', shoulderA, elbowA, left, distance(shoulderA, elbowA), fore);
    const armB = chain('nearArm', shoulderB, elbowB, right, distance(shoulderB, elbowB), fore);
    const angle = degrees;
    // A small wrist hook is held throughout the rep; the bar contact point remains the wrist/grip anchor.
    place('farHand', left, angle); place('nearHand', right, angle);
    barTransform('bar', center);
    line('cable', point(408, 310), center);
    $('stack').setAttribute('transform', `translate(0,${-32 * p})`);
    return { kind: 'arms-extra-seated-cable-curl', chains: [armA, armB], contacts: [{ a: left, b: left }, { a: right, b: right }], anchors: [point(236, 354), point(292, 282), point(301, 287), point(372, 356), point(392, 356)], supports: [{ id: 'floor', at: point(38, 358), kind: 'floor' }, { id: 'leftShoe', at: point(372, 356), kind: 'foot' }, { id: 'rightShoe', at: point(392, 356), kind: 'foot' }, { id: 'pelvisContact', at: point(236, 354), kind: 'seated pelvis' }], cables: [{ id: 'cable', a: point(408, 310), b: center }], bars: [{ id: 'bar', position: center }], hands: [{ id: 'farHand', at: left, bar: 'bar', offset: point(-20, 0), wristFlexDegrees: -8 }, { id: 'nearHand', at: right, bar: 'bar', offset: point(20, 0), wristFlexDegrees: -8 }], stacks: [{ id: 'stack', y: 302 - 32 * p }], motionAxis: 'up', pelvis: point(236, 354) };
  }

  function lyingBarbellExtension(p) {
    // Small head-up bench incline (~15° in the source demonstration). Feet remain
    // planted on the floor; body and shoulder/elbow geometry follow the bench.
    const shoulderNear = point(310, 228), shoulderFar = point(280, 228);
    const elbowNear = point(336, 161), elbowFar = point(306, 161), fore = 67;
    // Start slightly flexed, then bend toward the forehead without crossing
    // the fixed upper-arm direction. The return retraces this same elbow arc.
    const degrees = -55 + 40 * p;
    const center = arcPoint(point(321, 161), fore, degrees, point(0, -4));
    const left = arcPoint(elbowFar, fore, degrees), right = arcPoint(elbowNear, fore, degrees);
    const a = chain('farArm', shoulderFar, elbowFar, left, distance(shoulderFar, elbowFar), fore);
    const b = chain('nearArm', shoulderNear, elbowNear, right, distance(shoulderNear, elbowNear), fore);
    const angle = degrees;
    place('farHand', left, angle); place('nearHand', right, angle); barTransform('barbell', center);
    return { kind: 'arms-extra-lying-barbell-extension', chains: [a, b], contacts: [{ a: left, b: left }, { a: right, b: right }], anchors: [point(75, 300), point(427, 205), point(98, 358), point(151, 358)], supports: [{ id: 'bench', at: point(75, 300), kind: 'head-up incline bench' }, { id: 'leftShoe', at: point(98, 358), kind: 'foot' }, { id: 'rightShoe', at: point(151, 358), kind: 'foot' }], supportContacts: [point(180.25, 263.4), point(304, 230.2), point(388, 208.4)], bars: [{ id: 'barbell', position: center, shape: 'illustrative EZ-style curved bar' }], hands: [{ id: 'farHand', at: left, bar: 'barbell', offset: point(-15, 4) }, { id: 'nearHand', at: right, bar: 'barbell', offset: point(15, 4) }], motionAxis: 'down', gravity: point(0, 1), pelvis: point(181, 275) };
  }

  function standingBarbellCurl(p) {
    const shoulderNear = point(267, 132), shoulderFar = point(230, 135.3);
    const elbowNear = point(290, 190), elbowFar = point(260, 190), fore = 72;
    const degrees = 67 - 87 * p;
    const center = arcPoint(point(275, 190), fore, degrees, point(0, -4));
    const left = arcPoint(elbowFar, fore, degrees), right = arcPoint(elbowNear, fore, degrees);
    const a = chain('leftArm', shoulderFar, elbowFar, left, distance(shoulderFar, elbowFar), fore);
    const b = chain('rightArm', shoulderNear, elbowNear, right, distance(shoulderNear, elbowNear), fore);
    const angle = degrees;
    place('leftHand', left, angle); place('rightHand', right, angle); barTransform('barbell', center);
    return { kind: 'arms-extra-standing-barbell-curl', chains: [a, b], contacts: [{ a: left, b: left }, { a: right, b: right }], anchors: [point(220, 358), point(314, 358), point(250, 229)], supports: [{ id: 'floor', at: point(38, 358), kind: 'floor' }, { id: 'leftShoe', at: point(220, 358), kind: 'foot' }, { id: 'rightShoe', at: point(314, 358), kind: 'foot' }], bars: [{ id: 'barbell', position: center, shape: 'EZ curved bar' }], hands: [{ id: 'leftHand', at: left, bar: 'barbell', offset: point(-15, 4) }, { id: 'rightHand', at: right, bar: 'barbell', offset: point(15, 4) }], motionAxis: 'up', gravity: point(0, 1), pelvis: point(250, 224) };
  }

  const renderers = {
    'cable-pushdown': cablePushdown,
    'seated-cable-curl': seatedCableCurl,
    'lying-barbell-extension': lyingBarbellExtension,
    'standing-barbell-curl': standingBarbellCurl
  };
  const key = document.body.dataset.artwork;
  if (!renderers[key]) throw new Error(`Unknown arms-extra artwork: ${key}`);
  window.renderEquipment = p => renderers[key](common(p));
  window.renderEquipment(0);
})();
