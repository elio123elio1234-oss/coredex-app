/* Right bundle branch pattern — wide QRS with a deep terminal S in lead I.

   ══ WHAT SIX LEADS CAN AND CANNOT SAY ══
   Which bundle is blocked is a chest-lead question: RBBB is defined by the
   rSR' in V1 and RBBB versus LBBB by V1 and V6 together. What the LIMB
   leads do see is the terminal forces, and they are genuinely informative —
   a right ventricle finishing late drags the terminal vector rightward, which
   lead I records as a wide slurred S.

   Hence `bbbRightPattern` and not `rbbb`. The identifier carries the hedge
   so every label downstream inherits it. */

import { fmtMs, fmtMv, margin, type ScreeningRule } from '../types';

const QRS_BBB_MS = 120;
const QRS_DECISIVE_MS = 150;
/** A terminal S in lead I this deep is the limb-lead signature of RBBB. */
const S_LEAD_I_MV = -0.15;

export const rule: ScreeningRule = {
  id: 'bbbRightPattern',
  category: 'conduction',
  level: 'attention',
  confidence: 'moderate',
  source: 'AHA/ACCF/HRS 2009 part III — RBBB; limb-lead terminal S in I',
  evaluate(ctx) {
    const qrs = ctx.analysis.intervals.qrsMs;
    const sI = ctx.analysis.amplitudes.I?.sMv ?? null;
    if (qrs === null || sI === null) return null;
    if (qrs < QRS_BBB_MS || sI > S_LEAD_I_MV) return false;

    return {
      evidence: [
        { label: 'QRS', value: fmtMs(qrs) },
        { label: 'S in I', value: fmtMv(sI) },
      ],
      margin: margin(qrs, QRS_BBB_MS, QRS_DECISIVE_MS),
      focus: 'qrs',
      scale: { value: qrs, unit: 'ms', min: 60, max: 200, normalLow: 80, normalHigh: QRS_BBB_MS },
    };
  },
};

// v1.0.0 — QRS >=120 ms with a deep terminal S in lead I.
