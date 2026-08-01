/* ==================================================================
   Measurement guide illustrations — the "how do I hold it?" pictures.

   The mobile twin of the web `config/measurementGuides.ts`. These are the
   SAME photographs, copied from `CYPHIX_MEDICAL_WEB/public/assets/` into
   `assets/guides/` — a patient must not be shown one illustration on the
   phone and a different one on the web.

   The web resolves them as URLs; Metro resolves `require()` at build time,
   so they are bundled and appear instantly (the web's manual `new Image()`
   preloading has no mobile equivalent and needs none).
   ================================================================== */

/* Limb measurement is set up in two confirmed steps, then held. */
export const LIMB_PREP_IMAGES = {
  /** Step 1 — wear the watch on the left wrist. */
  wear: require('../../assets/guides/ecg-limb-step1-wear.jpg'),
  /** Step 2 — rest that hand (watch down) on the left thigh. */
  rest: require('../../assets/guides/ecg-limb-step2-rest.jpg'),
} as const;

/**
 * Shown on the live screen while no heartbeat is detected yet: touch the
 * watch face with the other hand — the recording then arms itself.
 */
export const LIMB_MEASURE_GUIDE_IMAGE = require('../../assets/guides/ecg-limb-step3-touch.jpg');

// v1.0.0 — The web's own limb guide photographs, bundled for mobile.
