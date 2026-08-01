/* @cyphix/shared — platform-neutral core (root CLAUDE.md §2.1).
   Pure TypeScript only: no React, no DOM, no React Native imports. */

export * from './types/ecg';
export * from './types/scan';
export * from './types/ecgAnalysis';
export * from './ble/protocol';
export * from './api/contract';

/* ── The frozen signal chain ──────────────────────────────────────
   `ecg/` is the ECG maths, copied VERBATIM from the web app so every
   platform computes bit-identical waveforms (root CLAUDE.md §2.3).
   Do not re-derive, re-tune or "clean up" any constant in there.
   The web app still carries its own copy under src/services/ecg/;
   migrating it to import from here is tracked in PARITY.md. Until it
   does, ANY edit to these files must be made in both places. */
export * from './ecg/filterDesign';
export * from './ecg/ecgDSP';
export * from './ecg/qrsValidator';
export * from './ecg/ecgSimulator';
export * from './ecg/measurement.constants';
export * from './ecg/reportFilter';
export * from './ecg/ecgAnalysis';

// v1.1.0 — Adds the shared ECG signal chain (DSP, validator, simulator).
