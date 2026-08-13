/* ==================================================================
   The two measurements the screening layer makes for itself.

   Everything else it needs comes from `analyseLimbEcg`. These two do not,
   because the measurement layer has no reason to make them and no rule can
   work without them:

     ST level at J+60 ms   — the ischaemia rules
     per-beat width/height — the ectopy and alternans rules

   ══ THEY LIVE HERE, NOT IN THE RULES ══
   Measured ONCE and handed to all 43. If a rule measured its own ST level,
   the number it fired on and the number the "why" sheet draws would be two
   independent computations of one quantity — and two computations of one
   quantity eventually disagree, at which point the app is showing a patient
   evidence that contradicts the finding it is evidence for.
   ================================================================== */

import { LIMB_LEAD_ORDER, type LimbLeadName } from '../../types/ecg';
import { delineateBeat, type BeatDelineation } from '../ecgAnalysis';
import { median, type BeatMetric } from './types';

/** ST is read this long after the J point — the standard offset. */
const ST_J_OFFSET_SECONDS = 0.06;
/** The PR segment window used as the isoelectric reference. */
const PR_BASELINE_START_SECONDS = 0.04;
const PR_BASELINE_END_SECONDS = 0.01;
/** A beat arriving this much earlier than the running median is premature. */
const PREMATURE_RR_FRACTION = 0.85;
/** QRS at or above this is "wide" — the bundle-branch-block threshold. */
const WIDE_QRS_MS = 120;

/**
 * Per-lead ST level at J+60 ms, referenced to the PR segment.
 *
 * ══ WHY THE PR SEGMENT AND NOT ZERO ══
 * The filtered trace has no absolute zero — baseline removal has already
 * moved it, and a residual wander of a tenth of a millivolt is normal. An
 * ST level read against 0 would therefore measure the filter's leftovers as
 * an infarct. The PR segment is electrically silent (the atria have
 * finished, the ventricles have not started), so it is the reference every
 * manual reader uses, and it moves WITH the wander instead of against it.
 */
export function measureStLevels(
  leads: Record<LimbLeadName, Float32Array>,
  beats: (BeatDelineation | null)[],
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
 * Prematurity is judged against the MEDIAN of all RR intervals rather than
 * the record's mean, because in a rhythm that is itself irregular the mean
 * is not a thing any single beat was early relative to.
 */
export function measureBeats(
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
      wide: widthMs >= WIDE_QRS_MS,
    });
  }

  return out;
}

/** Longest R-to-R in the raw peak list, in ms — where pauses survive. */
export function measureLongestRr(rPeaks: number[], fs: number): number | null {
  let max: number | null = null;
  for (let i = 1; i < rPeaks.length; i++) {
    const gap = ((rPeaks[i] - rPeaks[i - 1]) / fs) * 1000;
    if (max === null || gap > max) max = gap;
  }
  return max;
}

// v1.0.0 — ST level at J+60 ms against the PR baseline, per-beat width and
//          amplitude, and the longest raw R-to-R. Measured once for all rules.
