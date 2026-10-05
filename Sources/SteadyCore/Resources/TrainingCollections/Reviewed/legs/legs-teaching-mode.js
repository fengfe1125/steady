/* Static teaching diagrams live in their own panels; motion geometry stays unchanged. */
(() => {
  'use strict';
  const artwork = document.querySelector('[data-artwork]');
  const drawMotion = window.renderEquipment;
  if (!artwork || typeof drawMotion !== 'function') return;
  const originalHidden = artwork.getAttribute('hidden');
  const originalAriaHidden = artwork.getAttribute('aria-hidden');
  let teachingHidden = false;
  function synchronizeArtworkVisibility() {
    const teachingMode = ['detail', 'mistakes'].some(mode => document.getElementById(mode)?.hidden === false);
    if (teachingMode && !teachingHidden) {
      artwork.setAttribute('hidden', '');
      artwork.setAttribute('aria-hidden', 'true');
      teachingHidden = true;
    } else if (!teachingMode && teachingHidden) {
      if (originalHidden === null) artwork.removeAttribute('hidden');
      else artwork.setAttribute('hidden', originalHidden);
      if (originalAriaHidden === null) artwork.removeAttribute('aria-hidden');
      else artwork.setAttribute('aria-hidden', originalAriaHidden);
      teachingHidden = false;
    }
  }
  // Both the local and native runtimes select a panel before invoking this entry point.
  // Keep every argument and the returned motion pose intact, including full-cycle timing.
  window.renderEquipment = function (...args) {
    const pose = drawMotion.apply(this, args);
    synchronizeArtworkVisibility();
    return pose;
  };
  synchronizeArtworkVisibility();
})();
