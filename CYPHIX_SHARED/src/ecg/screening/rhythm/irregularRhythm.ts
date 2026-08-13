/* An irregular rhythm WITH P waves.

   That combination is usually sinus arrhythmia — the normal speeding and
   slowing of the heart with breathing, most pronounced in the young and the
   fit, and a sign of a healthy autonomic system rather than a problem.

   It is named rather than hidden because irregularity is something people
   feel and ask about. Confidence is `limited` and the copy says it is
   usually normal. Atrial fibrillation suppresses this rule, so the two can
   never appear together. */

import { fmtPct, margin, type ScreeningRule } from '../types';

const VARIATION_PCT = 15;
const VARIATION_DECISIVE = 28;
const P_PRESENT_MIN_PCT = 60;

export const rule: ScreeningRule = {
  id: 'irregularRhythm',
  category: 'rhythm',
  level: 'attention',
  confidence: 'limited',
  source: 'Respiratory sinus arrhythmia — a normal autonomic finding',
  evaluate(ctx) {
    const { rrVariationPct, pBeforeQrsPct } = ctx.analysis.rate;
    if (rrVariationPct === null || pBeforeQrsPct === null) return null;
    if (rrVariationPct <= VARIATION_PCT || pBeforeQrsPct < P_PRESENT_MIN_PCT) return false;

    return {
      evidence: [
        { label: 'RR variation', value: fmtPct(rrVariationPct) },
        { label: 'P before QRS', value: fmtPct(pBeforeQrsPct) },
      ],
      margin: margin(rrVariationPct, VARIATION_PCT, VARIATION_DECISIVE),
      focus: 'rhythm',
      scale: {
        value: rrVariationPct,
        unit: '%',
        min: 0,
        max: 40,
        normalLow: 0,
        normalHigh: VARIATION_PCT,
      },
    };
  },
};

// v1.0.0 — Variable RR with P waves present: usually sinus arrhythmia.
