/* ==================================================================
   The welcome screen's photograph — the asset itself, and the one thing
   that has to happen before it is shown.

   ── Why this file exists ──
   The first screen of the app was navy for a second or two and then the
   picture appeared, which reads as a glitch rather than as a design.
   The cause is not the file (1400 × 1066, 176 KB — modest): it is WHEN it
   is fetched. Nothing asked for the image until `WelcomeStep` mounted, so
   the fetch and the decode happened while the patient was already looking
   at the screen.

   In **Expo Go** it is worse and worth naming, because that is where it
   was noticed: a `require`d asset is not bundled into the client — it is
   pulled from the Metro dev server over Wi-Fi on first use. So the first
   launch pays a network round trip for the background of the very first
   screen.

   `prefetchHero()` moves that work into the boot splash, which is dead
   time the app already holds for 1.7 s. By the time the welcome screen
   mounts, the image is in the loader's cache and appears with it.

   Deliberately no new dependency: `resolveAssetSource` + `Image.prefetch`
   are React Native's own, and in a production build — where the asset is
   local and prefetching is unnecessary — a rejection is caught and
   ignored rather than guarded with a platform check that would lie about
   why it is there.
   ================================================================== */

import { Image } from 'react-native';

/** The onboarding photograph. Imported from here by everything that
    draws it, so the asset and its preload can never drift apart. */
export const HERO_IMAGE = require('../../../assets/onboarding-hero.jpg');

let started: Promise<void> | null = null;

/** Warm the image cache. Safe to call more than once — the work happens
    once, and the caller is never made to wait for it. */
export function prefetchHero(): void {
  started ??= (async () => {
    try {
      const uri = Image.resolveAssetSource(HERO_IMAGE)?.uri;
      if (uri) await Image.prefetch(uri);
    } catch {
      /* Nothing is lost: the image still loads when it is rendered, and
         WelcomeStep fades it in either way. */
    }
  })();
}

// v1.0.0 — The welcome photograph + a splash-time prefetch, so the first
//          screen is not navy for a second before its own background arrives.
