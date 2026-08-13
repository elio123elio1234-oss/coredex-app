/* Marked first-degree AV block — PR over 300 ms.

   Beyond 300 ms the atrial contraction starts to land on a closed mitral
   valve, so the delay stops being an ECG curiosity and starts costing
   cardiac output — this is the range where first-degree block actually
   produces symptoms and is sometimes paced. */

import { fmtMs, margin, type ScreeningRule } from '../types';

const PR_MARKED_MS = 300;
const PR_DECISIVE_MS = 360;

export const rule: ScreeningRule = {
  id: 'avBlock1Marked',
  category: 'conduction',
  level: 'attention',
  confidence: 'high',
  source: 'Marked first-degree AV block, PR >300 ms (pseudo-pacemaker syndrome range)',
  suppresses: ['avBlock1'],
  evaluate(ctx) {
    const pr = ctx.analysis.intervals.prMs;
    if (pr === null) return null;
    if (pr <= PR_MARKED_MS) return false;

    return {
      evidence: [
        { label: 'PR', value: fmtMs(pr) },
        { label: 'Upper limit', value: fmtMs(200) },
      ],
      margin: margin(pr, PR_MARKED_MS, PR_DECISIVE_MS),
      focus: 'pr',
      scale: { value: pr, unit: 'ms', min: 80, max: 400, normalLow: 120, normalHigh: 200 },
    };
  },
};

// v1.0.0 — PR over 300 ms.
