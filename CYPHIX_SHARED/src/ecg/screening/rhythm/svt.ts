/* Supraventricular tachycardia — regular, fast, and NARROW.

   Narrow means the ventricles are being activated through the normal
   conduction system, so whatever drives the rhythm sits above them. Urgent
   rather than attention: a sustained rate above 150 does not reliably
   self-resolve and is treated, not observed. */

import { fmtBpm, fmtMs, margin, type ScreeningRule } from '../types';

const BPM_THRESHOLD = 150;
const BPM_DECISIVE = 180;

export const rule: ScreeningRule = {
  id: 'svt',
  category: 'rhythm',
  level: 'urgent',
  confidence: 'moderate',
  source: 'ACC/AHA/HRS 2015 SVT guideline — regular narrow-complex tachycardia',
  evaluate(ctx) {
    const { bpm, rrVariationPct } = ctx.analysis.rate;
    const qrs = ctx.analysis.intervals.qrsMs;
    if (bpm === null || rrVariationPct === null) return null;

    const fires =
      ctx.derived.regular && bpm > BPM_THRESHOLD && !ctx.derived.wideQrs && ctx.derived.pAbsent;
    if (!fires) return false;

    return {
      evidence: [
        { label: 'HR', value: fmtBpm(bpm) },
        { label: 'QRS', value: fmtMs(qrs) },
      ],
      margin: margin(bpm, BPM_THRESHOLD, BPM_DECISIVE),
      focus: 'rhythm',
      scale: { value: bpm, unit: 'BPM', min: 30, max: 220, normalLow: 50, normalHigh: 100 },
    };
  },
};

// v1.0.0 — Regular narrow-complex tachycardia above 150 bpm.
