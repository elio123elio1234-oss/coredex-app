/* Nonspecific intraventricular conduction delay — QRS 110–119 ms.

   Wider than normal, but short of the 120 ms that defines a bundle branch
   block. Very often nothing; occasionally the earliest sign of the
   conduction disease that later becomes one. Worth a line, not worth alarm,
   which is what `moderate` confidence and an attention level say together. */

import { fmtMs, margin, type ScreeningRule } from '../types';

const QRS_IVCD_MS = 110;
const QRS_BBB_MS = 120;

export const rule: ScreeningRule = {
  id: 'ivcd',
  category: 'conduction',
  level: 'attention',
  confidence: 'moderate',
  source: 'AHA/ACCF/HRS 2009 part III — nonspecific IVCD, QRS 110–119 ms',
  evaluate(ctx) {
    const qrs = ctx.analysis.intervals.qrsMs;
    if (qrs === null) return null;
    if (qrs < QRS_IVCD_MS || qrs >= QRS_BBB_MS) return false;

    return {
      evidence: [
        { label: 'QRS', value: fmtMs(qrs) },
        { label: 'Upper limit', value: fmtMs(QRS_IVCD_MS) },
      ],
      margin: margin(qrs, QRS_IVCD_MS, QRS_BBB_MS),
      focus: 'qrs',
      scale: { value: qrs, unit: 'ms', min: 60, max: 180, normalLow: 80, normalHigh: QRS_IVCD_MS },
    };
  },
};

// v1.0.0 — QRS 110–119 ms.
