/* ==================================================================
   Every photograph the app ships, warmed once — before the first
   screen that needs one is drawn.

   ── The thing that is easy to get wrong about `require()` ──
   A `require`d image IS bundled into the binary — but only in a RELEASE
   build. In Expo Go and in a Debug dev build the asset is **not in the
   app at all**: `resolveAssetSource` hands back an `http://<your-pc>:8081/
   assets/...` URL and React Native fetches it over Wi-Fi the first time
   the <Image> is rendered. That request also queues behind whatever
   Metro is doing, which after a reload is serving a multi-megabyte JS
   bundle. Hence "the picture arrives seconds late", on a 36 KB file.

   ── Why one list and not a prefetch per screen ──
   v0.22.0 warmed the welcome photograph and nothing else, because that
   was the one that had been reported. The three measurement guides were
   left cold, so their first fetch happened at the exact moment the
   patient tapped START TEST — the same bug, one screen deeper. A single
   registry means adding a photograph to the app cannot silently skip
   its warm-up: it is added here or it is not preloaded, and that is
   visible in one place.

   ── Why it starts at module scope, not in an effect ──
   `AuthGate` was the earliest React point available, but it mounts
   *behind* `PreferencesGate`, which holds the tree until it has read
   stored preferences off the device. Starting here means the fetches
   are already in flight while that read is happening, and the whole
   1.7 s splash is available to absorb them rather than what is left of
   it. Nothing waits for this — the splash is not held for images.

   Deliberately no new dependency: `resolveAssetSource` + `Image.prefetch`
   are React Native's own. In a production build the assets are already
   local, prefetch is unnecessary, and a rejection is caught per-image
   rather than guarded by a platform check that would lie about why it
   is there.
   ================================================================== */

import { Image, type ImageSourcePropType } from 'react-native';
import { LIMB_MEASURE_GUIDE_IMAGE, LIMB_PREP_IMAGES } from '@/config/measurementGuides';
import { HERO_IMAGE } from './heroImage';

/**
 * Every bundled photograph, in the order the patient meets it.
 * ★ A new image asset belongs in this list. Nothing else warms them.
 */
const BUNDLED_IMAGES: readonly ImageSourcePropType[] = [
  /* Sign-in — the very first screen, and the first thing reported slow. */
  HERO_IMAGE,
  /* START TEST → the two confirmed prep steps. Both, because LimbPrep
     mounts both at once to make the step change a crossfade with nothing
     left to load (see LimbPrep.tsx). */
  LIMB_PREP_IMAGES.wear,
  LIMB_PREP_IMAGES.rest,
  /* The circular "touch the watch face" guide over the live traces. */
  LIMB_MEASURE_GUIDE_IMAGE,
];

let started = false;

/**
 * Pull every bundled photograph into the image loader's cache. Safe to
 * call more than once — the work happens once — and the caller is never
 * made to wait for it.
 */
export function preloadAppImages(): void {
  if (started) return;
  started = true;
  /* Fired in parallel and NOT awaited together: one rejection must not
     abandon the images after it in the list, which is exactly what a
     single try/catch around a sequence of awaits would do. */
  for (const source of BUNDLED_IMAGES) void warm(source);
}

async function warm(source: ImageSourcePropType): Promise<void> {
  try {
    const uri = Image.resolveAssetSource(source)?.uri;
    if (uri) await Image.prefetch(uri);
  } catch {
    /* Nothing is lost: the image still loads when it is rendered. A
       local `file://` asset in a release build can reject here, and that
       is the case where the preload was never needed anyway. */
  }
}

// v1.0.0 — One warm-up for every bundled photograph, started before the first
//          render. Replaces heroImage's hero-only prefetch, which left the
//          three measurement guides to be fetched at the tap that shows them.
