/* ==================================================================
   leadFusion — one cleaner Lead II out of two measured copies of it.

   Firmware v3 measures Lead II twice: copy A is LL#1−RA (the electrode pair
   every earlier device had), copy B is LL#2−RA (a second left-leg electrode).
   Both see the same heart. They do NOT see the same noise: each leg electrode
   has its own contact noise, its own motion artefact and its own patch of
   muscle under it. This module turns that redundancy into a quieter trace.

   ══ THE CONSTRAINT THAT SHAPES EVERYTHING BELOW ══
   Nothing here may remove diagnostic bandwidth. Ischaemia lives in the ST
   level and in fine QRS detail, i.e. anywhere from 0.05 to 150 Hz, and muscle
   noise sits right on top of it — so the usual cure (a 40 Hz low-pass) is
   forbidden. There is therefore NO frequency-selective filter in the signal
   path of this file. The two things it does are:

     1. FUSION.  out = A − w(t)·d(t), where d = A − g·B is the DISAGREEMENT
        between the copies. The heart is the same in both, so it cancels in
        d: d is a noise reference with no ECG in it, measured in-band, for
        free. w is the fraction of d that belongs to copy A — estimated from
        the record itself (w = cov(A,d)/var(d), the classic noise canceller
        with a signal-free reference). For noise this is the weighted mean
        (1−w)·A + w·g·B with weights that always sum to one. "Use only A",
        "use only B" and "average them" are just w = 0, 1 and ½, so choosing
        the cleanest of those is not a separate step — it is what estimating
        w means. An electrode that gets bumped drives its own share of d up,
        and is weighted out for exactly as long as the bump lasts.
        Copy A itself passes at UNIT GAIN AT EVERY FREQUENCY, whatever w
        does; only the reference d is ever shaped (its drift, its repeatable
        cardiac residue and — inside the QRS — its fast part are removed, so
        that none of them can be subtracted from the ECG). The result is
        therefore copy A's Lead II with noise taken off it: same R amplitude,
        same ST level, not a blend of two slightly different leads.

     2. BEAT-SYNCHRONOUS AVERAGING, trust-gated. Noise that both copies share
        (it enters through RA, which they have in common) cannot be fused
        away. It is, however, not repeatable from beat to beat, and the ECG
        is. Each beat is blended towards the average of its NEIGHBOURS — but
        only (a) as far as that beat resembles them, (b) only at the points
        of the cycle where beats measurably do not differ from one another,
        (c) never inside the QRS, and (d) only in what is FAST within the
        beat: the slow part of "this beat minus its neighbours" is baseline
        — or a genuinely different ST level — and is left exactly as
        measured, so this stage cannot move a level, only quieten it. A beat
        that looks unlike the rest is passed through untouched; a repeated
        ectopic shape is averaged only against its own kind. Neighbours are
        weighted by distance in time.

   ══ WHAT THE FILTERS IN THIS FILE ARE FOR ══
   A 0.67 Hz zero-phase high-pass, a mains notch and a short smoother do appear
   below. They are applied to private copies used to ESTIMATE things (where the
   beats are, how noisy each copy is, how one beat differs from its neighbours)
   and to the noise reference d. None of them is ever applied to the ECG. The
   output is assembled in the raw domain as `A − w·d + correction`: it keeps
   copy A's own baseline and its own mains pickup, so the report chain
   downstream (reportFilter.ts) sees exactly the kind of signal it has always
   been handed, and old two-channel recordings never enter this file at all.

   ══ MEASURED (scripts/verify-fusion.ts) ══
   Simulated, truth known, 25 µV independent + 15 µV shared EMG on a drifting
   baseline: error vs truth 28.6 → 24.3 µV after fusion (the theoretical limit
   for two copies is 23.2) → 15.6 µV after stage 2; R amplitude within 0.5 %,
   ST level within 3 µV of the truth (within 9 µV at 150 bpm); a lone ectopic
   beat changed by 0.00 µV; a 3 mV bump on copy B held to 11 µV where a plain
   average shows 246 µV; 60 s fuses in ~0.2 s.
   On a real 132 s HW_PLAYGROUND recording (IN3−IN1 / IN4−IN1): non-repeatable
   noise down 6–11 dB per 10 s segment (e.g. 26 → 8 µV), ST level within 9 µV
   and R amplitude within 3 % of copy A — and most of that R "change" is copy
   A's own noisy PR reference being cleaned, not the R wave moving.

   ══ LIMITS, STATED PLAINLY ══
   - Noise entering through the shared RA electrode is common to both copies.
     Fusion cannot touch it; only stage 2 can, and only its non-repeatable part.
   - Stage 2 assumes beats of one class repeat. Beat-to-beat phenomena smaller
     than the noise (microvolt T-wave alternans) will be averaged towards
     their mean. That is what the on/off switch in the viewer is for.
   - The two copies must measure the SAME lead. In the chest protocol the probe
     electrode moves and copy B does not follow it — callers must not fuse
     there. The same-lead check below is a backstop, not the rule.
   - Lead I has a single copy and is never mixed into this estimate.

   Inspired by the multichannel bench (MWF + per-beat electrode rejection +
   phase-dependent averaging gain); reduced to the two-copies-of-one-lead
   case, where the spatial filter collapses to a single scalar weight.
   ================================================================== */

import { detectRPeaks } from './ecgAnalysis';

export interface LeadFusionOptions {
  /** Mains frequency kept OUT of the noise estimate (removed downstream). */
  mainsHz?: 50 | 60;
  /** Stage 2 (beat-synchronous averaging). Stage 1 (fusion) always runs. */
  beatAveraging?: boolean;
}

export type LeadFusionFallback =
  | 'no-second-copy'
  | 'length-mismatch'
  | 'too-short'
  | 'not-finite'
  | 'flat'
  | 'not-same-lead';

/** What was done, in numbers a report can print. All noise figures are the
    robust RMS of the NON-REPEATABLE part of the trace outside the QRS, in µV. */
export interface LeadFusionInfo {
  mode: 'fused' | 'single';
  /** Set when `mode` is 'single': why copy B was not used. */
  fallback?: LeadFusionFallback;
  /** Amplitude of copy B relative to copy A (1 = identical pick-up). */
  gain: number;
  /** Shape agreement between the two copies' median beats, −1…1. */
  copyAgreement: number;
  /** Average share of copy B in the mix, 0…1 (½ = both equally clean). */
  meanWeightB: number;
  noiseCopyAUv: number;
  noiseFusedUv: number;
  noiseOutputUv: number;
  beats: number;
  /** Beats blended towards their neighbours at all. */
  beatsAveraged: number;
  /** Beats left exactly as measured because they looked unlike the rest. */
  beatsPassedThrough: number;
}

export interface LeadFusionResult {
  /** Lead II in mV, raw domain (baseline and mains still in it). When `info.mode`
      is 'single' this IS the input array — treat it as read-only. */
  fused: Float32Array;
  info: LeadFusionInfo;
}

/* ── tuning, each with its reason ─────────────────────────────── */

/** Copies whose median beats correlate below this are not the same lead. */
const SAME_LEAD_MIN_CORR = 0.9;
/** …and neither is a pair whose amplitudes differ by more than 2×. */
const GAIN_MIN = 0.5;
const GAIN_MAX = 2;
/** Weight window. Long enough to estimate a covariance, short enough that a
    bumped electrode is weighted out within a beat of the bump. */
const WEIGHT_WINDOW_S = 0.6;
const WEIGHT_STEP_S = 0.1;
/** Disagreement slower than this is electrode drift, not noise to be fused: the
    output keeps copy A's own wander. 0.67 Hz is the corner the diagnostic-ECG
    standards accept for a ZERO-PHASE high-pass — and here it is not even applied
    to the ECG, only to the heart-free noise reference. */
const DRIFT_CUTOFF_HZ = 0.67;
/** Disagreement below this (mV RMS) carries no information about which copy is
    cleaner — the weight relaxes to ½ instead of chasing arithmetic noise. */
const WEIGHT_FLOOR_MV = 0.002;
/** QRS samples are kept out of the weight statistics: respiration modulates R
    amplitude, and that modulation would otherwise pose as noise. */
const QRS_MASK_S = 0.06;
/** Stage 2 never averages inside this half-width around R … */
const QRS_GUARD_S = 0.05;
/** … and fades in over this much beyond it. */
const QRS_GUARD_FADE_S = 0.02;
/** Inside the QRS guard the noise reference is reduced to its part slower than
    this. The copies' QRS never line up to the last fraction of a sample, so the
    FAST disagreement there is mostly a timing residue, not noise — and it sits
    exactly where R amplitude is read. A slow artefact under the QRS is still
    fused, so no pedestal is left behind. */
const QRS_REFERENCE_SMOOTH_S = 0.06;
/** Stage 2 cancels only what is faster than this within a beat. The slow part of
    "this beat minus its neighbours" is baseline offset and tilt — or a genuinely
    different ST level — and neither is stage 2's to touch. */
const BEAT_CORRECTION_SLOW_S = 0.25;
/** Neighbour weighting for the local template: Gaussian σ and reach, in beats. */
const NEIGHBOUR_SIGMA_BEATS = 4.5;
const NEIGHBOUR_REACH_BEATS = 8;
/** Morphology is scored around the complex, not over the flat remainder. */
const SCORE_PRE_S = 0.12;
const SCORE_POST_S = 0.38;
const ALIGN_MAX_LAG_S = 0.045;
/** Anomalous beats that resemble each other this well form their own class. */
const CLASS_MIN_CORR = 0.8;

/* ── small numerics ───────────────────────────────────────────── */

function medianOf(values: ArrayLike<number>): number {
  const a = Array.from(values).sort((x, y) => x - y);
  if (a.length === 0) return 0;
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : 0.5 * (a[m - 1] + a[m]);
}

function robustSigma(values: ArrayLike<number>): number {
  const m = medianOf(values);
  const dev = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) dev[i] = Math.abs(values[i] - m);
  return 1.4826 * medianOf(dev);
}

function percentileOf(values: ArrayLike<number>, p: number): number {
  const a = Array.from(values).sort((x, y) => x - y);
  if (a.length === 0) return 0;
  return a[Math.min(a.length - 1, Math.max(0, Math.round(p * (a.length - 1))))];
}

function biquad(x: Float64Array, b: number[], a: number[]): Float64Array {
  const y = new Float64Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = v;
    y[i] = v;
  }
  return y;
}

/** Zero-phase mains notch. ESTIMATION ONLY — see the file header. */
function notchMains(x: Float64Array, fs: number, f0: number): Float64Array {
  if (f0 <= 0 || f0 >= fs / 2) return Float64Array.from(x);
  const w0 = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w0) / (2 * 30);
  const a0 = 1 + alpha;
  const b = [1 / a0, (-2 * Math.cos(w0)) / a0, 1 / a0];
  const a = [1, (-2 * Math.cos(w0)) / a0, (1 - alpha) / a0];
  const pad = Math.min(x.length - 1, Math.round(fs * 0.5));
  const ext = new Float64Array(x.length + 2 * pad);
  for (let i = 0; i < pad; i++) {
    ext[i] = x[0];
    ext[ext.length - 1 - i] = x[x.length - 1];
  }
  ext.set(x, pad);
  const back = biquad(biquad(ext, b, a).reverse(), b, a).reverse();
  return back.slice(pad, pad + x.length);
}

function ncc(p: Float64Array, q: Float64Array, from: number, len: number): number {
  let mp = 0;
  let mq = 0;
  for (let j = 0; j < len; j++) {
    mp += p[from + j];
    mq += q[from + j];
  }
  mp /= len;
  mq /= len;
  let num = 0;
  let dp = 0;
  let dq = 0;
  for (let j = 0; j < len; j++) {
    const u = p[from + j] - mp;
    const v = q[from + j] - mq;
    num += u * v;
    dp += u * u;
    dq += v * v;
  }
  return num / (Math.sqrt(dp * dq) + 1e-18);
}

/* ── beat geometry ────────────────────────────────────────────── */

interface BeatFrame {
  pre: number;
  post: number;
  len: number;
  scoreFrom: number;
  scoreLen: number;
}

function beatFrame(peaks: number[], fs: number): BeatFrame {
  const rr: number[] = [];
  for (let k = 1; k < peaks.length; k++) rr.push(peaks[k] - peaks[k - 1]);
  const rrMed = Math.min(Math.max(rr.length ? medianOf(rr) : 0.86 * fs, 0.35 * fs), 1.8 * fs);
  // Windows tile the whole cycle with a little overlap, so every sample of the
  // record belongs to some beat.
  const pre = Math.round(Math.min(Math.max(0.42 * rrMed, 0.22 * fs), 0.5 * fs));
  const post = Math.round(Math.min(Math.max(0.62 * rrMed, 0.34 * fs), 0.9 * fs));
  const scorePre = Math.min(pre, Math.round(SCORE_PRE_S * fs));
  const scorePost = Math.min(post, Math.round(SCORE_POST_S * fs));
  return { pre, post, len: pre + post, scoreFrom: pre - scorePre, scoreLen: scorePre + scorePost };
}

/** One beat window read at a possibly fractional position. The edge sample is
    repeated rather than dropping the first and last beats — they are real data. */
function cutBeat(src: Float64Array, centre: number, frame: BeatFrame): Float64Array {
  const n = src.length;
  const out = new Float64Array(frame.len);
  for (let j = 0; j < frame.len; j++) {
    const x = centre - frame.pre + j;
    const i = Math.floor(x);
    const f = x - i;
    const p = src[i < 0 ? 0 : i >= n ? n - 1 : i];
    const q = src[i + 1 < 0 ? 0 : i + 1 >= n ? n - 1 : i + 1];
    out[j] = p + f * (q - p);
  }
  return out;
}

/** Median across beats, then the mean of the beats that sit close to it: an
    average is quieter than a median once the outliers are gone. */
function robustTemplate(rows: Float64Array[], members: number[], len: number): Float64Array {
  const t = new Float64Array(len);
  if (members.length === 0) return t;
  const col = new Float64Array(members.length);
  for (let j = 0; j < len; j++) {
    for (let m = 0; m < members.length; m++) col[m] = rows[members[m]][j];
    t[j] = medianOf(col);
  }
  if (members.length < 4) return t;
  const dist = members.map((b) => {
    let s = 0;
    for (let j = 0; j < len; j++) {
      const e = rows[b][j] - t[j];
      s += e * e;
    }
    return s;
  });
  const dm = medianOf(dist);
  const ds = robustSigma(dist) || dm * 0.5;
  const kept = members.filter((_, i) => dist[i] <= dm + 2.5 * ds);
  const use = kept.length >= 3 ? kept : members;
  const out = new Float64Array(len);
  for (const b of use) for (let j = 0; j < len; j++) out[j] += rows[b][j];
  for (let j = 0; j < len; j++) out[j] /= use.length;
  return out;
}

function taperWeights(len: number, fs: number): Float64Array {
  const taper = Math.max(2, Math.round(0.05 * fs));
  const w = new Float64Array(len);
  for (let j = 0; j < len; j++) {
    const e = Math.min(j, len - 1 - j);
    w[j] = e >= taper ? 1 : 0.5 - 0.5 * Math.cos((Math.PI * e) / taper);
  }
  return w;
}

/** Lay one template down at every beat (tapered overlap-add): the repeatable
    part of the trace. Samples no beat covers stay zero. */
function synthesise(n: number, centres: number[], template: Float64Array, frame: BeatFrame, taper: Float64Array): Float64Array {
  const acc = new Float64Array(n);
  const wsum = new Float64Array(n);
  for (const c of centres) {
    const base = Math.round(c) - frame.pre;
    for (let j = 0; j < frame.len; j++) {
      const i = base + j;
      if (i < 0 || i >= n) continue;
      acc[i] += taper[j] * template[j];
      wsum[i] += taper[j];
    }
  }
  for (let i = 0; i < n; i++) if (wsum[i] > 1e-9) acc[i] /= wsum[i];
  return acc;
}

function qrsMask(n: number, peaks: number[], halfWidth: number): Uint8Array {
  const mask = new Uint8Array(n);
  for (const p of peaks) {
    for (let i = Math.max(0, p - halfWidth); i <= Math.min(n - 1, p + halfWidth); i++) mask[i] = 1;
  }
  return mask;
}

/** Robust RMS of what does NOT repeat from beat to beat, outside the QRS. */
function nonRepeatableNoise(z: Float64Array, peaks: number[], fs: number): number {
  const n = z.length;
  if (peaks.length < 4) return robustSigma(z);
  const frame = beatFrame(peaks, fs);
  const rows = peaks.map((p) => cutBeat(z, p, frame));
  const template = robustTemplate(rows, peaks.map((_, i) => i), frame.len);
  const sHat = synthesise(n, peaks, template, frame, taperWeights(frame.len, fs));
  const mask = qrsMask(n, peaks, Math.round(QRS_MASK_S * fs));
  const resid: number[] = [];
  for (let i = 0; i < n; i++) if (!mask[i]) resid.push(z[i] - sHat[i]);
  return robustSigma(resid);
}

/** Centred box average, `passes` times (≈ Gaussian), shrinking at the ends.
    Only ever applied to noise terms — the reference d and stage 2's correction —
    never to the ECG. */
function smoothBox(x: Float64Array, width: number, passes: number): Float64Array {
  const n = x.length;
  const half = width >> 1;
  let cur = x;
  for (let p = 0; p < passes; p++) {
    const ps = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) ps[i + 1] = ps[i] + cur[i];
    const next = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const from = Math.max(0, i - half);
      const to = Math.min(n - 1, i + half);
      next[i] = (ps[to + 1] - ps[from]) / (to - from + 1);
    }
    cur = next;
  }
  return cur;
}

/** Zero-phase 2nd-order Butterworth high-pass, run forwards then backwards over
    an odd-reflected extension (so a large electrode offset does not ring at the
    ends). Used on the NOISE REFERENCE only — never on the ECG. */
function highpassZeroPhase(x: Float64Array, fs: number, fc: number): Float64Array {
  const n = x.length;
  const w0 = (2 * Math.PI * fc) / fs;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / Math.SQRT2;
  const a0 = 1 + alpha;
  const b = [(1 + cos) / 2 / a0, -(1 + cos) / a0, (1 + cos) / 2 / a0];
  const a = [1, (-2 * cos) / a0, (1 - alpha) / a0];
  const pad = Math.min(n - 1, Math.round(3 * fs));
  const ext = new Float64Array(n + 2 * pad);
  for (let i = 0; i < pad; i++) {
    ext[pad - 1 - i] = 2 * x[0] - x[i + 1];
    ext[pad + n + i] = 2 * x[n - 1] - x[n - 2 - i];
  }
  ext.set(x, pad);
  // Start each pass from its own first sample, not from zero: the reference
  // sits on millivolts of offset and a zero start would be a step input.
  const run = (v: Float64Array): Float64Array => {
    const y = new Float64Array(v.length);
    let x1 = v[0];
    let x2 = v[0];
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < v.length; i++) {
      const o = b[0] * v[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
      x2 = x1;
      x1 = v[i];
      y2 = y1;
      y1 = o;
      y[i] = o;
    }
    return y;
  };
  return run(run(ext).reverse()).reverse().slice(pad, pad + n);
}

/**
 * The repeatable part of the disagreement, per point of the cycle.
 *
 * An averaged template of N beats still carries 1/√N of the noise, and that
 * noise would be stamped identically onto every beat of the output, where
 * stage 2 can never average it away. So the template is split in two:
 *   - its SMOOTH part (the copies' ST and T differences live here) is kept
 *     whole. Smoothing has already averaged its noise down, and keeping it is
 *     what holds the output's ST level on copy A's instead of letting it slide
 *     part-way to copy B's;
 *   - its ROUGH part is kept only where it stands above its own standard
 *     error — which a real QRS difference (tens of µV) does, and template
 *     noise does not.
 * This shapes the template of the NOISE REFERENCE. The ECG is not smoothed.
 */
function residueTemplate(dz: Float64Array, centres: number[], frame: BeatFrame, fs: number): Float64Array {
  const rows = centres.map((c) => cutBeat(dz, c, frame));
  const t = robustTemplate(rows, centres.map((_, i) => i), frame.len);
  if (rows.length < 2) return t;

  const half = Math.max(1, Math.round(0.03 * fs));
  let smooth = t;
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float64Array(frame.len);
    for (let j = 0; j < frame.len; j++) {
      let sum = 0;
      let cnt = 0;
      for (let k = Math.max(0, j - half); k <= Math.min(frame.len - 1, j + half); k++) {
        sum += smooth[k];
        cnt++;
      }
      next[j] = sum / cnt;
    }
    smooth = next;
  }

  const out = new Float64Array(frame.len);
  for (let j = 0; j < frame.len; j++) {
    let v = 0;
    for (const row of rows) v += (row[j] - t[j]) * (row[j] - t[j]);
    const se2 = v / (rows.length - 1) / rows.length;
    const rough = t[j] - smooth[j];
    out[j] = smooth[j] + rough * Math.max(0, 1 - se2 / (rough * rough + 1e-18));
  }
  return out;
}

/* ── the public entry point ───────────────────────────────────── */

const single = (a: Float32Array, fallback: LeadFusionFallback): LeadFusionResult => ({
  fused: a,
  info: {
    mode: 'single',
    fallback,
    gain: 1,
    copyAgreement: 0,
    meanWeightB: 0,
    noiseCopyAUv: 0,
    noiseFusedUv: 0,
    noiseOutputUv: 0,
    beats: 0,
    beatsAveraged: 0,
    beatsPassedThrough: 0,
  },
});

/**
 * Fuse two raw copies of Lead II (mV, same length, same clock) into one.
 *
 * Never throws and never returns worse than copy A: every condition under
 * which copy B cannot be trusted — absent, a different length, flat, railed
 * into nonsense, or simply not the same lead — returns copy A untouched with
 * `info.fallback` saying why. A recording made before firmware v3 takes the
 * first exit.
 */
export function fuseLeadII(
  copyA: Float32Array,
  copyB: Float32Array | null | undefined,
  fs: number,
  options: LeadFusionOptions = {},
): LeadFusionResult {
  const mainsHz = options.mainsHz ?? 50;
  const beatAveraging = options.beatAveraging ?? true;
  const n = copyA.length;

  if (!copyB || copyB.length === 0) return single(copyA, 'no-second-copy');
  if (copyB.length !== n) return single(copyA, 'length-mismatch');
  if (n < 2 * fs) return single(copyA, 'too-short');
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(copyA[i]) || !Number.isFinite(copyB[i])) return single(copyA, 'not-finite');
  }

  /* ── private estimation copies ── */
  // Baseline out with a LINEAR zero-phase high-pass, not a median. A median
  // baseline is the right tool for a trace someone will read (it spares the ST
  // segment) and the wrong one here: its output has kinks, the kinks land
  // differently on every beat of a drifting record, and stage 2 — which works on
  // differences BETWEEN beats — took them for signal and stamped ~5 µV of them
  // into the ST level. A linear filter bends every beat the same way, so what it
  // does to the ST segment cancels exactly when one beat is compared with
  // another. None of this reaches the output: these copies only answer "where
  // are the beats", "how noisy is each copy" and "how does this beat differ
  // from its neighbours".
  const a = Float64Array.from(copyA);
  const b = Float64Array.from(copyB);
  const za = notchMains(highpassZeroPhase(a, fs, DRIFT_CUTOFF_HZ), fs, mainsHz);
  const zb = notchMains(highpassZeroPhase(b, fs, DRIFT_CUTOFF_HZ), fs, mainsHz);
  if (robustSigma(zb) < 1e-4 || robustSigma(za) < 1e-4) return single(copyA, 'flat');

  /* ── beats, from the copy every device has ── */
  const peaks = detectRPeaks(Float32Array.from(za), fs);
  const haveBeats = peaks.length >= 4;
  const frame = beatFrame(peaks, fs);
  const taper = taperWeights(frame.len, fs);
  const everyBeat = peaks.map((_, i) => i);

  /* ── are these the same lead, and how do their gains compare? ── */
  let gain: number;
  let agreement: number;
  let templateA: Float64Array | null = null;
  let templateB: Float64Array | null = null;
  if (haveBeats) {
    templateA = robustTemplate(peaks.map((p) => cutBeat(za, p, frame)), everyBeat, frame.len);
    templateB = robustTemplate(peaks.map((p) => cutBeat(zb, p, frame)), everyBeat, frame.len);
    agreement = ncc(templateA, templateB, 0, frame.len);
    // Gain from the TEMPLATES, not the samples: noise in copy B would bias a
    // sample-wise fit low, and a biased gain leaks heartbeat into d.
    let mA = 0;
    let mB = 0;
    for (let j = 0; j < frame.len; j++) {
      mA += templateA[j];
      mB += templateB[j];
    }
    mA /= frame.len;
    mB /= frame.len;
    let num = 0;
    let den = 0;
    for (let j = 0; j < frame.len; j++) {
      num += (templateA[j] - mA) * (templateB[j] - mB);
      den += (templateB[j] - mB) * (templateB[j] - mB);
    }
    gain = num / (den + 1e-18);
  } else {
    agreement = ncc(za, zb, 0, n);
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += za[i] * zb[i];
      den += zb[i] * zb[i];
    }
    gain = num / (den + 1e-18);
  }
  if (!(agreement >= SAME_LEAD_MIN_CORR) || !(gain >= GAIN_MIN && gain <= GAIN_MAX)) {
    return single(copyA, 'not-same-lead');
  }

  /* ── the disagreement: a noise reference with no heart in it ── */
  // Built from the RAW copies, not from the baseline-removed ones. Because the
  // heart cancels in it, its own slow part (the electrodes' offset and drift
  // difference) can be taken out with a plain linear high-pass — there is no
  // QRS to protect, so none of the median estimator's cardiac bias gets in.
  // Going through the two estimated baselines instead leaked their DIFFERENCE
  // (~15 µV of slow error on a drifting record) straight into the output.
  //
  // This high-passes the NOISE REFERENCE, not the signal: copy A still passes
  // at unit gain at every frequency. The only consequence is that disagreement
  // slower than DRIFT_CUTOFF_HZ is not fused — the output keeps copy A's own
  // wander, which the report chain's baseline stage removes as it always has.
  const dRaw = new Float64Array(n);
  for (let i = 0; i < n; i++) dRaw[i] = a[i] - gain * b[i];
  const d = highpassZeroPhase(dRaw, fs, DRIFT_CUTOFF_HZ); // what the output uses
  const dz = notchMains(d, fs, mainsHz); // mains kept out — what the estimate uses

  // Two electrodes a few centimetres apart do not see EXACTLY the same heart:
  // the copies' beats differ by a few percent in shape, so d carries a small,
  // REPEATABLE cardiac residue on top of the noise. It is taken out with a
  // template, for two reasons. In the estimate, it would pull w towards
  // cancelling the heart. In the output, subtracting it would quietly move R
  // amplitude and ST level towards copy B's — and the contract of this file is
  // that the result is copy A's Lead II with noise removed, not a new lead.
  let ra: Float64Array = za;
  let dres: Float64Array = dz;
  let dNoise: Float64Array = d;
  let mask: Uint8Array = new Uint8Array(n);
  if (haveBeats && templateA) {
    // Only beats that conform to the prevailing shape may speak for it. An
    // ectopic beat minus the normal template is a millivolt of "residual" that
    // would swamp the covariance, so its whole window sits out of the estimate
    // (w simply carries over it) and nothing is assumed about its residue.
    const fitA = peaks.map((p) => ncc(cutBeat(za, p, frame), templateA as Float64Array, frame.scoreFrom, frame.scoreLen));
    const fitFloor = Math.max(0.5, medianOf(fitA) - Math.max(0.1, 3 * robustSigma(fitA)));
    const conforming = peaks.filter((_, k) => fitA[k] >= fitFloor);
    const sHatA = synthesise(n, conforming, templateA, frame, taper);
    const sHatD = synthesise(n, conforming, residueTemplate(dz, conforming, frame, fs), frame, taper);
    ra = new Float64Array(n);
    dres = new Float64Array(n);
    dNoise = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      ra[i] = za[i] - sHatA[i];
      dres[i] = dz[i] - sHatD[i];
      dNoise[i] = d[i] - sHatD[i];
    }
    mask = qrsMask(n, conforming, Math.round(QRS_MASK_S * fs));
    peaks.forEach((p, k) => {
      if (fitA[k] >= fitFloor) return;
      for (let i = Math.max(0, p - frame.pre); i < Math.min(n, p + frame.post); i++) mask[i] = 1;
    });
  }

  /* ── stage 1: how much of d belongs to copy A, as a function of time ── */
  const winLen = Math.round(WEIGHT_WINDOW_S * fs) | 1;
  const winHalf = winLen >> 1;
  const step = Math.max(1, Math.round(WEIGHT_STEP_S * fs));
  const hann = new Float64Array(winLen);
  for (let j = 0; j < winLen; j++) hann[j] = 0.5 - 0.5 * Math.cos((2 * Math.PI * (j + 0.5)) / winLen);

  const centres: number[] = [];
  for (let c = 0; c < n; c += step) centres.push(c);
  if (centres[centres.length - 1] !== n - 1) centres.push(n - 1);
  const wAt = new Float64Array(centres.length);
  let previous = 0.5;
  for (let k = 0; k < centres.length; k++) {
    let num = 0;
    let den = 0;
    let hs = 0;
    for (let j = 0; j < winLen; j++) {
      const i = centres[k] - winHalf + j;
      if (i < 0 || i >= n || mask[i]) continue;
      num += hann[j] * ra[i] * dres[i];
      den += hann[j] * dres[i] * dres[i];
      hs += hann[j];
    }
    if (hs > 0) {
      const floor = hs * WEIGHT_FLOOR_MV * WEIGHT_FLOOR_MV;
      previous = Math.min(1, Math.max(0, (num + 0.5 * floor) / (den + floor)));
    }
    wAt[k] = previous;
  }
  const w = new Float64Array(n);
  let seg = 0;
  let wSum = 0;
  for (let i = 0; i < n; i++) {
    while (seg < centres.length - 2 && i > centres[seg + 1]) seg++;
    const c0 = centres[seg];
    const c1 = centres[Math.min(centres.length - 1, seg + 1)];
    const f = c1 > c0 ? Math.min(1, Math.max(0, (i - c0) / (c1 - c0))) : 0;
    w[i] = wAt[seg] * (1 - f) + wAt[Math.min(centres.length - 1, seg + 1)] * f;
    wSum += w[i];
  }

  if (haveBeats) {
    const guard = Math.round(QRS_GUARD_S * fs);
    const fade = Math.max(1, Math.round(QRS_GUARD_FADE_S * fs));
    const slowPart = smoothBox(dNoise, Math.round(QRS_REFERENCE_SMOOTH_S * fs) | 1, 2);
    const softened = Float64Array.from(dNoise);
    for (const p of peaks) {
      for (let i = Math.max(0, p - guard - fade); i <= Math.min(n - 1, p + guard + fade); i++) {
        const fromR = Math.abs(i - p);
        const g = fromR <= guard ? 1 : 0.5 + 0.5 * Math.cos((Math.PI * (fromR - guard)) / fade);
        // overlapping guards (very fast rhythm): the stronger protection wins
        const candidate = dNoise[i] + g * (slowPart[i] - dNoise[i]);
        if (Math.abs(candidate - slowPart[i]) < Math.abs(softened[i] - slowPart[i])) softened[i] = candidate;
      }
    }
    dNoise = softened;
  }

  const y1 = new Float64Array(n); // stage-1 result, RAW domain: copy A minus its share of the noise
  for (let i = 0; i < n; i++) y1[i] = a[i] - w[i] * dNoise[i];

  const info: LeadFusionInfo = {
    mode: 'fused',
    gain,
    copyAgreement: agreement,
    meanWeightB: wSum / n,
    noiseCopyAUv: 1000 * nonRepeatableNoise(za, peaks, fs),
    noiseFusedUv: 0,
    noiseOutputUv: 0,
    beats: peaks.length,
    beatsAveraged: 0,
    beatsPassedThrough: 0,
  };

  // Mains is set aside before stage 2 and handed back untouched afterwards.
  // Blending beat by beat would amplitude-modulate it, and a modulated hum has
  // sidebands the narrow notch downstream cannot reach.
  const u = notchMains(highpassZeroPhase(y1, fs, DRIFT_CUTOFF_HZ), fs, mainsHz);
  info.noiseFusedUv = 1000 * nonRepeatableNoise(u, peaks, fs);

  const correction = new Float64Array(n);
  if (beatAveraging && haveBeats) {
    averageBeats(u, fs, correction, info);
  }

  const fused = new Float32Array(n);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    fused[i] = y1[i] + correction[i];
    out[i] = u[i] + correction[i];
  }
  info.noiseOutputUv = 1000 * nonRepeatableNoise(out, peaks, fs);
  return { fused, info };
}

/* ── stage 2 ──────────────────────────────────────────────────── */

/**
 * Fill `correction` with what must be ADDED to `u` to blend each beat towards
 * its neighbours, as far as that beat has earned it. `u` is never modified.
 */
function averageBeats(u: Float64Array, fs: number, correction: Float64Array, info: LeadFusionInfo): void {
  const n = u.length;
  const detected = detectRPeaks(Float32Array.from(u), fs);
  if (detected.length < 4) return;
  const frame = beatFrame(detected, fs);
  const lagMax = Math.round(ALIGN_MAX_LAG_S * fs);

  /* Align every beat to the shape they share, to a fraction of a sample:
     beats each a fraction of a sample off would blur the template's slopes. */
  let centres = detected.map((p) => p as number);
  let rows = centres.map((c) => cutBeat(u, c, frame));
  let template = robustTemplate(rows, centres.map((_, i) => i), frame.len);
  for (let pass = 0; pass < 2; pass++) {
    centres = centres.map((c) => {
      const base = Math.round(c);
      const scoreAt = (lag: number): number =>
        ncc(cutBeat(u, base + lag, frame), template, frame.scoreFrom, frame.scoreLen);
      let bestLag = 0;
      let bestScore = -Infinity;
      for (let lag = -lagMax; lag <= lagMax; lag++) {
        const s = scoreAt(lag);
        if (s > bestScore) {
          bestScore = s;
          bestLag = lag;
        }
      }
      const sm = scoreAt(bestLag - 1);
      const sp = scoreAt(bestLag + 1);
      const den = sm - 2 * bestScore + sp;
      const frac = Math.abs(den) > 1e-12 ? Math.max(-0.5, Math.min(0.5, (0.5 * (sm - sp)) / den)) : 0;
      return base + bestLag + frac;
    });
    rows = centres.map((c) => cutBeat(u, c, frame));
    template = robustTemplate(rows, centres.map((_, i) => i), frame.len);
  }
  const count = centres.length;
  const all = centres.map((_, i) => i);

  /* How ordinary is each beat? Thresholds come from THIS record's own spread,
     so a noisy recording is not held to a quiet recording's standard. */
  const fit = all.map((k) => ncc(rows[k], template, frame.scoreFrom, frame.scoreLen));
  const fitMedian = medianOf(fit);
  const spread = robustSigma(fit.filter((c) => c >= fitMedian)) || 0.03;
  const ref = percentileOf(fit, 0.7);
  const low = Math.max(0.15, ref - Math.max(0.12, 3 * spread));
  const trustOf = (c: number): number => Math.max(0, Math.min(1, (c - low) / (ref - low + 1e-9)));

  /* Repeated ectopy earns its own template; a one-off is never rewritten. */
  const cls = new Int32Array(count); // 0 = prevailing rhythm, −1 = one-off
  let classes = 1;
  const odd = all.filter((k) => fit[k] < low);
  const placed = new Set<number>();
  for (const k of odd) {
    if (placed.has(k)) continue;
    const group = [k];
    for (const m of odd) {
      if (m === k || placed.has(m)) continue;
      if (ncc(rows[k], rows[m], frame.scoreFrom, frame.scoreLen) > CLASS_MIN_CORR) group.push(m);
    }
    if (group.length >= 2) {
      for (const g of group) {
        cls[g] = classes;
        placed.add(g);
      }
      classes++;
    } else {
      cls[k] = -1;
      placed.add(k);
    }
  }

  const guard = Math.round(QRS_GUARD_S * fs);
  const fade = Math.max(1, Math.round(QRS_GUARD_FADE_S * fs));
  const taper = taperWeights(frame.len, fs);
  const acc = new Float64Array(n);
  const wsum = new Float64Array(n);

  for (let c = 0; c < classes; c++) {
    const members = all.filter((k) => cls[k] === c);
    // Below four beats there is no way to tell variation from noise — leave
    // the class exactly as measured.
    if (members.length < 4) continue;
    const classTemplate = robustTemplate(rows, members, frame.len);
    const classFit = members.map((k) => ncc(rows[k], classTemplate, frame.scoreFrom, frame.scoreLen));

    /* Per point of the cycle: do beats genuinely differ here? Successive
       differences measure spread without assuming a mean. Most of the cycle
       carries no real beat-to-beat change, so the TYPICAL spread is a direct
       read of the noise, and anything above it is the heart — kept. */
    const spreadAt = new Float64Array(frame.len);
    for (let j = 0; j < frame.len; j++) {
      let v = 0;
      for (let m = 1; m < members.length; m++) {
        const e = rows[members[m]][j] - rows[members[m - 1]][j];
        v += e * e;
      }
      spreadAt[j] = v / (2 * (members.length - 1));
    }
    const noiseVar = medianOf(spreadAt) || 1e-18;
    const keep = new Float64Array(frame.len);
    for (let j = 0; j < frame.len; j++) {
      const excess = Math.max(0, spreadAt[j] - noiseVar);
      let k = excess / (excess + noiseVar);
      // The QRS is never averaged: noise is invisible on its slopes, while R
      // amplitude and QRS width are numbers someone will act on.
      const fromR = Math.abs(j - frame.pre);
      if (fromR <= guard) k = 1;
      else if (fromR < guard + fade) {
        const t = (fromR - guard) / fade;
        k = 1 - (1 - k) * (0.5 - 0.5 * Math.cos(Math.PI * t));
      }
      keep[j] = k;
    }

    for (let mi = 0; mi < members.length; mi++) {
      const k = members[mi];
      const trust = c === 0 ? trustOf(fit[k]) : trustOf(classFit[mi]);
      if (trust <= 0) continue;
      // Neighbours weighted by distance in beats: nearly all of the averaging
      // gain, while a level that drifts over the record is followed, not erased.
      const local = new Float64Array(frame.len);
      let ws = 0;
      for (let mj = 0; mj < members.length; mj++) {
        const dist = mj - mi;
        if (Math.abs(dist) > NEIGHBOUR_REACH_BEATS) continue;
        const g = Math.exp(-(dist * dist) / (2 * NEIGHBOUR_SIGMA_BEATS * NEIGHBOUR_SIGMA_BEATS));
        const row = rows[members[mj]];
        ws += g;
        for (let j = 0; j < frame.len; j++) local[j] += g * row[j];
      }
      for (let j = 0; j < frame.len; j++) local[j] /= ws;

      // The template lives on the beats' shared, sub-sample-aligned axis; this
      // beat's samples sit `shift` away from it. The TEMPLATE is read back at
      // that shift (it is smooth, so interpolating it is harmless) and compared
      // with the samples as measured — interpolating the noisy beat instead
      // would low-pass the very noise the correction has to cancel.
      const centre = Math.round(centres[k]);
      const shift = centres[k] - centre;
      const base = centre - frame.pre;
      const diff = new Float64Array(frame.len);
      for (let j = 0; j < frame.len; j++) {
        const i = Math.min(n - 1, Math.max(0, base + j));
        const x = j - shift;
        const x0 = Math.floor(x);
        const f = x - x0;
        const t0 = local[x0 < 0 ? 0 : x0 >= frame.len ? frame.len - 1 : x0];
        const t1 = local[x0 + 1 < 0 ? 0 : x0 + 1 >= frame.len ? frame.len - 1 : x0 + 1];
        diff[j] = t0 + f * (t1 - t0) - u[i];
      }
      // Keep only the fast part of the difference. What is slow in it is this
      // beat's own baseline offset and tilt against its neighbours' — or a ST
      // level that really is different on this beat. Blending that in, by an
      // amount that varies along the cycle, moved the ST level by ~9 µV on a
      // drifting record. Removed, stage 2 CANNOT shift a level: it can only
      // take fast noise off whatever level the beat was measured at.
      const slow = smoothBox(diff, Math.round(BEAT_CORRECTION_SLOW_S * fs) | 1, 2);
      for (let j = 0; j < frame.len; j++) {
        const i = base + j;
        if (i < 0 || i >= n) continue;
        const amount = trust * (1 - keep[j]);
        acc[i] += taper[j] * amount * (diff[j] - slow[j]);
        wsum[i] += taper[j];
      }
      info.beatsAveraged++;
    }
  }
  info.beats = count;
  info.beatsPassedThrough = count - info.beatsAveraged;

  for (let i = 0; i < n; i++) if (wsum[i] > 1e-9) correction[i] = acc[i] / wsum[i];
}

// v1.0.1 — Estimation copies use a LINEAR zero-phase high-pass instead of a median
//          baseline: the median's kinks differed beat to beat on a drifting record and
//          stage 2 stamped ~5 µV of them into the ST level. Mean ST error is now
//          within ~1 µV of copy A at 70–100 bpm. Output path unchanged.
// v1.0.0 — Dual Lead II fusion: signal-free-reference weighting of two copies
//          (frequency-flat, unit gain by construction) + trust-gated
//          beat-synchronous averaging that never touches the QRS. No
//          frequency-selective filter in the signal path.
