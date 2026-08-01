/* ==================================================================
   Stored ECG recordings — the domain type behind Scan History.

   ★ THIS IS THE SHARED COPY (root CLAUDE.md §2.1). Web, mobile and the
   server all describe a stored recording with THESE fields. The web app
   predates the shared package and still carries its own copy under
   `src/types/recording.ts`; the two are byte-equivalent in shape and any
   change must be made in both until the web migrates. Mobile imports only
   from here.

   ══ WHAT IS STORED, AND WHY IT MATTERS ══
   We persist the **two RAW measured channels only** (Lead I and Lead II,
   in millivolts, exactly as they came off the hardware). Everything a
   viewer shows — the other four limb leads, any filtering, every
   measurement — is DERIVED from those two at view time.

   That is a deliberate clinical choice, not a storage optimisation:

     1. A clinician must be able to turn filters OFF. If we stored the
        filtered waveform we would have baked one filtering opinion into
        the record permanently, and "show me the raw signal" would be
        impossible to honour.
     2. Re-analysis improves. If the measurement code gets better, old
        recordings benefit, because they were never flattened into
        someone else's idea of clean.
     3. It is the honest artefact for export (raw CSV / EDF+) and for a
        future regulatory audit: this is what the electrodes saw.

   ══ FHIR ══
   Not a FHIR resource today. When the server owns these, a recording maps
   to an `Observation` with LOINC 11524-6 carrying `SampledData`, and each
   summary metric becomes a member `Observation`. The shape here is kept
   transport-agnostic and reference-based (`subject: 'Patient/xxx'`) so
   that mapping is mechanical.
   ================================================================== */

import type { MeasurementType } from './ecg';

/** Waveform payload: base64 of a little-endian Float32Array, in millivolts. */
export type EncodedChannel = string;

/**
 * The cheap summary the history LIST renders.
 *
 * Cached on write so browsing never has to decode and re-analyse every
 * waveform — with 100 recordings that would mean 100 × 6 leads of DSP just
 * to draw a list. The viewer recomputes from raw when a recording is
 * actually opened, so this is a display cache and never the source of
 * truth. Every field is nullable: a measurement that could not be made
 * reads "—".
 */
export interface RecordingSummary {
  bpm: number | null;
  /** Rhythm steadiness index 0–100. */
  sqi: number;
  qrsMs: number | null;
  qtcMs: number | null;
  prMs: number | null;
  axisDegrees: number | null;
  beatsAnalyzed: number;
  /** True when too few clean beats were found to trust the numbers. */
  insufficient: boolean;
}

/** A clinician's marker on the trace. Never auto-generated. */
export interface RecordingAnnotation {
  id: string;
  /** Which lead the marker sits on; null = applies to the whole recording. */
  lead: string | null;
  /** Sample index the marker points at. */
  sampleIndex: number;
  /** Short label, e.g. "PVC". Free text is acceptable here: it is a note by
      a named author about a waveform, NOT a coded clinical finding. */
  text: string;
  authorId: string;
  createdAt: string;
}

export interface StoredRecording {
  id: string;
  /** Not a FHIR resourceType — a local discriminator. See header. */
  kind: 'EcgRecording';
  /** FHIR-style reference, e.g. "Patient/pat-001". */
  subject: string;
  /** ISO 8601. */
  recordedAt: string;
  type: MeasurementType;
  sampleRate: number;
  durationSec: number;
  /** RAW measured channels — see the header for why only these two. */
  channels: {
    leadI: EncodedChannel;
    leadII: EncodedChannel;
  };
  /** True when the source was the bench simulator. MUST stay visible in every UI. */
  isSimulated: boolean;
  deviceLabel?: string;
  summary: RecordingSummary;
  annotations: RecordingAnnotation[];
  /**
   * Free-text clinical note / patient remark for the WHOLE study — a
   * doctor's summary or a patient's comment, as opposed to `annotations`
   * which are markers pinned to a beat. One per recording, edited in place.
   * Never a coded finding.
   */
  note?: string;
}

/** What a caller supplies to save a recording (id / summary are derived). */
export interface NewRecordingInput {
  subject: string;
  recordedAt: string;
  type: MeasurementType;
  sampleRate: number;
  rawLeadI: Float32Array;
  rawLeadII: Float32Array;
  isSimulated: boolean;
  deviceLabel?: string;
  summary: RecordingSummary;
}

/**
 * What the history LIST carries: everything except the waveform.
 *
 * Browsing a hundred sessions must not drag a hundred waveforms across the
 * wire; the viewer fetches the full record by id when one is opened.
 */
export type RecordingListItem = Omit<StoredRecording, 'channels'>;

// v1.0.0 — Shared stored-recording domain types (mirrors web types/recording.ts).
