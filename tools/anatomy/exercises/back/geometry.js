// Build-time projection helpers. The modules exported to the app stay plain data.
const R = Math.PI / 180;
export const reviewed = spec => ({
  ...spec,
  // The common anatomical renderer has one authored view. Hide legacy view/side
  // controls rather than promise camera or side switches it cannot render.
  dropManifestKeys: ['availableViews', 'defaultView', 'supportsSideSelection']
});

// Horizontal lower legs, knees on the mat, toes laid back. Hip and trunk do not
// translate during either kneeling preparation exercise.
export const kneel = {
  x: -100, y: -94, pelvis: 75, lumbar: 4, thorax: 4, neck: 8, head: 6,
  legs: {near: {hip: 95, knee: 110, ankle: 80}, far: {hip: 95, knee: 110, ankle: 80}}
};

// Sagittal shoulder/elbow motion, projected into the rear drawing with a 20°
// oblique component. Segment foreshortening comes from the projection, not from
// arbitrarily shrinking the limb to make the end pose fit.
export function rowArm(sh, el, projection = 0.35) {
  const x = a => projection * Math.sin(a * R), y = a => Math.cos(a * R);
  const a = Math.atan2(x(sh), y(sh)) / R;
  const b = Math.atan2(x(sh + el), y(sh + el)) / R;
  return {abd: a, el: b - a, f: Math.hypot(x(sh), y(sh)), ff: Math.hypot(x(sh + el), y(sh + el))};
}

export function walkPose(near, far, arms) {
  return {
    act: 0.58, y: -181,
    ik: {ankle: {near: {...near, bend: -1, foot: 0}, far: {...far, bend: -1, foot: 0}}},
    arms
  };
}

// Side-view hand targets with a constant projected span make a rigid two-grip
// attachment. The IK solver keeps both palms on those actual grip positions.
export const pairHands = (x, y) => ({near: {x, y, bend: 1}, far: {x: x - 10, y: y - 6, bend: 1}});

// Shoulder location for the kneeling base, shared by the arm and bench geometry.
export function sideShoulder(p) {
  const up = a => ({x: Math.sin(a * R), y: -Math.cos(a * R)});
  const add = (a, b, k) => ({x: a.x + b.x * k, y: a.y + b.y * k});
  const a0 = p.pelvis || 0, a1 = a0 + (p.lumbar || 0), a2 = a1 + (p.thorax || 0);
  let s = add({x: p.x || 0, y: p.y}, up(a0), 6 + 22);
  s = add(s, up(a0 + 90), -4);
  s = add(s, up(a1), 39);
  s = add(s, up(a2), 52 * .56 + (p.scapE || 0));
  return add(s, up(a2 + 90), 4 + (p.scapP || 0));
}
