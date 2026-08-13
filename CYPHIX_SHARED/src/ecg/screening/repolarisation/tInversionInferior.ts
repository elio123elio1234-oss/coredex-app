/* Inverted T waves in the inferior leads.

   ★ THE RULE COUNTS TWO OF THREE, AND THAT IS THE WHOLE RULE.
   An inverted T in lead III ALONE is a normal positional variant — it
   changes with a deep breath — and firing on it would flag a large slice of
   healthy people. Requiring two of II, III and aVF excludes exactly that
   case while keeping genuine inferior T-wave inversion.

   What it can mean: old or evolving ischaemia, or nothing at all. The one
   thing that separates those is a previous ECG, which is why the copy says
   a doctor compares. */

import { fmtMv, margin, INFERIOR, type ScreeningRule } from '../types';

const INVERSION_MV = -0.1;
const DECISIVE_MV = -0.3;
const MIN_LEADS = 2;

export const rule: ScreeningRule = {
  id: 'tInversionInferior',
  category: 'repolarisation',
  level: 'attention',
  confidence: 'moderate',
  source: 'AHA/ACCF/HRS 2009 part IV — T-wave inversion; lead III alone is a normal variant',
  evaluate(ctx) {
    const amps = ctx.analysis.amplitudes;
    if (INFERIOR.some((l) => (amps[l]?.tMv ?? null) === null)) return null;

    const hit = INFERIOR.filter((l) => (amps[l]?.tMv ?? 0) <= INVERSION_MV);
    if (hit.length < MIN_LEADS) return false;

    const deepest = Math.min(...hit.map((l) => amps[l]?.tMv ?? 0));
    return {
      evidence: INFERIOR.map((l) => ({ label: 'T in ' + l, value: fmtMv(amps[l]?.tMv ?? null) })),
      margin: margin(deepest, INVERSION_MV, DECISIVE_MV),
      leads: hit,
      focus: 't',
      scale: { value: deepest, unit: 'mV', min: -0.6, max: 0.8, normalLow: 0, normalHigh: 0.6 },
    };
  },
};

// v1.0.0 — T inversion in at least two of II, III, aVF.
