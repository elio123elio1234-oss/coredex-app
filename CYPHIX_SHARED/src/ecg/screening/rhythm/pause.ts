/* A pause of 2–3 seconds between beats.

   Two seconds is the conventional reporting threshold. Pauses in this range
   are common in sleep and in trained athletes and are frequently benign —
   but they are also how sinus node disease and intermittent block first
   show themselves, so they are reported and not graded.

   ⚠️ Measured from the RAW R-peak list. `rate.rrMaxMs` comes from intervals
   already filtered to 300–1500 ms, which makes a 2.4 s pause invisible: the
   interval carrying it is discarded before it is reported. */

import { fmtMs, margin, type ScreeningRule } from '../types';

const PAUSE_MS = 2000;
const LONG_MS = 3000;

export const rule: ScreeningRule = {
  id: 'pause',
  category: 'rhythm',
  level: 'attention',
  confidence: 'high',
  source: 'Conventional 2 s reporting threshold for ventricular pauses',
  evaluate(ctx) {
    const max = ctx.maxRrMs;
    if (max === null) return null;
    if (max < PAUSE_MS || max >= LONG_MS) return false;

    return {
      evidence: [
        { label: 'Longest gap', value: fmtMs(max) },
        { label: 'Usual gap', value: fmtMs(ctx.analysis.rate.rrMeanMs) },
      ],
      margin: margin(max, PAUSE_MS, LONG_MS),
      focus: 'rhythm',
      scale: { value: max, unit: 'ms', min: 400, max: 3500, normalLow: 600, normalHigh: 1500 },
    };
  },
};

// v1.0.0 — A ventricular pause of 2–3 s, measured off the raw peak list.
