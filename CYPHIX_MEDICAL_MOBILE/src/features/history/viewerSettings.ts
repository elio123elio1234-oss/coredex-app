/* ==================================================================
   Viewer settings — how a stored recording is DRAWN on a phone.

   ══ THE SCALE IS FIXED; ZOOM IS A WINDOW ══
   Ported from the web's `features/history/viewerSettings.ts`, and the one
   rule that matters carries over untouched: the trace is ALWAYS drawn at
   the clinical 25 mm/s : 10 mm/mV. Sweep speed and gain are not offered as
   choices. Zooming does not rescale the trace — it narrows the WINDOW of
   time on screen (fewer millimetres of paper across the same glass, drawn
   larger), and panning slides that window. Because the scale never changes,
   a caliper reading is the true interval at any zoom.

   ══ WHAT ZOOM MEANS HERE, AND WHY IT IS NOT THE WEB'S NUMBER ══
   The web zooms by seconds-on-screen because its viewport is wide enough
   to hold the whole 10 s at 25 mm/s. A phone is not: at 3.6 pt/mm a 390 pt
   column holds ~108 mm ≈ 4 s. So the mobile control is `windowMm` — how
   many millimetres of paper fill the width — which is the same quantity
   expressed in the unit the phone actually constrains. The report already
   works this way (`VIEWPORT_MM` in EcgReport), so the two mobile surfaces
   zoom identically.
   ================================================================== */

import type { LimbLeadName, ReportFilterOptions } from '@cyphix/shared';

/* ── The clinical standard. Fixed, not offered as a choice. ── */
export const STANDARD_SPEED_MM_S = 25;
export const STANDARD_GAIN_MM_MV = 10;

/**
 * How the leads are arranged.
 *   all    — every lead, stacked; the default review layout
 *   single — one lead, taller, for close reading of a single vector
 *
 * Both live inside ONE horizontal scroll, which is what makes panning
 * synchronised across leads for free: there is no code path in which lead
 * III shows a different instant from lead II. Six independently scrolled
 * strips would let a reader compare 2.1 s of one lead against 3.4 s of
 * another without noticing — a genuine misread, not a glitch.
 */
export type LeadLayout = 'all' | 'single';

export interface ViewerSettings {
  layout: LeadLayout;
  /** Which lead `single` shows. */
  focusLead: LimbLeadName;
  /** Id of a second recording ghosted behind this one; null = off. */
  overlayId: string | null;
  /** DSP stages. All on = the standard report chain. */
  filters: Required<ReportFilterOptions>;
  /** Draw the R-peak ticks. */
  showRPeaks: boolean;
  /**
   * Millimetres of ECG paper across the viewport width. SMALLER = more
   * zoomed in (the same glass shows less paper, so every square is bigger).
   */
  windowMm: number;
}

/**
 * Zoom limits, in millimetres of paper across the screen.
 *
 * 40 mm is ~1.25 s — one beat filling the width, which is as far in as a
 * caliper measurement is useful. 260 mm is a whole 10 s capture plus the
 * calibration pulse, i.e. fully zoomed out on a phone held in portrait; the
 * viewer clamps to the recording's own length so a short capture cannot be
 * zoomed out into blank paper.
 */
export const MIN_WINDOW_MM = 40;
export const MAX_WINDOW_MM = 260;
/** What the viewer opens at: ~3.6 s, three to four beats, each legible. */
export const DEFAULT_WINDOW_MM = 100;

export const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  layout: 'all',
  focusLead: 'II',
  overlayId: null,
  filters: { baseline: true, notch: true, smoothing: true },
  // R peaks on by default: the reader wants to see which beats the rate came
  // from wherever they happen to be looking.
  showRPeaks: true,
  windowMm: DEFAULT_WINDOW_MM,
};

/** True when any DSP stage has been switched off. */
export function hasFiltersOff(s: ViewerSettings): boolean {
  return !s.filters.baseline || !s.filters.notch || !s.filters.smoothing;
}

/**
 * Height of one lead's band, in millimetres. 30 mm ≙ ±1.5 mV at 10 mm/mV.
 *
 * ★ Must stay a MULTIPLE OF 5, for the same reason as the report
 * (`EcgReport.STRIP_HEIGHT_MM`): the bands are drawn with no gap, so band
 * N's last grid line and band N+1's first are the same line on screen. At a
 * multiple of the 5 mm major step they coincide and the grid tiles unbroken;
 * at 32 mm every seam shows as a stripe of mismatched squares.
 */
export const STRIP_HEIGHT_MM = 30;
/** One lead alone gets double the height — it has the whole sheet to itself. */
export const SINGLE_STRIP_HEIGHT_MM = 60;

// v1.0.0 — Mobile viewer settings: fixed clinical scale, zoom expressed as
//          millimetres of paper across the viewport.
