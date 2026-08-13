/* Pathological Q waves in the inferior leads.

   Electrically dead tissue does not depolarise, so the lead facing it
   records the depolarisation of the wall OPPOSITE — a downward deflection
   at the start of the beat. That is usually the scar of an old inferior
   infarct, which may well have gone unnoticed at the time.

   ⚠️ Confidence is `limited`, and the reason is lead III: an isolated Q
   there is a positional variant present in a great many normal ECGs, and it
   disappears on a deep breath. Requiring two of the three inferior leads
   already excludes the commonest false positive, and the remaining ones are
   why a doctor rather than this app decides */

import { fmtMv, depth, margin, INFERIOR, type ScreeningRule } from '../types';

/** A Q wave must be deep in ABSOLUTE terms... */
const Q_MIN_MV = -0.1;
/** ...and relative to the R it precedes. A quarter is the classic figure. */
const R_RATIO = 0.25;
const DECISIVE_MV = -0.25;
const MIN_LEADS = 2;

export const rule: ScreeningRule = {
  id: 'qWavesInferior',
  category: 'ischaemia',
  level: 'attention',
  confidence: 'limited',
  source: 'Pathological Q wave — >=25 % of the following R and >=0.1 mV deep',
  evaluate(ctx) {
    const amps = ctx.analysis.amplitudes;
    if (INFERIOR.some((l) => (amps[l]?.qMv ?? null) === null)) return null;

    const pathological = (lead: (typeof INFERIOR)[number]): boolean => {
      const a = amps[lead];
      if (!a || a.qMv === null || a.rMv === null) return false;
      return a.qMv <= Q_MIN_MV && depth(a.qMv) >= a.rMv * R_RATIO;
    };

    const hit = INFERIOR.filter(pathological);
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

// v1.0.0 — Pathological Q waves in two or more inferior leads.
