/* ==================================================================
   beatTemplate — the REPRESENTATIVE BEAT of one recording.

   ══ WHAT THIS COMPUTES, AND WHY IT IS THE RIGHT PRIMITIVE ══
   A 10 s strip holds ~12 drawings of the same beat. Each one carries the
   heart's actual signal plus noise that is uncorrelated with it: mains
   hum, muscle, electrode movement, the baseline riding on the breath.
   Line the beats up on their R peaks and take a per-sample MEDIAN and the
   uncorrelated part collapses while the shape stays — with ~12 beats the
   noise floor drops by roughly √12 ≈ 3.5×.

   This is not a CYPHIX invention: it is the "median beat" / representative
   complex that every clinical ECG cart computes, and it is what their
   automated measurements are actually taken from. It exists for a reason
   the eye already knows — you can see detail in the median beat (a small
   Q wave, a subtle ST shift) that no single noisy beat shows.

        beat 1  ╭╮      ╭─╮
        beat 2  ╭╮      ╭─╮      per-sample median      ╭╮
        beat 3  ╭╮╮     ╭─╮   ────────────────────►     ╭╮   ← the ECG ID
        beat 4  ╭╮      ╭─╮      (ectopics thrown out)  ╰╯     of ONE study
        beat 5  ╭╯╰╮ ← PVC: excluded, not averaged in

   ══ THE FOUR THINGS THAT MAKE IT HONEST ══
   1. ECTOPICS ARE THROWN OUT, NOT AVERAGED IN. A premature beat has a
      different origin and a different shape; averaging it into the
      template would contaminate the very reference everything else is
      compared against. Two independent gates catch them — PREMATURITY
      (its RR is far from this record's median) and SHAPE (it correlates
      poorly with the record's own preliminary template).
   2. THE BEATS ARE RE-ALIGNED BEFORE AVERAGING. R-peak detection is
      accurate to a sample or two; at 320 Hz that is ±6 ms of jitter, and
      averaging jittered beats SMEARS the QRS — the template comes out
      wider than any beat in it, which would then read as a widened QRS.
      A cross-correlation refinement removes it.
   3. THE MEDIAN, NOT THE MEAN. One surviving artefact moves a mean; it
      cannot move a median.
   4. THE SPREAD IS KEPT. `dispersion` is the per-sample MAD across the
      contributing beats — the record's own answer to "how repeatable was
      this?", and the raw material for the identity's tolerance corridor.

   ══ THE CANONICAL GRID ══
   Templates from different recordings must be comparable sample-for-
   sample, so every template is resampled onto ONE grid: 250 ms before R
   to 450 ms after, at 320 Hz. Our own hardware runs at exactly 320 Hz, so
   its data lands on the grid without interpolation — resolution is never
   invented, only ever preserved. An imported 500 Hz CSV is resampled down,
   which is lossy and unavoidable; nothing else in the pipeline changes.

   ══ WHAT THIS FILE MUST NOT DO ══
   No interpretation, same as `ecgAnalysis.ts`. It returns a curve and a
   count. What that curve means is not a question this layer may answer.
   ================================================================== */

import { DISPLAY_FS } from './ecgDSP';
import type { EcgLeadName } from '../types/ecg';
import type { BeatRejectReason, BeatTemplate, RejectedBeat } from '../types/ecgIdentity';

/* ══════════════════ The canonical grid ══════════════════ */

/** Sample rate every template is expressed on — the hardware's own rate. */
export const TEMPLATE_FS = DISPLAY_FS;
/** Window before R. 250 ms comfortably contains P and the PR segment. */
export const TEMPLATE_PRE_MS = 250;
/** Window after R. 450 ms contains the ST segment and the whole T wave. */
export const TEMPLATE_POST_MS = 450;

export const TEMPLATE_PRE_SAMPLES = Math.round((TEMPLATE_PRE_MS / 1000) * TEMPLATE_FS);
export const TEMPLATE_POST_SAMPLES = Math.round((TEMPLATE_POST_MS / 1000) * TEMPLATE_FS);
/** Total length of every template array. R sits at `TEMPLATE_PRE_SAMPLES`. */
export const TEMPLATE_SAMPLES = TEMPLATE_PRE_SAMPLES + TEMPLATE_POST_SAMPLES + 1;

/**
 * ★ Bump this whenever the maths below changes.
 *
 * Templates are cached on the device and a cache holding two generations
 * of the algorithm would silently average them into one baseline — which
 * is worse than having no baseline, because it looks fine. Callers compare
 * this against the cached value and recompute on a mismatch.
 */
export const TEMPLATE_VERSION = 2;

/**
 * How many rejected beats are kept for display, per recording.
 *
 * Four is enough to show a reader what was thrown out and why; keeping all
 * of them would put a second copy of a noisy recording in the cache to
 * illustrate a point three beats already make.
 */
export const MAX_KEPT_REJECTS = 4;

/* ══════════════════ Tunables, named and justified ══════════════════ */

/** The isoelectric estimate is taken from this window before R (PR segment). */
const ISO_FROM_MS = 200;
const ISO_TO_MS = 120;

/** A beat whose RR differs from the record's median by more than this is premature. */
const PREMATURITY_FRACTION = 0.2;

/** Realignment searches ± this far for the best correlation with the template. */
const REALIGN_WINDOW_MS = 25;

/** Correlation is judged over the QRS core only — the part that defines timing. */
const CORE_BEFORE_R_MS = 60;
const CORE_AFTER_R_MS = 60;

/** Below this correlation with the record's own template, a beat is not this beat. */
const MIN_BEAT_CORRELATION = 0.9;

/** Fewer contributing beats than this and a template is not worth building. */
export const MIN_TEMPLATE_BEATS = 3;

/** MAD → σ for a normal distribution. Standard constant, not tuned. */
const MAD_TO_SIGMA = 1.4826;

/* ══════════════════ Small numeric helpers ══════════════════ */

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Pearson correlation of two equal-length spans.
 *
 * Correlation and not RMSE, deliberately: it is invariant to gain and to
 * offset, so it answers "is this the same SHAPE" without also answering
 * "was the electrode contact as good", which is a separate question with
 * a separate metric.
 */
export function correlate(a: ArrayLike<number>, b: ArrayLike<number>, from = 0, to?: number): number {
  const end = Math.min(to ?? a.length, a.length, b.length);
  const n = end - from;
  if (n < 2) return 0;

  let sumA = 0;
  let sumB = 0;
  for (let i = from; i < end; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;

  let num = 0;
  let devA = 0;
  let devB = 0;
  for (let i = from; i < end; i++) {
    const x = a[i] - meanA;
    const y = b[i] - meanB;
    num += x * y;
    devA += x * x;
    devB += y * y;
  }
  const denom = Math.sqrt(devA * devB);
  // A perfectly flat span has no shape to correlate. Zero is the honest
  // answer; 1 ("identical") would let two dead leads look like a match.
  return denom > 1e-12 ? num / denom : 0;
}

/** Linear resample of `src` (at `srcFs`) onto the canonical grid. */
function toCanonicalGrid(src: Float32Array, srcFs: number, srcRIndex: number): Float32Array {
  const out = new Float32Array(TEMPLATE_SAMPLES);
  const ratio = srcFs / TEMPLATE_FS;

  for (let i = 0; i < TEMPLATE_SAMPLES; i++) {
    // Position relative to R on the canonical grid → the same position on the source grid.
    const pos = srcRIndex + (i - TEMPLATE_PRE_SAMPLES) * ratio;
    const i0 = Math.floor(pos);
    const i1 = i0 + 1;
    if (i0 < 0 || i1 >= src.length) {
      out[i] = i0 < 0 ? src[0] ?? 0 : src[src.length - 1] ?? 0;
    } else {
      const w = pos - i0;
      out[i] = src[i0] * (1 - w) + src[i1] * w;
    }
  }
  return out;
}

/* ══════════════════ Beat selection ══════════════════ */

interface Candidate {
  /** R-peak index in the SOURCE signal. */
  r: number;
  /** Lag applied by the realignment pass, in source samples. */
  lag: number;
}

/**
 * Keep the beats whose RR agrees with the record's own rhythm.
 *
 * A premature beat is not a noisy version of the normal beat — it is a
 * different beat, from a different place in the heart. Its RR gives it
 * away before its shape does, and the RR test is cheap and independent of
 * the template we are about to build, which matters: gating on shape alone
 * would be circular.
 */
function rejectPremature(rPeaks: number[]): { kept: number[]; premature: number[] } {
  if (rPeaks.length < 3) return { kept: [...rPeaks], premature: [] };

  const rr: number[] = [];
  for (let i = 1; i < rPeaks.length; i++) rr.push(rPeaks[i] - rPeaks[i - 1]);
  const medianRr = medianOf(rr);
  if (medianRr <= 0) return { kept: [...rPeaks], premature: [] };

  const lo = medianRr * (1 - PREMATURITY_FRACTION);
  const hi = medianRr * (1 + PREMATURITY_FRACTION);

  const kept: number[] = [];
  const premature: number[] = [];
  for (let i = 0; i < rPeaks.length; i++) {
    const before = i > 0 ? rPeaks[i] - rPeaks[i - 1] : medianRr;
    const after = i < rPeaks.length - 1 ? rPeaks[i + 1] - rPeaks[i] : medianRr;
    /* BOTH neighbours are tested. A premature beat is early (short RR
       before) AND followed by a compensatory pause (long RR after) — and
       the pause is what would otherwise let the NEXT, perfectly normal
       beat look abnormal. Testing both intervals rejects the culprit and
       spares its neighbour. */
    if (before >= lo && before <= hi && after >= lo && after <= hi) kept.push(rPeaks[i]);
    else premature.push(rPeaks[i]);
  }
  return { kept, premature };
}

/* ══════════════════ THE ENTRY POINT ══════════════════ */

export interface BeatTemplateResult {
  /** One template per lead handed in. Empty when nothing could be built. */
  leads: Partial<Record<EcgLeadName, BeatTemplate>>;
  /** Beats averaged into every lead's template (they share one beat set). */
  beatsUsed: number;
  beatsRejected: number;
  /** Where R sits in every template. */
  rIndex: number;
  sampleRate: number;
  /** Up to `MAX_KEPT_REJECTS` of the discarded beats, on the reference lead. */
  rejected: RejectedBeat[];
}

/**
 * Build the representative beat of one recording, per lead.
 *
 * `leads` must be REPORT-FILTERED and `rPeaks` must come from the same
 * `analyseLimbEcg` pass that produced the recording's measurements — so a
 * template and the numbers printed beside it describe the same beats.
 *
 * The beat SET is chosen once, on the reference lead, and applied to every
 * other lead unchanged. That is physiology, not an optimisation: there is
 * one heart and one depolarisation, so a beat that is ectopic in lead II is
 * ectopic in aVF. Choosing per lead would let the leads disagree about
 * which beats exist, and the templates would no longer be simultaneous.
 */
export function buildBeatTemplates(
  leads: Partial<Record<EcgLeadName, Float32Array>>,
  rPeaks: number[],
  fs: number,
  referenceLead: EcgLeadName = 'II',
): BeatTemplateResult {
  const empty: BeatTemplateResult = {
    leads: {},
    beatsUsed: 0,
    beatsRejected: rPeaks.length,
    rIndex: TEMPLATE_PRE_SAMPLES,
    sampleRate: TEMPLATE_FS,
    rejected: [],
  };

  const leadNames = Object.keys(leads) as EcgLeadName[];
  const reference = leads[referenceLead] ?? leads[leadNames[0]];
  if (!reference || fs <= 0 || rPeaks.length < MIN_TEMPLATE_BEATS) return empty;

  const ms = (v: number) => Math.round((v / 1000) * fs);
  const pre = ms(TEMPLATE_PRE_MS);
  const post = ms(TEMPLATE_POST_MS);
  const realign = ms(REALIGN_WINDOW_MS);

  /* ── 1. Prematurity gate, then the window gate ───────────────────
     A beat too close to either end of the recording has no full window
     around it. Padding it would invent samples that were never measured;
     dropping it costs one beat out of a dozen. */
  const { kept: onTime, premature } = rejectPremature(rPeaks);
  const inWindow = (r: number) => r - pre - realign >= 0 && r + post + realign < reference.length;
  const candidates: Candidate[] = onTime.filter(inWindow).map((r) => ({ r, lag: 0 }));

  let rejected = premature.length + (onTime.length - candidates.length);
  if (candidates.length < MIN_TEMPLATE_BEATS) return { ...empty, beatsRejected: rPeaks.length };

  /* ── 2. Isoelectric correction, per beat ─────────────────────────
     Each beat is levelled on its OWN PR segment before it is averaged.
     Without this the residual baseline wander — the part the filter
     legitimately leaves behind — offsets the beats vertically, and a
     median across vertically-scattered beats flattens the ST segment,
     which is precisely the region worth watching. */
  const isoFrom = ms(ISO_FROM_MS);
  const isoTo = ms(ISO_TO_MS);
  const isoLevel = (signal: Float32Array, r: number, lag: number): number => {
    const a = Math.max(0, r + lag - isoFrom);
    const b = Math.max(a + 1, r + lag - isoTo);
    const span: number[] = [];
    for (let i = a; i < b && i < signal.length; i++) span.push(signal[i]);
    return medianOf(span);
  };

  /** Cut one beat out of one lead, levelled, on the SOURCE grid. */
  const cut = (signal: Float32Array, c: Candidate): Float32Array => {
    const level = isoLevel(signal, c.r, c.lag);
    const out = new Float32Array(pre + post + 1);
    for (let i = 0; i < out.length; i++) {
      const j = c.r + c.lag - pre + i;
      out[i] = (j >= 0 && j < signal.length ? signal[j] : 0) - level;
    }
    return out;
  };

  /** Per-sample median across a set of equal-length beats. */
  const medianStack = (beats: Float32Array[]): Float32Array => {
    const len = beats[0].length;
    const out = new Float32Array(len);
    const column = new Array<number>(beats.length);
    for (let i = 0; i < len; i++) {
      for (let b = 0; b < beats.length; b++) column[b] = beats[b][i];
      out[i] = medianOf(column);
    }
    return out;
  };

  /* ── 3. Preliminary template, on the reference lead ──────────────
     Built from the R peaks as detected. It is only good enough to align
     against — which is all it is used for. */
  const preliminary = medianStack(candidates.map((c) => cut(reference, c)));

  /* ── 4. Realign each beat against it, over the QRS core ──────────
     The core window only: correlating over the whole 700 ms would let a
     large T wave dominate the alignment, and it is the QRS whose timing
     the template must preserve. */
  const coreFrom = pre - ms(CORE_BEFORE_R_MS);
  const coreTo = pre + ms(CORE_AFTER_R_MS);

  for (const c of candidates) {
    let bestLag = 0;
    let bestScore = -Infinity;
    for (let lag = -realign; lag <= realign; lag++) {
      const trial = cut(reference, { r: c.r, lag });
      const score = correlate(trial, preliminary, coreFrom, coreTo);
      if (score > bestScore) {
        bestScore = score;
        bestLag = lag;
      }
    }
    c.lag = bestLag;
  }

  /* ── 5. Shape gate, AFTER alignment ──────────────────────────────
     Judging shape before realignment would fail beats that were merely
     mis-detected by 6 ms — throwing away good data and, worse, throwing
     it away non-randomly. */
  const accepted: Candidate[] = [];
  const discarded: RejectedBeat[] = [];

  /** Keep a rejected beat as evidence, bounded. See `MAX_KEPT_REJECTS`. */
  const keepReject = (c: Candidate, reason: BeatRejectReason, beat?: Float32Array) => {
    if (discarded.length >= MAX_KEPT_REJECTS) return;
    const samples = beat ?? cut(reference, c);
    discarded.push({
      samples: toCanonicalGrid(samples, fs, pre),
      reason,
      correlation: Math.max(0, correlate(samples, preliminary, coreFrom, coreTo)),
      atSec: c.r / fs,
    });
  };

  for (const c of candidates) {
    const beat = cut(reference, c);
    if (correlate(beat, preliminary, coreFrom, coreTo) >= MIN_BEAT_CORRELATION) accepted.push(c);
    else {
      rejected++;
      keepReject(c, 'dissimilar', beat);
    }
  }

  /* The premature ones are kept too, and they are the interesting case: a
     beat thrown out for its TIMING usually looks different as well, and
     showing it next to the template is what lets a reader see that for
     themselves rather than take the RR test on trust. Only those with a
     full window — a beat clipped by the end of the recording has no
     complete shape to draw, so it stays a count. */
  for (const r of premature) {
    if (inWindow(r)) keepReject({ r, lag: 0 }, 'premature');
  }

  if (accepted.length < MIN_TEMPLATE_BEATS) {
    return { ...empty, beatsRejected: rPeaks.length, rejected: discarded };
  }

  /* ── 6. Final template + dispersion, per lead, on the canonical grid ── */
  const out: Partial<Record<EcgLeadName, BeatTemplate>> = {};

  for (const lead of leadNames) {
    const signal = leads[lead];
    if (!signal || signal.length === 0) continue;

    const beats = accepted.map((c) => cut(signal, c));
    const stacked = medianStack(beats);

    // Robust spread: MAD about the median, scaled to a σ-equivalent so the
    // corridor downstream can be reasoned about in the usual units.
    const spread = new Float32Array(stacked.length);
    const column = new Array<number>(beats.length);
    for (let i = 0; i < stacked.length; i++) {
      for (let b = 0; b < beats.length; b++) column[b] = Math.abs(beats[b][i] - stacked[i]);
      spread[i] = medianOf(column) * MAD_TO_SIGMA;
    }

    out[lead] = {
      samples: toCanonicalGrid(stacked, fs, pre),
      dispersion: toCanonicalGrid(spread, fs, pre),
      beatsUsed: accepted.length,
      beatsRejected: rejected,
      // Only the reference lead carries the evidence: it is what the beat
      // decisions were MADE on, and six copies would be six times the
      // cache for the same conclusion.
      rejected: lead === referenceLead ? discarded : [],
    };
  }

  return {
    leads: out,
    beatsUsed: accepted.length,
    beatsRejected: rejected,
    rIndex: TEMPLATE_PRE_SAMPLES,
    sampleRate: TEMPLATE_FS,
    rejected: discarded,
  };
}

// v2.0.0 — Keeps up to four of the REJECTED beats (with reason, correlation and
//          where in the recording they sat), so "3 beats were not used" can be
//          drawn against the accepted beat instead of asserted. TEMPLATE_VERSION
//          → 2: a v1 cache entry has no evidence in it and is recomputed.
// v1.0.0 — The representative (median) beat of one recording: prematurity and
//          shape gates, cross-correlation realignment before averaging, a
//          per-sample median rather than a mean, and the per-sample spread kept
//          so the identity's tolerance corridor can be built from measured
//          repeatability instead of a guessed constant.
