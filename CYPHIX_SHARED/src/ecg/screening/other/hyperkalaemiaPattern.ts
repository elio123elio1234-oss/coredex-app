/* Peaked T waves — the ECG face of high blood potassium.

   "Peaked" is not "tall": a big T wave in a big-voltage heart is
   proportionate and normal. What matters is the T wave growing RELATIVE to
   its own R, which is why the rule tests both an absolute height and a T/R
   ratio.

   ★ THIS RULE ESCALATES ITSELF, and that is deliberate rather than two
   findings. Hyperkalaemia is a SEQUENCE: peaked T waves first, then the
   P waves flatten and vanish, then the QRS widens until it merges with the
   T and the heart arrests. Peaked T alone is a metabolic hint worth a blood
   test. Peaked T with a widening QRS and absent P waves is the late stage
   of that sequence, and reporting it at the same urgency would be reporting
   one process as though it had one severity. */

import { fmtMs, fmtMv, margin, type ScreeningRule } from '../types';

const T_MV = 0.55;
const T_DECISIVE_MV = 0.9;
const T_R_RATIO = 0.75;
/** The late-stage picture: wide QRS and the atria electrically silent. */
const LATE_QRS_MS = 120;
const LATE_P_PRESENT_PCT = 30;

export const rule: ScreeningRule = {
  id: 'hyperkalaemiaPattern',
  category: 'other',
  level: 'attention',
  confidence: 'moderate',
  source: 'Hyperkalaemia ECG progression — peaked T, P-wave loss, QRS widening',
  evaluate(ctx) {
    const a = ctx.analysis.amplitudes.II;
    const t = a?.tMv ?? null;
    const r = a?.rMv ?? null;
    if (t === null || r === null) return null;
    if (r <= 0 || t < T_MV || t / r < T_R_RATIO) return false;

    const qrs = ctx.analysis.intervals.qrsMs;
    const pPct = ctx.analysis.rate.pBeforeQrsPct ?? 100;
    const late = ctx.derived.wideQrs && pPct < LATE_P_PRESENT_PCT;

    return {
      evidence: [
        { label: 'T in II', value: fmtMv(t) },
        { label: 'T / R ratio', value: (t / r).toFixed(2) },
        { label: 'QRS', value: fmtMs(qrs) },
      ],
      margin: late ? 1 : margin(t, T_MV, T_DECISIVE_MV),
      level: late ? 'urgent' : undefined,
      leads: ['II'],
      focus: 't',
      scale: { value: t, unit: 'mV', min: 0, max: 1.2, normalLow: 0.1, normalHigh: T_MV },
    };
  },
};

// v1.0.0 — Peaked T waves; escalates to urgent with a wide QRS and absent P.
