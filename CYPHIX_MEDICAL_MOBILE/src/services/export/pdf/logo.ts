/* ==================================================================
   The CYPHIX wordmark, for print.

   ══ WHY THIS FILE STILL EXISTS ══
   `components/atoms/CyphixWordmark.tsx` renders through `react-native-svg`,
   which produces native views. This document is HTML handed to a print
   engine, so the same artwork has to exist as plain SVG markup.

   ══ WHAT IT NO LONGER DOES ══
   It no longer carries its own copy of the path data. Until 2026-10-10 it
   held three hand-copied path strings under a comment admitting that
   "four copies of one wordmark is not a design" — and the mitigation,
   that nobody would edit them by hand, stopped being a mitigation the
   moment the brand actually changed. The artwork now comes from
   `@cyphix/shared` (`brand/wordmark`), the single place it is declared.

   ══ WHAT THE PRINTED LOGO LOOKS LIKE NOW ══
   Lettering only. The round mark and the grey "MEDICAL" beside it are not
   in the new artwork, so the letterhead carries the six glyphs and
   nothing else. The shared viewBox is already tight, so the cropping this
   file used to do (the old box left the lockup ~10 units off centre, which
   on a letterhead read as a logo that had slipped) is no longer needed.
   ================================================================== */

import {
  WORDMARK_ASPECT,
  WORDMARK_INK,
  WORDMARK_INK_LIGHT,
  WORDMARK_PATH,
  WORDMARK_VIEWBOX,
} from '@cyphix/shared';

/**
 * The wordmark at a given width in millimetres.
 *
 * `onNavy` inverts the ink for the letterhead band (v0.56.0): a white
 * wordmark on the brand navy. Only the FILL changes.
 */
export function wordmark(widthMm: number, onNavy = false): string {
  const h = widthMm / WORDMARK_ASPECT;
  const fill = onNavy ? WORDMARK_INK_LIGHT : WORDMARK_INK;
  return `<svg width="${widthMm}mm" height="${h.toFixed(3)}mm" viewBox="${WORDMARK_VIEWBOX}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMid meet">
  <path fill="${fill}" d="${WORDMARK_PATH}"/>
</svg>`;
}

// v2.0.0 — The 2026-10-10 lettering-only logo, taken from `@cyphix/shared`
//          brand/wordmark instead of three local path copies. `onNavy` now
//          flips one fill rather than four. Callers were re-sized to hold the
//          printed HEIGHT constant (pages.ts: 34 mm → 24.6 mm), so the 16 mm
//          letterhead band's geometry — and `assertFits` — are untouched.
// v1.1.0 — An `onNavy` fill variant for the letterhead band. Fills only; the
//          path data stays the verbatim copy.
// v1.0.0 — The wordmark as plain SVG for the print engine. Path data copied
//          verbatim from components/atoms/BrandLogo.tsx; never hand-edited.
