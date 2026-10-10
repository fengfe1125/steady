// Topic-local metadata; lesson/resource/timing still come from the frozen manifest.
export const lesson = spec => ({id: spec.id, ...spec, dropManifestKeys: ['availableViews', 'defaultView', 'supportsSideSelection', 'documentLayout', 'injectedRuntimeResource', 'teachingDiagrams']});
export const floor = (type, options = {}) => ({
  hands: {near: 'open', far: 'open'}, ground: false,
  camera: {focus: ['headTop', 'headPivot', 'shoulder', 'hip', 'legs.near.K', 'legs.far.K', 'legs.near.A', 'legs.far.A', 'legs.near.toe', 'legs.far.toe', 'arms.near.H', 'arms.far.H'], side: 17, head: 12, t: 64, b: 102, max: 1.7},
  equipment: [{type: 'legs_mat', x: -190, length: 410, width: 110}],
  poses: {
    base: {arms: {near: {sh: 4, el: 8}, far: {sh: 4, el: 8}}, legs: {near: {hip: 0, knee: 0, ankle: 0}, far: {hip: 0, knee: 0, ankle: 0}}, eq: {legs3D: {type, ...options}}},
    start: {act: .32}, peak: {act: .9}
  }
});
