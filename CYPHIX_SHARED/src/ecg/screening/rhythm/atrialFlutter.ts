/* Atrial flutter — a REGULAR rhythm with no P waves, at the rate fixed 2:1
   conduction from a ~300/min atrial circuit produces.

   ⚠️ Confidence is `limited` deliberately. Confirming flutter means seeing
   sawtooth F waves in the inferior leads, and separating those from a T
   wave on ten seconds of a wearable trace is not something this engine
   claims to do. What it CAN say is "regular, no P waves, at the rate
   flutter characteristically produces" — enough for a doctor to look, and
   honest about being no more than that. */

import { fmtBpm, fmtPct, margin, type ScreeningRule } from '../types';

const BPM_LOW = 125;
const BPM_HIGH = 175;
/** The middle of the 2:1 window is the most typical picture. */
const BPM_TYPICAL = 150;

export const rule: ScreeningRule = {
  id: 'atrialFlutter',
  category: 'rhythm',
  level: 'attention',
  confidence: 'limited',
  source: 'Typical atrial flutter 240–340/min with 2:1 AV conduction',
  suppresses: ['svt'],
  evaluate(ctx) {
    const { bpm, rrVariationPct, pBeforeQrsPct } = ctx.analysis.rate;
    if (bpm === null || rrVariationPct === null || pBeforeQrsPct === null) return null;

    const fires =
      ctx.derived.regular &&
      ctx.derived.pAbsent &&
      bpm >= BPM_LOW &&
      bpm <= BPM_HIGH &&
      !ctx.derived.wideQrs;
    if (!fires) return false;

    return {
      evidence: [
        { label: 'HR', value: fmtBpm(bpm) },
        { label: 'RR variation', value: fmtPct(rrVariationPct) },
        { label: 'P before QRS', value: fmtPct(pBeforeQrsPct) },
      ],
      /* Peaks in the middle of the window rather than at an edge: a rate of
         150 is the classic picture, 126 and 174 are the doubtful ones. */
      margin: margin(Math.abs(bpm - BPM_TYPICAL), 25, 0),
      focus: 'p',
      scale: { value: bpm, unit: 'BPM', min: 30, max: 200, normalLow: 50, normalHigh: 100 },
    };
  },
};

// v1.0.0 — Regular, P-less, at the rate 2:1 flutter produces.
