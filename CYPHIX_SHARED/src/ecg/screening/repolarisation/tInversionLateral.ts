/* Inverted T waves in the lateral leads.

   Requires BOTH I and aVL — the same logic as the inferior rule, one lead
   stricter because there are only two lateral limb leads to work with. An
   isolated inverted T in aVL is common and usually means nothing; the pair
   is worth a look. */

import { fmtMv, margin, LATERAL, type ScreeningRule } from '../types';

const INVERSION_MV = -0.1;
const DECISIVE_MV = -0.3;

export const rule: ScreeningRule = {
  id: 'tInversionLateral',
  category: 'repolarisation',
  level: 'attention',
  confidence: 'moderate',
  source: 'AHA/ACCF/HRS 2009 part IV — lateral T-wave inversion',
  evaluate(ctx) {
    const amps = ctx.analysis.amplitudes;
    if (LATERAL.some((l) => (amps[l]?.tMv ?? null) === null)) return null;

    const hit = LATERAL.filter((l) => (amps[l]?.tMv ?? 0) <= INVERSION_MV);
    if (hit.length < LATERAL.length) return false;

    const deepest = Math.min(...hit.map((l) => amps[l]?.tMv ?? 0));
    return {
      evidence: LATERAL.map((l) => ({ label: 'T in ' + l, value: fmtMv(amps[l]?.tMv ?? null) })),
      margin: margin(deepest, INVERSION_MV, DECISIVE_MV),
      leads: hit,
      focus: 't',
      scale: { value: deepest, unit: 'mV', min: -0.6, max: 0.8, normalLow: 0, normalHigh: 0.6 },
    };
  },
};

// v1.0.0 — T inversion in both I and aVL.
