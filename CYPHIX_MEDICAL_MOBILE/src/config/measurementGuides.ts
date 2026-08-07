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

/** The two physical placements a still can depict. */
export type GuidePlacement = 'limb' | 'chest';

/**
 * The Tests-tab circles: the watch on a wrist resting on a leg (limb) and
 * the watch on a bare chest (chest). The 12-lead choice has no photograph
 * of its own — it is drawn as a half/half of these two, exactly as the web
 * `SplitLeadCircle` does, because the full test IS both placements.
 */
export const MEASUREMENT_GUIDE_IMAGE: Record<GuidePlacement, number> = {
  limb: require('../../assets/guides/ecg-tests-limb.jpg'),
  chest: require('../../assets/guides/ecg-tests-chest.jpg'),
};

/**
 * Explainer clips for the "Watch how" button, keyed by measurement type.
 *
 * `null` is a supported value, not a gap to be filled in later by whoever
 * reads this: the sheet then shows the still with a "coming soon" badge
 * rather than an empty player. Only the limb clip has been produced.
 *
 * ⚠️ These are `require()`d, so every clip listed here is BUNDLED INTO THE
 * APP — the 6-limb tutorial alone is 2.7 MB. A clip that is not short is a
 * download every patient pays for on install; host long ones and put a URL
 * string here instead (`VideoSource` accepts both).
 */
export const MEASUREMENT_GUIDE_VIDEO: Record<'limb' | '12lead', number | null> = {
  limb: require('../../assets/guides/6limb-tutorial.mp4'),
  '12lead': null,
};

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

// v1.1.0 — Adds the Tests-tab circle artwork + the 6-limb explainer clip, the
//          same files the web serves from /assets (bundled, not fetched).
// v1.0.0 — The web's own limb guide photographs, bundled for mobile.
