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

   ══ FIVE DECISIONS THAT MAKE IT TRUSTWORTHY ══

   1. NOT EVERY STUDY MAY DEFINE YOU. Simulator output, low-SQI strips and
      recordings with too few clean beats are barred, each with a stated
      reason. A baseline quietly built from a bad strip is worse than no
      baseline: it moves the reference, so the GOOD studies then score as
      deviant and the real change hides in the noise.

   2. THE EARLY STUDIES WEIGH MORE — AND ARE WATCHED HARDEST. Enrollment
      is when the reference is decided, exactly as with a fingerprint. So
      the first studies carry a boost, and *because* they do, an early
      study that disagrees with its own cohort is FLAGGED by name rather
      than absorbed. Without the flag, one loose electrode on day one
      would poison every comparison that follows, permanently and
      invisibly.

   3. STUDIES THAT DISAGREE ARE DOWN-WEIGHTED, NOT AVERAGED IN. A second
      pass re-weights each study by how well it agrees with the provisional
      baseline. A study that correlates below the floor contributes
      nothing — it is still SCORED, and still shown, it simply does not get
      to redefine the person.

   4. A STUDY IS NEVER SCORED AGAINST A BASELINE IT HELPED BUILD.
      Every match uses a LEAVE-ONE-OUT baseline — that study's own
      contribution subtracted. Skipping this is the classic way a system
      like this fools itself: with few studies, each one drags the mean
      toward itself and then reports an excellent match with what is
      largely its own reflection. Outliers would be the LEAST likely
      thing to be caught, which is backwards.

   5. THE CORRIDOR IS MEASURED, NOT CHOSEN. How far a trace may move
      before it counts as moved comes from this person's own repeatability
      — the spread between their studies plus the spread within them —
      never from a constant somebody picked.

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
   ================================================================== */

import { correlate, TEMPLATE_FS, TEMPLATE_PRE_SAMPLES, TEMPLATE_SAMPLES } from './beatTemplate';
import { TWELVE_LEAD_ORDER, type EcgLeadName } from '../types/ecg';
import type {
  BeatTemplate,
  EcgIdentity,
  ExclusionReason,
  IdentityDeviation,
  IdentityLead,
  IdentityMatch,
  IdentityMaturity,
  LeadCoverage,
  RecordingTemplate,
} from '../types/ecgIdentity';

/* ══════════════════ Tunables, named and justified ══════════════════ */

/** Studies needed before the baseline stops being called provisional. */
export const ENROLLMENT_TARGET = 5;
/** Weight multiplier the very first eligible study carries; it decays to 1. */
const ENROLLMENT_BOOST = 2;

/** A study below this rhythm-steadiness index may not shape the baseline. */
const MIN_SQI = 50;
/** Nor may one built from fewer clean beats than this. */
const MIN_BEATS = 3;
/** Beats beyond this add no further confidence to a study's weight. */
const BEATS_FOR_FULL_WEIGHT = 8;

/**
 * Agreement floor. A study correlating this poorly with the provisional
 * baseline gets zero weight — it is scored and shown, never averaged in.
 */
const CONSENSUS_FLOOR = 0.8;

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
 * The similarity score is stretched from this floor, not from zero.
 *
 * Two recordings of one healthy heart correlate at 0.98–0.999, so a raw
 * correlation printed as a percentage would read 98 % for everything and
 * discriminate nothing. Anchoring the scale at 0.90 makes the last two
 * decimal places — which is where the signal actually lives — visible.
 */
const SIMILARITY_FLOOR = 0.9;

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

/* ══════════════════ THE ENTRY POINT ══════════════════ */

export interface BuildIdentityOptions {
  /** Studies needed before the identity is `established`. */
  enrollmentTarget?: number;
  /** Recording ids the reader has explicitly struck from the baseline. */
  excludedIds?: readonly string[];
}

/**
 * Fuse a patient's recording templates into their ECG ID and score each.
 *
 * `templates` may arrive in any order — they are sorted into time order
 * here, because "the early studies weigh more" is meaningless otherwise.
 */
export function buildEcgIdentity(
  templates: readonly RecordingTemplate[],
  options: BuildIdentityOptions = {},
): EcgIdentity {
  const enrollmentTarget = options.enrollmentTarget ?? ENROLLMENT_TARGET;
  const struck = new Set(options.excludedIds ?? []);

  const ordered = [...templates].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

  const empty: EcgIdentity = {
    maturity: 'none',
    confidence: 0,
    enrolled: 0,
    enrollmentTarget,
    considered: ordered.length,
    leads: {},
    sampleRate: TEMPLATE_FS,
    rIndex: TEMPLATE_PRE_SAMPLES,
    intervals: { prMs: null, qrsMs: null, qtcMs: null, axisDegrees: null, bpm: null },
    matches: [],
    coverage: TWELVE_LEAD_ORDER.map((lead) => ({ lead, studies: 0, meanToleranceMv: null })),
    updatedAt: null,
  };

  /* ── 1. Eligibility, and the enrollment ranking ────────────────── */
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

  /* ── 2. Prior weights: enrollment position × quality ────────────
     Position is taken over the ELIGIBLE studies, not over all of them —
     otherwise two rejected simulator runs on day one would burn the
     enrollment slots that the first real recordings deserve. */
  const priors = new Map<string, number>();
  eligible.forEach((t, i) => {
    const enrollment =
      1 + (ENROLLMENT_BOOST - 1) * Math.max(0, (enrollmentTarget - i) / enrollmentTarget);
    const quality = (t.sqi / 100) * Math.min(1, t.beatsUsed / BEATS_FOR_FULL_WEIGHT);
    priors.set(t.recordingId, enrollment * Math.max(0.05, quality));
  });

  /* ── 3. Pass one: the provisional baseline ─────────────────────
     A per-sample weighted MEDIAN, and the choice is load-bearing. */
  const provisional = provisionalBaseline(eligible, (t) => priors.get(t.recordingId) ?? 0);

  /* ── 4. Pass two: agreement re-weighting ────────────────────────
     Each study is compared with the provisional baseline and its weight
     scaled by how well it agrees. This is one round of robust
     re-weighting; a second round buys almost nothing here because the
     first already zeroes the studies that were pulling hardest. */
  const agreement = new Map<string, number>();
  const finalWeights = new Map<string, number>();
  const consensusPossible = eligible.length >= MIN_FOR_CONSENSUS;

  for (const t of eligible) {
    const r = meanCorrelation(t, provisional);
    agreement.set(t.recordingId, r);
    if (!consensusPossible) {
      finalWeights.set(t.recordingId, priors.get(t.recordingId) ?? 0);
      continue;
    }
    const consensus = clamp01((r - CONSENSUS_FLOOR) / (1 - CONSENSUS_FLOOR));
    const w = (priors.get(t.recordingId) ?? 0) * consensus;
    finalWeights.set(t.recordingId, w);
    if (w <= 0) exclusions.set(t.recordingId, 'outlier');
  }

  const contributors = eligible.filter((t) => (finalWeights.get(t.recordingId) ?? 0) > 0);
  if (contributors.length === 0) {
    /* Everyone disagreed with everyone — which happens with two studies of
       genuinely different quality, and would leave the patient with no
       baseline at all. Rather than promote one of them to "the truth",
       fall back to the quality-weighted fusion and halve the confidence.
       The `outlier` marks from this pass are withdrawn with it: they were
       relative to a baseline that has just been discarded, and leaving
       them would tell the reader every study is an outlier. */
    for (const t of eligible) exclusions.set(t.recordingId, null);
    const fallback = accumulate(eligible, (t) => priors.get(t.recordingId) ?? 0);
    return finalise(ordered, eligible, priors, agreement, fallback, exclusions, {
      enrollmentTarget,
      degraded: true,
    });
  }

  const final = accumulate(contributors, (t) => finalWeights.get(t.recordingId) ?? 0);
  return finalise(ordered, eligible, finalWeights, agreement, final, exclusions, {
    enrollmentTarget,
    degraded: false,
  });
}

/* ══════════════════ Accumulation ══════════════════ */

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
 * The FINAL baseline is still a weighted mean (`accumulate`) — once the
 * outliers carry zero weight, the mean is the better estimator of what is
 * left, because it uses every sample instead of the middle one. Median to
 * find the inliers, mean to combine them.
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

/** Mean per-lead correlation of a study against a baseline, over shared leads. */
function meanCorrelation(
  t: RecordingTemplate,
  leads: Partial<Record<EcgLeadName, Float32Array>>,
): number {
  const scores: number[] = [];
  for (const [name, template] of leadEntries(t)) {
    const baseline = leads[name];
    if (!template || !baseline) continue;
    scores.push(correlate(template.samples, baseline));
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
    correlation: {},
    deviations: [],
    contributed: false,
    weight: 0,
    excluded: exclusions.get(t.recordingId) ?? null,
    flaggedAtEnrollment: false,
  }));
}

interface FinaliseOptions {
  enrollmentTarget: number;
  degraded: boolean;
}

function finalise(
  /** Every study considered, in time order — including the excluded ones. */
  all: readonly RecordingTemplate[],
  eligible: readonly RecordingTemplate[],
  weights: Map<string, number>,
  agreement: Map<string, number>,
  acc: Accumulated,
  exclusions: Map<string, ExclusionReason | null>,
  opts: FinaliseOptions,
): EcgIdentity {
  const leads: Partial<Record<EcgLeadName, IdentityLead>> = {};
  for (const [name, a] of Object.entries(acc.leads) as [EcgLeadName, LeadAccumulator][]) {
    if (!a || a.weight <= 0) continue;
    leads[name] = {
      samples: baselineOf(a),
      tolerance: toleranceOf(a),
      contributors: a.contributors,
    };
  }

  /* ── Baseline intervals: weighted MEDIAN, not mean ──────────────
     One study whose T end was mis-delineated produces a QT 120 ms out.
     A mean carries that into the reference every later study is judged
     against; a median does not notice it. */
  const withWeights = eligible
    .map((t) => ({ t, w: weights.get(t.recordingId) ?? 0 }))
    .filter((x) => x.w > 0);

  const pick = (get: (t: RecordingTemplate) => number | null): number | null =>
    weightedMedian(
      withWeights
        .map(({ t, w }) => ({ value: get(t) as number, weight: w }))
        .filter((p) => p.value !== null && p.value !== undefined),
    );

  const intervals = {
    prMs: round(pick((t) => t.intervals.prMs)),
    qrsMs: round(pick((t) => t.intervals.qrsMs)),
    qtcMs: round(pick((t) => t.intervals.qtcMs)),
    axisDegrees: round(pick((t) => t.intervals.axisDegrees)),
    bpm: round(pick((t) => t.intervals.bpm)),
  };

  /* ── Per-study matching, each against a LEAVE-ONE-OUT baseline ── */
  const contributorCount = withWeights.length;
  const matches: IdentityMatch[] = eligible.map((t, index) => {
    const w = weights.get(t.recordingId) ?? 0;
    return scoreOne(t, {
      acc,
      leads,
      intervals,
      ownWeight: w,
      excluded: exclusions.get(t.recordingId) ?? null,
      isEnrollment: index < opts.enrollmentTarget,
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

  /* ── Maturity and confidence ────────────────────────────────────
     Confidence is how much a reader should lean on this baseline: how
     many studies stand behind it, and how well they agreed. Both matter
     — forty studies that disagree are not a confident baseline, and two
     that agree perfectly are not one either. */
  const maturity: IdentityMaturity =
    contributorCount === 0
      ? 'none'
      : contributorCount < opts.enrollmentTarget
        ? 'enrolling'
        : 'established';

  const agreementScores = withWeights.map(({ t }) =>
    clamp01(((agreement.get(t.recordingId) ?? 0) - SIMILARITY_FLOOR) / (1 - SIMILARITY_FLOOR)),
  );
  const meanAgreement = agreementScores.length
    ? agreementScores.reduce((a, b) => a + b, 0) / agreementScores.length
    : 0;
  const countFactor = Math.min(1, contributorCount / opts.enrollmentTarget);
  const confidence = Math.round(100 * countFactor * meanAgreement * (opts.degraded ? 0.5 : 1));

  const updatedAt =
    withWeights.length > 0
      ? withWeights.map(({ t }) => t.recordedAt).sort((a, b) => b.localeCompare(a))[0]
      : null;

  return {
    maturity,
    confidence,
    enrolled: contributorCount,
    enrollmentTarget: opts.enrollmentTarget,
    considered: all.length,
    leads,
    sampleRate: TEMPLATE_FS,
    rIndex: TEMPLATE_PRE_SAMPLES,
    intervals,
    matches,
    coverage,
    updatedAt,
  };
}

interface ScoreContext {
  acc: Accumulated;
  leads: Partial<Record<EcgLeadName, IdentityLead>>;
  intervals: EcgIdentity['intervals'];
  ownWeight: number;
  excluded: ExclusionReason | null;
  isEnrollment: boolean;
}

function scoreOne(t: RecordingTemplate, ctx: ScoreContext): IdentityMatch {
  const deviations: IdentityDeviation[] = [];
  const correlation: Partial<Record<EcgLeadName, number>> = {};

  const shapeScores: number[] = [];
  const corridorScores: number[] = [];

  for (const [name, template] of leadEntries(t)) {
    const acc = ctx.acc.leads[name];
    const lead = ctx.leads[name];
    if (!template || !acc || !lead || acc.weight <= 0) continue;

    /* ── Leave-one-out ───────────────────────────────────────────
       Subtract this study's own contribution before comparing. With
       three studies, a study left in the baseline is comparing itself
       against a third of itself and scores accordingly — the outliers
       would be the last thing this ever caught. */
    const remaining = acc.weight - ctx.ownWeight;
    const reference =
      ctx.ownWeight > 0 && remaining > 1e-9
        ? subtractOne(acc, template.samples, ctx.ownWeight, remaining)
        : lead.samples;

    const r = correlate(template.samples, reference);
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
    // ratio says how much, never which.
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

/** The baseline with one study's weighted contribution removed. */
function subtractOne(
  acc: LeadAccumulator,
  own: Float32Array,
  ownWeight: number,
  remaining: number,
): Float32Array {
  const out = new Float32Array(TEMPLATE_SAMPLES);
  for (let i = 0; i < TEMPLATE_SAMPLES; i++) {
    out[i] = (acc.sum[i] - ownWeight * (own[i] ?? 0)) / remaining;
  }
  return out;
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
