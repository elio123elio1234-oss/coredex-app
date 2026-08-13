/* Possible complete heart block.

   Slow, regular, and the atria are not driving it. That description covers
   third-degree AV block and a junctional escape rhythm; both are urgent and
   neither is separable on six leads without measuring the atrial rate
   independently — so the finding names the SITUATION rather than picking
   one of them.

   Urgent because an escape rhythm is a heart running on its backup pacemaker,
   and backups fail. */

import { fmtBpm, fmtPct, margin, type ScreeningRule } from '../types';

const BPM_THRESHOLD = 50;
const BPM_DECISIVE = 38;
/** Below this fraction of beats with a preceding P, the atria are not driving. */
const P_PRESENT_MAX_PCT = 50;

export const rule: ScreeningRule = {
  id: 'avBlockCompleteSuspected',
  category: 'conduction',
  level: 'urgent',
  confidence: 'limited',
  source: 'Third-degree AV block / junctional escape — slow, regular, AV dissociation',
  suppresses: ['bradycardia', 'bradycardiaSevere'],
  evaluate(ctx) {
    const { bpm, rrVariationPct, pBeforeQrsPct } = ctx.analysis.rate;
    if (bpm === null || rrVariationPct === null || pBeforeQrsPct === null) return null;
    if (bpm >= BPM_THRESHOLD || !ctx.derived.regular || pBeforeQrsPct >= P_PRESENT_MAX_PCT) {
      return false;
    }

    return {
      evidence: [
        { label: 'HR', value: fmtBpm(bpm) },
        { label: 'P before QRS', value: fmtPct(pBeforeQrsPct) },
        { label: 'RR variation', value: fmtPct(rrVariationPct) },
      ],
      margin: margin(bpm, BPM_THRESHOLD, BPM_DECISIVE),
      focus: 'p',
      scale: { value: bpm, unit: 'BPM', min: 20, max: 120, normalLow: 50, normalHigh: 100 },
    };
  },
};

// v1.0.0 — Slow, regular, and the atria are not driving it.
