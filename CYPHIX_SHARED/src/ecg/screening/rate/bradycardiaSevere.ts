/* Severe bradycardia — under 40 bpm.
   At this rate cardiac output starts to depend on stroke volume alone, and
   syncope becomes likely. It is `urgent` regardless of cause: whether it is
   sinus node disease, drugs or block, a resting adult at 35 bpm needs to be
   seen rather than reassured. */

import { fmtBpm, margin, type ScreeningRule } from '../types';

/** Below this a resting adult rate is not a variant, it is a finding. */
const THRESHOLD_BPM = 40;
/** By here no reader would call it borderline. */
const DECISIVE_BPM = 30;

export const rule: ScreeningRule = {
  id: 'bradycardiaSevere',
  category: 'rate',
  level: 'urgent',
  confidence: 'high',
  source: 'AHA/ACC/HRS 2018 bradycardia guideline — symptomatic bradycardia threshold',
  suppresses: ['bradycardia'],
  evaluate(ctx) {
    const bpm = ctx.analysis.rate.bpm;
    if (bpm === null) return null;
    if (bpm >= THRESHOLD_BPM) return false;
    return {
      evidence: [{ label: 'HR', value: fmtBpm(bpm) }],
      margin: margin(bpm, THRESHOLD_BPM, DECISIVE_BPM),
      focus: 'rhythm',
      scale: { value: bpm, unit: 'BPM', min: 30, max: 200, normalLow: 50, normalHigh: 100 },
    };
  },
};

// v1.0.0 — Resting rate below 40 bpm.
