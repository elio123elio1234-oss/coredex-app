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

// v0.2.0 — Adds the mobile-only shell-wordmark switch (currently hidden).
