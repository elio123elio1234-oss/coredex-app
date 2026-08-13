/* Left posterior fascicular block.

   The mirror of the anterior hemiblock and much rarer, because the
   posterior fascicle is short, thick and dually supplied. That rarity is
   exactly why confidence is `limited`: right axis deviation has commoner
   causes — right ventricular hypertrophy, chronic lung disease, a tall thin
   build — and this device cannot exclude them. The finding is worth raising
   so a doctor can, not so the app can conclude. */

import { fmtDeg, fmtMv, depth, margin, type ScreeningRule } from '../types';

const AXIS_LOW = 90;
const AXIS_HIGH = 180;
const AXIS_DECISIVE = 120;
const QRS_WIDE_MS = 120;
const Q_III_MV = -0.02;

export const rule: ScreeningRule = {
  id: 'lpfb',
  category: 'conduction',
  level: 'attention',
  confidence: 'limited',
  source: 'AHA/ACCF/HRS 2009 part III — left posterior fascicular block (RVH must be excluded clinically)',
  suppresses: ['axisRight'],
  evaluate(ctx) {
    const deg = ctx.analysis.axis.degrees;
    const qrs = ctx.analysis.intervals.qrsMs;
    const leadI = ctx.analysis.amplitudes.I;
    const leadIII = ctx.analysis.amplitudes.III;
    if (deg === null || qrs === null || !leadI || !leadIII) return null;

    const fires =
      deg >= AXIS_LOW &&
      deg <= AXIS_HIGH &&
      qrs < QRS_WIDE_MS &&
      depth(leadI.sMv) > (leadI.rMv ?? 0) &&
      (leadIII.qMv ?? 0) < Q_III_MV;
    if (!fires) return false;

    return {
      evidence: [
        { label: 'Axis', value: fmtDeg(deg) },
        { label: 'S in I', value: fmtMv(leadI.sMv) },
        { label: 'Q in III', value: fmtMv(leadIII.qMv) },
      ],
      margin: margin(deg, AXIS_LOW, AXIS_DECISIVE),
      leads: ['I', 'III'],
      focus: 'qrs',
      scale: { value: deg, unit: 'deg', min: -120, max: 180, normalLow: -30, normalHigh: 90 },
    };
  },
};

// v1.0.0 — Right axis with rS in I and qR in III, narrow QRS.
