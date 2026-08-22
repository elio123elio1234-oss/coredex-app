/* Feature flags — MUST mirror the web app's featureFlags per the
   Cross-Platform Rule (root CLAUDE.md §1). A flag that exists on web
   exists here, and PARITY.md tracks any divergence. */

export const FEATURE_FLAGS = {
  liveScan: true,
  measure: true,
  scanHistory: true,
  patientProfile: true,
  systemSettings: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * The floating CYPHIX wordmark in the top-start corner of the patient shell.
 *
 * ★ Deliberately OUTSIDE `FEATURE_FLAGS` above: that table mirrors the web's
 * nav modules one for one and must keep doing so. This is a mobile-only
 * presentation switch — the web's wordmark lives in a sidebar that mobile
 * does not have — so putting it in the mirrored table would make the two
 * apps' flag sets diverge for no reason. Recorded in PARITY.md.
 *
 * Off at the user's request (v0.14.0), temporarily. It is a switch and not a
 * deletion precisely because "for now" was the word: flip this back to `true`
 * and the mark returns on every patient screen at once, with the top padding
 * that clears it.
 *
 * This does NOT touch the report's letterhead (`ReportHeader`) — that mark
 * identifies a clinical document rather than decorating a screen, and a
 * report with no issuer on it is a different decision entirely.
 */
export const SHOW_SHELL_WORDMARK = false;

/**
 * ★ WHETHER THIS BUILD INTERPRETS AT ALL.
 *
 * Off at the user's instruction (v0.59.0): *"the app does not decode
 * anything, it only shows measurements."* That is a claim about the whole
 * product, not about one screen, so it is one constant read by every
 * surface that would otherwise make it:
 *
 *   • `StudyViewerScreen`   — the Findings tab, its pane, and whether
 *                             `useScreening` runs at all.
 *   • `HistoryScreen`       — the verdict pill on every row of the list.
 *   • `digestFromRecording` — whether the background backfill screens each
 *                             study at all (43 rules over six leads, per
 *                             study — not something to compute for a label
 *                             nobody is shown).
 *   • `pdf/document.ts`     — the interpretation pages of the report. This
 *                             one matters most: a PDF leaves the phone and
 *                             is read later by someone who cannot ask what
 *                             the app was claiming that day.
 *
 * It is a SWITCH AND NOT A DELETION, deliberately. `screenLimbEcg`, the 43
 * rules, `EcgScreeningSheet`, the "why" sheets and `interpretationPages`
 * are all untouched and all still correct. Flip this to `true` and the
 * tab, the pill and the printed pages come back together — which is the
 * only way to make "for now" mean what it says.
 *
 * Every null path it opens is one the app already had: a SIMULATED
 * recording has never been screened, so "no verdict" is a shape every
 * consumer has handled since v1.0.0 rather than a new one introduced here.
 */
export const INTERPRETATION_ENABLED = false;

// v0.59.0 — Adds INTERPRETATION_ENABLED (off): this build measures, it does
//           not decode. One flag for the tab, the list pill, the digest
//           backfill and the PDF.
// v0.2.0 — Adds the mobile-only shell-wordmark switch (currently hidden).
