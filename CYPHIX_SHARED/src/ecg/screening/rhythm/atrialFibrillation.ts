/* Atrial fibrillation — the flagship of single-lead ECG screening.

   The rule is the classic PAIR, and both halves are required because each
   alone is common and innocent: sinus arrhythmia is irregular WITH P waves,
   and a noisy strip loses P waves while staying regular. Only an
   irregularly irregular ventricular response with no organised atrial
   activity is AF.

   Why it is worth detecting at all: AF roughly quintuples stroke risk, is
   frequently silent, and is highly treatable once known. */

import { fmtMs, fmtPct, margin, type ScreeningRule } from '../types';

/** RR coefficient of variation above which the rhythm is irregularly irregular. */
const RR_VARIATION_PCT = 12;
const RR_VARIATION_DECISIVE = 22;
/** Some noise is always mis-read as a P wave, which is why this is 40 %, not 0 %. */
const P_PRESENT_MAX_PCT = 40;
/** Fewer beats than this and RR variability is a small sample, not a rhythm. */
const MIN_BEATS = 6;

export const rule: ScreeningRule = {
  id: 'atrialFibrillation',
  category: 'rhythm',
  level: 'attention',
  confidence: 'high',
  source: 'Dash et al. 2009 — RR irregularity for AF detection',
  suppresses: ['irregularRhythm', 'atrialFlutter'],
  evaluate(ctx) {
    const { rrVariationPct, pBeforeQrsPct, beatsAnalyzed, rmssdMs } = ctx.analysis.rate;
    if (rrVariationPct === null || pBeforeQrsPct === null || beatsAnalyzed < 3) return null;

    const fires =
      rrVariationPct > RR_VARIATION_PCT &&
      pBeforeQrsPct < P_PRESENT_MAX_PCT &&
      beatsAnalyzed >= MIN_BEATS &&
      !ctx.derived.wideQrs;
    if (!fires) return false;

    return {
      evidence: [
        { label: 'RR variation', value: fmtPct(rrVariationPct) },
        { label: 'P before QRS', value: fmtPct(pBeforeQrsPct) },
        { label: 'RMSSD', value: fmtMs(rmssdMs) },
      ],
      margin: margin(rrVariationPct, RR_VARIATION_PCT, RR_VARIATION_DECISIVE),
      focus: 'rhythm',
      scale: {
        value: rrVariationPct,
        unit: '%',
        min: 0,
        max: 40,
        normalLow: 0,
        normalHigh: RR_VARIATION_PCT,
      },
    };
  },
};

// v1.0.0 — Irregularly irregular RR with absent P waves.
