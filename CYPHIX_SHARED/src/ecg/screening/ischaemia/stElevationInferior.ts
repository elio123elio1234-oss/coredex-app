/* ST elevation in the inferior leads — the "go now" finding.

   Two or more of II, III and aVF elevated by 0.1 mV or more. In the
   right clinical context this is an inferior STEMI: an artery to the bottom
   wall of the heart is blocked, muscle is dying, and time is the whole
   treatment.

   ★ THIS IS THE MOST CONSEQUENTIAL RULE IN THE ENGINE and it is why the ST
   measurement is referenced to the PR segment rather than to zero — a
   baseline-wander artefact read as elevation would send a well person to an
   emergency room, and a filter leftover read as flat would keep a sick one
   at home.

   Requiring two contiguous leads is the standard criterion and matters
   here: isolated elevation in lead III has innocent causes */

import { fmtMv, margin, INFERIOR, type ScreeningRule } from '../types';

const THRESHOLD_MV = 0.1;
const DECISIVE_MV = 0.25;
const MIN_LEADS = 2;

export const rule: ScreeningRule = {
  id: 'stElevationInferior',
  category: 'ischaemia',
  level: 'urgent',
  confidence: 'moderate',
  source: 'ESC/ACC Fourth Universal Definition of MI — >=0.1 mV in two contiguous limb leads',
  evaluate(ctx) {
    if (INFERIOR.some((l) => ctx.st[l] === null)) return null;

    const hit = INFERIOR.filter((l) => (ctx.st[l] as number) >= THRESHOLD_MV);
    if (hit.length < MIN_LEADS) return false;

    const worst = Math.max(...hit.map((l) => ctx.st[l] as number));
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

// v1.0.0 — ST elevation >=0.1 mV in two or more inferior leads.
