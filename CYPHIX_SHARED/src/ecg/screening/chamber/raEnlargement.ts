/* Right atrial enlargement — "P pulmonale".

   A P wave in lead II at or above 0.25 mV. The right atrium depolarises
   first, so when it is enlarged the EARLY half of the P wave grows and the
   whole wave becomes tall and peaked rather than wide.

   Its usual company is lung disease or pulmonary hypertension. On its own,
   on one recording, it is a hint — hence `limited`. */

import { fmtMv, margin, type ScreeningRule } from '../types';

const P_MV = 0.25;
const DECISIVE_MV = 0.35;

export const rule: ScreeningRule = {
  id: 'raEnlargement',
  category: 'chamber',
  level: 'attention',
  confidence: 'limited',
  source: 'P pulmonale — P wave amplitude in lead II >=0.25 mV',
  evaluate(ctx) {
    const p = ctx.analysis.amplitudes.II?.pMv ?? null;
    if (p === null) return null;
    if (p < P_MV) return false;

    return {
      evidence: [
        { label: 'P in II', value: fmtMv(p) },
        { label: 'Upper limit', value: fmtMv(P_MV) },
      ],
      margin: margin(p, P_MV, DECISIVE_MV),
      leads: ['II'],
      focus: 'p',
      scale: { value: p, unit: 'mV', min: 0, max: 0.5, normalLow: 0.05, normalHigh: P_MV },
    };
  },
};

// v1.0.0 — P wave in lead II at or above 0.25 mV.
