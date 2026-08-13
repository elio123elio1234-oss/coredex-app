/* ST depression in the lateral limb leads (I and aVL).

   The same statement as the inferior rule, in circumflex/diagonal
   territory, and with the same deliberately strict 0.1 mV threshold for the
   same reason — a wearable measuring 0.05 mV of ST shift is as likely to be
   describing its own electrodes as the heart */

import { fmtMv, margin, LATERAL, type ScreeningRule } from '../types';

const THRESHOLD_MV = -0.1;
const DECISIVE_MV = -0.25;
const MIN_LEADS = LATERAL.length;

export const rule: ScreeningRule = {
  id: 'stDepressionLateral',
  category: 'ischaemia',
  level: 'attention',
  confidence: 'moderate',
  source: 'ST depression; 0.1 mV used in place of the clinical 0.05 mV',
  evaluate(ctx) {
    if (LATERAL.some((l) => ctx.st[l] === null)) return null;

    const hit = LATERAL.filter((l) => (ctx.st[l] as number) <= THRESHOLD_MV);
    if (hit.length < MIN_LEADS) return false;

    const worst = Math.min(...hit.map((l) => ctx.st[l] as number));
    return {
      evidence: LATERAL.map((l) => ({ label: 'ST in ' + l, value: fmtMv(ctx.st[l]) })),
      margin: margin(worst, THRESHOLD_MV, DECISIVE_MV),
      leads: hit,
      focus: 'st',
      scale: {
        value: worst,
        unit: 'mV',
        min: -0.4,
        max: 0.4,
        normalLow: -0.05,
        normalHigh: 0.05,
      },
    };
  },
};

// v1.0.0 — ST depression <=-0.1 mV in both I and aVL.
