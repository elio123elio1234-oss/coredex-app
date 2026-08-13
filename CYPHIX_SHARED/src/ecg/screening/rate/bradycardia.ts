/* Bradycardia — under 50 bpm.
   ⚠️ The textbook boundary is 60, and this rule deliberately does not use
   it. 50–59 bpm is the resting rate of a great many healthy and athletic
   people; a screen that flags all of them teaches its reader that amber
   means nothing, which is the failure mode this codebase has already paid
   for once (see the v0.41.1 post-mortem). 50 is where a rate becomes worth
   a sentence. */

import { fmtBpm, margin, type ScreeningRule } from '../types';

const THRESHOLD_BPM = 50;
const SEVERE_BPM = 40;
const DECISIVE_BPM = 42;

export const rule: ScreeningRule = {
  id: 'bradycardia',
  category: 'rate',
  level: 'attention',
  confidence: 'high',
  source: 'AHA/ACC/HRS 2018 — sinus bradycardia; 50 bpm used in place of 60 (see header)',
  evaluate(ctx) {
    const bpm = ctx.analysis.rate.bpm;
    if (bpm === null) return null;
    if (bpm >= THRESHOLD_BPM || bpm < SEVERE_BPM) return false;
    return {
      evidence: [{ label: 'HR', value: fmtBpm(bpm) }],
      margin: margin(bpm, THRESHOLD_BPM, DECISIVE_BPM),
      focus: 'rhythm',
      scale: { value: bpm, unit: 'BPM', min: 30, max: 200, normalLow: 50, normalHigh: 100 },
    };
  },
};

// v1.0.0 — Resting rate 40–49 bpm.
