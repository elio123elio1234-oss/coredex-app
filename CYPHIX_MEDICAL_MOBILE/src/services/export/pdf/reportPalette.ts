/* ==================================================================
   reportPalette — the printed report's colour language, from the design
   handoff "Clinical data export to PDF".

   ══ WHY THIS IS A SECOND PALETTE AND NOT AN EDIT TO `theme.ts` ══
   `theme.ts` is the report's GEOMETRY plus the brand's own inks — the navy
   the wordmark is set in, the blue ECG grid, the greens and golds the
   interval bands and the H/L flags use. Those are load-bearing: a ruler
   laid on this paper has to agree with a ruler laid on the web report, and
   the trace has to stay the wordmark's navy. None of that changes.

   What this file adds is the SECTIONING language of the redesign: a hue per
   section (rate red, intervals blue, axis violet, quality green), the deep
   plum letterhead, and the wave colours in the amplitude panel. It is the
   paper twin of `theme/valuesPalette.ts`, and it obeys the same rule.

   ★ COLOUR SECTIONS, IT NEVER GRADES.
   The rhythm tile is amber whether the rhythm is regular or not. The
   steadiness ring is green at 12 % and at 98 %. The reference band on an
   interval is one flat tint at any value. Nothing on the measurements page
   takes its colour from whether a measurement is inside or outside a range
   — that would be an interpretation drawn as styling, in the one direction
   `ecgAnalysis.ts` may not go. The handoff's own "within range" / "2 ms
   below range" call-outs were dropped for exactly this reason, at the
   user's instruction; the shaded band and the marker stay, because a
   reader can see where the marker sits without being told.

   ══ WHY HEX AND NOT `oklch()` ══
   The handoff is written entirely in `oklch()`. This document is rendered
   by whatever WebView the phone happens to have — `expo-print` hands the
   HTML to WKWebView on iOS and to Android's Chromium WebView — and
   `oklch()` only landed in Safari 15.4 and Chrome 111. A colour function
   an engine cannot parse does not degrade, it drops the declaration: the
   letterhead would print white and the tiles would print transparent, on
   exactly the older devices least likely to be noticed in testing.

   So every value below was converted ONCE, offline, from the handoff's
   oklch through OKLab → linear sRGB → gamma, and the result is checked in
   as hex. The oklch original is kept in the comment beside each one so the
   conversion can be re-derived rather than trusted.
   ================================================================== */

/* ── Type ─────────────────────────────────────────────────────────── */

/** Body ink. oklch(0.26 0.02 285) — a violet-leaning near-black. */
export const R_INK = '#23232E';
/** Running copy. oklch(0.42 0.02 285) */
export const R_BODY = '#4C4C58';
/** Captions. oklch(0.50 0.02 285) */
export const R_MUTE = '#62626F';
/** Secondary captions and units. oklch(0.55 0.02 285) */
export const R_MUTE2 = '#70707D';
/** The quietest type on the page. oklch(0.60 0.02 285) */
export const R_FAINT = '#7F7F8C';
/** A number that should be read first in a row of numbers. oklch(0.35 0.02 285) */
export const R_NUM = '#393945';
/** Section kickers. oklch(0.50 0.03 295) */
export const R_KICKER = '#646073';

/* ── The letterhead / hero band ───────────────────────────────────── */

/** oklch(0.22 0.06 285) → oklch(0.18 0.05 300) → oklch(0.24 0.07 330) */
export const R_HERO_A = '#181535';
export const R_HERO_B = '#150B24';
export const R_HERO_C = '#31102F';
/** Type on the band. oklch(0.97 0.01 285) */
export const R_HERO_TXT = '#F4F4FC';
/** The band's kicker. oklch(0.75 0.06 330) */
export const R_HERO_KICK = '#C4A1C0';
/** The rate's gradient. oklch(0.85 0.13 15) → oklch(0.82 0.12 320) */
export const R_HERO_N1 = '#FFA9B2';
export const R_HERO_N2 = '#E7AAF5';
/** "BPM" beside it. oklch(0.80 0.03 300) */
export const R_HERO_UNIT = '#C0BACF';
/** The rhythm chip on the band. oklch(0.42 0.10 75) / oklch(0.96 0.04 90) */
export const R_CHIP_AMBER_BG = '#6C4300';
export const R_CHIP_AMBER_FG = '#FCF1D4';
/** The provenance chips. oklch(0.32 0.03 290) / oklch(0.85 0.02 290) */
export const R_CHIP_BG = '#323041';
export const R_CHIP_FG = '#CDCCDA';
/** The trace drawn on the band. oklch(0.72 0.20 15) */
export const R_TRACE = '#FF637B';

/* ── The tile row: one hue per measurement family ─────────────────── */

export const R_T_RED_BG = '#FFEAEB'; // oklch(0.96 0.03 15)
export const R_T_RED_LB = '#9A4F56'; // oklch(0.52 0.10 15)
export const R_T_RED_VA = '#C72C4C'; // oklch(0.55 0.19 15)
export const R_T_BLUE_BG = '#E8F3FF'; // oklch(0.96 0.02 250)
export const R_T_BLUE_LB = '#3E668F'; // oklch(0.50 0.08 250)
export const R_T_BLUE_VA = '#0465AF'; // oklch(0.50 0.14 250)
export const R_T_VIO_BG = '#F2EFFE'; // oklch(0.96 0.02 295)
export const R_T_VIO_LB = '#665A8C'; // oklch(0.50 0.08 295)
export const R_T_VIO_VA = '#6C4AB3'; // oklch(0.50 0.16 295)
export const R_T_AMB_BG = '#FEF0D4'; // oklch(0.96 0.04 85)
export const R_T_AMB_LB = '#8A5F28'; // oklch(0.52 0.09 70)
export const R_T_AMB_VA = '#B56300'; // oklch(0.58 0.15 65)
/** The outlined tiles. oklch(0.91 0.01 285) */
export const R_OUTLINE = '#E0E0E8';

/* ── Bars and tracks ──────────────────────────────────────────────── */

/** Empty track. oklch(0.94 0.006 285) */
export const R_TRACK = '#EAEBEF';
/** The reference band. oklch(0.88 0.06 250) → oklch(0.90 0.05 200) */
export const R_BAND_A = '#BADBFE';
export const R_BAND_B = '#B8E9EB';

/* ── The axis card ────────────────────────────────────────────────── */

export const R_AX_BG_A = '#F6F3FF'; // oklch(0.97 0.02 295)
export const R_AX_BG_B = '#EEF6FF'; // oklch(0.97 0.015 250)
export const R_AX_RING = '#DFDCEA'; // oklch(0.90 0.02 295)
export const R_AX_RING2 = '#E8E6F1'; // oklch(0.93 0.015 295)
export const R_AX_SECTOR = '#E0D7FF'; // oklch(0.90 0.06 295)
export const R_AX_INK = '#7E4ED7'; // oklch(0.55 0.20 295)
export const R_AX_NUM = '#703DC6'; // oklch(0.50 0.20 295)

/* ── The signal-quality card ──────────────────────────────────────── */

export const R_Q_BG_A = '#E6FCEC'; // oklch(0.97 0.03 155)
export const R_Q_BG_B = '#E7FAF8'; // oklch(0.97 0.02 190)
export const R_Q_RING = '#04AB62'; // oklch(0.65 0.16 155)
export const R_Q_TRACK = '#DBE9DF'; // oklch(0.92 0.02 155)
export const R_Q_NUM = '#008B45'; // oklch(0.55 0.16 155)

/* ── Wave amplitudes ──────────────────────────────────────────────── */

/**
 * One colour per wave, and this is the one place on the page where colour
 * is doing real work rather than sectioning: five bars per lead, six leads
 * across, and the reader is comparing the SAME wave down the row. Without a
 * hue per wave that panel is thirty grey bars.
 */
export const R_W_P = '#8F6EDB'; // oklch(0.62 0.16 295)
export const R_W_Q = '#00A2B7'; // oklch(0.65 0.12 210)
export const R_W_R = '#E4405E'; // oklch(0.62 0.20 15)
export const R_W_S = '#D98B09'; // oklch(0.70 0.15 70)
export const R_W_T = '#24A965'; // oklch(0.65 0.15 155)
export const R_WAVE_INKS: readonly [string, string, string, string, string] = [
  R_W_P,
  R_W_Q,
  R_W_R,
  R_W_S,
  R_W_T,
];

export const R_AMP_HEAD = '#F4F4FA'; // oklch(0.97 0.008 285)
export const R_AMP_LINE = '#E7E7EC'; // oklch(0.93 0.006 285)
export const R_AMP_LINE2 = '#EEEEF2'; // oklch(0.95 0.005 285)
/** The zero line each lead's waves stand on. oklch(0.90 0.01 285) */
export const R_BASELINE = '#DDDDE5';
/** Peak-to-peak: the one derived number in the panel. oklch(0.50 0.14 250) */
export const R_PP_INK = '#0465AF';
export const R_PP_A = '#3284D0'; // oklch(0.60 0.14 250)
export const R_PP_B = '#00A6C1'; // oklch(0.65 0.15 210)

/** Footer / divider rules. oklch(0.92 0.01 285) */
export const R_RULE = '#E4E4EB';

// v1.0.0 — The printed report's sectioning palette, converted from the
//          handoff's oklch to hex so an older WebView cannot drop it.
