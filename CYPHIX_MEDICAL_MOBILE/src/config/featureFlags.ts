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

// v0.1.0 — Initial flags mirroring the web nav modules.
