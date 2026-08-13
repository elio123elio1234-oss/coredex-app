/* Left bundle branch pattern — wide QRS, broadly upright in lead I, with no
   deep terminal S.

   Same hedge as the right-sided rule and the same reason: V1 and V6 are
   what define LBBB, and this device has neither. What it can see is a wide
   complex whose forces stay leftward, which is the limb-lead half of the
   picture.

   Clinically LBBB matters more than RBBB — it is more often associated with
   structural heart disease, and it makes the ECG unreadable for ischaemia,
   which is itself worth a doctor knowing. */

import { fmtMs, fmtMv, margin, type ScreeningRule } from '../types';

const QRS_BBB_MS = 120;
const QRS_DECISIVE_MS = 150;
const S_LEAD_I_MV = -0.15;

export const rule: ScreeningRule = {
  id: 'bbbLeftPattern',
  category: 'conduction',
  level: 'attention',
  confidence: 'moderate',
  source: 'AHA/ACCF/HRS 2009 part III — LBBB; limb-lead leftward terminal forces',
  evaluate(ctx) {
    const qrs = ctx.analysis.intervals.qrsMs;
    const sI = ctx.analysis.amplitudes.I?.sMv ?? null;
    const netI = ctx.analysis.axis.netI;
    if (qrs === null || sI === null || netI === null) return null;
    if (qrs < QRS_BBB_MS || sI <= S_LEAD_I_MV || netI <= 0) return false;

    return {
      evidence: [
        { label: 'QRS', value: fmtMs(qrs) },
        { label: 'Net QRS in I', value: fmtMv(netI) },
      ],
      margin: margin(qrs, QRS_BBB_MS, QRS_DECISIVE_MS),
      focus: 'qrs',
      scale: { value: qrs, unit: 'ms', min: 60, max: 200, normalLow: 80, normalHigh: QRS_BBB_MS },
    };
  },
};

// v1.0.0 — QRS >=120 ms, upright in lead I, no deep terminal S.
