/* Extreme tachycardia — over 150 bpm at rest.
   Above 150 a resting rate is rarely plain sinus tachycardia; it is where
   re-entrant rhythms live. The narrow/wide distinction is made by the `svt`
   and `wideComplexTachycardia` rules, both of which suppress or outrank
   this one when they fire — this is the finding that remains when neither
   can be established. */

import { fmtBpm, margin, type ScreeningRule } from '../types';

const THRESHOLD_BPM = 150;
const DECISIVE_BPM = 180;

export const rule: ScreeningRule = {
  id: 'tachycardiaExtreme',
  category: 'rate',
  level: 'urgent',
  confidence: 'high',
  source: 'Standard adult sinus rate bounds; >150 bpm at rest is rarely sinus',
  suppresses: ['tachycardia'],
  evaluate(ctx) {
    const bpm = ctx.analysis.rate.bpm;
    if (bpm === null) return null;
    if (bpm <= THRESHOLD_BPM) return false;
    return {
      evidence: [{ label: 'HR', value: fmtBpm(bpm) }],
      margin: margin(bpm, THRESHOLD_BPM, DECISIVE_BPM),
      focus: 'rhythm',
      scale: { value: bpm, unit: 'BPM', min: 30, max: 200, normalLow: 50, normalHigh: 100 },
    };
  },
};

// v1.0.0 — Resting rate above 150 bpm.
