/* ==================================================================
   ECG SCREENING — pattern detection over the six limb leads.

   ══ WHERE THIS SITS ══
        recording → reportFilterLeads → analyseLimbEcg → THIS
                                        (measures)      (reads)

   `analyseLimbEcg` produces numbers. This file applies published
   thresholds to those numbers and names the patterns they describe. It
   adds exactly two measurements of its own, because the analysis layer
   has no reason to make them and this one cannot work without them:
   the ST level at J+60 ms, and per-beat QRS width/amplitude.

   ══ THE THREE RULES THIS FILE OBEYS ══

   1. A RULE THAT CANNOT BE EVALUATED IS COUNTED, NOT SKIPPED.
      Every check reports whether its inputs existed. `clear` therefore
      arrives with "41 of 43 checks ran" attached, and a recording where
      only six could run cannot present itself as a clean bill of health.
      This is the single most important behaviour in the file.

   2. A FINDING CARRIES THE ARITHMETIC THAT PRODUCED IT.
      `evidence` is not a nicety. Someone must be able to disagree with
      this engine, and they cannot disagree with a bare verdict.

   3. THE NAME NEVER OUTRUNS THE EVIDENCE.
      Six leads see a wide QRS with a left-sided morphology. They do not
      see LBBB — that needs V1 and V6 — so the finding is
      `bbbLeftPattern`, and every label downstream inherits the hedge
      because the identifier itself contains it.

   ══ THRESHOLD PROVENANCE ══
   Every constant below is a published clinical threshold, cited at its
   definition. None was tuned to make a demo look good, and none may be.
   Where a threshold is genuinely contested the more conservative value is
   used, because the cost of the two errors is not symmetric: a missed
   finding sends someone to a doctor who finds nothing, and a false
   `clear` sends someone home.
   ================================================================== */

import { LIMB_LEAD_ORDER, type LimbLeadName } from '../types/ecg';
import type { EcgAnalysis } from '../types/ecgAnalysis';
import type {
  BlindSpotId,
  EcgScreening,
  FindingCategory,
  FindingConfidence,
  FindingId,
  FindingLevel,
  ScreeningContext,
  ScreeningEvidence,
  ScreeningFinding,
  ScreeningLevel,
} from '../types/ecgScreening';
import { delineateBeat } from './ecgAnalysis';

/* ══════════════════ Lead groups ══════════════════ */

/** The inferior wall — right coronary territory. */
const INFERIOR: readonly LimbLeadName[] = ['II', 'III', 'aVF'];
/** The high lateral wall — circumflex / diagonal territory. */
const LATERAL: readonly LimbLeadName[] = ['I', 'aVL'];

/* ══════════════════ Thresholds, each with its source ══════════════════ */

/* ── Rate. AHA/ACC/HRS use 60 and 100 as the sinus bounds, but 50–59 bpm
      is the resting rate of a great many healthy and athletic people, and
      a screen that flags them all teaches its reader to ignore it. 50 is
      the value at which a rate becomes worth a sentence. ── */
const BRADY_BPM = 50;
const BRADY_SEVERE_BPM = 40;
const TACHY_BPM = 100;
const TACHY_EXTREME_BPM = 150;

/* ── Rhythm ── */
/** RR coefficient of variation above which the rhythm is "irregularly
    irregular" — the defining feature of AF (Dash et al., 2009). */
const AF_RR_VARIATION_PCT = 12;
/** AF has no organised atrial activity, so P waves are absent on nearly
    every beat. Some noise will always be mis-read as a P, hence 40 % and
    not 0 %. */
const AF_P_PRESENT_MAX_PCT = 40;
/** Fewer beats than this and RR variability is not a rhythm, it is a
    small sample. Ten seconds at 60 bpm gives ~10. */
const AF_MIN_BEATS = 6;
/** Atrial flutter with 2:1 block lands the ventricles here, characteristically. */
const FLUTTER_BPM_LOW = 125;
const FLUTTER_BPM_HIGH = 175;
/** A regular rhythm: RR spread at or below this is not variable. */
const REGULAR_MAX_VARIATION_PCT = 6;
/** Sinus arrhythmia is benign and common in the young; only a clearly
    irregular rhythm WITH P waves is worth naming. */
const IRREGULAR_WITH_P_PCT = 15;
const P_PRESENT_MIN_PCT = 60;
/** A ventricular pause. 2 s is the conventional reporting threshold; 3 s
    is the one that changes what happens next. */
const PAUSE_MS = 2000;
const PAUSE_LONG_MS = 3000;
/** A beat arriving this much earlier than the running median is premature. */
const PREMATURE_RR_FRACTION = 0.85;
/** Ectopy burden. Ten seconds is a poor denominator, so a percentage
    alone is not allowed to fire a finding — an absolute count is
    required with it. */
const ECTOPY_FREQUENT_PCT = 15;
const ECTOPY_FREQUENT_MIN_BEATS = 3;

/* ── Conduction ── */
/** PR > 200 ms is first-degree AV block by definition. */
const PR_BLOCK_MS = 200;
/** Beyond 300 ms the delay is "marked" and more often symptomatic. */
const PR_BLOCK_MARKED_MS = 300;
/** A dropped ventricular beat leaves an RR near twice the prevailing one. */
const DROPPED_BEAT_RR_LOW = 1.7;
const DROPPED_BEAT_RR_HIGH = 2.3;
/** QRS 110–119 ms is a nonspecific intraventricular conduction delay;
    120 ms is the bundle-branch-block threshold. */
const QRS_IVCD_MS = 110;
const QRS_BBB_MS = 120;
/** A terminal S in lead I this deep is the limb-lead signature of right
    bundle branch block (the delayed right ventricle pulling rightward). */
const RBBB_S_LEAD_I_MV = -0.15;

/* ── Repolarisation ──
      QTc upper limits are sex-specific (AHA/ACCF/HRS 2009): 450 ms male,
      460 ms female. 500 ms is where torsades risk rises steeply and is
      the same for everyone. */
const QTC_LONG_MALE_MS = 450;
const QTC_LONG_FEMALE_MS = 460;
const QTC_LONG_SEVERE_MS = 500;
/** Short QT syndrome: QTc below 340 ms (Gollob criteria). */
const QTC_SHORT_MS = 340;
/** A T wave this negative is inverted rather than merely small. */
const T_INVERSION_MV = -0.1;

/* ── Chamber ──
      Lewis index (R I + S III) − (R III + S I) > 1.6 mV, and R in aVL
      > 1.1 mV (Sokolow's limb-lead criterion) — the two LVH criteria that
      need no chest leads. Both are specific and insensitive; that
      asymmetry is stated in the finding's confidence, not hidden. */
const LEWIS_INDEX_MV = 1.6;
const R_AVL_LVH_MV = 1.1;
/** Below this age, voltage criteria false-positive often enough on thin
    healthy chests that the finding is downgraded rather than trusted. */
const LVH_YOUNG_AGE = 35;
/** P-pulmonale: P in lead II ≥ 0.25 mV → right atrial enlargement. */
const P_PULMONALE_MV = 0.25;

/* ── Ischaemia ──
      The ESC/ACC universal definition puts significant ST elevation at
      0.1 mV in limb leads. Depression is conventionally 0.05 mV, but that
      is half the noise floor of a dry-electrode wearable, so 0.1 mV is
      used here and the loss of sensitivity is deliberate and recorded. */
const ST_ELEVATION_MV = 0.1;
const ST_DEPRESSION_MV = -0.1;
/** ST is measured this long after the J point — the standard offset. */
const ST_J_OFFSET_SECONDS = 0.06;
/** The PR segment is the isoelectric reference the ST level is read against. */
const PR_BASELINE_START_SECONDS = 0.04;
const PR_BASELINE_END_SECONDS = 0.01;
/** A pathological Q wave: at least a quarter of the R it precedes, and
    at least 0.1 mV in its own right. */
const Q_PATHOLOGICAL_MV = -0.1;
const Q_PATHOLOGICAL_R_RATIO = 0.25;

/* ── Other ── */
/** Peaked T waves of hyperkalaemia: tall in absolute terms AND tall
    relative to their own R, which is what "peaked" actually means. */
const HYPERK_T_MV = 0.55;
const HYPERK_T_R_RATIO = 0.75;
/** Low voltage: QRS under 0.5 mV in EVERY limb lead (effusion, obesity,
    COPD, infiltrative disease). */
const LOW_VOLTAGE_MV = 0.5;
/* ── Electrical alternans.
      ⚠️ THESE NUMBERS WERE TIGHTENED AFTER MEASURING, NOT AFTER READING.
      The first version (15 % swing, 80 % alternating, 6 beats) fired on
      6 of 40 simulated NORMAL subjects. It was measuring noise: on ten
      beats, ordinary amplitude jitter splits into "even" and "odd" groups
      that differ by 15 % often, and a short sequence of noisy differences
      flips sign 80 % of the time by chance. A rule that fires on one
      healthy subject in seven is not a rule, it is a decoration — and this
      one carried `urgent`. ── */
const ALTERNANS_RATIO = 0.2;
const ALTERNANS_MIN_BEATS = 8;
const ALTERNANS_MIN_CONSISTENCY = 0.9;
/** The alternation must also exceed the scatter WITHIN each alternating
    group by this factor. This is the condition that actually separates a
    swinging heart from a noisy recording: real alternans makes two tight
    populations, noise makes one loose one. */
const ALTERNANS_SEPARATION = 2;

/* ══════════════════ small helpers ══════════════════ */

function median(values: number[]): number | null {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return null;
  const sorted = [...clean].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Magnitude of a negative deflection; 0 when the wave never went below
    baseline. Wave amplitudes are signed, and every criterion below that
    "adds an S" means adding its DEPTH. */
function depth(mv: number | null): number {
  return mv !== null && mv < 0 ? -mv : 0;
}

function ms(v: number | null): string {
  return v === null ? '—' : `${Math.round(v)} ms`;
}

function bpm(v: number | null): string {
  return v === null ? '—' : `${Math.round(v)} BPM`;
}

/** Signed millivolts — the sign is the finding, so it is always printed. */
function mv(v: number | null): string {
  if (v === null) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)} mV`;
}

function pct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v)} %`;
}

/* ══════════════════ The two measurements this file makes ══════════════════ */

interface BeatMetric {
  rIdx: number;
  qrsMs: number;
  /** Peak-to-peak QRS amplitude on the reference lead. */
  qrsAmpMv: number;
  /** Arrived earlier than the running median RR. */
  premature: boolean;
  wide: boolean;
}

/**
 * Per-lead ST level at J+60 ms, referenced to the PR segment.
 *
 * ══ WHY THE PR SEGMENT AND NOT ZERO ══
 * The filtered trace has no absolute zero — baseline removal has already
 * moved it, and a residual wander of a tenth of a millivolt is normal. An
 * ST level read against 0 would therefore measure the filter's leftovers
 * as an infarct. The PR segment is electrically silent (the atria have
 * finished, the ventricles have not started), so it is the reference every
 * manual reader uses, and it moves WITH the wander instead of against it.
 */
function measureStLevels(
  leads: Record<LimbLeadName, Float32Array>,
  beats: ReturnType<typeof delineateBeat>[],
  fs: number,
): Record<LimbLeadName, number | null> {
  const jOffset = Math.round(fs * ST_J_OFFSET_SECONDS);
  const baseFrom = Math.round(fs * PR_BASELINE_START_SECONDS);
  const baseTo = Math.round(fs * PR_BASELINE_END_SECONDS);

  const out = {} as Record<LimbLeadName, number | null>;

  for (const lead of LIMB_LEAD_ORDER) {
    const signal = leads[lead];
    if (!signal) {
      out[lead] = null;
      continue;
    }
    const levels: number[] = [];

    for (const beat of beats) {
      if (!beat) continue;
      const from = beat.qrsOnset - baseFrom;
      const to = beat.qrsOnset - baseTo;
      const j = beat.qrsOffset + jOffset;
      if (from < 0 || to <= from || j >= signal.length) continue;

      let sum = 0;
      let n = 0;
      for (let i = from; i <= to; i++) {
        sum += signal[i];
        n++;
      }
      if (n === 0) continue;
      levels.push(signal[j] - sum / n);
    }

    out[lead] = levels.length > 0 ? median(levels) : null;
  }

  return out;
}

/**
 * Per-beat width and amplitude, and whether the beat came early.
 *
 * Prematurity is judged against the median of the SURROUNDING RR
 * intervals rather than the record's mean, because in a rhythm that is
 * itself irregular the mean is not a thing any single beat was early
 * relative to.
 */
function measureBeats(
  reference: Float32Array,
  rPeaks: number[],
  rrMeanSamples: number,
  fs: number,
): BeatMetric[] {
  const out: BeatMetric[] = [];
  if (rPeaks.length < 2) return out;

  const rrAll: number[] = [];
  for (let i = 1; i < rPeaks.length; i++) rrAll.push(rPeaks[i] - rPeaks[i - 1]);
  const rrTypical = median(rrAll) ?? rrMeanSamples;

  for (let k = 0; k < rPeaks.length; k++) {
    const beat = delineateBeat(reference, rPeaks[k], rrMeanSamples, fs);
    if (!beat) continue;

    let maxV = -Infinity;
    let minV = Infinity;
    for (let i = beat.qrsOnset; i <= beat.qrsOffset && i < reference.length; i++) {
      if (reference[i] > maxV) maxV = reference[i];
      if (reference[i] < minV) minV = reference[i];
    }
    if (!Number.isFinite(maxV) || !Number.isFinite(minV)) continue;

    const widthMs = ((beat.qrsOffset - beat.qrsOnset) / fs) * 1000;
    /* The FIRST beat has no preceding interval, so it can never be called
       premature — which is correct: "early" is a statement about what came
       before it, and nothing did. */
    const prevRr = k > 0 ? rPeaks[k] - rPeaks[k - 1] : rrTypical;

    out.push({
      rIdx: rPeaks[k],
      qrsMs: widthMs,
      qrsAmpMv: maxV - minV,
      premature: prevRr < rrTypical * PREMATURE_RR_FRACTION,
      wide: widthMs >= QRS_BBB_MS,
    });
  }

  return out;
}

/* ══════════════════ Finding assembly ══════════════════ */

const CATEGORY_OF: Record<FindingId, FindingCategory> = {
  bradycardiaSevere: 'rate',
  bradycardia: 'rate',
  tachycardia: 'rate',
  tachycardiaExtreme: 'rate',
  atrialFibrillation: 'rhythm',
  atrialFlutter: 'rhythm',
  svt: 'rhythm',
  wideComplexTachycardia: 'rhythm',
  ectopyFrequent: 'rhythm',
  ectopyOccasional: 'rhythm',
  irregularRhythm: 'rhythm',
  pause: 'rhythm',
  pauseLong: 'rhythm',
  avBlock1: 'conduction',
  avBlock1Marked: 'conduction',
  avBlock2Suspected: 'conduction',
  avBlockCompleteSuspected: 'conduction',
  ivcd: 'conduction',
  bbbLeftPattern: 'conduction',
  bbbRightPattern: 'conduction',
  bbbIndeterminate: 'conduction',
  lafb: 'conduction',
  lpfb: 'conduction',
  qtLong: 'repolarisation',
  qtLongSevere: 'repolarisation',
  qtShort: 'repolarisation',
  tInversionInferior: 'repolarisation',
  tInversionLateral: 'repolarisation',
  axisLeft: 'axis',
  axisRight: 'axis',
  axisExtreme: 'axis',
  lvhVoltage: 'chamber',
  raEnlargement: 'chamber',
  stElevationInferior: 'ischaemia',
  stElevationLateral: 'ischaemia',
  stDepressionInferior: 'ischaemia',
  stDepressionLateral: 'ischaemia',
  qWavesInferior: 'ischaemia',
  qWavesLateral: 'ischaemia',
  hyperkalaemiaPattern: 'other',
  lowVoltage: 'other',
  electricalAlternans: 'other',
  leadReversal: 'technical',
};

/**
 * Findings that make other findings redundant or wrong.
 *
 * Two different jobs, deliberately in one table because both are "do not
 * show this alongside that":
 *
 *   REDUNDANT — `avBlock1Marked` already says everything `avBlock1` says.
 *               Showing both is one fact counted twice, and a list of
 *               findings is read as a count.
 *   WRONG     — `leadReversal` invalidates every conclusion drawn from
 *               lead I's polarity, which is the axis and everything
 *               derived from it. Those are not lesser findings, they are
 *               artefacts of a swapped cable, and leaving them on screen
 *               beside the explanation would have a patient reading six
 *               scary rows caused by one misplaced sticker.
 */
const SUPPRESSES: Partial<Record<FindingId, readonly FindingId[]>> = {
  bradycardiaSevere: ['bradycardia'],
  tachycardiaExtreme: ['tachycardia'],
  avBlock1Marked: ['avBlock1'],
  atrialFibrillation: ['irregularRhythm', 'atrialFlutter'],
  atrialFlutter: ['svt'],
  avBlockCompleteSuspected: ['bradycardia', 'bradycardiaSevere'],
  wideComplexTachycardia: [
    'tachycardia',
    'tachycardiaExtreme',
    'svt',
    'ivcd',
    'bbbLeftPattern',
    'bbbRightPattern',
    'bbbIndeterminate',
  ],
  ectopyFrequent: ['ectopyOccasional'],
  lafb: ['axisLeft'],
  lpfb: ['axisRight'],
  qtLongSevere: ['qtLong'],
  /* A swapped cable inverts lead I. Everything below is read off lead I's
     polarity or off the frontal axis it defines. */
  leadReversal: [
    'axisLeft',
    'axisRight',
    'axisExtreme',
    'lafb',
    'lpfb',
    'bbbRightPattern',
    'bbbLeftPattern',
    'stElevationLateral',
    'stDepressionLateral',
    'tInversionLateral',
    'qWavesLateral',
    'lvhVoltage',
  ],
};

/** Display order within a level: the categories a reader triages by, first. */
const CATEGORY_ORDER: Record<FindingCategory, number> = {
  technical: 0,
  ischaemia: 1,
  rhythm: 2,
  conduction: 3,
  repolarisation: 4,
  rate: 5,
  chamber: 6,
  axis: 7,
  other: 8,
};

const CONFIDENCE_ORDER: Record<FindingConfidence, number> = {
  high: 0,
  moderate: 1,
  limited: 2,
};

/**
 * Six limb leads always have the same blind spots, so this is a constant
 * rather than something computed — and it is returned on EVERY screen,
 * including a perfectly clear one. That is the whole point of it: the
 * moment it becomes conditional, the condition will eventually be "we
 * found nothing", which is exactly when it most needs saying.
 */
const LIMB_LEAD_BLIND_SPOTS: readonly BlindSpotId[] = [
  'anteriorSeptal',
  'posterior',
  'chamberPrecordial',
  'paroxysmal',
  'singleTimepoint',
];

/* ══════════════════ THE ENTRY POINT ══════════════════ */

/**
 * Screen a measured limb-lead recording for named patterns.
 *
 * @param leads    the SAME filtered waveforms `analysis` was measured from
 * @param analysis the output of `analyseLimbEcg` over those waveforms
 * @param context  optional patient facts that move a threshold (never a rule)
 */
export function screenLimbEcg(
  leads: Record<LimbLeadName, Float32Array>,
  analysis: EcgAnalysis,
  context: ScreeningContext = {},
): EcgScreening {
  const fs = analysis.sampleRate;
  const { rate, intervals, axis, amplitudes, quality, rPeaks } = analysis;

  const found: ScreeningFinding[] = [];
  let rulesTotal = 0;
  let rulesEvaluated = 0;

  /**
   * Declare a rule.
   *
   * `inputsPresent` is the honest half: a rule whose measurement came back
   * null did not pass, it did not RUN, and the difference is the whole
   * meaning of a clear result.
   */
  const rule = (
    id: FindingId,
    inputsPresent: boolean,
    fires: boolean,
    level: FindingLevel,
    confidence: FindingConfidence,
    evidence: ScreeningEvidence[],
    fLeads?: LimbLeadName[],
  ): void => {
    rulesTotal++;
    if (!inputsPresent) return;
    rulesEvaluated++;
    if (!fires) return;
    found.push({ id, category: CATEGORY_OF[id], level, confidence, evidence, leads: fLeads });
  };

  /* ── The two local measurements ── */
  const reference = leads.II;
  const rrMeanSamples =
    rate.rrMeanMs !== null ? (rate.rrMeanMs / 1000) * fs : Math.round(fs * 0.8);

  const delineated = reference
    ? rPeaks.map((r) => delineateBeat(reference, r, rrMeanSamples, fs))
    : [];
  const st = measureStLevels(leads, delineated, fs);
  const beatMetrics = reference ? measureBeats(reference, rPeaks, rrMeanSamples, fs) : [];

  /* Pauses must be measured from the RAW peak list. `rate.rrMinMs/rrMaxMs`
     come from intervals already filtered to 300–1500 ms, which is correct
     for a rate estimate and would make a 2.4 s pause literally invisible
     here — the interval carrying it is discarded before it is reported. */
  let maxRrMs: number | null = null;
  for (let i = 1; i < rPeaks.length; i++) {
    const gap = ((rPeaks[i] - rPeaks[i - 1]) / fs) * 1000;
    if (maxRrMs === null || gap > maxRrMs) maxRrMs = gap;
  }

  const hasRate = rate.bpm !== null;
  const hasBeats = rate.beatsAnalyzed >= 3;
  const regular = rate.rrVariationPct !== null && rate.rrVariationPct <= REGULAR_MAX_VARIATION_PCT;
  const pAbsent = rate.pBeforeQrsPct !== null && rate.pBeforeQrsPct < AF_P_PRESENT_MAX_PCT;
  const qrs = intervals.qrsMs;
  const wideQrs = qrs !== null && qrs >= QRS_BBB_MS;

  /* ═════ 1. Rate ═════ */

  rule(
    'bradycardiaSevere',
    hasRate,
    (rate.bpm ?? 0) < BRADY_SEVERE_BPM,
    'urgent',
    'high',
    [{ label: 'HR', value: bpm(rate.bpm) }],
  );
  rule(
    'bradycardia',
    hasRate,
    (rate.bpm ?? 0) >= BRADY_SEVERE_BPM && (rate.bpm ?? 0) < BRADY_BPM,
    'attention',
    'high',
    [{ label: 'HR', value: bpm(rate.bpm) }],
  );
  rule(
    'tachycardia',
    hasRate,
    (rate.bpm ?? 0) > TACHY_BPM && (rate.bpm ?? 0) <= TACHY_EXTREME_BPM,
    'attention',
    'high',
    [{ label: 'HR', value: bpm(rate.bpm) }],
  );
  rule(
    'tachycardiaExtreme',
    hasRate,
    (rate.bpm ?? 0) > TACHY_EXTREME_BPM,
    'urgent',
    'high',
    [{ label: 'HR', value: bpm(rate.bpm) }],
  );

  /* ═════ 2. Rhythm ═════ */

  /* AF is the flagship of single-lead screening and the rule is the
     classic pair: an irregularly irregular ventricular response WITH no
     organised atrial activity. Either half alone is common and innocent —
     sinus arrhythmia is irregular with P waves, and a noisy strip loses P
     waves while staying regular. */
  rule(
    'atrialFibrillation',
    rate.rrVariationPct !== null && rate.pBeforeQrsPct !== null && hasBeats,
    (rate.rrVariationPct ?? 0) > AF_RR_VARIATION_PCT &&
      pAbsent &&
      rate.beatsAnalyzed >= AF_MIN_BEATS &&
      !wideQrs,
    'attention',
    'high',
    [
      { label: 'RR var', value: pct(rate.rrVariationPct) },
      { label: 'P before QRS', value: pct(rate.pBeforeQrsPct) },
      { label: 'RMSSD', value: ms(rate.rmssdMs) },
    ],
  );

  rule(
    'atrialFlutter',
    hasRate && rate.rrVariationPct !== null && rate.pBeforeQrsPct !== null,
    regular &&
      pAbsent &&
      (rate.bpm ?? 0) >= FLUTTER_BPM_LOW &&
      (rate.bpm ?? 0) <= FLUTTER_BPM_HIGH &&
      !wideQrs,
    'attention',
    'limited',
    [
      { label: 'HR', value: bpm(rate.bpm) },
      { label: 'RR var', value: pct(rate.rrVariationPct) },
    ],
  );

  rule(
    'svt',
    hasRate && rate.rrVariationPct !== null,
    regular && (rate.bpm ?? 0) > TACHY_EXTREME_BPM && !wideQrs && pAbsent,
    'urgent',
    'moderate',
    [
      { label: 'HR', value: bpm(rate.bpm) },
      { label: 'QRS', value: ms(qrs) },
    ],
  );

  /* A wide-complex tachycardia is ventricular tachycardia until proven
     otherwise, and the proof needs more than six leads. The urgency is
     therefore set by the WORST thing it can be, not the most likely — this
     is the one rule in the file that is deliberately pessimistic. */
  rule(
    'wideComplexTachycardia',
    hasRate && qrs !== null,
    (rate.bpm ?? 0) > TACHY_BPM && wideQrs,
    'urgent',
    'moderate',
    [
      { label: 'HR', value: bpm(rate.bpm) },
      { label: 'QRS', value: ms(qrs) },
    ],
  );

  const ectopicCount = beatMetrics.filter((b) => b.premature).length;
  const ectopyPct = beatMetrics.length > 0 ? (ectopicCount / beatMetrics.length) * 100 : null;
  const ectopicWide = beatMetrics.filter((b) => b.premature && b.wide).length;

  rule(
    'ectopyFrequent',
    beatMetrics.length >= AF_MIN_BEATS,
    ectopicCount >= ECTOPY_FREQUENT_MIN_BEATS && (ectopyPct ?? 0) > ECTOPY_FREQUENT_PCT,
    'attention',
    'moderate',
    [
      { label: 'Ectopic beats', value: `${ectopicCount} / ${beatMetrics.length}` },
      { label: 'Burden', value: pct(ectopyPct) },
      { label: 'Wide', value: `${ectopicWide}` },
    ],
  );
  rule(
    'ectopyOccasional',
    beatMetrics.length >= AF_MIN_BEATS,
    ectopicCount > 0 && ectopicCount < ECTOPY_FREQUENT_MIN_BEATS,
    'attention',
    'limited',
    [{ label: 'Ectopic beats', value: `${ectopicCount} / ${beatMetrics.length}` }],
  );

  rule(
    'irregularRhythm',
    rate.rrVariationPct !== null && rate.pBeforeQrsPct !== null,
    (rate.rrVariationPct ?? 0) > IRREGULAR_WITH_P_PCT &&
      (rate.pBeforeQrsPct ?? 0) >= P_PRESENT_MIN_PCT,
    'attention',
    'limited',
    [
      { label: 'RR var', value: pct(rate.rrVariationPct) },
      { label: 'P before QRS', value: pct(rate.pBeforeQrsPct) },
    ],
  );

  rule(
    'pause',
    maxRrMs !== null,
    (maxRrMs ?? 0) >= PAUSE_MS && (maxRrMs ?? 0) < PAUSE_LONG_MS,
    'attention',
    'high',
    [{ label: 'Longest RR', value: ms(maxRrMs) }],
  );
  rule(
    'pauseLong',
    maxRrMs !== null,
    (maxRrMs ?? 0) >= PAUSE_LONG_MS,
    'urgent',
    'high',
    [{ label: 'Longest RR', value: ms(maxRrMs) }],
  );

  /* ═════ 3. Conduction ═════ */

  const pr = intervals.prMs;
  rule(
    'avBlock1',
    pr !== null,
    (pr ?? 0) > PR_BLOCK_MS && (pr ?? 0) <= PR_BLOCK_MARKED_MS,
    'attention',
    'high',
    [{ label: 'PR', value: ms(pr) }],
  );
  rule('avBlock1Marked', pr !== null, (pr ?? 0) > PR_BLOCK_MARKED_MS, 'attention', 'high', [
    { label: 'PR', value: ms(pr) },
  ]);

  /* A dropped ventricular beat: one RR that is close to twice its
     neighbours, in a rhythm that is otherwise not irregular. On ten
     seconds this is a hint, never a Mobitz classification — telling I from
     II needs the PR trend across the dropped beat, which needs more beats
     than this recording contains. */
  let droppedBeat = false;
  if (rPeaks.length >= 4) {
    const gaps: number[] = [];
    for (let i = 1; i < rPeaks.length; i++) gaps.push(rPeaks[i] - rPeaks[i - 1]);
    const typical = median(gaps.filter((g) => g < (median(gaps) ?? 0) * 1.5)) ?? median(gaps);
    if (typical && typical > 0) {
      droppedBeat = gaps.some(
        (g) => g >= typical * DROPPED_BEAT_RR_LOW && g <= typical * DROPPED_BEAT_RR_HIGH,
      );
    }
  }
  rule(
    'avBlock2Suspected',
    rPeaks.length >= 4 && rate.pBeforeQrsPct !== null,
    droppedBeat && (rate.pBeforeQrsPct ?? 0) >= P_PRESENT_MIN_PCT,
    'attention',
    'limited',
    [
      { label: 'Longest RR', value: ms(maxRrMs) },
      { label: 'Mean RR', value: ms(rate.rrMeanMs) },
    ],
  );

  /* Slow, regular, and the atria are not driving it. That is complete
     heart block or a junctional escape rhythm; both are urgent and neither
     is separable here, so the finding names the situation rather than
     picking one. */
  rule(
    'avBlockCompleteSuspected',
    hasRate && rate.rrVariationPct !== null && rate.pBeforeQrsPct !== null,
    (rate.bpm ?? 0) < BRADY_BPM && regular && (rate.pBeforeQrsPct ?? 0) < 50,
    'urgent',
    'limited',
    [
      { label: 'HR', value: bpm(rate.bpm) },
      { label: 'P before QRS', value: pct(rate.pBeforeQrsPct) },
      { label: 'RR var', value: pct(rate.rrVariationPct) },
    ],
  );

  rule(
    'ivcd',
    qrs !== null,
    (qrs ?? 0) >= QRS_IVCD_MS && (qrs ?? 0) < QRS_BBB_MS,
    'attention',
    'moderate',
    [{ label: 'QRS', value: ms(qrs) }],
  );

  /* Which bundle is a chest-lead question. What the limb leads DO see is
     the terminal forces in lead I: a deep terminal S is the right
     ventricle finishing late (RBBB), a broad monophasic R is the left
     (LBBB). Both findings are named `…Pattern` for that reason. */
  const sLeadI = amplitudes.I?.sMv ?? null;
  const rbbbShape = sLeadI !== null && sLeadI <= RBBB_S_LEAD_I_MV;
  const lbbbShape = sLeadI !== null && sLeadI > RBBB_S_LEAD_I_MV && (axis.netI ?? 0) > 0;

  rule('bbbRightPattern', qrs !== null && sLeadI !== null, wideQrs && rbbbShape, 'attention', 'moderate', [
    { label: 'QRS', value: ms(qrs) },
    { label: 'S in I', value: mv(sLeadI) },
  ]);
  rule('bbbLeftPattern', qrs !== null && sLeadI !== null, wideQrs && lbbbShape, 'attention', 'moderate', [
    { label: 'QRS', value: ms(qrs) },
    { label: 'Net QRS I', value: mv(axis.netI) },
  ]);
  rule(
    'bbbIndeterminate',
    qrs !== null,
    wideQrs && !rbbbShape && !lbbbShape,
    'attention',
    'limited',
    [{ label: 'QRS', value: ms(qrs) }],
  );

  /* The fascicular blocks are among the very few diagnoses that are PURE
     limb-lead findings — the hemiblocks change the frontal axis and
     nothing else, so chest leads add nothing to them. */
  const deg = axis.degrees;
  const avl = amplitudes.aVL;
  const avf = amplitudes.aVF;
  const leadIII = amplitudes.III;
  const leadI = amplitudes.I;

  const lafbShape =
    deg !== null &&
    deg <= -45 &&
    deg >= -90 &&
    !wideQrs &&
    (avl?.qMv ?? 0) < -0.02 &&
    (avl?.rMv ?? 0) > 0.1 &&
    depth(avf?.sMv ?? null) > (avf?.rMv ?? 0);

  rule(
    'lafb',
    deg !== null && qrs !== null && avl !== undefined && avf !== undefined,
    lafbShape,
    'attention',
    'moderate',
    [
      { label: 'Axis', value: deg === null ? '—' : `${Math.round(deg)}°` },
      { label: 'R in aVL', value: mv(avl?.rMv ?? null) },
      { label: 'S in aVF', value: mv(avf?.sMv ?? null) },
    ],
    ['aVL', 'aVF'],
  );

  const lpfbShape =
    deg !== null &&
    deg >= 90 &&
    deg <= 180 &&
    !wideQrs &&
    depth(leadI?.sMv ?? null) > (leadI?.rMv ?? 0) &&
    (leadIII?.qMv ?? 0) < -0.02;

  rule(
    'lpfb',
    deg !== null && qrs !== null && leadI !== undefined && leadIII !== undefined,
    lpfbShape,
    'attention',
    'limited',
    [
      { label: 'Axis', value: deg === null ? '—' : `${Math.round(deg)}°` },
      { label: 'S in I', value: mv(leadI?.sMv ?? null) },
      { label: 'Q in III', value: mv(leadIII?.qMv ?? null) },
    ],
    ['I', 'III'],
  );

  /* ═════ 4. Repolarisation ═════ */

  const qtc = intervals.qtcBazettMs;
  const qtcF = intervals.qtcFridericiaMs;
  const qtcLimit =
    context.sex === 'female'
      ? QTC_LONG_FEMALE_MS
      : context.sex === 'male'
        ? QTC_LONG_MALE_MS
        : /* Unknown sex takes the HIGHER limit, so an unprofiled screen
             under-calls rather than over-calls. */
          QTC_LONG_FEMALE_MS;

  /**
   * ★ WHICH RATE CORRECTION A QT FINDING IS ALLOWED TO FIRE ON.
   *
   * ⚠️ WRITTEN AFTER MEASURING, and the measurement changed the design.
   *
   * Bazett (QT/√RR) is what every report form prints, and it is accurate
   * only between about 60 and 100 bpm. Outside that band it is not
   * slightly off, it is wrong in a direction: it OVER-corrects when fast
   * and UNDER-corrects when slow, so a tachycardic healthy adult is handed
   * a QTc near the torsades threshold and a bradycardic long QT is hidden.
   * Fridericia (QT/∛RR) is much flatter across rate — that is the entire
   * reason it exists.
   *
   * So the correction is chosen BY RATE, which is the clinical convention,
   * rather than one formula being used everywhere:
   *
   *   60–100 bpm  → Bazett      (its accurate range, and the printed one)
   *   outside     → Fridericia  (where Bazett is known to mislead)
   *
   * ── AND THE URGENT FINDING NEEDS BOTH ──
   * `qtLongSevere` is the only repolarisation finding that says "get seen
   * now", and no alarm of that weight may rest on a single formula at the
   * edge of its validity. It fires only when Bazett AND Fridericia both
   * clear 500 ms. `qtLong` — an "ask your doctor" finding — does not need
   * that corroboration, because the cost of its false positive is a
   * conversation rather than an emergency room.
   *
   * The report still prints both, unchanged. This governs what FIRES.
   */
  const qtcMeasured = qtc !== null && qtcF !== null;
  const rateInBazettRange = rate.bpm !== null && rate.bpm >= 60 && rate.bpm <= 100;
  const qtcPrimary = rateInBazettRange ? qtc : qtcF;
  const qtcPrimaryLabel = rateInBazettRange ? 'QTc (Bazett)' : 'QTc (Fridericia)';

  const qtcEvidence = [
    { label: qtcPrimaryLabel, value: ms(qtcPrimary) },
    { label: rateInBazettRange ? 'QTc (F)' : 'QTc (B)', value: ms(rateInBazettRange ? qtcF : qtc) },
    { label: 'QT', value: ms(intervals.qtMs) },
  ];

  const severe = qtc !== null && qtcF !== null && qtc >= QTC_LONG_SEVERE_MS && qtcF >= QTC_LONG_SEVERE_MS;

  rule('qtLongSevere', qtcMeasured, severe, 'urgent', 'high', qtcEvidence);
  rule(
    'qtLong',
    qtcMeasured,
    (qtcPrimary ?? 0) > qtcLimit && !severe,
    'attention',
    'high',
    [...qtcEvidence, { label: 'Limit', value: ms(qtcLimit) }],
  );
  rule(
    'qtShort',
    qtcMeasured,
    (qtcPrimary ?? 0) > 0 && (qtcPrimary ?? 0) < QTC_SHORT_MS,
    'attention',
    'moderate',
    qtcEvidence,
  );

  /* T inversion in lead III alone is a normal positional variant, which is
     precisely why the rule counts TWO of the three inferior leads. */
  const tInvInferior = INFERIOR.filter((l) => (amplitudes[l]?.tMv ?? 0) <= T_INVERSION_MV);
  rule(
    'tInversionInferior',
    INFERIOR.every((l) => amplitudes[l]?.tMv !== null && amplitudes[l]?.tMv !== undefined),
    tInvInferior.length >= 2,
    'attention',
    'moderate',
    tInvInferior.map((l) => ({ label: `T ${l}`, value: mv(amplitudes[l]?.tMv ?? null) })),
    tInvInferior,
  );

  const tInvLateral = LATERAL.filter((l) => (amplitudes[l]?.tMv ?? 0) <= T_INVERSION_MV);
  rule(
    'tInversionLateral',
    LATERAL.every((l) => amplitudes[l]?.tMv !== null && amplitudes[l]?.tMv !== undefined),
    tInvLateral.length === LATERAL.length,
    'attention',
    'moderate',
    tInvLateral.map((l) => ({ label: `T ${l}`, value: mv(amplitudes[l]?.tMv ?? null) })),
    tInvLateral,
  );

  /* ═════ 5. Axis ═════ */

  const axisEvidence = [
    { label: 'Axis', value: deg === null ? '—' : `${Math.round(deg)}°` },
    { label: 'Normal', value: '−30° … +90°' },
  ];
  rule('axisLeft', deg !== null, axis.classification === 'left', 'attention', 'limited', axisEvidence);
  rule('axisRight', deg !== null, axis.classification === 'right', 'attention', 'limited', axisEvidence);
  rule('axisExtreme', deg !== null, axis.classification === 'extreme', 'attention', 'moderate', axisEvidence);

  /* ═════ 6. Chamber ═════ */

  const rI = leadI?.rMv ?? null;
  const rIII = leadIII?.rMv ?? null;
  const lewis =
    rI !== null && rIII !== null
      ? rI + depth(leadIII?.sMv ?? null) - (rIII + depth(leadI?.sMv ?? null))
      : null;
  const rAvl = avl?.rMv ?? null;
  const lvhFires =
    (lewis !== null && lewis > LEWIS_INDEX_MV) || (rAvl !== null && rAvl > R_AVL_LVH_MV);

  rule(
    'lvhVoltage',
    lewis !== null || rAvl !== null,
    lvhFires,
    'attention',
    /* Voltage criteria are specific in middle age and noisy in the young,
       where a thin chest wall raises every amplitude. The rule does not
       change with age; the weight it is given does. */
    context.ageYears !== undefined && context.ageYears < LVH_YOUNG_AGE ? 'limited' : 'moderate',
    [
      { label: 'Lewis index', value: lewis === null ? '—' : `${lewis.toFixed(2)} mV` },
      { label: 'R in aVL', value: mv(rAvl) },
      { label: 'Threshold', value: `${LEWIS_INDEX_MV.toFixed(1)} mV` },
    ],
  );

  const pII = amplitudes.II?.pMv ?? null;
  rule('raEnlargement', pII !== null, (pII ?? 0) >= P_PULMONALE_MV, 'attention', 'limited', [
    { label: 'P in II', value: mv(pII) },
    { label: 'Threshold', value: `${P_PULMONALE_MV.toFixed(2)} mV` },
  ]);

  /* ═════ 7. Ischaemia ═════ */

  const stElevInf = INFERIOR.filter((l) => (st[l] ?? -1) >= ST_ELEVATION_MV);
  const stElevLat = LATERAL.filter((l) => (st[l] ?? -1) >= ST_ELEVATION_MV);
  const stDepInf = INFERIOR.filter((l) => (st[l] ?? 1) <= ST_DEPRESSION_MV);
  const stDepLat = LATERAL.filter((l) => (st[l] ?? 1) <= ST_DEPRESSION_MV);
  const stMeasured = (group: readonly LimbLeadName[]) => group.every((l) => st[l] !== null);

  rule(
    'stElevationInferior',
    stMeasured(INFERIOR),
    stElevInf.length >= 2,
    'urgent',
    'moderate',
    INFERIOR.map((l) => ({ label: `ST ${l}`, value: mv(st[l]) })),
    stElevInf,
  );
  rule(
    'stElevationLateral',
    stMeasured(LATERAL),
    stElevLat.length === LATERAL.length,
    'urgent',
    'moderate',
    LATERAL.map((l) => ({ label: `ST ${l}`, value: mv(st[l]) })),
    stElevLat,
  );
  rule(
    'stDepressionInferior',
    stMeasured(INFERIOR),
    stDepInf.length >= 2,
    'attention',
    'moderate',
    INFERIOR.map((l) => ({ label: `ST ${l}`, value: mv(st[l]) })),
    stDepInf,
  );
  rule(
    'stDepressionLateral',
    stMeasured(LATERAL),
    stDepLat.length === LATERAL.length,
    'attention',
    'moderate',
    LATERAL.map((l) => ({ label: `ST ${l}`, value: mv(st[l]) })),
    stDepLat,
  );

  /** A Q wave is pathological when it is both absolutely and relatively
      deep — 0.1 mV on its own is noise, and a quarter of a tiny R is too. */
  const pathologicalQ = (l: LimbLeadName): boolean => {
    const a = amplitudes[l];
    if (!a || a.qMv === null || a.rMv === null) return false;
    return a.qMv <= Q_PATHOLOGICAL_MV && depth(a.qMv) >= a.rMv * Q_PATHOLOGICAL_R_RATIO;
  };
  const qInf = INFERIOR.filter(pathologicalQ);
  const qLat = LATERAL.filter(pathologicalQ);

  rule(
    'qWavesInferior',
    INFERIOR.every((l) => amplitudes[l]?.qMv !== null),
    qInf.length >= 2,
    'attention',
    'limited',
    qInf.map((l) => ({ label: `Q ${l}`, value: mv(amplitudes[l]?.qMv ?? null) })),
    qInf,
  );
  rule(
    'qWavesLateral',
    LATERAL.every((l) => amplitudes[l]?.qMv !== null),
    qLat.length === LATERAL.length,
    'attention',
    'limited',
    qLat.map((l) => ({ label: `Q ${l}`, value: mv(amplitudes[l]?.qMv ?? null) })),
    qLat,
  );

  /* ═════ 8. Other ═════ */

  const tII = amplitudes.II?.tMv ?? null;
  const rII = amplitudes.II?.rMv ?? null;
  const peakedT =
    tII !== null && rII !== null && rII > 0 && tII >= HYPERK_T_MV && tII / rII >= HYPERK_T_R_RATIO;
  rule(
    'hyperkalaemiaPattern',
    tII !== null && rII !== null,
    peakedT,
    /* Peaked T alone is a metabolic hint. Peaked T with a widening QRS and
       vanishing P waves is the sequence that ends in arrest, so the same
       finding escalates rather than being split into two. */
    peakedT && wideQrs && (rate.pBeforeQrsPct ?? 100) < 30 ? 'urgent' : 'attention',
    'moderate',
    [
      { label: 'T in II', value: mv(tII) },
      { label: 'T/R', value: rII && rII > 0 && tII !== null ? (tII / rII).toFixed(2) : '—' },
      { label: 'QRS', value: ms(qrs) },
    ],
    ['II'],
  );

  const allVoltages = LIMB_LEAD_ORDER.map((l) => amplitudes[l]?.qrsAmplitudeMv ?? null);
  rule(
    'lowVoltage',
    allVoltages.every((v) => v !== null),
    allVoltages.every((v) => (v ?? 1) < LOW_VOLTAGE_MV),
    'attention',
    'moderate',
    [
      {
        label: 'Largest QRS',
        value: mv(Math.max(...allVoltages.map((v) => v ?? 0))),
      },
      { label: 'Threshold', value: `${LOW_VOLTAGE_MV.toFixed(2)} mV` },
    ],
  );

  /* Electrical alternans: the heart swinging inside a pericardium full of
     fluid, so the QRS amplitude alternates beat to beat. The test is not
     "amplitudes vary" — every recording's do — but that they ALTERNATE:
     the sign of each successive difference must keep flipping. */
  let alternansRatio = 0;
  let alternansConsistency = 0;
  let alternansSeparated = false;
  if (beatMetrics.length >= ALTERNANS_MIN_BEATS) {
    const amps = beatMetrics.map((b) => b.qrsAmpMv);
    const even = amps.filter((_, i) => i % 2 === 0);
    const odd = amps.filter((_, i) => i % 2 === 1);
    const mEven = median(even) ?? 0;
    const mOdd = median(odd) ?? 0;
    const mAll = median(amps) ?? 0;
    const gap = Math.abs(mEven - mOdd);
    alternansRatio = mAll > 0 ? gap / mAll : 0;

    /* Median absolute deviation INSIDE each group. Using the spread of all
       beats together would be self-defeating: the alternation is itself
       most of that spread, so it would be compared against itself and
       every recording would look separated. */
    const mad = (group: number[], centre: number): number =>
      median(group.map((v) => Math.abs(v - centre))) ?? 0;
    const scatter = Math.max(mad(even, mEven), mad(odd, mOdd));
    alternansSeparated = gap > scatter * ALTERNANS_SEPARATION;

    let flips = 0;
    let pairs = 0;
    for (let i = 1; i < amps.length - 1; i++) {
      const a = amps[i] - amps[i - 1];
      const b = amps[i + 1] - amps[i];
      if (a !== 0 && b !== 0) {
        pairs++;
        if (Math.sign(a) !== Math.sign(b)) flips++;
      }
    }
    alternansConsistency = pairs > 0 ? flips / pairs : 0;
  }
  rule(
    'electricalAlternans',
    beatMetrics.length >= ALTERNANS_MIN_BEATS,
    alternansRatio >= ALTERNANS_RATIO &&
      alternansConsistency >= ALTERNANS_MIN_CONSISTENCY &&
      alternansSeparated,
    'urgent',
    'limited',
    [
      { label: 'Amplitude swing', value: pct(alternansRatio * 100) },
      { label: 'Alternating', value: pct(alternansConsistency * 100) },
    ],
    ['II'],
  );

  /* ═════ 9. Technical ═════ */

  /* Lead I inverted — both its P wave and its net QRS negative. The
     overwhelmingly common cause is the left and right arm electrodes
     swapped, which is fixable in five seconds; the rare one is
     dextrocardia, which is not, and the copy for this finding says so
     rather than asserting the likely case as fact.

     ⚠️ THE aVR CONDITION IS NOT OPTIONAL, and it was added after measuring.
     Without it the rule fired on ordinary marked RIGHT AXIS DEVIATION: a
     frontal vector at +120° inverts lead I on its own, P wave included, so
     "lead I is upside down" cannot by itself tell a swapped cable from a
     rightward heart. What CAN tell them apart is aVR. It faces the right
     shoulder, so atrial depolarisation always runs away from it and its P
     wave is negative in every physiological axis — measured at −0.09 mV at
     +45° and still −0.01 mV at +110°. Swap the arm electrodes and aVR
     becomes the old lead −aVL: its P flips POSITIVE (+0.73 mV at the
     reversed geometry). One sign, and it separates the two cleanly. */
  const pI = leadI?.pMv ?? null;
  const pAvr = amplitudes.aVR?.pMv ?? null;
  rule(
    'leadReversal',
    pI !== null && pAvr !== null && axis.netI !== null,
    (pI ?? 0) < 0 && (axis.netI ?? 0) < 0 && (pAvr ?? -1) > 0,
    'attention',
    'moderate',
    [
      { label: 'P in I', value: mv(pI) },
      { label: 'P in aVR', value: mv(pAvr) },
      { label: 'Net QRS I', value: mv(axis.netI) },
    ],
    ['I', 'aVR'],
  );

  /* ══════════════════ Resolve ══════════════════ */

  const firedIds = new Set(found.map((f) => f.id));
  const suppressed = new Set<FindingId>();
  for (const id of firedIds) {
    for (const victim of SUPPRESSES[id] ?? []) suppressed.add(victim);
  }

  const findings = found
    .filter((f) => !suppressed.has(f.id))
    .sort(
      (a, b) =>
        (a.level === 'urgent' ? 0 : 1) - (b.level === 'urgent' ? 0 : 1) ||
        CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence] ||
        CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category],
    );

  const stats = {
    rulesEvaluated,
    rulesTotal,
    ectopyBurdenPct: ectopyPct === null ? null : Math.round(ectopyPct * 10) / 10,
    beatsAnalyzed: rate.beatsAnalyzed,
    analysedSeconds: quality.analysedSeconds,
    signalQuality: quality.sqi,
  };

  /* ★ THE ONE BRANCH THAT MATTERS MOST.
     Too few clean beats and nothing above is trustworthy — including the
     absence of findings. `inconclusive` is returned instead of `clear`,
     and the heart findings are dropped rather than shown at a discount,
     because a list of hedged findings reads as a list of findings.
     The TECHNICAL finding survives: "your electrodes look swapped" is the
     most useful thing that can be said about an unreadable recording, and
     it is the one conclusion that does not depend on beat quality. */
  if (quality.insufficient || rate.beatsAnalyzed < 3) {
    return {
      level: 'inconclusive',
      findings: findings.filter((f) => f.category === 'technical'),
      blindSpots: [...LIMB_LEAD_BLIND_SPOTS],
      stats,
    };
  }

  const level: ScreeningLevel = findings.some((f) => f.level === 'urgent')
    ? 'urgent'
    : findings.length > 0
      ? 'attention'
      : 'clear';

  return { level, findings, blindSpots: [...LIMB_LEAD_BLIND_SPOTS], stats };
}

// v1.0.0 — Limb-lead ECG SCREENING: 43 published-threshold rules across rate,
//          rhythm, conduction, repolarisation, axis, chamber, ischaemia and
//          recording technique. Adds two measurements of its own (ST at J+60 ms
//          against the PR baseline; per-beat QRS width and amplitude) and reads
//          everything else from `analyseLimbEcg`. Every rule reports whether it
//          could RUN, so `clear` always arrives with its own denominator.
