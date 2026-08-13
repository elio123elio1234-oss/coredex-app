/* ST depression in the inferior leads.

   Muscle that is short of blood but not yet infarcting — the ECG
   signature of demand ischaemia — or the reciprocal shadow of an injury
   somewhere this device cannot see.

   ⚠️ THE THRESHOLD IS DELIBERATELY STRICTER THAN THE TEXTBOOK. Clinically
   ST depression is called at 0.05 mV; that is half the noise floor of a
   dry-electrode wearable, and using it here would report ischaemia on
   ordinary baseline noise. 0.1 mV is used, the sensitivity that costs is
   real, and this comment is where it is admitted rather than quietly
   traded */

import { fmtMv, margin, INFERIOR, type ScreeningRule } from '../types';

const THRESHOLD_MV = -0.1;
const DECISIVE_MV = -0.25;
const MIN_LEADS = 2;

export const rule: ScreeningRule = {
  id: 'stDepressionInferior',
  category: 'ischaemia',
  level: 'attention',
  confidence: 'moderate',
  source: 'ST depression; 0.1 mV used in place of the clinical 0.05 mV (see header)',
  evaluate(ctx) {
    if (INFERIOR.some((l) => ctx.st[l] === null)) return null;

    const hit = INFERIOR.filter((l) => (ctx.st[l] as number) <= THRESHOLD_MV);
    if (hit.length < MIN_LEADS) return false;

    const worst = Math.min(...hit.map((l) => ctx.st[l] as number));
    return {
      evidence: INFERIOR.map((l) => ({ label: 'ST in ' + l, value: fmtMv(ctx.st[l]) })),
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

// v1.0.0 — ST depression <=-0.1 mV in two or more inferior leads.
