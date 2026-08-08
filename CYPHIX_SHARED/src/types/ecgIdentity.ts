/* ==================================================================
   ECG ID — the domain types behind a patient's own cardiac signature.

   ══ WHAT AN "ECG ID" IS ══
   Every recording of one person contains the same beat, drawn again and
   again with noise on top. Average enough of those beats — properly, with
   the ectopic ones thrown out — and the noise cancels while the shape
   survives. What is left is that person's REPRESENTATIVE BEAT: the
   waveform their heart actually makes, per lead, with the breathing, the
   mains hum and the electrode movement gone.

   Do that across many studies and you get something a single study can
   never give you: a BASELINE. Not "is this normal for a human", which is
   what a textbook range answers, but "is this normal FOR YOU" — which is
   the question that catches a change while it is still small, because a
   QRS that widened by 18 ms is still inside every textbook range.

     study 1 ─┐
     study 2 ─┤  median beat per study      weighted, outlier-resistant
     study 3 ─┼─────────────────────────►   aggregate  ────►  ECG ID
     study 4 ─┤  (ectopics rejected)         (early studies weigh more)
     study n ─┘                                    │
                                                   ▼
                              every new study is scored against it

   ══ ⚠️ THIS IS A COMPARISON, NOT A DIAGNOSIS ⚠️ ══
   The same rule that governs `ecgAnalysis.ts` governs this file, and it is
   load-bearing: **nothing here interprets**. A `Deviation` says "the QRS in
   lead II is 18 ms wider than your own baseline of 92 ms". It does not say
   what that means, whether it is bad, or what to do — because deciding that
   is practising medicine, and the moment software does it the product
   changes regulatory class.

   Every deviation therefore carries the measured value, the baseline it was
   measured against, and the difference. A clinician reading it can check
   the arithmetic. That is the whole design goal: make the comparison a
   clinician would do by hand — pull up the old traces, lay them on top,
   see what moved — happen automatically and be auditable afterwards.

   ══ LEAD-SET AGNOSTIC BY CONSTRUCTION ══
   Today the hardware measures two channels and derives six limb leads.
   Tomorrow it measures twelve. Nothing in these types names six: an
   identity holds a PARTIAL map keyed by `EcgLeadName`, so a study that
   carries V1–V6 extends the identity into those leads and a limb-only
   study simply does not. `coverage` then states, per lead, how many
   studies stand behind it — which is exactly the honesty a reader needs
   when V3's baseline rests on two recordings and lead II's on forty.
   ================================================================== */

import type { EcgLeadName } from './ecg';

/* ══════════════════ 1. One recording's representative beat ══════════════════ */

/**
 * The median beat of ONE lead in ONE recording, on the canonical grid.
 *
 * `dispersion` is the per-sample robust spread across the beats that were
 * averaged (MAD × 1.4826 ≈ σ). It is not decoration: it is what separates
 * "this person's T wave genuinely varies" from "this recording was noisy",
 * and the identity's tolerance corridor is built from it.
 */
export interface BeatTemplate {
  /** Millivolts, `TEMPLATE_SAMPLES` long, on the canonical R-aligned grid. */
  samples: Float32Array;
  /** Robust per-sample spread across contributing beats, in mV. */
  dispersion: Float32Array;
  /** Beats that survived the ectopic/artefact gates and were averaged. */
  beatsUsed: number;
  /** Beats found but rejected — prematurity, low correlation, or clipped window. */
  beatsRejected: number;
  /**
   * ★ A few of the rejected beats, KEPT so they can be shown.
   *
   * Reporting only a count ("3 beats were not used") asks the reader to
   * take the algorithm's word for it, on the one decision that most shapes
   * the result — which beats were allowed to define the template. Keeping
   * a handful means the claim is checkable: draw them against the accepted
   * beat and a reader can see for themselves that the rejected one is a
   * different shape, and disagree if it is not.
   *
   * Bounded on purpose (`MAX_KEPT_REJECTS`), and only on the reference
   * lead: this is evidence for a UI, not a second copy of the recording.
   * A `truncated` beat is counted but never kept — its window ran off the
   * end of the record, so there is no complete beat to draw.
   */
  rejected: RejectedBeat[];
}

/** Why a beat did not make it into the template. Reported, never silent. */
export type BeatRejectReason =
  /** The ±window around R ran off the end of the recording. */
  | 'truncated'
  /** RR to the neighbouring beat deviated too far from this record's median. */
  | 'premature'
  /** Shape disagreed with this recording's own preliminary template. */
  | 'dissimilar';

/** One beat that was left out, with the evidence for leaving it out. */
export interface RejectedBeat {
  /** The beat itself, on the canonical grid — drawable beside the template. */
  samples: Float32Array;
  reason: BeatRejectReason;
  /** Its correlation with the recording's own preliminary template, 0–1. */
  correlation: number;
  /** Where it sat in the recording, in seconds from the start. */
  atSec: number;
}

/**
 * Everything one stored recording contributes to an identity.
 *
 * This is the CACHEABLE artifact: deriving it costs a full decode + six
 * lead-filters + Pan-Tompkins, and the answer never changes, because a
 * recording is immutable. Compute once, keep forever, version it so a
 * change to the maths invalidates the cache instead of quietly mixing two
 * generations of template into one baseline.
 */
export interface RecordingTemplate {
  recordingId: string;
  /** ISO 8601, copied from the recording — the identity is built in time order. */
  recordedAt: string;
  /** Which algorithm generation produced this. Bump = recompute. */
  templateVersion: number;
  /** The canonical grid these templates live on. */
  sampleRate: number;
  /** Sample index of the R peak inside every template. */
  rIndex: number;
  /** Only the leads this recording actually had. */
  leads: Partial<Record<EcgLeadName, BeatTemplate>>;
  /** Rhythm-steadiness index 0–100, carried from the recording's analysis. */
  sqi: number;
  /** Beats the template was averaged from (reference lead). */
  beatsUsed: number;
  /** Per-recording interval snapshot, so the identity can baseline them too. */
  intervals: {
    prMs: number | null;
    qrsMs: number | null;
    qtMs: number | null;
    qtcMs: number | null;
    axisDegrees: number | null;
    bpm: number | null;
  };
  /** True when the source was the bench simulator — barred from the baseline. */
  isSimulated: boolean;
}

/* ══════════════════ 2. The identity itself ══════════════════ */

/**
 * How much of a baseline there is yet. Named after what the user is doing,
 * not after a number, because this is the state the UI narrates.
 */
export type IdentityMaturity =
  /** Nothing usable yet — no eligible recording. */
  | 'none'
  /** Enrolling: fewer studies than the enrollment target. Usable, provisional. */
  | 'enrolling'
  /** Enrollment complete; the baseline is stable and new studies are scored. */
  | 'established';

/** One lead's baseline, and the corridor a study is allowed to move inside. */
export interface IdentityLead {
  /** The weighted representative beat — the ECG ID for this lead, in mV. */
  samples: Float32Array;
  /**
   * Per-sample tolerance in mV: how far this lead legitimately moves for
   * this person. Combines the spread BETWEEN studies with the spread
   * WITHIN them, so a corridor is never narrower than the measurement
   * noise that built it.
   */
  tolerance: Float32Array;
  /** Studies that contributed a non-zero weight to this lead. */
  contributors: number;
}

/** Which measurement moved, in a form a reader can check by hand. */
export type DeviationKind =
  /** Beat SHAPE stopped matching — the correlation against baseline fell. */
  | 'morphology'
  /** The trace left this person's own tolerance corridor for a real span. */
  | 'corridor'
  /** Overall QRS height changed relative to baseline. */
  | 'amplitude'
  | 'qrsDuration'
  | 'qtcInterval'
  | 'prInterval'
  | 'axis'
  | 'rate';

/**
 * `watch` — outside this person's usual range, inside the range a clean
 *           recording can move on its own. Shown, not shouted.
 * `marked` — a difference larger than measurement variation explains.
 *
 * Deliberately NOT `mild / moderate / severe`: those words grade a
 * FINDING, and there is no finding here — only a distance from a baseline.
 */
export type DeviationSeverity = 'watch' | 'marked';

export interface IdentityDeviation {
  kind: DeviationKind;
  severity: DeviationSeverity;
  /** Which lead it was measured on; null when it is a whole-study number. */
  lead: EcgLeadName | null;
  /** What this study measured. */
  value: number;
  /** What the identity holds for it. */
  baseline: number;
  /** value − baseline, in the unit below. */
  delta: number;
  unit: 'ms' | 'mV' | 'deg' | 'bpm' | 'ratio' | '%';
}

/** How one recording compares with the identity built from the others. */
export interface IdentityMatch {
  recordingId: string;
  recordedAt: string;
  /**
   * 0–100. A blend of per-lead shape correlation and how far the trace
   * strayed outside the tolerance corridor. 100 is "indistinguishable from
   * your baseline", not "healthy".
   */
  similarity: number;
  /** Per-lead Pearson correlation against the baseline beat. */
  correlation: Partial<Record<EcgLeadName, number>>;
  deviations: IdentityDeviation[];
  /** True when this study helped BUILD the baseline (vs merely scored against it). */
  contributed: boolean;
  /** The weight it carried, 0 when it was excluded or outvoted. */
  weight: number;
  /** Set when the study is not eligible to shape the baseline at all. */
  excluded: ExclusionReason | null;
  /**
   * ★ An enrollment study that disagrees with its own cohort.
   *
   * The first studies weigh most, so an early recording taken with a loose
   * electrode would bend the baseline permanently and every later study
   * would then be scored as "deviant" against a bad reference. Flagging it
   * is the only way that stays fixable: the reader is told which study is
   * doing it, and can strike it.
   */
  flaggedAtEnrollment: boolean;
}

/** Why a recording may not shape the baseline. Always stated, never implied. */
export type ExclusionReason =
  /** Bench simulator output. Synthetic data may never define a person. */
  | 'simulated'
  /** Too few clean beats for a template to mean anything. */
  | 'tooFewBeats'
  /** Signal quality below the floor. */
  | 'lowQuality'
  /** Disagreed with the cohort so strongly it was given no weight. */
  | 'outlier';

/** Per-lead honesty about how much evidence stands behind each baseline. */
export interface LeadCoverage {
  lead: EcgLeadName;
  /** Studies contributing to this lead. Zero means "never measured". */
  studies: number;
  /** Mean per-sample tolerance in mV — how tight this lead's baseline is. */
  meanToleranceMv: number | null;
}

/** The complete ECG ID: the signature, its provenance, and every score. */
export interface EcgIdentity {
  maturity: IdentityMaturity;
  /** 0–100: how much this baseline should be leaned on. See `buildEcgIdentity`. */
  confidence: number;
  /** Studies used / studies needed before `established`. */
  enrolled: number;
  enrollmentTarget: number;
  /** Every study looked at, including the excluded ones. */
  considered: number;
  /** The signature, per lead that has one. */
  leads: Partial<Record<EcgLeadName, IdentityLead>>;
  /** Canonical grid: sample rate and where R sits in it. */
  sampleRate: number;
  rIndex: number;
  /** Baseline intervals — the weighted median across contributing studies. */
  intervals: {
    prMs: number | null;
    qrsMs: number | null;
    qtcMs: number | null;
    axisDegrees: number | null;
    bpm: number | null;
  };
  /** One row per study, newest first. */
  matches: IdentityMatch[];
  /** Per-lead evidence, in 12-lead order, INCLUDING leads never measured. */
  coverage: LeadCoverage[];
  /** ISO timestamp of the newest study that shaped the baseline. */
  updatedAt: string | null;
}

/* ══════════════════ 3. Measurement statistics ══════════════════ */

/**
 * "When do I actually measure?" — the adherence half of Insights.
 *
 * A baseline is only as good as the habit that feeds it, and the habit is
 * invisible in a reverse-chronological list: forty rows look identical
 * whether they were taken daily for six weeks or twice a day for three
 * days and then never again. These are the numbers that make the pattern
 * visible.
 *
 * All of it is derived in the READER'S timezone, on purpose — "I measure
 * in the morning" is a statement about their morning, not about UTC.
 */
export interface MeasurementStats {
  total: number;
  /** Non-simulated studies with enough beats to measure. */
  usable: number;
  simulated: number;
  /** ISO of the first and last study, or null when there are none. */
  firstAt: string | null;
  lastAt: string | null;
  /** Whole days from the first study to now. */
  daysTracked: number;
  /** Days since the most recent study. */
  daysSinceLast: number | null;
  /** Mean studies per week over the tracked span. */
  perWeek: number | null;
  /** The longest silence between two consecutive studies, in days. */
  longestGapDays: number | null;
  /** Consecutive weeks, counting back from this one, with ≥ 1 study. */
  streakWeeks: number;
  /** Counts by local hour (24) and local weekday (7, Sunday first). */
  byHour: number[];
  byWeekday: number[];
  /** The 4-hour block holding the most studies, as [startHour, endHour). */
  busiestBlock: [number, number] | null;
  /** Last 12 months, oldest first — for the cadence bars. */
  byMonth: { month: string; count: number }[];
  /** Study-by-study series for the trend sparklines. Nulls are kept as gaps. */
  trends: {
    bpm: MeasurementPoint[];
    qrsMs: MeasurementPoint[];
    qtcMs: MeasurementPoint[];
  };
}

export interface MeasurementPoint {
  at: string;
  value: number | null;
}

// v1.0.0 — ECG ID domain types: per-recording beat templates, the weighted
//          personal baseline, typed deviations that state their own arithmetic,
//          per-lead coverage, and the measurement-cadence statistics. Nothing
//          in here interprets — every shape is a distance from a baseline.
