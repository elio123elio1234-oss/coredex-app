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
 * caliper measurement is useful.
 *
 * The ceiling is 600 rather than "the length of the recording", which is what
 * it was until the full-screen view existed. Fitting all six leads to a
 * landscape phone's HEIGHT is the binding constraint there, not the width:
 * 6 × 30 mm of paper into ~353 pt is 1.96 pt/mm, and at that scale an 852 pt
 * width holds ~434 mm — more paper than a 10 s recording contains. Capping at
 * the recording's length would have forced a taller scale and put the sheet
 * back into a vertical scroll. The extra is drawn as BLANK PAPER, which is
 * what a printout does when the sheet is longer than the trace.
 */
export const MIN_WINDOW_MM = 40;
export const MAX_WINDOW_MM = 600;
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

/**
 * The window that makes `leadCount` bands exactly fill `heightPt`, given a
 * viewport `widthPt`. This is what "Fit" means on a phone and what the
 * full-screen view opens at.
 *
 * ★ It is derived from the HEIGHT on purpose. The obvious "fit" — show the
 * whole recording — is a width calculation, and on a landscape phone it
 * produces bands 99 pt tall inside a 353 pt sheet, so four of the six leads
 * are below the fold. A six-lead ECG is read as six leads at once.
 */
export function fitWindowMm(
  widthPt: number,
  heightPt: number,
  leadCount: number,
  bandMm: number,
): number {
  if (widthPt <= 0 || heightPt <= 0) return DEFAULT_WINDOW_MM;
  const ptPerMm = heightPt / (leadCount * bandMm);
  return Math.min(MAX_WINDOW_MM, Math.max(MIN_WINDOW_MM, widthPt / ptPerMm));
}

// v1.1.0 — Zoom ceiling raised to 600 mm and `fitWindowMm` added, so "Fit" and
//          the full-screen view size the window to the HEIGHT — all six leads
//          at once — instead of to the recording's length.
