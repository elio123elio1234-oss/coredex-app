/* A wide QRS that fits neither limb-lead pattern.

   Honest residue: the complex is over 120 ms and the terminal forces do not
   point clearly either way. Rather than force it into the nearer bucket —
   which would put a name a doctor might act on onto a shape that does not
   support it — the finding says "wide, undetermined" and confidence is
   `limited`. */

import { fmtMs, margin, type ScreeningRule } from '../types';

const QRS_BBB_MS = 120;
const QRS_DECISIVE_MS = 150;
const S_LEAD_I_MV = -0.15;

export const rule: ScreeningRule = {
  id: 'bbbIndeterminate',
  category: 'conduction',
  level: 'attention',
  confidence: 'limited',
  source: 'Wide QRS without a determinable limb-lead morphology',
  evaluate(ctx) {
    const qrs = ctx.analysis.intervals.qrsMs;
    const sI = ctx.analysis.amplitudes.I?.sMv ?? null;
    const netI = ctx.analysis.axis.netI;
    if (qrs === null || sI === null || netI === null) return null;
    if (qrs < QRS_BBB_MS) return false;

    const rightPattern = sI <= S_LEAD_I_MV;
    const leftPattern = sI > S_LEAD_I_MV && netI > 0;
    if (rightPattern || leftPattern) return false;

    return {
      evidence: [{ label: 'QRS', value: fmtMs(qrs) }],
      margin: margin(qrs, QRS_BBB_MS, QRS_DECISIVE_MS),
      focus: 'qrs',
      scale: { value: qrs, unit: 'ms', min: 60, max: 200, normalLow: 80, normalHigh: QRS_BBB_MS },
    };
  },
};

// v1.0.0 — QRS >=120 ms with no clear left or right limb-lead pattern.
