/* ==================================================================
   useExamOrientation — the exam runs in LANDSCAPE, everything else in
   portrait.

   ── WHY ──
   Six simultaneous limb traces need horizontal room. In portrait each
   card is ~55 px tall AND narrow, so a 4-second window is squeezed into
   ~350 px and the QRS complexes crowd together. Rotated, the same six
   cards get the full long edge and read like a strip of ECG paper.

   The lock covers the WHOLE exam route — set-up photographs, live
   monitor and report — because a rotation mid-measurement would remount
   the Skia canvases and interrupt a recording the patient cannot restart
   without letting go of the electrodes.

   ⚠️ `app.json` must keep `"orientation": "default"`. Pinning it to
   `"portrait"` writes a restricted `UISupportedInterfaceOrientations`
   into the build, and `lockAsync(LANDSCAPE)` then silently fails on iOS
   while continuing to work in Expo Go — the worst kind of difference,
   because it only appears in a real build.
   ================================================================== */

import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';

/* ── Why this is a counter and not a plain lock/unlock ──
   A naive `lock on mount / unlock on cleanup` rotates the device THREE
   times on the way in: React (Strict Mode in development, and any remount
   during a navigation transition) runs mount → cleanup → mount, so the
   screen went landscape, snapped back to portrait, then landscape again.
   That is the flicker.

   So: count how many screens currently want landscape, and defer the
   revert to the next tick. A remount that happens in the same tick simply
   cancels the pending revert, and the device rotates exactly once. */
let landscapeHolders = 0;
let pendingRevert: ReturnType<typeof setTimeout> | null = null;

function apply(lock: ScreenOrientation.OrientationLock): void {
  ScreenOrientation.lockAsync(lock).catch(() => {
    // Locking is a presentation nicety — a device that refuses (or a
    // client without the module) must still be able to take a reading.
  });
}

/** Landscape for as long as the calling screen is mounted; portrait after. */
export function useLandscapeWhileMounted(): void {
  useEffect(() => {
    if (pendingRevert) {
      clearTimeout(pendingRevert);
      pendingRevert = null;
    }
    if (landscapeHolders === 0) apply(ScreenOrientation.OrientationLock.LANDSCAPE);
    landscapeHolders++;

    return () => {
      landscapeHolders--;
      pendingRevert = setTimeout(() => {
        pendingRevert = null;
        if (landscapeHolders === 0) apply(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }, 0);
    };
  }, []);
}

/** The app's baseline: everything outside the exam stays upright. */
export function lockPortrait(): void {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
}

// v1.0.0 — Landscape exam, portrait everywhere else.
