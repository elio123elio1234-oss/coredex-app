/* Left anterior fascicular block.

   ★ ONE OF THE VERY FEW DIAGNOSES THAT IS A PURE LIMB-LEAD FINDING.
   The hemiblocks change the frontal-plane axis and essentially nothing
   else, so chest leads add nothing to them — a six-lead device is as
   capable here as a twelve-lead machine, which is worth knowing given how
   much of this engine has to hedge.

   The full criterion: axis −45 to −90, qR in aVL, rS in the inferior leads,
   and a QRS under 120 ms (a wide complex means something else is going on).
   All four are tested. */

import { fmtDeg, fmtMv, depth, margin, type ScreeningRule } from '../types';

const AXIS_LOW = -45;
const AXIS_HIGH = -90;
const AXIS_DECISIVE = -60;
const QRS_WIDE_MS = 120;
/** A q wave in aVL must be present, but only just — it is a small deflection. */
const Q_AVL_MV = -0.02;
const R_AVL_MIN_MV = 0.1;

export const rule: ScreeningRule = {
  id: 'lafb',
  category: 'conduction',
  level: 'attention',
  confidence: 'moderate',
  source: 'AHA/ACCF/HRS 2009 part III — left anterior fascicular block',
  suppresses: ['axisLeft'],
  evaluate(ctx) {
    const deg = ctx.analysis.axis.degrees;
    const qrs = ctx.analysis.intervals.qrsMs;
    const avl = ctx.analysis.amplitudes.aVL;
    const avf = ctx.analysis.amplitudes.aVF;
    if (deg === null || qrs === null || !avl || !avf) return null;

    const fires =
      deg <= AXIS_LOW &&
      deg >= AXIS_HIGH &&
      qrs < QRS_WIDE_MS &&
      (avl.qMv ?? 0) < Q_AVL_MV &&
      (avl.rMv ?? 0) > R_AVL_MIN_MV &&
      depth(avf.sMv) > (avf.rMv ?? 0);
    if (!fires) return false;

    return {
      evidence: [
        { label: 'Axis', value: fmtDeg(deg) },
        { label: 'R in aVL', value: fmtMv(avl.rMv) },
        { label: 'S in aVF', value: fmtMv(avf.sMv) },
      ],
      margin: margin(deg, AXIS_LOW, AXIS_DECISIVE),
      leads: ['aVL', 'aVF'],
      focus: 'qrs',
      scale: { value: deg, unit: 'deg', min: -120, max: 180, normalLow: -30, normalHigh: 90 },
    };
  },
};

// v1.0.0 — Left axis with qR in aVL and rS inferiorly, narrow QRS.
