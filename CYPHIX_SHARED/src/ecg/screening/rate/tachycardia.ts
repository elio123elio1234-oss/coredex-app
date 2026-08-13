/* Sinus tachycardia — over 100 bpm, up to 150.
   Almost always a response rather than a disease: stress, caffeine, fever,
   pain, dehydration, having just climbed the stairs. The finding says so,
   because a patient who reads "fast heartbeat" and is not told the ordinary
   causes will assume the frightening one. */

import { fmtBpm, margin, type ScreeningRule } from '../types';

const THRESHOLD_BPM = 100;
const EXTREME_BPM = 150;
const DECISIVE_BPM = 130;

export const rule: ScreeningRule = {
  id: 'tachycardia',
  category: 'rate',
  level: 'attention',
  confidence: 'high',
  source: 'Standard adult sinus rate bounds (60–100 bpm)',
  evaluate(ctx) {
    const bpm = ctx.analysis.rate.bpm;
    if (bpm === null) return null;
    if (bpm <= THRESHOLD_BPM || bpm > EXTREME_BPM) return false;
    return {
      evidence: [{ label: 'HR', value: fmtBpm(bpm) }],
      margin: margin(bpm, THRESHOLD_BPM, DECISIVE_BPM),
      focus: 'rhythm',
      scale: { value: bpm, unit: 'BPM', min: 30, max: 200, normalLow: 50, normalHigh: 100 },
    };
  },
};

// v1.0.0 — Resting rate 101–150 bpm.
