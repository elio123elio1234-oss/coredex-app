/* @cyphix/shared — platform-neutral core (root CLAUDE.md §2.1).
   Pure TypeScript only: no React, no DOM, no React Native imports. */

export * from './types/ecg';
export * from './types/scan';
export * from './types/ecgAnalysis';
export * from './types/recording';
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

/* Report GEOMETRY, in millimetres. Not signal maths, but the same rule
   applies for a different reason: a trace measured off the web's printed
   sheet and one measured off the phone must land on the same ruler, so
   both platforms build their grid and their path from these. */
export * from './ecg/ecgPath';
export * from './ecg/ecgGrid';

/* ── Stored recordings: persist, compare, export, import ──────────
   Everything a Scan History needs that is not UI. The codec is what makes
   a waveform survive a string-only store; `ecgAlign` is the fiducial warp
   two studies are compared through; the export builders are the pure half
   of the web's ecgExport (delivery — a download vs a share sheet — stays
   per-platform); the importer decides what an outside CSV is allowed to
   become. All four are read by web AND mobile, so a recording exported on
   one and re-imported on the other is the same recording. */
export * from './ecg/recordingCodec';
export * from './ecg/ecgAlign';
export * from './ecg/ecgExport';
export * from './ecg/ecgImport';

// v1.3.0 — Adds the Scan History core: stored-recording types, the waveform
//          codec, fiducial alignment, and the CSV/EDF+ export + CSV import
//          builders — so History means the same thing on every platform.
