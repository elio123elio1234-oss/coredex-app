/* ==================================================================
   ECG ANALYSIS — domain types for AUTOMATED MEASUREMENTS.

   ⚠️ SCOPE, precisely: everything here is a MEASUREMENT (a duration, an
   amplitude, an angle) derived from the recorded waveform. Nothing here
   is an interpretation, a diagnosis, or a finding. There is deliberately
   no `diagnosis` field and no ICD-10/SNOMED coding, because this module
   does not diagnose — a clinician reads the trace and decides.

   When a backend exists, each measurement below maps to a FHIR R4
   `Observation` with a LOINC code (e.g. PR interval = LOINC 8625-6,
   QRS duration = 8633-0, QT = 8634-8, QTc = 8636-3, QRS axis = 8632-2).
   That mapping belongs in the service layer at that time; this type stays
   transport-agnostic.

   EVERY numeric field is nullable on purpose. A measurement that could
   not be made honestly must read "—", never 0 and never a guess.
   ================================================================== */

import type { LimbLeadName } from './ecg';

/** Where the mean QRS vector points in the frontal plane. */
export type AxisClass = 'normal' | 'left' | 'right' | 'extreme' | 'indeterminate';

/** How steady the beat-to-beat timing is. */
export type RegularityClass = 'regular' | 'slightlyIrregular' | 'irregular' | 'indeterminate';

export interface RateAndRhythm {
  /** Heart rate from the mean RR interval. */
  bpm: number | null;
  rrMeanMs: number | null;
  rrMinMs: number | null;
  rrMaxMs: number | null;
  /** Standard deviation of RR intervals — the classic HRV time-domain measure. */
  sdnnMs: number | null;
  /** Root mean square of successive RR differences (short-term variability). */
  rmssdMs: number | null;
  /** Spread of RR as a fraction of the mean — drives the regularity class. */
  rrVariationPct: number | null;
  regularity: RegularityClass;
  /** Fraction of analysed beats that had a detectable P wave before the QRS. */
  pBeforeQrsPct: number | null;
  beatsAnalyzed: number;
}

export interface Intervals {
  /** Atrial depolarisation → ventricular depolarisation (P onset → QRS onset). */
  prMs: number | null;
  /** Ventricular depolarisation time (QRS onset → QRS offset). */
  qrsMs: number | null;
  /** Depolarisation + repolarisation (QRS onset → T end). */
  qtMs: number | null;
  /** QT corrected for rate — Bazett (QT / √RR). The convention most report forms use. */
  qtcBazettMs: number | null;
  /** QT corrected for rate — Fridericia (QT / ∛RR). More stable at rate extremes. */
  qtcFridericiaMs: number | null;
}

/** Per-lead wave amplitudes in millivolts, median across analysed beats. */
export interface LeadAmplitudes {
  pMv: number | null;
  qMv: number | null;
  rMv: number | null;
  sMv: number | null;
  tMv: number | null;
  /** QRS peak-to-peak — a raw indicator of ventricular voltage. */
  qrsAmplitudeMv: number | null;
}

export interface FrontalAxis {
  /** Mean QRS vector angle in degrees (−180…+180); null when indeterminate. */
  degrees: number | null;
  classification: AxisClass;
  /** Net QRS area in lead I — the horizontal component of the vector. */
  netI: number | null;
  /** Net QRS area in aVF — the vertical component. */
  netAvf: number | null;
}

export interface SignalQuality {
  /** Rhythm regularity index 0–100 (from RR-interval spread). */
  sqi: number;
  /** Seconds of usable signal the measurements were computed from. */
  analysedSeconds: number;
  /** True when too few clean beats were found to trust the numbers. */
  insufficient: boolean;
}

export interface EcgAnalysis {
  rate: RateAndRhythm;
  intervals: Intervals;
  axis: FrontalAxis;
  amplitudes: Record<LimbLeadName, LeadAmplitudes>;
  quality: SignalQuality;
  /** Sample positions of detected R peaks — used to mark the report strips. */
  rPeaks: number[];
  sampleRate: number;
}

// v1.0.0 — Types for automated limb-lead ECG measurements (measurements only; no interpretation).
