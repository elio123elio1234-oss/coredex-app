/* ==================================================================
   ecgIdentity — build ONE person's cardiac signature from their studies,
   then score every study against it.

   ══ THE IDEA ══
   Face ID does not store a photograph; it stores what is stable about a
   face across many looks at it, and then measures new looks against that.
   This does the same with a heart. Each recording contributes its
   representative beat (`beatTemplate.ts`); this file fuses them into a
   baseline and reports, per study, how far it sat from it.

   The clinical value is the part a textbook range cannot give: a QRS of
   104 ms is unremarkable for a population and may be a 16 ms change for
   THIS person. Serial comparison against a patient's own prior ECG is
   how that is caught by hand today — the reader pulls the old traces and
   lays them on top. All this does is make it happen every time, and keep
   the arithmetic visible afterwards.

   ══ ★ TWO BASELINES, BECAUSE THE BRIEF CONTAINS A CONTRADICTION ★ ══
   "The first studies should define the person" and "the baseline must
   follow their heart's slow changes" are both correct and cannot both be
   true of one number. Weight the past and the reference can never learn;
   weight the present and there is nothing left to deviate from.

   So there are two, and the split is the design:

     ANCHOR   the enrollment cohort, no time decay at all. Later studies
              contribute a small tail so it keeps refining, but the first
              `ENROLLMENT_TARGET` studies own it. "The heart as we met it."

     TRACKER  time-decayed toward now (`TRACKER_HALF_LIFE_DAYS`). This is
              `leads` — the ECG ID the screen draws and what a new study
              is scored against. "The heart as it is."

     DRIFT    the distance between them, as a per-year RATE. A trend,
              never an alert.

   That is Phase I / Phase II from statistical process control, and it is
   what makes an ALERT and a TREND separable events. A single baseline
   reports a slowly-drifting patient as permanently deviant on every study
   forever, which is both wrong and unactionable.

   ══ SIX DECISIONS THAT MAKE IT TRUSTWORTHY ══

   1. NOT EVERY STUDY MAY DEFINE YOU. Simulator output, low-SQI strips and
      recordings with too few clean beats are barred, each with a stated
      reason. A baseline quietly built from a bad strip is worse than no
      baseline: it moves the reference, so the GOOD studies then score as
      deviant and the real change hides in the noise.

   2. WHERE THE PADS WERE IS NOT WHAT THE HEART DID. Before any study is
      judged for agreement, the linear (I, II) channel remap that
      electrode displacement produces is fitted out (`leadCalibration.ts`).
      Skipping this was a real, measured defect: pads a couple of
      centimetres off change the three DERIVED leads' shapes while the two
      measured leads stay perfect, and the identity was deleting those
      studies as outliers. The remap's clinical content — axis, amplitude
      — is still measured and reported independently. It is removed from
      the WEIGHTING and never from the REPORTING.

   3. DISAGREEMENT IS DOWN-WEIGHTED SMOOTHLY, AND NO STUDY MAY DOMINATE.
      Agreement scaling is a Tukey biweight on a robust z-score against
      the cohort's OWN spread, and every weight is then capped at
      `WEIGHT_CAP` of the total. Both replace a hard linear ramp off a
      fixed constant, and the reason is measured, not aesthetic — see the
      failure note at the foot of this file. `nEff` reports what is left.

   4. A STUDY IS SCORED AGAINST ITS TEMPORAL NEIGHBOURS, NEVER ITSELF.
      Each match uses a LOCAL leave-one-out baseline: every OTHER study,
      weighted by how close in time it is. Leaving the study out is what
      stops a system like this fooling itself — with few studies each one
      drags the mean toward itself and then reports an excellent match
      with its own reflection. Making it LOCAL is what stops slow drift
      retroactively condemning old studies: a recording from two years ago
      is compared with the heart of two years ago, which is the only
      comparison that was ever meaningful.

   5. THE CORRIDOR IS MEASURED, NOT CHOSEN. How far a trace may move
      before it counts as moved comes from this person's own repeatability
      — the spread between their studies plus the spread within them —
      never from a constant somebody picked.

   6. ONE STUDY IS NEVER AN ALERT. A threshold crossing on a single study
      is `watch`; the same kind of difference on two consecutive studies
      is `marked`. See `IdentityAlert` for the arithmetic — it turns a
      per-study false-positive rate into its square at a cost of at most
      one measurement's delay.

   ══ ⚠️ NO INTERPRETATION. NONE. ⚠️ ══
   Every output is a distance from a baseline, carrying the value, the
   baseline and the difference so a clinician can check it. There is no
   "abnormal", no finding, no advice. Adding one would change what this
   product legally is (`ecgAnalysis.ts` header — same rule, same reason).

   ══ LEAD SETS ══
   Nothing here counts to six. Leads are looked up by name from whatever
   each study carried, so the day a study arrives with V1–V6 the identity
   simply gains six more leads, each with its own coverage count. Limb-only
   studies keep contributing to the limb leads and are not penalised for
   the leads they never had.

   ══ WHERE THE POPULATION PRIOR WILL GO ══
   A population mean, when there is one, enters as a prior with a small
   pseudo-weight `w₀` inside `accumulate` — a phantom study of about two
   studies' worth. It shrinks the baseline toward the population while N
   is tiny (which is exactly the case the enrollment cohort cannot defend
   itself against: a first recording taken during ischaemia) and vanishes
   on its own as real studies arrive. Nothing else in this file changes,
   which is the reason the accumulator is written as sums rather than as a
   running mean.
   ================================================================== */

import { correlate, TEMPLATE_FS, TEMPLATE_PRE_SAMPLES, TEMPLATE_SAMPLES } from './beatTemplate';
import {
  applyChannelTransform,
  fitChannelTransform,
  IDENTITY_TRANSFORM,
  type ChannelTransform,
} from './leadCalibration';
import { TWELVE_LEAD_ORDER, type EcgLeadName } from '../types/ecg';
import type {
  BeatTemplate,
  EcgIdentity,
  ExclusionReason,
  IdentityAlert,
  IdentityDeviation,
  IdentityDrift,
  IdentityLead,
  IdentityMatch,
  IdentityMaturity,
  LeadCoverage,
  RecordingTemplate,
} from '../types/ecgIdentity';

/* ══════════════════ Tunables, named and justified ══════════════════ */

/**
 * Studies that own the enrollment anchor, and the target `maturity` and
 * `confidence` are measured against.
 *
 * Ten, not five. Five was chosen when the weighting was gentler; with the
 * anchor now genuinely frozen against later studies it has to be built
 * from enough recordings that one bad session cannot define a person, and
 * five is not enough for that when the tail weight is small.
 */
export const ENROLLMENT_TARGET = 10;

/**
 * What a study contributes to the ANCHOR once enrollment is over.
 *
 * Not zero. Zero would freeze the anchor permanently at ten recordings,
 * which throws away every later confirmation of what the person's beat
 * looks like — and would make the anchor MORE fragile over time, not
 * less, since nothing could ever dilute an enrollment study that turned
 * out to be poor. A tenth each means twenty later studies eventually
 * carry about as much as the cohort, but slowly enough that the anchor is
 * still recognisably "the heart as we met it".
 */
const ANCHOR_TAIL = 0.1;

/**
 * ★ How fast the TRACKER forgets. A study this many days old carries half
 * the weight of one taken today.
 *
 * Six months is chosen to sit between the two things it has to balance:
 * long enough that a fortnight of unusually noisy sessions cannot capture
 * the baseline, short enough that a year-old heart is not still the
 * reference a reading today is judged against. It is the one constant
 * here that is a genuine judgement call rather than a measurement, and it
 * is the first thing to revisit against real longitudinal data.
 */
export const TRACKER_HALF_LIFE_DAYS = 180;

/**
 * How local the leave-one-out scoring baseline is, in days.
 *
 * Wider than the tracker's half-life on purpose. The tracker answers
 * "what is normal NOW", where recency is the point; scoring answers "was
 * this study normal for its own time", and it needs enough neighbours on
 * both sides to have a baseline at all. Too narrow and a study taken
 * during a three-month gap is scored against almost nothing, which shows
 * up as a wild score for a perfectly ordinary recording.
 */
const SCORING_HALF_LIFE_DAYS = 365;

/** A study below this rhythm-steadiness index may not shape the baseline. */
const MIN_SQI = 50;
/** Nor may one built from fewer clean beats than this. */
const MIN_BEATS = 3;
/** Beats beyond this add no further confidence to a study's weight. */
const BEATS_FOR_FULL_WEIGHT = 8;

/**
 * ★ NO STUDY MAY CARRY MORE THAN THIS SHARE OF THE TOTAL WEIGHT.
 *
 * The single most important line in this file, and the direct fix for the
 * defect that prompted the rewrite. The trigger was a screenshot of a
 * real 24-study history in which one study dominated; the arithmetic
 * below was then reproduced by running the OLD weight formula over a
 * correlation distribution consistent with it (a tight clique plus a
 * scattered majority) — one study held 54 % of the total, nineteen were
 * struck as outliers, `nEff` came out 2.5. That figure is therefore a
 * MODEL of the failure, not a measurement of that patient's data; what
 * was measured directly, on synthetic vectorcardiogram cohorts, is that
 * the old formula loses effective studies faster than this one at every
 * level of electrode-placement variability, and collapses where the real
 * history appears to sit.
 *
 * The cap is applied by redistribution, so it is a statement about
 * STRUCTURE rather than about any particular study: whatever the
 * agreement maths concludes, an identity is not permitted to rest on one
 * recording. `2 / n` keeps it meaningful while a history is small (with
 * three studies no one may exceed two-thirds) and the floor keeps it from
 * becoming absurd (with two studies a 50 % share is unavoidable).
 */
const weightCap = (n: number): number => Math.max(1 / 3, Math.min(1, 2 / Math.max(1, n)));

/** Redistribution passes. Two is enough in practice; five is free insurance. */
const CAP_PASSES = 5;

/**
 * Tukey's biweight tuning constant, in robust-σ units.
 *
 * The standard value. A study 1 σ below the cohort median keeps 94 % of
 * its weight, 3 σ keeps 56 %, and 6 σ — genuinely a different beat —
 * keeps none. What matters is the SHAPE: smooth, bounded, and derived
 * from the cohort's own spread, where the constant it replaced was a
 * linear ramp from a fixed 0.80 that turned a 0.05 difference in
 * correlation into a 10× difference in weight.
 */
const BIWEIGHT_C = 6;

/**
 * The robust σ used to scale that z-score may not fall below this.
 *
 * Without a floor, a cohort that agrees to within 0.002 makes σ ≈ 0.002
 * and then a study at 0.985 against a median of 0.995 sits 5 σ out and is
 * nearly deleted — for a difference no cardiologist would look at twice.
 * Robustness must not turn into hair-triggering when the data is good.
 */
const MIN_AGREEMENT_SIGMA = 0.02;

/**
 * Correlation below which a study gets no weight whatever the cohort's
 * spread says. This is not an outlier test — it is "that is not the same
 * beat", which happens with reversed electrodes or a dead channel.
 */
const ABSOLUTE_AGREEMENT_FLOOR = 0.5;

/**
 * ★ Below this many eligible studies, the agreement pass DOES NOT RUN.
 *
 * Calling a study an outlier is a statement that it disagrees with a
 * majority, and two studies have no majority. Running the test anyway
 * makes the answer arbitrary: with one good study and one bad one there
 * is no information in the data saying which is which, so whichever the
 * arithmetic happens to favour would be crowned and the other struck —
 * a confident answer to an unanswerable question. Under three studies the
 * identity therefore keeps both, calls nothing an outlier, and reports the
 * low confidence that is the truth of the situation.
 */
const MIN_FOR_CONSENSUS = 3;

/**
 * ★ The similarity score is stretched from this floor, not from zero, and
 * `SIMILARITY_AXIS_FLOOR` below is where any chart of it must start.
 *
 * Two recordings of one healthy heart correlate at 0.95–0.999, so a raw
 * correlation printed as a percentage would read 98 % for everything and
 * discriminate nothing. Anchoring the scale makes the last two decimal
 * places — which is where the signal actually lives — visible.
 *
 * ⚠️ THESE TWO CONSTANTS MUST TRAVEL TOGETHER, AND ONCE DID NOT. The
 * floor was 0.90 while the timeline chart drew a 80–100 axis it had
 * chosen for itself. The consequence was not subtle: the entire visible
 * range of that chart was r ∈ [0.971, 1.000], so a study at r = 0.96 —
 * an excellent match — was drawn as the identical 6 px stub as one at
 * 0.80, and a whole history rendered as one tall bar in a row of dashes.
 * The chart looked like a weighting bug. It was two constants in two
 * files that had to agree and nobody owned. They live here now.
 */
export const SIMILARITY_FLOOR = 0.8;
/** The axis floor a similarity chart MUST use. Derived, not chosen: with a
 *  clean corridor this is r ≈ 0.886, so the drawn range is the range where
 *  serial ECGs of one person actually vary. */
export const SIMILARITY_AXIS_FLOOR = 60;

/** Nothing measured on this hardware is repeatable below ~20 µV. */
const MIN_TOLERANCE_MV = 0.02;

/** How many σ wide the corridor drawn in the UI is. */
export const CORRIDOR_BAND_SIGMA = 2;
/** …and how far outside it a sample must be to count as an excursion. */
const CORRIDOR_Z = 3;
/** An excursion must last this long to be reported (one noisy sample is noise). */
const CORRIDOR_WATCH_MS = 20;
const CORRIDOR_MARKED_MS = 40;

/* ── Deviation thresholds: [watch, marked] ───────────────────────
   These are NOT one number applied to three intervals, because the three
   are not measured with the same confidence. The threshold on each is set
   by how firmly its landmarks can be found (`ecgAnalysis.ts` §2):

     QRS  onset and offset come from a SLOPE collapse — the firmest
          landmarks in the whole delineation, so a 10 ms shift is real.
     QTc  needs T-end, found by extrapolating the steepest downslope to
          baseline. Sound, but softer than a slope threshold.
     PR   needs P ONSET, the faintest landmark on the trace: a low,
          rounded wave whose start is where it lifts off a noisy
          baseline. A 25 ms threshold here fired on delineation jitter in
          ordinary consecutive studies — and a panel that cries "your PR
          changed" every other week teaches the reader to ignore it,
          which costs more than the one real finding it might catch.

   Set them equal and the least reliable measurement generates most of
   the alerts, which is exactly backwards. */
const QRS_MS: [number, number] = [10, 20];
const QTC_MS: [number, number] = [30, 50];
const PR_MS: [number, number] = [35, 55];
const AXIS_DEG: [number, number] = [20, 30];
const AMPLITUDE_RATIO: [number, number] = [0.2, 0.35];

/* ── Two guards on the amplitude ratio, both learned from real output ──
   Lead III and aVL are derived and often small: a baseline QRS of 0.2 mV
   makes a 0.07 mV wobble a 35 % change, so the RATIO alone fired `marked`
   on ordinary session-to-session variation in the derived leads while the
   measured leads sat silent. Two independent floors stop it:

     • the lead must be big enough for a ratio to describe anything;
     • the change must clear the lead's OWN measured repeatability —
       the same corridor the rest of this file is built on, rather than a
       second constant invented for amplitude. */
const MIN_AMPLITUDE_BASELINE_MV = 0.3;
const AMPLITUDE_NOISE_SIGMA = 3;
/** Per-lead shape correlation, read the other way round: BELOW these. */
const MORPHOLOGY_R: [number, number] = [0.97, 0.93];
/**
 * Rate moves with the time of day, the stairs and the coffee, so a change
 * in it is information about the person's day at least as much as about
 * their heart. It is reported — a resting rate that has genuinely shifted
 * matters — but it is never allowed past `watch`.
 */
const RATE_BPM_WATCH = 20;

/** QRS amplitude is measured peak-to-peak over this window either side of R. */
const AMPLITUDE_WINDOW_MS = 60;

const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365.25;

/* ══════════════════ Small numeric helpers ══════════════════ */

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** The leads a study actually carried, typed. `Object.entries` loses the key type. */
function leadEntries(t: RecordingTemplate): [EcgLeadName, BeatTemplate | undefined][] {
  return Object.entries(t.leads) as [EcgLeadName, BeatTemplate | undefined][];
}

function round(value: number | null, decimals = 0): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** MAD scaled to a σ-equivalent. Same constant `beatTemplate` uses. */
function robustSigma(values: number[], centre: number): number {
  if (values.length === 0) return 0;
  return median(values.map((v) => Math.abs(v - centre))) * 1.4826;
}

/** Weighted median — robust to an outlier the way a weighted mean is not. */
function weightedMedian(pairs: { value: number; weight: number }[]): number | null {
  const clean = pairs.filter((p) => Number.isFinite(p.value) && p.weight > 0);
  if (clean.length === 0) return null;
  clean.sort((a, b) => a.value - b.value);
  const total = clean.reduce((s, p) => s + p.weight, 0);
  let acc = 0;
  for (const p of clean) {
    acc += p.weight;
    if (acc >= total / 2) return p.value;
  }
  return clean[clean.length - 1].value;
}

/**
 * Tukey's biweight, one-sided.
 *
 * ONE-SIDED is not a detail. A two-sided version would down-weight a
 * study for agreeing with the cohort BETTER than the median does, which
 * is the opposite of what a robustness weight is for — the cleanest
 * recording the patient ever made would be treated as suspicious.
 */
function biweight(zBelowCentre: number): number {
  if (zBelowCentre <= 0) return 1;
  if (zBelowCentre >= BIWEIGHT_C) return 0;
  const u = zBelowCentre / BIWEIGHT_C;
  return (1 - u * u) ** 2;
}

/**
 * Kish's effective sample size: `(Σw)² / Σw²`.
 *
 * With equal weights it is exactly n. With one study holding everything
 * it is 1. It is the number that answers "how many studies is this
 * baseline really made of", and the reason it is computed rather than
 * inferred is that nothing else in the output can reveal concentration —
 * a count of contributors cannot, and a mean agreement cannot.
 */
function effectiveN(weights: number[]): number {
  let sum = 0;
  let sumSq = 0;
  for (const w of weights) {
    if (w <= 0) continue;
    sum += w;
    sumSq += w * w;
  }
  return sumSq > 0 ? (sum * sum) / sumSq : 0;
}

/**
 * Enforce `weightCap` by redistribution.
 *
 * Capping changes the total, which changes the cap, which can push
 * another study over it — so it iterates. Excess is not discarded: it is
 * left with the uncapped studies by simple renormalisation, because the
 * cap is a statement about concentration, not a penalty on the study that
 * hit it.
 */
function capWeights(weights: Map<string, number>): void {
  const ids = [...weights.keys()].filter((id) => (weights.get(id) ?? 0) > 0);
  if (ids.length < 2) return;
  const cap = weightCap(ids.length);

  for (let pass = 0; pass < CAP_PASSES; pass++) {
    const total = ids.reduce((s, id) => s + (weights.get(id) ?? 0), 0);
    if (total <= 0) return;
    const ceiling = cap * total;
    const over = ids.filter((id) => (weights.get(id) ?? 0) > ceiling + 1e-12);
    if (over.length === 0) return;
    for (const id of over) weights.set(id, ceiling);
  }
}

function meanOf(values: Float32Array): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  return sum / values.length;
}

/** Peak-to-peak of the QRS core — the amplitude a gain change moves. */
function qrsAmplitude(samples: Float32Array): number {
  const half = Math.round((AMPLITUDE_WINDOW_MS / 1000) * TEMPLATE_FS);
  const from = Math.max(0, TEMPLATE_PRE_SAMPLES - half);
  const to = Math.min(samples.length - 1, TEMPLATE_PRE_SAMPLES + half);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = from; i <= to; i++) {
    if (samples[i] < lo) lo = samples[i];
    if (samples[i] > hi) hi = samples[i];
  }
  return Number.isFinite(hi - lo) ? hi - lo : 0;
}

/** Grade a magnitude against its [watch, marked] thresholds. */
function grade(magnitude: number, [watch, marked]: [number, number]) {
  if (magnitude >= marked) return 'marked' as const;
  if (magnitude >= watch) return 'watch' as const;
  return null;
}

/** Epoch ms, or NaN for an unparseable timestamp (which then decays to nothing). */
function epoch(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : NaN;
}

/** Exponential decay by half-life, in days. Unknown dates get no decay. */
function decay(fromMs: number, toMs: number, halfLifeDays: number): number {
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return 1;
  const days = Math.abs(toMs - fromMs) / MS_PER_DAY;
  return 2 ** (-days / halfLifeDays);
}

/* ══════════════════ Eligibility ══════════════════ */

function exclusionOf(t: RecordingTemplate): ExclusionReason | null {
  if (t.isSimulated) return 'simulated';
  if (t.beatsUsed < MIN_BEATS) return 'tooFewBeats';
  if (t.sqi < MIN_SQI) return 'lowQuality';
  return null;
}

/* ══════════════════ Per-lead weighted accumulation ══════════════════ */

interface LeadAccumulator {
  /** Σ w·x per sample. */
  sum: Float64Array;
  /** Σ w·x² per sample — the between-study spread comes out of this. */
  sumSq: Float64Array;
  /** Σ w·dispersion² per sample — the within-study spread. */
  sumWithin: Float64Array;
  /** Σ w. */
  weight: number;
  contributors: number;
}

function newAccumulator(): LeadAccumulator {
  return {
    sum: new Float64Array(TEMPLATE_SAMPLES),
    sumSq: new Float64Array(TEMPLATE_SAMPLES),
    sumWithin: new Float64Array(TEMPLATE_SAMPLES),
    weight: 0,
    contributors: 0,
  };
}

interface Accumulated {
  leads: Partial<Record<EcgLeadName, LeadAccumulator>>;
  totalWeight: number;
}

function accumulate(
  templates: readonly RecordingTemplate[],
  weightFn: (t: RecordingTemplate) => number,
): Accumulated {
  const leads: Partial<Record<EcgLeadName, LeadAccumulator>> = {};
  let totalWeight = 0;

  for (const t of templates) {
    const w = weightFn(t);
    if (w <= 0) continue;
    totalWeight += w;

    for (const [name, template] of leadEntries(t)) {
      if (!template) continue;
      const acc = (leads[name] ??= newAccumulator());
      acc.weight += w;
      acc.contributors += 1;
      const n = Math.min(TEMPLATE_SAMPLES, template.samples.length);
      for (let i = 0; i < n; i++) {
        const v = template.samples[i];
        const d = template.dispersion[i] ?? 0;
        acc.sum[i] += w * v;
        acc.sumSq[i] += w * v * v;
        acc.sumWithin[i] += w * d * d;
      }
    }
  }

  return { leads, totalWeight };
}

/** The weighted-mean beat of one accumulator. */
function baselineOf(acc: LeadAccumulator): Float32Array {
  const out = new Float32Array(TEMPLATE_SAMPLES);
  if (acc.weight <= 0) return out;
  for (let i = 0; i < TEMPLATE_SAMPLES; i++) out[i] = acc.sum[i] / acc.weight;
  return out;
}

/**
 * The tolerance corridor: between-study spread and within-study spread,
 * added in quadrature because they are independent sources of variation.
 *
 * A single contributor has no between-study spread at all — its corridor
 * is entirely its own beat-to-beat repeatability, which is exactly the
 * right answer and is why the floor below matters most on day one.
 */
function toleranceOf(acc: LeadAccumulator): Float32Array {
  const out = new Float32Array(TEMPLATE_SAMPLES);
  if (acc.weight <= 0) return out.fill(MIN_TOLERANCE_MV);
  for (let i = 0; i < TEMPLATE_SAMPLES; i++) {
    const mean = acc.sum[i] / acc.weight;
    const between = Math.max(0, acc.sumSq[i] / acc.weight - mean * mean);
    const within = Math.max(0, acc.sumWithin[i] / acc.weight);
    out[i] = Math.max(MIN_TOLERANCE_MV, Math.sqrt(between + within));
  }
  return out;
}

/** An `Accumulated` rendered as the identity leads a caller can read. */
function leadsOf(acc: Accumulated): Partial<Record<EcgLeadName, IdentityLead>> {
  const leads: Partial<Record<EcgLeadName, IdentityLead>> = {};
  for (const [name, a] of Object.entries(acc.leads) as [EcgLeadName, LeadAccumulator][]) {
    if (!a || a.weight <= 0) continue;
    leads[name] = {
      samples: baselineOf(a),
      tolerance: toleranceOf(a),
      contributors: a.contributors,
    };
  }
  return leads;
}

/** Weighted median of one interval across studies. See the note in `finalise`. */
function medianInterval(
  withWeights: readonly { t: RecordingTemplate; w: number }[],
  get: (t: RecordingTemplate) => number | null,
): number | null {
  return weightedMedian(
    withWeights
      .map(({ t, w }) => ({ value: get(t) as number, weight: w }))
      .filter((p) => p.value !== null && p.value !== undefined),
  );
}

function intervalsOf(withWeights: readonly { t: RecordingTemplate; w: number }[]) {
  return {
    prMs: round(medianInterval(withWeights, (t) => t.intervals.prMs)),
    qrsMs: round(medianInterval(withWeights, (t) => t.intervals.qrsMs)),
    qtcMs: round(medianInterval(withWeights, (t) => t.intervals.qtcMs)),
    axisDegrees: round(medianInterval(withWeights, (t) => t.intervals.axisDegrees)),
    bpm: round(medianInterval(withWeights, (t) => t.intervals.bpm)),
  };
}

/* ══════════════════ THE ENTRY POINT ══════════════════ */

export interface BuildIdentityOptions {
  /** Studies needed before the identity is `established`. */
  enrollmentTarget?: number;
  /** Recording ids the reader has explicitly struck from the baseline. */
  excludedIds?: readonly string[];
  /**
   * "Now", for the tracker's time decay. Defaults to the newest study.
   *
   * Defaulting to the newest study rather than the wall clock is
   * deliberate: it makes the identity a PURE function of its inputs, so
   * the same history builds the same baseline today and next month. A
   * patient who stops measuring for a year should find their ECG ID
   * exactly as they left it, not decayed to nothing by the passage of
   * time alone — nothing was learned in that year.
   */
  nowMs?: number;
}

/**
 * Fuse a patient's recording templates into their ECG ID and score each.
 *
 * `templates` may arrive in any order — they are sorted into time order
 * here, because both "the early studies own the anchor" and "the tracker
 * decays with age" are meaningless otherwise.
 */
export function buildEcgIdentity(
  templates: readonly RecordingTemplate[],
  options: BuildIdentityOptions = {},
): EcgIdentity {
  const enrollmentTarget = options.enrollmentTarget ?? ENROLLMENT_TARGET;
  const struck = new Set(options.excludedIds ?? []);

  const ordered = [...templates].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

  const noIntervals = { prMs: null, qrsMs: null, qtcMs: null, axisDegrees: null, bpm: null };
  const quietAlert: IdentityAlert = { state: 'none', kinds: [], since: null, consecutive: 0 };
  const empty: EcgIdentity = {
    maturity: 'none',
    confidence: 0,
    enrolled: 0,
    enrollmentTarget,
    nEff: 0,
    considered: ordered.length,
    leads: {},
    anchor: {},
    drift: [],
    alert: quietAlert,
    sampleRate: TEMPLATE_FS,
    rIndex: TEMPLATE_PRE_SAMPLES,
    intervals: noIntervals,
    anchorIntervals: noIntervals,
    matches: [],
    coverage: TWELVE_LEAD_ORDER.map((lead) => ({ lead, studies: 0, meanToleranceMv: null })),
    updatedAt: null,
  };

  /* ── 1. Eligibility ─────────────────────────────────────────────── */
  const exclusions = new Map<string, ExclusionReason | null>();
  const eligible: RecordingTemplate[] = [];
  for (const t of ordered) {
    const reason = struck.has(t.recordingId) ? ('outlier' as const) : exclusionOf(t);
    exclusions.set(t.recordingId, reason);
    if (!reason) eligible.push(t);
  }

  if (eligible.length === 0) {
    return { ...empty, matches: scoreWithoutBaseline(ordered, exclusions) };
  }

  /* ── 2. Quality prior ───────────────────────────────────────────
     Quality ONLY. Enrollment position and recency are no longer folded
     in here, because they now pull in opposite directions and belong to
     the two different baselines that need them. */
  const quality = new Map<string, number>();
  for (const t of eligible) {
    const q = (t.sqi / 100) * Math.min(1, t.beatsUsed / BEATS_FOR_FULL_WEIGHT);
    quality.set(t.recordingId, Math.max(0.05, q));
  }

  /* ── 3. Pass one: the provisional baseline ─────────────────────
     A per-sample weighted MEDIAN, and the choice is load-bearing. */
  const provisional = provisionalBaseline(eligible, (t) => quality.get(t.recordingId) ?? 0);

  /* ── 4. Remove the nuisance, THEN measure agreement ─────────────
     Each study is fitted against the provisional baseline for the linear
     channel remap that electrode displacement produces, and its
     agreement is measured on what is LEFT — the part of the difference
     no placement change can explain. Without this step the identity
     grades studies on where the pads were (`leadCalibration.ts`). */
  const calibration = new Map<string, ChannelTransform>();
  const agreement = new Map<string, number>();
  for (const t of eligible) {
    const fit = fitChannelTransform(t.leads, provisional);
    calibration.set(t.recordingId, fit);
    const leads = fit.applied ? applyChannelTransform(t.leads, fit.m) : undefined;
    agreement.set(t.recordingId, meanCorrelation(t, provisional, leads));
  }

  /* ── 5. Agreement → a bounded, cohort-relative weight ───────────
     A Tukey biweight on a robust z-score against the cohort's own
     spread. What it replaced — `clamp01((r − 0.8) / 0.2)` — was a linear
     ramp off a constant, and it behaved as a winner-take-all amplifier:
     see the failure note at the foot of this file. */
  const consensusPossible = eligible.length >= MIN_FOR_CONSENSUS;
  const rValues = eligible.map((t) => agreement.get(t.recordingId) ?? 0);
  const rCentre = median(rValues);
  const rSigma = Math.max(MIN_AGREEMENT_SIGMA, robustSigma(rValues, rCentre));

  const consensus = new Map<string, number>();
  for (const t of eligible) {
    const r = agreement.get(t.recordingId) ?? 0;
    if (r < ABSOLUTE_AGREEMENT_FLOOR) {
      consensus.set(t.recordingId, 0);
      continue;
    }
    consensus.set(t.recordingId, consensusPossible ? biweight((rCentre - r) / rSigma) : 1);
  }

  /* ── 6. The two weightings ──────────────────────────────────────
     Same evidence, two different questions about time. */
  const newestMs = Math.max(...eligible.map((t) => epoch(t.recordedAt)).filter(Number.isFinite));
  const nowMs = options.nowMs ?? (Number.isFinite(newestMs) ? newestMs : Date.now());

  const anchorWeights = new Map<string, number>();
  const trackerWeights = new Map<string, number>();
  eligible.forEach((t, i) => {
    const base = (quality.get(t.recordingId) ?? 0) * (consensus.get(t.recordingId) ?? 0);
    // The anchor: enrollment position, no calendar. Later studies keep a
    // tail so it can still be corrected, slowly.
    anchorWeights.set(t.recordingId, base * (i < enrollmentTarget ? 1 : ANCHOR_TAIL));
    // The tracker: the calendar, and nothing else.
    trackerWeights.set(
      t.recordingId,
      base * decay(epoch(t.recordedAt), nowMs, TRACKER_HALF_LIFE_DAYS),
    );
  });

  capWeights(anchorWeights);
  capWeights(trackerWeights);

  /* A study that the agreement pass reduced to nothing is named as an
     outlier — it is still scored and still shown, it simply does not get
     to define the person. */
  for (const t of eligible) {
    if ((consensus.get(t.recordingId) ?? 0) <= 0) exclusions.set(t.recordingId, 'outlier');
  }

  const contributors = eligible.filter((t) => (trackerWeights.get(t.recordingId) ?? 0) > 0);
  if (contributors.length === 0) {
    /* Everyone disagreed with everyone — which happens with two studies of
       genuinely different quality, and would leave the patient with no
       baseline at all. Rather than promote one of them to "the truth",
       fall back to the quality-weighted fusion and halve the confidence.
       The `outlier` marks from this pass are withdrawn with it: they were
       relative to a baseline that has just been discarded, and leaving
       them would tell the reader every study is an outlier. */
    for (const t of eligible) exclusions.set(t.recordingId, null);
    const fallback = new Map(eligible.map((t) => [t.recordingId, quality.get(t.recordingId) ?? 0]));
    capWeights(fallback);
    return finalise({
      all: ordered,
      eligible,
      trackerWeights: fallback,
      anchorWeights: fallback,
      agreement,
      calibration,
      exclusions,
      enrollmentTarget,
      degraded: true,
    });
  }

  return finalise({
    all: ordered,
    eligible,
    trackerWeights,
    anchorWeights,
    agreement,
    calibration,
    exclusions,
    enrollmentTarget,
    degraded: false,
  });
}

/* ══════════════════ The provisional baseline ══════════════════ */

/**
 * ★ The provisional baseline: a per-sample WEIGHTED MEDIAN across studies.
 *
 * ══ WHY NOT THE MEAN — this was a real failure, not a hypothetical ══
 * The first version averaged. Given five consistent studies and one taken
 * with a displaced electrode (bigger complexes, a flipped frontal axis),
 * the average was dragged far enough that the FIVE scored as outliers and
 * the ONE became the baseline. The minority did not merely survive — it
 * won, and the patient's identity became the shape of their worst
 * recording.
 *
 * The mechanism is worth stating, because it is not obvious: in the leads
 * where the bad study's polarity was reversed, the average of the two
 * populations very nearly CANCELLED. That left a small, noise-shaped
 * residual, the good studies correlated poorly against it, and the study
 * that dominated what was left correlated well. An estimator that is
 * pulled by an outlier cannot be used to detect that outlier.
 *
 * A per-sample median cannot be pulled: five values agree, one does not,
 * the middle one is still the agreed value. The disagreeing study then
 * measures its own distance from the majority and zeroes itself out.
 *
 * The FINAL baselines are still weighted means (`accumulate`) — once the
 * outliers carry little weight, the mean is the better estimator of what
 * is left, because it uses every sample instead of the middle one. Median
 * to find the inliers, mean to combine them.
 */
function provisionalBaseline(
  templates: readonly RecordingTemplate[],
  weightFn: (t: RecordingTemplate) => number,
): Partial<Record<EcgLeadName, Float32Array>> {
  /* Gather per lead first: studies carry different lead sets, and a lead
     present in three of forty studies must be medianed across those
     three, not across forty mostly-absent entries. */
  const perLead = new Map<EcgLeadName, { samples: Float32Array; weight: number }[]>();
  for (const t of templates) {
    const w = weightFn(t);
    if (w <= 0) continue;
    for (const [name, template] of leadEntries(t)) {
      if (!template) continue;
      const bucket = perLead.get(name) ?? [];
      bucket.push({ samples: template.samples, weight: w });
      perLead.set(name, bucket);
    }
  }

  const out: Partial<Record<EcgLeadName, Float32Array>> = {};
  for (const [name, entries] of perLead) {
    const baseline = new Float32Array(TEMPLATE_SAMPLES);
    const column: { value: number; weight: number }[] = entries.map((e) => ({
      value: 0,
      weight: e.weight,
    }));
    for (let i = 0; i < TEMPLATE_SAMPLES; i++) {
      for (let k = 0; k < entries.length; k++) column[k].value = entries[k].samples[i] ?? 0;
      baseline[i] = weightedMedian(column) ?? 0;
    }
    out[name] = baseline;
  }
  return out;
}

/**
 * Mean per-lead correlation of a study against a baseline, over shared leads.
 *
 * `calibrated` overrides the study's own samples when a channel remap was
 * accepted — so this measures the RESIDUAL disagreement, the part that
 * electrode placement cannot explain.
 */
function meanCorrelation(
  t: RecordingTemplate,
  leads: Partial<Record<EcgLeadName, Float32Array>>,
  calibrated?: Partial<Record<EcgLeadName, Float32Array>>,
): number {
  const scores: number[] = [];
  for (const [name, template] of leadEntries(t)) {
    const baseline = leads[name];
    if (!template || !baseline) continue;
    scores.push(correlate(calibrated?.[name] ?? template.samples, baseline));
  }
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/* ══════════════════ The baseline, one study at a time ══════════════════ */

/**
 * The baseline as it stood after each study, oldest first.
 *
 * `out[k]` is the identity built from the first `k + 1` contributing
 * studies — so `out[0]` is one study's own median beat and `out[n - 1]` is
 * the finished signature.
 *
 * ══ WHY THIS IS WORTH COMPUTING ══
 * It is the only honest way to SHOW what an ECG ID is. Told that averaging
 * many studies cancels the noise, a reader has to take it on faith. Handed
 * a control that walks through the sequence, they watch it happen.
 *
 * ══ ⚠️ THE CORRIDOR WIDENS. IT DOES NOT NARROW. ⚠️ ══
 * This doc comment claimed the opposite until it was measured. Across six
 * simulated sessions with ordinary variation the mean tolerance went
 * 0.021 → 0.026 → 0.028 mV and then settled.
 *
 * That is not a defect, it is the definition. The corridor is a
 * PREDICTION interval for the next study — how far this person's trace
 * legitimately moves — not the standard error of a mean, so it converges
 * on their real variability rather than shrinking toward zero. Both of the
 * things it is built from (between-study spread, within-study spread) are
 * population spreads, and neither gets smaller because you looked more.
 *
 * The direction is the interesting part. After ONE study the band is
 * narrow only because it contains nothing but that recording's own
 * beat-to-beat noise: it is a single measurement wearing the costume of a
 * range, and it is the most over-confident picture this system can draw.
 * Watching it fill out as studies arrive is watching the system learn how
 * much this person actually varies — which is what "enrolling" means, and
 * is far more legible than a percentage.
 *
 * ★ Any UI built on this must describe it that way. One promising a
 * tightening band would be promising the one thing the maths will not do.
 *
 * Accumulated incrementally, so the whole sequence costs one pass rather
 * than one pass per step.
 */
export function buildBaselineSequence(
  templates: readonly RecordingTemplate[],
  weightOf: (t: RecordingTemplate) => number,
  lead: EcgLeadName,
): IdentityLead[] {
  const contributing = [...templates]
    .filter((t) => weightOf(t) > 0 && t.leads[lead])
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

  const acc = newAccumulator();
  const out: IdentityLead[] = [];

  for (const t of contributing) {
    const template = t.leads[lead];
    if (!template) continue;
    const w = weightOf(t);

    acc.weight += w;
    acc.contributors += 1;
    const n = Math.min(TEMPLATE_SAMPLES, template.samples.length);
    for (let i = 0; i < n; i++) {
      const v = template.samples[i];
      const d = template.dispersion[i] ?? 0;
      acc.sum[i] += w * v;
      acc.sumSq[i] += w * v * v;
      acc.sumWithin[i] += w * d * d;
    }

    out.push({
      samples: baselineOf(acc),
      tolerance: toleranceOf(acc),
      contributors: acc.contributors,
    });
  }

  return out;
}

/* ══════════════════ Scoring ══════════════════ */

/** Studies exist but nothing is eligible: score nothing, explain everything. */
function scoreWithoutBaseline(
  ordered: readonly RecordingTemplate[],
  exclusions: Map<string, ExclusionReason | null>,
): IdentityMatch[] {
  return [...ordered].reverse().map((t) => ({
    recordingId: t.recordingId,
    recordedAt: t.recordedAt,
    similarity: 0,
    calibration: null,
    correlation: {},
    deviations: [],
    contributed: false,
    weight: 0,
    excluded: exclusions.get(t.recordingId) ?? null,
    flaggedAtEnrollment: false,
  }));
}

interface FinaliseInput {
  /** Every study considered, in time order — including the excluded ones. */
  all: readonly RecordingTemplate[];
  eligible: readonly RecordingTemplate[];
  trackerWeights: Map<string, number>;
  anchorWeights: Map<string, number>;
  agreement: Map<string, number>;
  calibration: Map<string, ChannelTransform>;
  exclusions: Map<string, ExclusionReason | null>;
  enrollmentTarget: number;
  degraded: boolean;
}

function finalise(input: FinaliseInput): EcgIdentity {
  const { all, eligible, trackerWeights, anchorWeights, agreement, calibration, exclusions } = input;

  const trackerAcc = accumulate(eligible, (t) => trackerWeights.get(t.recordingId) ?? 0);
  const anchorAcc = accumulate(eligible, (t) => anchorWeights.get(t.recordingId) ?? 0);
  const leads = leadsOf(trackerAcc);
  const anchorLeads = leadsOf(anchorAcc);

  /* ── Baseline intervals: weighted MEDIAN, not mean ──────────────
     One study whose T end was mis-delineated produces a QT 120 ms out.
     A mean carries that into the reference every later study is judged
     against; a median does not notice it. */
  const trackerWith = eligible
    .map((t) => ({ t, w: trackerWeights.get(t.recordingId) ?? 0 }))
    .filter((x) => x.w > 0);
  const anchorWith = eligible
    .map((t) => ({ t, w: anchorWeights.get(t.recordingId) ?? 0 }))
    .filter((x) => x.w > 0);

  const intervals = intervalsOf(trackerWith);
  const anchorIntervals = intervalsOf(anchorWith);

  /* ── Per-study matching, each against a LOCAL leave-one-out baseline ──
     See decision 4 in the header: the study itself is excluded, and the
     others are weighted by how close in time they are, so neither
     self-reflection nor slow drift can distort the score. */
  const matches: IdentityMatch[] = eligible.map((t, index) => {
    const own = trackerWeights.get(t.recordingId) ?? 0;
    const atMs = epoch(t.recordedAt);
    const localAcc = accumulate(eligible, (other) => {
      if (other.recordingId === t.recordingId) return 0;
      const w = trackerWeights.get(other.recordingId) ?? 0;
      if (w <= 0) return 0;
      // Re-weighted around THIS study's date rather than around now.
      return w * decay(epoch(other.recordedAt), atMs, SCORING_HALF_LIFE_DAYS);
    });
    const localLeads = leadsOf(localAcc);
    const localWith = eligible
      .filter((other) => other.recordingId !== t.recordingId)
      .map((other) => ({
        t: other,
        w:
          (trackerWeights.get(other.recordingId) ?? 0) *
          decay(epoch(other.recordedAt), atMs, SCORING_HALF_LIFE_DAYS),
      }))
      .filter((x) => x.w > 0);

    /* Nobody else has any weight — a first study, or the only survivor.
       Comparing it with itself would report a perfect match with its own
       reflection, so the whole-identity baseline is used instead and
       `maturity`/`nEff` are left to say how little that means. */
    const haveLocal = Object.keys(localLeads).length > 0;

    return scoreOne(t, {
      leads: haveLocal ? localLeads : leads,
      intervals: haveLocal && localWith.length > 0 ? intervalsOf(localWith) : intervals,
      ownWeight: own,
      calibration: calibration.get(t.recordingId) ?? IDENTITY_TRANSFORM,
      excluded: exclusions.get(t.recordingId) ?? null,
      isEnrollment: index < input.enrollmentTarget,
    });
  });

  // Studies that never made it as far as eligibility still get a row —
  // History shows every study, and a missing row reads as a missing study.
  for (const [id, reason] of exclusions) {
    if (reason && !matches.some((m) => m.recordingId === id)) {
      const t = all.find((x) => x.recordingId === id);
      matches.push({
        recordingId: id,
        recordedAt: t?.recordedAt ?? '',
        similarity: 0,
        calibration: null,
        correlation: {},
        deviations: [],
        contributed: false,
        weight: 0,
        excluded: reason,
        flaggedAtEnrollment: false,
      });
    }
  }
  matches.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  /* ── Coverage: every lead in 12-lead order, including the absent ones ──
     Naming the leads that have NEVER been measured is the point. A
     coverage table that only lists what exists cannot show a reader that
     their identity is limb-only. */
  const coverage: LeadCoverage[] = TWELVE_LEAD_ORDER.map((lead) => {
    const l = leads[lead];
    if (!l) return { lead, studies: 0, meanToleranceMv: null };
    let sum = 0;
    for (let i = 0; i < l.tolerance.length; i++) sum += l.tolerance[i];
    return {
      lead,
      studies: l.contributors,
      meanToleranceMv: round(sum / l.tolerance.length, 3),
    };
  });

  /* ── Maturity and confidence, off the EFFECTIVE count ────────────
     `nEff`, not the number of contributors. A baseline where one study
     holds most of the weight is not a ten-study baseline however many
     rows it has, and this is the only place the difference can be
     noticed before it does damage. */
  const nEff = effectiveN([...trackerWeights.values()]);
  const nEffAnchor = effectiveN([...anchorWeights.values()]);
  const contributorCount = trackerWith.length;
  const maturity: IdentityMaturity =
    contributorCount === 0 ? 'none' : nEff >= input.enrollmentTarget ? 'established' : 'enrolling';

  const agreementScores = trackerWith.map(({ t }) =>
    clamp01(((agreement.get(t.recordingId) ?? 0) - SIMILARITY_FLOOR) / (1 - SIMILARITY_FLOOR)),
  );
  const meanAgreement = agreementScores.length
    ? agreementScores.reduce((a, b) => a + b, 0) / agreementScores.length
    : 0;
  const countFactor = Math.min(1, nEff / input.enrollmentTarget);
  const confidence = Math.round(100 * countFactor * meanAgreement * (input.degraded ? 0.5 : 1));

  const updatedAt =
    trackerWith.length > 0
      ? trackerWith.map(({ t }) => t.recordedAt).sort((a, b) => b.localeCompare(a))[0]
      : null;

  return {
    maturity,
    confidence,
    enrolled: contributorCount,
    enrollmentTarget: input.enrollmentTarget,
    nEff: round(nEff, 1) ?? 0,
    considered: all.length,
    leads,
    anchor: anchorLeads,
    drift: measureDrift(
      anchorWith,
      trackerWith,
      anchorIntervals,
      intervals,
      anchorLeads,
      leads,
      nEffAnchor,
      nEff,
    ),
    alert: raiseAlert(matches),
    sampleRate: TEMPLATE_FS,
    rIndex: TEMPLATE_PRE_SAMPLES,
    intervals,
    anchorIntervals,
    matches,
    coverage,
    updatedAt,
  };
}

/* ══════════════════ Drift: the anchor → the tracker ══════════════════ */

/** The weighted centre of a set of studies in time — the "when" of a baseline. */
function centreMs(withWeights: readonly { t: RecordingTemplate; w: number }[]): number {
  let sum = 0;
  let weight = 0;
  for (const { t, w } of withWeights) {
    const ms = epoch(t.recordedAt);
    if (!Number.isFinite(ms) || w <= 0) continue;
    sum += ms * w;
    weight += w;
  }
  return weight > 0 ? sum / weight : NaN;
}

/**
 * ★ How much a threshold shrinks when it is applied to an AGGREGATE.
 *
 * Every `[watch, marked]` pair in this file is calibrated for ONE study
 * against a baseline: it has to clear the noise of a single ten-second
 * recording, which is why 10 ms of QRS is the smallest change worth
 * naming. Drift is not that comparison. It is the difference between two
 * baselines, each of which already averaged ten or more studies, so its
 * noise is smaller by roughly √n — and reusing the single-study threshold
 * there is not conservatism, it is a bug with a safe-sounding name: it
 * hides precisely the slow change the anchor/tracker split exists to
 * find. Measured on a cohort drifting at a known +7 ms/year, the drift
 * was computed correctly as +8.9 ms/year and then suppressed, because
 * 8 ms of movement between two 12-study means did not clear a threshold
 * built for one noisy strip.
 *
 * The floor at a third stops it running away: however many studies stand
 * behind the two baselines, the delineation itself quantises to a couple
 * of milliseconds, and a drift row that fires on rounding is a row that
 * teaches the reader to stop reading the section.
 */
const AGGREGATE_THRESHOLD_FLOOR = 1 / 3;
function aggregateScale(nAnchor: number, nTracker: number): number {
  const n = Math.max(1, Math.min(nAnchor, nTracker));
  return Math.max(AGGREGATE_THRESHOLD_FLOOR, 1 / Math.sqrt(n));
}

/**
 * How far the current baseline has walked from the enrollment anchor, as
 * a rate.
 *
 * ⚠️ This is NOT a deviation and must not be rendered as one. The
 * thresholds here decide one thing only — whether the movement is bigger
 * than this person's own measurement repeatability, i.e. whether it is
 * worth showing at all. A living person drifts. The number is a trend
 * line, and the interesting quantity is the SLOPE: "+6 ms/year" is a
 * sentence, and "+14 ms" without a duration is not.
 */
function measureDrift(
  anchorWith: readonly { t: RecordingTemplate; w: number }[],
  trackerWith: readonly { t: RecordingTemplate; w: number }[],
  anchorIntervals: EcgIdentity['anchorIntervals'],
  intervals: EcgIdentity['intervals'],
  anchorLeads: Partial<Record<EcgLeadName, IdentityLead>>,
  leads: Partial<Record<EcgLeadName, IdentityLead>>,
  nAnchor: number,
  nTracker: number,
): IdentityDrift[] {
  const scale = aggregateScale(nAnchor, nTracker);
  const from = centreMs(anchorWith);
  const to = centreMs(trackerWith);
  const years =
    Number.isFinite(from) && Number.isFinite(to) && to > from
      ? (to - from) / MS_PER_DAY / DAYS_PER_YEAR
      : null;

  // Under about a month between the two centres there is no separation
  // between "the anchor" and "now", so a rate would be a division by
  // nearly nothing dressed up as a trend.
  const rateable = years !== null && years >= 1 / 12;

  const out: IdentityDrift[] = [];
  const add = (
    kind: IdentityDrift['kind'],
    anchor: number | null,
    current: number | null,
    thresholds: [number, number],
    unit: IdentityDrift['unit'],
    decimals = 0,
  ) => {
    if (anchor === null || current === null) return;
    const delta = current - anchor;
    out.push({
      kind,
      anchor,
      current,
      delta: round(delta, decimals) ?? 0,
      perYear: rateable ? round(delta / (years as number), decimals + 1) : null,
      unit,
      beyondRepeatability: Math.abs(delta) >= thresholds[0] * scale,
    });
  };

  add('qrsDuration', anchorIntervals.qrsMs, intervals.qrsMs, QRS_MS, 'ms');
  add('qtcInterval', anchorIntervals.qtcMs, intervals.qtcMs, QTC_MS, 'ms');
  add('prInterval', anchorIntervals.prMs, intervals.prMs, PR_MS, 'ms');
  add('rate', anchorIntervals.bpm, intervals.bpm, [RATE_BPM_WATCH, RATE_BPM_WATCH], 'bpm');

  if (anchorIntervals.axisDegrees !== null && intervals.axisDegrees !== null) {
    // Axis is an angle: 350° and 10° are 20° apart, not 340°.
    let delta = intervals.axisDegrees - anchorIntervals.axisDegrees;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    out.push({
      kind: 'axis',
      anchor: anchorIntervals.axisDegrees,
      current: intervals.axisDegrees,
      delta: round(delta) ?? 0,
      perYear: rateable ? round(delta / (years as number), 1) : null,
      unit: 'deg',
      beyondRepeatability: Math.abs(delta) >= AXIS_DEG[0] * scale,
    });
  }

  /* Shape drift: how well the anchor beat still describes the current
     one, on the best-covered lead. One number, because six correlations
     between two baselines is a table nobody reads — and if the shape has
     genuinely moved, it has moved on more than one lead. */
  let bestLead: EcgLeadName | null = null;
  let bestContributors = 0;
  for (const name of Object.keys(leads) as EcgLeadName[]) {
    const l = leads[name];
    if (l && anchorLeads[name] && l.contributors > bestContributors) {
      bestContributors = l.contributors;
      bestLead = name;
    }
  }
  if (bestLead) {
    const r = correlate(leads[bestLead]!.samples, anchorLeads[bestLead]!.samples);
    out.push({
      kind: 'morphology',
      anchor: 1,
      current: round(r, 3) ?? 0,
      delta: round(r - 1, 3) ?? 0,
      perYear: rateable ? round((r - 1) / (years as number), 3) : null,
      unit: 'ratio',
      // Same aggregate scaling, read from the other end: the shape of two
      // averaged baselines should agree far more closely than one study
      // agrees with a baseline, so the bar for "it moved" is higher.
      beyondRepeatability: 1 - r >= (1 - MORPHOLOGY_R[0]) * scale,
    });
  }

  return out;
}

/* ══════════════════ The alert, and its persistence rule ══════════════════ */

/**
 * Whether the newest study is asking for attention.
 *
 * ★ THE RULE: one study crossing a threshold is `watch`. The SAME kind of
 * difference on two consecutive studies is `marked`. See `IdentityAlert`
 * in the types for why — briefly, a per-study false-positive rate becomes
 * its square, at a cost of at most one measurement's delay on anything
 * real, and a badge that fires on noise is a badge that gets ignored.
 *
 * Excluded studies are skipped rather than breaking a run: a simulator
 * session between two real ones is not evidence that the difference went
 * away.
 */
function raiseAlert(matches: readonly IdentityMatch[]): IdentityAlert {
  const quiet: IdentityAlert = { state: 'none', kinds: [], since: null, consecutive: 0 };
  // `matches` is newest-first. Only studies that were actually scored can
  // carry evidence; a struck or unusable one has no deviations to speak of.
  const scored = matches.filter((m) => m.deviations.length > 0 || m.excluded === null);
  const newest = scored[0];
  if (!newest) return quiet;

  const markedKinds = [
    ...new Set(newest.deviations.filter((d) => d.severity === 'marked').map((d) => d.kind)),
  ];

  if (markedKinds.length === 0) {
    const watchKinds = [...new Set(newest.deviations.map((d) => d.kind))];
    if (watchKinds.length === 0) return quiet;
    return { state: 'watch', kinds: watchKinds, since: newest.recordedAt, consecutive: 1 };
  }

  /* Walk back while the same kind keeps appearing — at ANY severity. A
     difference that drops from `marked` to `watch` has not resolved, it
     has become slightly smaller, and treating that as the end of the run
     would reset the counter every time the noise breathed. */
  let consecutive = 1;
  let since = newest.recordedAt;
  for (let i = 1; i < scored.length; i++) {
    const kinds = new Set(scored[i].deviations.map((d) => d.kind));
    if (!markedKinds.some((k) => kinds.has(k))) break;
    consecutive++;
    since = scored[i].recordedAt;
  }

  return {
    state: consecutive >= 2 ? 'marked' : 'watch',
    kinds: markedKinds,
    since,
    consecutive,
  };
}

/* ══════════════════ One study against its local baseline ══════════════════ */

interface ScoreContext {
  /** The LOCAL leave-one-out baseline this study is measured against. */
  leads: Partial<Record<EcgLeadName, IdentityLead>>;
  intervals: EcgIdentity['intervals'];
  ownWeight: number;
  calibration: ChannelTransform;
  excluded: ExclusionReason | null;
  isEnrollment: boolean;
}

function scoreOne(t: RecordingTemplate, ctx: ScoreContext): IdentityMatch {
  const deviations: IdentityDeviation[] = [];
  const correlation: Partial<Record<EcgLeadName, number>> = {};

  const shapeScores: number[] = [];
  const corridorScores: number[] = [];

  /* The remap was fitted against the PROVISIONAL baseline, not this local
     one, and it is reused rather than refitted. Refitting per study would
     let the geometry be re-estimated from a handful of temporal
     neighbours, which is both noisier and circular — the fit would start
     absorbing the very local differences the score is meant to find. */
  const calibrated = ctx.calibration.applied
    ? applyChannelTransform(t.leads, ctx.calibration.m)
    : undefined;

  for (const [name, template] of leadEntries(t)) {
    const lead = ctx.leads[name];
    if (!template || !lead) continue;

    const reference = lead.samples;
    /* ★ Shape is judged on the CALIBRATED trace and everything else on
       the raw one. That asymmetry is the safety argument of
       `leadCalibration.ts` in one line: placement is a nuisance for the
       question "is this the same beat", and is exactly the finding for
       the questions "did the axis move" and "did the amplitude change" —
       which are measured below, from the untouched data. */
    const shapeSamples = calibrated?.[name] ?? template.samples;
    const r = correlate(shapeSamples, reference);
    correlation[name] = round(r, 4) ?? 0;
    shapeScores.push(clamp01((r - SIMILARITY_FLOOR) / (1 - SIMILARITY_FLOOR)));

    const morph = grade(1 - r, [1 - MORPHOLOGY_R[0], 1 - MORPHOLOGY_R[1]]);
    if (morph) {
      deviations.push({
        kind: 'morphology',
        severity: morph,
        lead: name,
        value: round(r, 3) ?? 0,
        baseline: 1,
        delta: round(r - 1, 3) ?? 0,
        unit: 'ratio',
      });
    }

    /* ── Corridor excursion ──────────────────────────────────────
       Not "did any sample leave the band" — noise does that. The longest
       CONTIGUOUS run outside it, in milliseconds, because a real change
       in a waveform has duration and a spike does not. */
    const run = longestExcursion(template.samples, reference, lead.tolerance);
    const runMs = (run.samples / TEMPLATE_FS) * 1000;
    corridorScores.push(clamp01(1 - runMs / (CORRIDOR_MARKED_MS * 2)));
    const corridor = grade(runMs, [CORRIDOR_WATCH_MS, CORRIDOR_MARKED_MS]);
    if (corridor) {
      deviations.push({
        kind: 'corridor',
        severity: corridor,
        lead: name,
        value: round(run.peakMv, 3) ?? 0,
        baseline: round(run.baselineMv, 3) ?? 0,
        delta: round(run.peakMv - run.baselineMv, 3) ?? 0,
        unit: 'mV',
      });
    }

    // Amplitude: a gain change, an electrode change, or a real one — the
    // ratio says how much, never which. Measured on the RAW trace, since
    // the calibration is precisely what would erase it.
    const own = qrsAmplitude(template.samples);
    const ref = qrsAmplitude(reference);
    const noiseFloor = AMPLITUDE_NOISE_SIGMA * meanOf(lead.tolerance);
    if (ref >= MIN_AMPLITUDE_BASELINE_MV && Math.abs(own - ref) >= noiseFloor) {
      const ratio = own / ref;
      const amp = grade(Math.abs(1 - ratio), AMPLITUDE_RATIO);
      if (amp) {
        deviations.push({
          kind: 'amplitude',
          severity: amp,
          lead: name,
          value: round(own, 2) ?? 0,
          baseline: round(ref, 2) ?? 0,
          delta: round(own - ref, 2) ?? 0,
          unit: 'mV',
        });
      }
    }
  }

  /* ── Whole-study numbers ─────────────────────────────────────── */
  const interval = (
    kind: IdentityDeviation['kind'],
    value: number | null,
    baseline: number | null,
    thresholds: [number, number],
    unit: IdentityDeviation['unit'],
  ) => {
    if (value === null || baseline === null) return;
    const delta = value - baseline;
    const severity = grade(Math.abs(delta), thresholds);
    if (!severity) return;
    deviations.push({ kind, severity, lead: null, value, baseline, delta: round(delta, 1) ?? 0, unit });
  };

  interval('qrsDuration', t.intervals.qrsMs, ctx.intervals.qrsMs, QRS_MS, 'ms');
  interval('qtcInterval', t.intervals.qtcMs, ctx.intervals.qtcMs, QTC_MS, 'ms');
  interval('prInterval', t.intervals.prMs, ctx.intervals.prMs, PR_MS, 'ms');

  if (t.intervals.axisDegrees !== null && ctx.intervals.axisDegrees !== null) {
    // Axis is an angle: 350° and 10° are 20° apart, not 340°.
    let delta = t.intervals.axisDegrees - ctx.intervals.axisDegrees;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    const severity = grade(Math.abs(delta), AXIS_DEG);
    if (severity) {
      deviations.push({
        kind: 'axis',
        severity,
        lead: null,
        value: t.intervals.axisDegrees,
        baseline: ctx.intervals.axisDegrees,
        delta: round(delta) ?? 0,
        unit: 'deg',
      });
    }
  }

  if (t.intervals.bpm !== null && ctx.intervals.bpm !== null) {
    const delta = t.intervals.bpm - ctx.intervals.bpm;
    if (Math.abs(delta) >= RATE_BPM_WATCH) {
      deviations.push({
        kind: 'rate',
        severity: 'watch',
        lead: null,
        value: t.intervals.bpm,
        baseline: ctx.intervals.bpm,
        delta: round(delta) ?? 0,
        unit: 'bpm',
      });
    }
  }

  const shape = shapeScores.length ? shapeScores.reduce((a, b) => a + b, 0) / shapeScores.length : 0;
  const corridor = corridorScores.length
    ? corridorScores.reduce((a, b) => a + b, 0) / corridorScores.length
    : 0;
  // Shape carries most of the weight: it is what identifies the beat. The
  // corridor term is what stops a study that correlates beautifully but
  // sits 0.3 mV off from scoring as a perfect match.
  const similarity = shapeScores.length ? Math.round(100 * (0.7 * shape + 0.3 * corridor)) : 0;

  const marked = deviations.some((d) => d.severity === 'marked');

  return {
    recordingId: t.recordingId,
    recordedAt: t.recordedAt,
    similarity,
    calibration: {
      applied: ctx.calibration.applied,
      rotationDeg: round(ctx.calibration.rotationDeg, 1) ?? 0,
      scale: round(ctx.calibration.scale, 3) ?? 1,
      improvement: round(ctx.calibration.improvement, 3) ?? 0,
    },
    correlation,
    deviations: deviations.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'marked' ? -1 : 1)),
    contributed: ctx.ownWeight > 0,
    weight: round(ctx.ownWeight, 3) ?? 0,
    excluded: ctx.excluded,
    /* ★ The enrollment flag. An early study that carries a marked
       deviation, or that was outvoted entirely, is shaping — or failing to
       shape — the reference every later study is judged against. Saying so
       is what keeps it fixable. */
    flaggedAtEnrollment: ctx.isEnrollment && (marked || ctx.ownWeight <= 0),
  };
}

interface Excursion {
  /** Longest contiguous run of samples beyond `CORRIDOR_Z` × tolerance. */
  samples: number;
  /** The study's value at the furthest point of that run. */
  peakMv: number;
  /** The baseline at the same point. */
  baselineMv: number;
}

function longestExcursion(
  own: Float32Array,
  baseline: Float32Array,
  tolerance: Float32Array,
): Excursion {
  let best: Excursion = { samples: 0, peakMv: 0, baselineMv: 0 };
  let runLength = 0;
  let runPeakZ = 0;
  let runPeakIdx = -1;

  const flush = () => {
    if (runLength > best.samples && runPeakIdx >= 0) {
      best = { samples: runLength, peakMv: own[runPeakIdx], baselineMv: baseline[runPeakIdx] };
    }
    runLength = 0;
    runPeakZ = 0;
    runPeakIdx = -1;
  };

  const n = Math.min(own.length, baseline.length, tolerance.length);
  for (let i = 0; i < n; i++) {
    const z = Math.abs(own[i] - baseline[i]) / Math.max(MIN_TOLERANCE_MV, tolerance[i]);
    if (z > CORRIDOR_Z) {
      runLength++;
      if (z > runPeakZ) {
        runPeakZ = z;
        runPeakIdx = i;
      }
    } else {
      flush();
    }
  }
  flush();
  return best;
}

// v2.0.0 — ★ FOUR MEASURED DEFECTS, AND WHAT REPLACED THEM. All four were
//          visible in one screenshot of a real 24-study history that rendered
//          as a single tall bar in a row of identical dashes.
//
//          (1) THE AGREEMENT RAMP WAS A WINNER-TAKE-ALL AMPLIFIER.
//              `clamp01((r − 0.8) / 0.2)` turns a 0.05 difference in
//              correlation into a 10× difference in weight and deletes
//              everything under 0.80 outright. The enrollment boost was never
//              the culprit; at 2:1 it could not have been. Replaced by a
//              one-sided Tukey biweight scaled by the cohort's OWN robust
//              spread, plus `weightCap`, which makes single-study dominance
//              structurally impossible whatever the agreement maths concludes.
//              ★ MEASURED, on synthetic vectorcardiogram cohorts of 24
//                studies of one stable heart, sweeping how much the electrode
//                placement varied between sessions (`nEff`, higher is better):
//                  placement spread   ×1    ×2    ×2.5   ×3    ×4
//                  OLD               22.2  18.7   13.1   9.2   6.8
//                  NEW               22.1  19.6   16.2  13.8  20.2
//                The two agree while the data is clean and separate exactly
//                where a real history sits. The non-monotonic dip at ×3 is the
//                calibration's plausibility bounds refusing fits that a ×4
//                cohort makes unambiguous — robust statistics, not a defect,
//                but it is the reason those bounds must not be widened
//                casually to "improve" the middle of that row.
//
//          (2) ELECTRODE PLACEMENT WAS BEING SCORED AS CARDIAC MORPHOLOGY.
//              `Shape · 3 leads` with the two MEASURED leads silent is the
//              signature of pads moved a couple of centimetres: the derived
//              leads are differences of two channels whose gains drifted
//              apart. Those studies were being struck as outliers. The linear
//              remap is now fitted out before agreement is measured
//              (`leadCalibration.ts`) and never out of what the deviations
//              report — the axis and amplitude findings are untouched.
//
//          (3) THE SIMILARITY SCALE AND THE CHART AXIS DISAGREED. Scores were
//              stretched from r = 0.90 while the timeline drew an 80–100 axis
//              it had chosen for itself, so the chart's whole visible range
//              was r ∈ [0.971, 1.000] and an excellent 0.96 study was drawn
//              identically to a poor one. `SIMILARITY_FLOOR` and
//              `SIMILARITY_AXIS_FLOOR` are exported together so they cannot
//              drift apart again.
//
//          (4) THERE WAS NO TIME IN THE MODEL AT ALL. A study from two years
//              ago weighed the same as yesterday's, and a slowly drifting
//              heart was therefore guaranteed to fall below the agreement
//              floor and be labelled an outlier — the baseline locked onto
//              the past and called the present noise. Now: an `anchor` that
//              does not move, a time-decayed tracker that does, `drift`
//              between them as a per-year rate, and scoring against a LOCAL
//              leave-one-out baseline so an old study is compared with its
//              own era. Plus `IdentityAlert`, so a single threshold crossing
//              is a `watch` and only a repeated one is an alarm.
//
// v1.0.0 — The ECG ID: eligibility gates with stated reasons, enrollment-
//          weighted fusion, one round of agreement re-weighting, a measured
//          (never chosen) tolerance corridor, leave-one-out scoring so no study
//          is ever graded against its own reflection, and typed deviations that
//          carry their own arithmetic. No interpretation anywhere.
//          ★ Two findings from running it on synthetic cohorts before shipping,
//            both fixed here and both worth not re-introducing:
//            (1) the provisional baseline MUST be a per-sample weighted median.
//                As a mean, five consistent studies plus one taken with a
//                displaced electrode ended with the FIVE marked as outliers and
//                the ONE as the baseline — an estimator an outlier can pull
//                cannot be used to find that outlier;
//            (2) the amplitude ratio needs an absolute floor, or the small
//                derived leads (III, aVL) report `marked` on ordinary
//                session-to-session variation while the measured leads stay
//                silent.
