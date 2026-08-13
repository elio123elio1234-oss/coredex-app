/* Pathological Q waves in the lateral limb leads (I and aVL).

   The same reasoning as the inferior rule, in high lateral territory.
   Both leads are required — with only two lateral limb leads available,
   one is not a pattern */

import { fmtMv, depth, margin, LATERAL, type ScreeningRule } from '../types';

/** A Q wave must be deep in ABSOLUTE terms... */
const Q_MIN_MV = -0.1;
/** ...and relative to the R it precedes. A quarter is the classic figure. */
const R_RATIO = 0.25;
const DECISIVE_MV = -0.25;
const MIN_LEADS = LATERAL.length;

export const rule: ScreeningRule = {
  id: 'qWavesLateral',
  category: 'ischaemia',
  level: 'attention',
  confidence: 'limited',
  source: 'Pathological Q wave — >=25 % of the following R and >=0.1 mV deep',
  evaluate(ctx) {
    const amps = ctx.analysis.amplitudes;
    if (LATERAL.some((l) => (amps[l]?.qMv ?? null) === null)) return null;

    const pathological = (lead: (typeof LATERAL)[number]): boolean => {
      const a = amps[lead];
      if (!a || a.qMv === null || a.rMv === null) return false;
      return a.qMv <= Q_MIN_MV && depth(a.qMv) >= a.rMv * R_RATIO;
    };

    const hit = LATERAL.filter(pathological);
    if (hit.length < MIN_LEADS) return false;

    const deepest = Math.min(...hit.map((l) => amps[l]?.qMv ?? 0));
    return {
      evidence: hit.map((l) => ({ label: 'Q in ' + l, value: fmtMv(amps[l]?.qMv ?? null) })),
      margin: margin(deepest, Q_MIN_MV, DECISIVE_MV),
      leads: hit,
      focus: 'qrs',
      scale: {
        value: deepest,
        unit: 'mV',
        min: -0.5,
        max: 0.1,
        normalLow: Q_MIN_MV,
        normalHigh: 0,
      },
    };
  },
};

// v1.0.0 — Pathological Q waves in both I and aVL.
