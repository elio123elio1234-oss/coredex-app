/* ==================================================================
   ECG domain types — CANONICAL copy (single source of truth).
   Moved here from CYPHIX_MEDICAL_WEB/src/types/ecg.ts so Web, iOS and
   Android share one definition. The web copy is scheduled to re-export
   from here (root CLAUDE.md §2.1).

   Pipeline these types describe (ported from BEATALIGN):

     HARDWARE (ESP32 + ADS1293)
        │  BLE GATT notify @ 320 Hz
        │  packet = [seq][count][ sample × 5 or 9 bytes ]
        ▼
     BLE client → ring buffers (Lead I, Lead II) in mV
        ▼
     deriveLeads()  → I, II, III, aVR, aVL, aVF  (Einthoven)
        ▼
     filterSixLeads() → display-filtered traces (0.5–40 Hz + 50 Hz notch)
        ▼
     Pan-Tompkins validator → HR / SQI / "signal is valid" gate

   The hardware measures TWO physical channels; the other 4 limb leads
   are DERIVED mathematically.
   ================================================================== */

/** The 6 limb leads (2 measured + 4 derived). */
export type LimbLeadName = 'I' | 'II' | 'III' | 'aVR' | 'aVL' | 'aVF';

/** Canonical limb-lead display order (matches BEATALIGN). */
export const LIMB_LEAD_ORDER: readonly LimbLeadName[] = [
  'I',
  'II',
  'III',
  'aVR',
  'aVL',
  'aVF',
] as const;

/** One sample across all six limb leads, in millivolts. */
export type SixLeadSample = Record<LimbLeadName, number>;

/** What the user is measuring. */
export type MeasurementType = 'limb' | 'chest' | '12lead';

/** BLE connection lifecycle. Mirrors the legacy status machine. */
export type BleStatus = 'disconnected' | 'connecting' | 'connected' | 'streaming' | 'error';

/**
 * Live view of the BLE ring buffers.
 * Consumers read `writeIdx` to know how much new data arrived, then index
 * `leadI` / `leadII` modulo their length. Values are in millivolts (mV).
 */
export interface EcgBufferView {
  leadI: Float32Array;
  leadII: Float32Array;
  /** Monotonic write cursor (NOT wrapped) — use `% length` to index. */
  writeIdx: number;
  totalSamples: number;
  lastSeq: number;
  droppedPackets: number;
}

/** Result of one completed chest-lead recording (10 s at a single electrode). */
export interface ChestLeadRecording {
  /** Which precordial electrode this capture belongs to. */
  lead: 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6';
  leadI: Float32Array;
  leadII: Float32Array;
  sampleRate: number;
  /** ISO timestamp when the capture finished. */
  recordedAt: string;
}

/** Result of a completed limb (6-lead) recording. */
export interface LimbRecording {
  raw: Record<LimbLeadName, Float32Array>;
  filtered: Record<LimbLeadName, Float32Array>;
  totalSamples: number;
  sampleRate: number;
  hr: number;
  recordedAt: string;
}

/** Phases of the guided chest protocol (V1 → V6). */
export type GuidedPhase =
  | 'positioning' // waiting for the watch to reach the target electrode
  | 'locked' // watch is on target, confirming it's not a fluke
  | 'stabilizing' // holding steady before we commit to recording
  | 'recording' // capturing 10 s of ECG
  | 'leadDone' // this electrode finished, moving to the next
  | 'allDone'; // whole protocol complete

/** Signal-quality gate reported by the Pan-Tompkins validator. */
export type ValidatorStatus =
  | 'settling'
  | 'searching'
  | 'detecting'
  | 'lead_off'
  | 'valid'
  | 'failed';

export interface ValidatorResult {
  ready: boolean;
  peaksFound: number;
  status: ValidatorStatus;
  hr: number;
  /** Signal Quality Index 0–100 (RR-interval regularity). */
  sqi: number;
  failReason?: 'timeout' | 'lead_off' | 'no_signal' | 'few_peaks' | 'irregular';
}

// v1.0.0 — Canonical ECG domain types, lifted verbatim from the web app.
