/* Frequent extra beats.

   ⚠️ Ten seconds is a poor denominator for a burden percentage — one extra
   beat in twelve is 8 %, and one extra beat is nothing. So a percentage
   alone may not fire this rule: an absolute COUNT is required with it.

   Frequent ectopy matters because a sustained high PVC burden can cause a
   cardiomyopathy. Establishing that needs a 24-hour tape; this finding asks
   for one and does not pretend to be one. */

import { fmtPct, margin, type ScreeningRule } from '../types';

const BURDEN_PCT = 15;
const BURDEN_DECISIVE_PCT = 30;
const MIN_ECTOPIC_BEATS = 3;
const MIN_BEATS = 6;

export const rule: ScreeningRule = {
  id: 'ectopyFrequent',
  category: 'rhythm',
  level: 'attention',
  confidence: 'moderate',
  source: 'Baman et al. 2010 — PVC burden and PVC-induced cardiomyopathy',
  suppresses: ['ectopyOccasional'],
  evaluate(ctx) {
    const { beats, derived } = ctx;
    if (beats.length < MIN_BEATS || derived.ectopyPct === null) return null;
    if (derived.ectopicCount < MIN_ECTOPIC_BEATS || derived.ectopyPct <= BURDEN_PCT) return false;

    const wide = beats.filter((b) => b.premature && b.wide).length;
    return {
      evidence: [
        { label: 'Extra beats', value: derived.ectopicCount + ' / ' + beats.length },
        { label: 'Burden', value: fmtPct(derived.ectopyPct) },
        { label: 'Wide (ventricular)', value: String(wide) },
      ],
      margin: margin(derived.ectopyPct, BURDEN_PCT, BURDEN_DECISIVE_PCT),
      focus: 'rhythm',
      scale: {
        value: derived.ectopyPct,
        unit: '%',
        min: 0,
        max: 50,
        normalLow: 0,
        normalHigh: BURDEN_PCT,
      },
    };
  },
};

// v1.0.0 — Ectopic burden above 15 %, with at least three ectopic beats.
