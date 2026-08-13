/* First-degree AV block — PR over 200 ms.

   Every atrial impulse still reaches the ventricles; each one simply takes
   longer. On its own it is often benign and is common with age, athletic
   training and rate-slowing drugs. It is reported because it is the mildest
   member of a family whose severe members are pacemaker territory, and
   because a doctor reading it in the context of symptoms reads it very
   differently from one reading it alone. */

import { fmtMs, margin, type ScreeningRule } from '../types';

/** PR > 200 ms is first-degree AV block by definition. */
const PR_MS = 200;
const PR_MARKED_MS = 300;
const PR_DECISIVE_MS = 240;

export const rule: ScreeningRule = {
  id: 'avBlock1',
  category: 'conduction',
  level: 'attention',
  confidence: 'high',
  source: 'Standard ECG criterion — PR interval >200 ms',
  evaluate(ctx) {
    const pr = ctx.analysis.intervals.prMs;
    if (pr === null) return null;
    if (pr <= PR_MS || pr > PR_MARKED_MS) return false;

    return {
      evidence: [
        { label: 'PR', value: fmtMs(pr) },
        { label: 'Upper limit', value: fmtMs(PR_MS) },
      ],
      margin: margin(pr, PR_MS, PR_DECISIVE_MS),
      focus: 'pr',
      scale: { value: pr, unit: 'ms', min: 80, max: 340, normalLow: 120, normalHigh: PR_MS },
    };
  },
};

// v1.0.0 — PR 201–300 ms.
