/* A pause over 3 seconds.

   Three seconds while awake is the threshold at which pacing is discussed.
   It is urgent for a plain reason: a pause that long produces presyncope or
   syncope, and syncope at the wheel or at the top of the stairs turns a
   rhythm problem into a trauma problem. */

import { fmtMs, margin, type ScreeningRule } from '../types';

const LONG_MS = 3000;
const DECISIVE_MS = 5000;

export const rule: ScreeningRule = {
  id: 'pauseLong',
  category: 'rhythm',
  level: 'urgent',
  confidence: 'high',
  source: 'ESC 2021 pacing guideline — pauses >3 s while awake',
  suppresses: ['pause'],
  evaluate(ctx) {
    const max = ctx.maxRrMs;
    if (max === null) return null;
    if (max < LONG_MS) return false;

    return {
      evidence: [
        { label: 'Longest gap', value: fmtMs(max) },
        { label: 'Usual gap', value: fmtMs(ctx.analysis.rate.rrMeanMs) },
      ],
      margin: margin(max, LONG_MS, DECISIVE_MS),
      focus: 'rhythm',
      scale: { value: max, unit: 'ms', min: 400, max: 6000, normalLow: 600, normalHigh: 1500 },
    };
  },
};

// v1.0.0 — A ventricular pause over 3 s.
