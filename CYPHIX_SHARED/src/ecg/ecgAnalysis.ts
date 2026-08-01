/* ==================================================================
   ECG ANALYSIS — automated measurements from the six limb leads.

   ══ WHAT THIS IS ══
   A pure, offline pass over an already report-filtered recording that
   produces the numbers a limb-lead ECG can legitimately yield: rate,
   rhythm regularity, the frontal-plane QRS axis, the standard intervals
   (PR / QRS / QT / QTc), and per-lead wave amplitudes.

   ══ WHAT THIS IS NOT ══
   It does not diagnose, and it must never start to. There is no finding,
   no ICD-10 code, no "normal/abnormal" verdict anywhere in this file.
   Automated measurements exist so a clinician reads the trace faster —
   not so software reads it for them. Adding interpretation here would
   change the regulatory class of the product.

   ══ THE HONESTY RULE ══
   Every measurement returns `null` when it cannot be made from the data.
   A missing P wave yields a null PR interval, not a plausible-looking
   160 ms. Fabricating a number a clinician might act on is the single
   worst thing this module could do, so failure is always representable.

   ══ PIPELINE ══
     filtered Lead II
        → R-peak detection (offline Pan-Tompkins: derivative → square →
          150 ms integration → threshold on the record's own maximum)
        → per-beat delineation on Lead II
             QRS onset/offset : slope collapse either side of R
             P wave           : largest deflection in the atrial window
             T end            : tangent method on the steepest T downslope
        → MEDIAN across beats (robust: three clean beats outvote one
          artefact, which a mean would not survive)
        → axis from net QRS area in I and aVF (Einthoven's triangle)

   Reference conventions: Bazett QTc = QT/√RR; Fridericia = QT/∛RR;
   axis = atan2(net aVF, net I), normal −30°…+90°.
   ================================================================== */

import { LIMB_LEAD_ORDER, type LimbLeadName } from '../types/ecg';
import type {
  AxisClass,
  EcgAnalysis,
  FrontalAxis,
  Intervals,
  LeadAmplitudes,
  RateAndRhythm,
  RegularityClass,
} from '../types/ecgAnalysis';

/* ══════════════════ Tunable, named, and justified ══════════════════ */

/** Moving-window integration width — one QRS complex wide (Pan & Tompkins, 1985). */
const MWI_SECONDS = 0.15;
/** A detection must clear this fraction of the record's peak QRS energy. */
const QRS_ENERGY_FRACTION = 0.3;
/** Two R peaks closer than this are the same beat (≈ 240 BPM ceiling). */
const REFRACTORY_SECONDS = 0.25;
/** R is re-located to the true waveform peak within this window of the energy peak. */
const R_REFINE_SECONDS = 0.05;
/** Physiological RR bounds — 40…200 BPM. Anything outside is a detection error. */
const RR_MIN_MS = 300;
const RR_MAX_MS = 1500;
/** Fewer clean beats than this and no measurement is trustworthy. */
const MIN_BEATS_FOR_ANALYSIS = 3;

/** QRS onset is searched at most this far back from R. */
const QRS_ONSET_WINDOW_SECONDS = 0.1;
/** QRS offset is searched at most this far forward from R. */
const QRS_OFFSET_WINDOW_SECONDS = 0.14;
/** Slope has "collapsed" below this fraction of the peak QRS slope. */
const SLOPE_COLLAPSE_FRACTION = 0.08;

/** The atrial window: P falls between 300 ms and 40 ms before QRS onset. */
const P_SEARCH_START_SECONDS = 0.3;
const P_SEARCH_END_SECONDS = 0.04;
/** Below this the "P wave" is indistinguishable from residual noise (mV). */
const P_MIN_AMPLITUDE_MV = 0.03;

/** T peak is searched from here after QRS offset… */
const T_SEARCH_START_SECONDS = 0.04;
/** …to this fraction of the RR interval (repolarisation always completes inside it). */
const T_SEARCH_RR_FRACTION = 0.6;

/** RR spread thresholds for the regularity class (coefficient of variation, %). */
const REGULARITY_REGULAR_PCT = 5;
const REGULARITY_SLIGHT_PCT = 12;

/* ══════════════════ small numeric helpers ══════════════════ */

function median(values: number[]): number | null {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return null;
  const sorted = [...clean].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round(value: number | null, decimals = 0): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/* ══════════════════ 1. R-peak detection ══════════════════ */

/**
 * Locate R peaks in a filtered lead.
 *
 * Offline detection can do something the real-time validator cannot: look
 * at the WHOLE record first and threshold against its actual maximum QRS
 * energy. That removes the adaptive-threshold warm-up entirely, so the
 * first beats of a 10 s strip are detected as reliably as the last —
 * which matters when the recording is only ~10 beats long.
 */
export function detectRPeaks(signal: Float32Array, fs: number): number[] {
  const n = signal.length;
  if (n < fs) return [];

  // Derivative (emphasise the steep QRS slope) → square (all-positive, peaks boosted).
  const squared = new Float32Array(n);
  for (let i = 2; i < n - 2; i++) {
    const d = (-signal[i - 2] - 2 * signal[i - 1] + 2 * signal[i + 1] + signal[i + 2]) / 8;
    squared[i] = d * d;
  }

  // Moving window integration — turns each QRS into a single energy hump.
  const mwiLen = Math.max(3, Math.round(fs * MWI_SECONDS));
  const mwi = new Float32Array(n);
  let running = 0;
  for (let i = 0; i < n; i++) {
    running += squared[i];
    if (i >= mwiLen) running -= squared[i - mwiLen];
    mwi[i] = running / mwiLen;
  }

  let peakEnergy = 0;
  for (let i = 0; i < n; i++) if (mwi[i] > peakEnergy) peakEnergy = mwi[i];
  if (peakEnergy <= 0) return [];

  const threshold = peakEnergy * QRS_ENERGY_FRACTION;
  const refractory = Math.round(fs * REFRACTORY_SECONDS);
  const refine = Math.round(fs * R_REFINE_SECONDS);

  const peaks: number[] = [];
  let i = 0;
  while (i < n) {
    if (mwi[i] <= threshold) {
      i++;
      continue;
    }
    // Walk to the top of this energy hump.
    let best = i;
    while (i < n && mwi[i] > threshold) {
      if (mwi[i] > mwi[best]) best = i;
      i++;
    }
    // The energy peak lags the waveform peak (integration delay), so snap to
    // the largest absolute deflection nearby — that is the true R.
    const from = Math.max(0, best - mwiLen - refine);
    const to = Math.min(n - 1, best + refine);
    let rIdx = from;
    for (let k = from; k <= to; k++) {
      if (Math.abs(signal[k]) > Math.abs(signal[rIdx])) rIdx = k;
    }
    if (peaks.length === 0 || rIdx - peaks[peaks.length - 1] > refractory) {
      peaks.push(rIdx);
    } else if (Math.abs(signal[rIdx]) > Math.abs(signal[peaks[peaks.length - 1]])) {
      peaks[peaks.length - 1] = rIdx;
    }
  }

  return peaks;
}

/* ══════════════════ 2. Per-beat delineation ══════════════════ */

interface BeatDelineation {
  rIdx: number;
  qrsOnset: number;
  qrsOffset: number;
  /** null when no P wave rises above the noise floor. */
  pPeak: number | null;
  pOnset: number | null;
  tPeak: number | null;
  /** null when the T wave has no resolvable end. */
  tEnd: number | null;
}

/**
 * Find the boundaries of one beat on the reference lead.
 *
 * QRS onset/offset use SLOPE, not amplitude: the complex begins where the
 * waveform stops being flat, and a slope criterion finds that regardless
 * of whether the beat starts with a Q dip or straight into R.
 */
function delineateBeat(
  signal: Float32Array,
  rIdx: number,
  rrSamples: number,
  fs: number,
): BeatDelineation | null {
  const n = signal.length;

  // Local slope magnitude.
  const slopeAt = (i: number): number =>
    i <= 0 || i >= n - 1 ? 0 : Math.abs(signal[i + 1] - signal[i - 1]);

  const onsetLimit = Math.max(0, rIdx - Math.round(fs * QRS_ONSET_WINDOW_SECONDS));
  const offsetLimit = Math.min(n - 1, rIdx + Math.round(fs * QRS_OFFSET_WINDOW_SECONDS));
  if (onsetLimit >= rIdx || offsetLimit <= rIdx) return null;

  let peakSlope = 0;
  for (let i = onsetLimit; i <= offsetLimit; i++) {
    const s = slopeAt(i);
    if (s > peakSlope) peakSlope = s;
  }
  if (peakSlope <= 0) return null;
  const flat = peakSlope * SLOPE_COLLAPSE_FRACTION;

  let qrsOnset = onsetLimit;
  for (let i = rIdx; i > onsetLimit; i--) {
    if (slopeAt(i) < flat) {
      qrsOnset = i;
      break;
    }
  }

  let qrsOffset = offsetLimit;
  for (let i = rIdx; i < offsetLimit; i++) {
    if (slopeAt(i) < flat) {
      qrsOffset = i;
      break;
    }
  }

  /* ---- P wave: largest deflection in the atrial window ---- */
  const pFrom = Math.max(0, qrsOnset - Math.round(fs * P_SEARCH_START_SECONDS));
  const pTo = Math.max(pFrom, qrsOnset - Math.round(fs * P_SEARCH_END_SECONDS));
  let pPeak: number | null = null;
  if (pTo > pFrom + 2) {
    let candidate = pFrom;
    for (let i = pFrom; i <= pTo; i++) {
      if (Math.abs(signal[i]) > Math.abs(signal[candidate])) candidate = i;
    }
    if (Math.abs(signal[candidate]) >= P_MIN_AMPLITUDE_MV) pPeak = candidate;
  }

  // P onset: walk back from the P peak until the wave returns to baseline.
  let pOnset: number | null = null;
  if (pPeak !== null) {
    const sign = Math.sign(signal[pPeak]) || 1;
    const floor = Math.abs(signal[pPeak]) * 0.15;
    pOnset = pFrom;
    for (let i = pPeak; i > pFrom; i--) {
      if (sign * signal[i] < floor) {
        pOnset = i;
        break;
      }
    }
  }

  /* ---- T wave: peak, then the tangent method for its end ---- */
  const tFrom = Math.min(n - 1, qrsOffset + Math.round(fs * T_SEARCH_START_SECONDS));
  const tTo = Math.min(n - 1, qrsOffset + Math.round(rrSamples * T_SEARCH_RR_FRACTION));
  let tPeak: number | null = null;
  let tEnd: number | null = null;
  if (tTo > tFrom + 4) {
    let candidate = tFrom;
    for (let i = tFrom; i <= tTo; i++) {
      if (Math.abs(signal[i]) > Math.abs(signal[candidate])) candidate = i;
    }
    tPeak = candidate;

    // Tangent method: the steepest slope on the T downslope, extrapolated
    // to the baseline, defines T end. This is the standard manual technique
    // and is far more stable than "where it crosses zero", which noise moves.
    let steepestIdx = -1;
    let steepest = 0;
    for (let i = candidate + 1; i < tTo; i++) {
      const d = signal[i + 1] - signal[i - 1];
      // Slope must run back TOWARD baseline (opposite sign to the T peak).
      if (Math.sign(d) === -Math.sign(signal[candidate]) && Math.abs(d) > steepest) {
        steepest = Math.abs(d);
        steepestIdx = i;
      }
    }
    if (steepestIdx > 0 && steepest > 0) {
      // Baseline crossing of the tangent line through (steepestIdx, value).
      const slopePerSample = (signal[steepestIdx + 1] - signal[steepestIdx - 1]) / 2;
      const samplesToBaseline = -signal[steepestIdx] / slopePerSample;
      const candidateEnd = steepestIdx + samplesToBaseline;
      if (Number.isFinite(candidateEnd) && candidateEnd > qrsOffset && candidateEnd <= tTo + 2) {
        tEnd = Math.round(candidateEnd);
      }
    }
  }

  return { rIdx, qrsOnset, qrsOffset, pPeak, pOnset, tPeak, tEnd };
}

/* ══════════════════ 3. Rate & rhythm ══════════════════ */

function classifyRegularity(variationPct: number | null): RegularityClass {
  if (variationPct === null) return 'indeterminate';
  if (variationPct <= REGULARITY_REGULAR_PCT) return 'regular';
  if (variationPct <= REGULARITY_SLIGHT_PCT) return 'slightlyIrregular';
  return 'irregular';
}

function analyseRate(rrMs: number[], beats: BeatDelineation[]): RateAndRhythm {
  if (rrMs.length === 0) {
    return {
      bpm: null,
      rrMeanMs: null,
      rrMinMs: null,
      rrMaxMs: null,
      sdnnMs: null,
      rmssdMs: null,
      rrVariationPct: null,
      regularity: 'indeterminate',
      pBeforeQrsPct: null,
      beatsAnalyzed: beats.length,
    };
  }

  const rrMean = mean(rrMs)!;
  const variance = rrMs.reduce((s, v) => s + (v - rrMean) ** 2, 0) / rrMs.length;
  const sdnn = Math.sqrt(variance);

  // RMSSD uses SUCCESSIVE differences, so it reflects beat-to-beat change
  // rather than overall spread — the two say different things about rhythm.
  let successiveSum = 0;
  for (let i = 1; i < rrMs.length; i++) successiveSum += (rrMs[i] - rrMs[i - 1]) ** 2;
  const rmssd = rrMs.length > 1 ? Math.sqrt(successiveSum / (rrMs.length - 1)) : null;

  const variationPct = (sdnn / rrMean) * 100;
  const withP = beats.filter((b) => b.pPeak !== null).length;

  return {
    bpm: round(60000 / rrMean),
    rrMeanMs: round(rrMean),
    rrMinMs: round(Math.min(...rrMs)),
    rrMaxMs: round(Math.max(...rrMs)),
    sdnnMs: round(sdnn, 1),
    rmssdMs: round(rmssd, 1),
    rrVariationPct: round(variationPct, 1),
    regularity: classifyRegularity(variationPct),
    pBeforeQrsPct: beats.length ? round((withP / beats.length) * 100) : null,
    beatsAnalyzed: beats.length,
  };
}

/* ══════════════════ 4. Frontal-plane QRS axis ══════════════════ */

function classifyAxis(degrees: number): AxisClass {
  if (degrees >= -30 && degrees <= 90) return 'normal';
  if (degrees > -90 && degrees < -30) return 'left';
  if (degrees > 90 && degrees <= 180) return 'right';
  return 'extreme';
}

/**
 * The mean QRS vector, from the NET AREA (not peak height) of the complex
 * in leads I and aVF. Area is the correct quantity: it accounts for both
 * positive and negative deflections, so a deep S wave properly pulls the
 * vector back the way it physically should.
 *
 * Leads I and aVF are perpendicular (0° and +90°) — the two axes of the
 * hexaxial reference system — so the angle is a plain atan2 of the two.
 */
function analyseAxis(
  leads: Record<LimbLeadName, Float32Array>,
  beats: BeatDelineation[],
): FrontalAxis {
  if (beats.length === 0) {
    return { degrees: null, classification: 'indeterminate', netI: null, netAvf: null };
  }

  const netArea = (signal: Float32Array, b: BeatDelineation): number => {
    let sum = 0;
    for (let i = b.qrsOnset; i <= b.qrsOffset && i < signal.length; i++) sum += signal[i];
    return sum;
  };

  const netI = median(beats.map((b) => netArea(leads.I, b)));
  const netAvf = median(beats.map((b) => netArea(leads.aVF, b)));
  if (netI === null || netAvf === null) {
    return { degrees: null, classification: 'indeterminate', netI: null, netAvf: null };
  }

  // Both components ≈ 0 means the QRS is isoelectric in the frontal plane;
  // the angle is then genuinely undefined, not "zero degrees".
  const magnitude = Math.hypot(netI, netAvf);
  if (magnitude < 1e-3) {
    return {
      degrees: null,
      classification: 'indeterminate',
      netI: round(netI, 3),
      netAvf: round(netAvf, 3),
    };
  }

  const degrees = (Math.atan2(netAvf, netI) * 180) / Math.PI;
  return {
    degrees: round(degrees),
    classification: classifyAxis(degrees),
    netI: round(netI, 3),
    netAvf: round(netAvf, 3),
  };
}

/* ══════════════════ 5. Intervals ══════════════════ */

function analyseIntervals(
  beats: BeatDelineation[],
  rrMeanMs: number | null,
  fs: number,
): Intervals {
  const toMs = (samples: number): number => (samples / fs) * 1000;

  const prValues = beats
    .filter((b) => b.pOnset !== null)
    .map((b) => toMs(b.qrsOnset - (b.pOnset as number)))
    // A PR outside 80–320 ms is a delineation failure, not a finding.
    .filter((v) => v >= 80 && v <= 320);

  const qrsValues = beats
    .map((b) => toMs(b.qrsOffset - b.qrsOnset))
    .filter((v) => v >= 40 && v <= 200);

  const qtValues = beats
    .filter((b) => b.tEnd !== null)
    .map((b) => toMs((b.tEnd as number) - b.qrsOnset))
    .filter((v) => v >= 200 && v <= 700);

  const qt = median(qtValues);
  let qtcBazett: number | null = null;
  let qtcFridericia: number | null = null;
  if (qt !== null && rrMeanMs !== null && rrMeanMs > 0) {
    const rrSec = rrMeanMs / 1000;
    qtcBazett = qt / Math.sqrt(rrSec);
    qtcFridericia = qt / Math.cbrt(rrSec);
  }

  return {
    prMs: round(median(prValues)),
    qrsMs: round(median(qrsValues)),
    qtMs: round(qt),
    qtcBazettMs: round(qtcBazett),
    qtcFridericiaMs: round(qtcFridericia),
  };
}

/* ══════════════════ 6. Amplitudes ══════════════════ */

function analyseAmplitudes(
  leads: Record<LimbLeadName, Float32Array>,
  beats: BeatDelineation[],
): Record<LimbLeadName, LeadAmplitudes> {
  const out = {} as Record<LimbLeadName, LeadAmplitudes>;

  for (const lead of LIMB_LEAD_ORDER) {
    const signal = leads[lead];
    const pVals: number[] = [];
    const qVals: number[] = [];
    const rVals: number[] = [];
    const sVals: number[] = [];
    const tVals: number[] = [];
    const ppVals: number[] = [];

    for (const b of beats) {
      if (b.pPeak !== null && b.pPeak < signal.length) pVals.push(signal[b.pPeak]);
      if (b.tPeak !== null && b.tPeak < signal.length) tVals.push(signal[b.tPeak]);

      let maxV = -Infinity;
      let minV = Infinity;
      for (let i = b.qrsOnset; i <= b.qrsOffset && i < signal.length; i++) {
        if (signal[i] > maxV) maxV = signal[i];
        if (signal[i] < minV) minV = signal[i];
      }
      if (!Number.isFinite(maxV) || !Number.isFinite(minV)) continue;

      // R is the positive deflection, S the negative one after it; Q is the
      // negative deflection BEFORE the R. Split at the R position so a deep
      // Q isn't mistaken for an S.
      let rIdxLocal = b.qrsOnset;
      for (let i = b.qrsOnset; i <= b.qrsOffset && i < signal.length; i++) {
        if (signal[i] > signal[rIdxLocal]) rIdxLocal = i;
      }
      let qMin = 0;
      for (let i = b.qrsOnset; i < rIdxLocal; i++) if (signal[i] < qMin) qMin = signal[i];
      let sMin = 0;
      for (let i = rIdxLocal; i <= b.qrsOffset && i < signal.length; i++) {
        if (signal[i] < sMin) sMin = signal[i];
      }

      rVals.push(Math.max(0, maxV));
      qVals.push(qMin);
      sVals.push(sMin);
      ppVals.push(maxV - minV);
    }

    out[lead] = {
      pMv: round(median(pVals), 2),
      qMv: round(median(qVals), 2),
      rMv: round(median(rVals), 2),
      sMv: round(median(sVals), 2),
      tMv: round(median(tVals), 2),
      qrsAmplitudeMv: round(median(ppVals), 2),
    };
  }

  return out;
}

/* ══════════════════ THE ENTRY POINT ══════════════════ */

/**
 * Analyse a complete, report-filtered six-lead limb recording.
 *
 * Lead II is the reference for detection and delineation because it is
 * conventionally the rhythm strip: it runs closest to the heart's normal
 * depolarisation axis, so P waves and R waves are largest there.
 */
export function analyseLimbEcg(
  leads: Record<LimbLeadName, Float32Array>,
  fs: number,
): EcgAnalysis {
  const reference = leads.II;
  const analysedSeconds = reference ? reference.length / fs : 0;

  const empty: EcgAnalysis = {
    rate: analyseRate([], []),
    intervals: { prMs: null, qrsMs: null, qtMs: null, qtcBazettMs: null, qtcFridericiaMs: null },
    axis: { degrees: null, classification: 'indeterminate', netI: null, netAvf: null },
    amplitudes: analyseAmplitudes(leads, []),
    quality: { sqi: 0, analysedSeconds: round(analysedSeconds, 1) ?? 0, insufficient: true },
    rPeaks: [],
    sampleRate: fs,
  };

  if (!reference || reference.length < fs) return empty;

  const rPeaks = detectRPeaks(reference, fs);

  // Keep only physiologically plausible RR intervals. A rejected interval
  // means a missed or spurious detection, and letting it through would
  // corrupt the rate, the regularity index, and every rate-corrected value.
  const rrMs: number[] = [];
  for (let i = 1; i < rPeaks.length; i++) {
    const ms = ((rPeaks[i] - rPeaks[i - 1]) / fs) * 1000;
    if (ms >= RR_MIN_MS && ms <= RR_MAX_MS) rrMs.push(ms);
  }

  if (rPeaks.length < MIN_BEATS_FOR_ANALYSIS || rrMs.length === 0) {
    return { ...empty, rPeaks };
  }

  const rrMeanSamples = (mean(rrMs)! / 1000) * fs;
  const beats: BeatDelineation[] = [];
  for (const rIdx of rPeaks) {
    const beat = delineateBeat(reference, rIdx, rrMeanSamples, fs);
    if (beat) beats.push(beat);
  }

  const rate = analyseRate(rrMs, beats);
  const intervals = analyseIntervals(beats, rate.rrMeanMs, fs);
  const axis = analyseAxis(leads, beats);
  const amplitudes = analyseAmplitudes(leads, beats);

  // SQI mirrors the live validator's definition (low RR spread → high score)
  // so the number on the report means the same thing as the one on screen.
  const sqi =
    rate.rrVariationPct === null
      ? 0
      : Math.max(0, Math.min(100, Math.round(100 - rate.rrVariationPct)));

  return {
    rate,
    intervals,
    axis,
    amplitudes,
    quality: {
      sqi,
      analysedSeconds: round(analysedSeconds, 1) ?? 0,
      insufficient: beats.length < MIN_BEATS_FOR_ANALYSIS,
    },
    rPeaks,
    sampleRate: fs,
  };
}

// v1.0.0 — Automated limb-lead ECG measurements (rate, rhythm, axis, intervals, amplitudes). No interpretation.
