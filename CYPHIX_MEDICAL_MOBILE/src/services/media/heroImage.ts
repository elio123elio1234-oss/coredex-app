/* ==================================================================
   The welcome screen's photograph — the asset itself.

   ── Why this file exists ──
   The first screen of the app was navy for a second or two and then the
   picture appeared, which reads as a glitch rather than as a design.
   The cause is not the file (1400 × 1066, 176 KB — modest): it is WHEN
   it is fetched. Nothing asked for the image until `WelcomeStep`
   mounted, so the fetch and the decode happened while the patient was
   already looking at the screen.

   The warm-up that fixes it now lives in `imagePreload.ts` and covers
   every bundled photograph, not just this one — see the note there on
   why a `require`d asset is an HTTP request in a dev build. Declaring
   the asset here and preloading it there keeps one rule intact: an
   image has exactly one home, and the preloader imports it rather than
   naming the path a second time.
   ================================================================== */

/** The onboarding photograph. Imported from here by everything that
    draws it — including `imagePreload`, so the asset and its warm-up
    can never drift apart. */
export const HERO_IMAGE = require('../../../assets/onboarding-hero.jpg');

// v2.0.0 — The prefetch moved out to `imagePreload.ts`, which warms this AND
//          the three measurement guides. This file is now only the asset.
// v1.0.0 — The welcome photograph + a splash-time prefetch, so the first
//          screen is not navy for a second before its own background arrives.
