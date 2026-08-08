/* @cyphix/shared — platform-neutral core (root CLAUDE.md §2.1).
   Pure TypeScript only: no React, no DOM, no React Native imports. */

export * from './types/ecg';
export * from './types/scan';
export * from './types/ecgAnalysis';
export * from './types/recording';
export * from './ble/protocol';
export * from './api/contract';

/* How a device that already HAS the data asks what changed, rather than
   asking for the data again: collection deltas + ETag/304 for single
   documents. Protocol, not policy — the server answers it and every
   client speaks it, so "unchanged" means the same thing everywhere. */
export * from './api/sync';

/* Who the user IS, and what registration collects about them. Same
   caveat as `ecg/` below: the web still holds its own copy under
   src/services/auth/authTypes.ts, so until it imports from here an edit
   belongs in both places (tracked in PARITY.md). */
export * from './auth/contract';

/* What the app SHOWS about that person: the assembled, minimized medical
   card the Profile screen draws, and the portrait that follows them
   across devices. Same caveat — web `types/viewModels.ts` and the
   server's `types.ts` still declare it too. */
export * from './types/patient';

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

/* ── ECG ID: a patient measured against THEMSELVES ────────────────
   `ecgAlign` compares two studies. These three compare a study against
   every study that came before it: `beatTemplate` reduces one recording
   to its representative beat, `ecgIdentity` fuses those into a personal
   baseline and scores each study against it (leave-one-out, so nothing is
   ever graded against its own reflection), and `measurementStats` says
   when the measuring actually happened.

   Pure maths with no IO, so the same functions can move server-side
   later without changing an answer — which is the point of them being
   here rather than in the app that happens to run them today. Same
   prohibition as `ecgAnalysis`: they measure distances, never meanings. */
/* When the patient means to measure. A statement about their care rather
   than a handset setting — it has to survive a new phone and be legible to
   the web — so the shape is here and only the DELIVERY (OS notifications
   on a phone; nothing comparable in a browser tab) is per-platform. */
export * from './types/reminder';

export * from './types/ecgIdentity';
export * from './ecg/beatTemplate';
export * from './ecg/ecgIdentity';
export * from './ecg/measurementStats';

// v1.8.0 — Adds the measurement-reminder schedule (types/reminder.ts).
// v1.7.0 — Adds the ECG ID stack (beat templates, the personal baseline, the
//          measurement-cadence summary) and names the precordial leads, so the
//          identity is written against "whatever leads a study had" rather than
//          against six and 12-lead hardware extends it instead of replacing it.
// v1.6.0 — Adds the sync contract (api/sync.ts): delta envelope + cursor rules
//          + the 304 convention, so offline-first means one thing platform-wide.
// v1.5.0 — Adds the patient medical-card contract (card, portrait, routes), so
//          the Profile screen renders the same record on every platform.
// v1.4.0 — Adds the auth/registration contract (account, registration profile,
//          typed failures, password strength), so sign-up asks for the same
//          things and fails the same way on web, iOS and Android.
