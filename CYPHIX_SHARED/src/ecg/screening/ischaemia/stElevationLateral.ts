/* ST elevation in the lateral limb leads (I and aVL).

   Both leads elevated by 0.1 mV or more — a high lateral injury
   pattern, usually circumflex or first diagonal territory. Both are
   required rather than one, because there are only two lateral limb leads
   and a single one is not a contiguous pair */

import { fmtMv, margin, LATERAL, type ScreeningRule } from '../types';

const THRESHOLD_MV = 0.1;
const DECISIVE_MV = 0.25;
const MIN_LEADS = LATERAL.length;

export const rule: ScreeningRule = {
  id: 'stElevationLateral',
  category: 'ischaemia',
  level: 'urgent',
  confidence: 'moderate',
  source: 'ESC/ACC Fourth Universal Definition of MI — high lateral ST elevation',
  evaluate(ctx) {
    if (LATERAL.some((l) => ctx.st[l] === null)) return null;

    const hit = LATERAL.filter((l) => (ctx.st[l] as number) >= THRESHOLD_MV);
    if (hit.length < MIN_LEADS) return false;

    const worst = Math.max(...hit.map((l) => ctx.st[l] as number));
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

// v1.0.0 — ST elevation >=0.1 mV in both I and aVL.
