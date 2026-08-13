/* Left ventricular hypertrophy by VOLTAGE — the limb-lead criteria.

   Two criteria, either of which fires: the Lewis index
   (R I + S III) - (R III + S I) > 1.6 mV, and R in aVL > 1.1 mV. Both are
   deliberately chosen because they need no chest leads at all; Sokolow-Lyon
   and Cornell do, and are listed among this screen's blind spots.

   ⚠️ VOLTAGE CRITERIA ARE SPECIFIC AND INSENSITIVE, and that asymmetry is
   stated rather than hidden. They miss most real hypertrophy, and in a thin
   young chest they fire on a normal heart — every published series puts the
   false-positive rate around 5 %, and the Monte-Carlo validation of this
   engine reproduced almost exactly that. An echocardiogram is what confirms
   it, which is what the copy says.

   Age changes the WEIGHT, never the rule: under 35 the finding drops to
   `limited`. */

import { fmtMv, depth, margin, type ScreeningRule } from '../types';

/** Lewis index threshold, in mV. */
const LEWIS_MV = 1.6;
const LEWIS_DECISIVE_MV = 2.2;
/** Sokolow's limb-lead criterion. */
const R_AVL_MV = 1.1;
const R_AVL_DECISIVE_MV = 1.6;
/** Below this age a thin chest wall raises every amplitude. */
const YOUNG_AGE = 35;

export const rule: ScreeningRule = {
  id: 'lvhVoltage',
  category: 'chamber',
  level: 'attention',
  confidence: 'moderate',
  source: 'Lewis index >1.6 mV; Sokolow R in aVL >1.1 mV (limb-lead-only LVH criteria)',
  evaluate(ctx) {
    const a = ctx.analysis.amplitudes;
    const rI = a.I?.rMv ?? null;
    const rIII = a.III?.rMv ?? null;
    const rAvl = a.aVL?.rMv ?? null;

    const lewis =
      rI !== null && rIII !== null
        ? rI + depth(a.III?.sMv ?? null) - (rIII + depth(a.I?.sMv ?? null))
        : null;
    if (lewis === null && rAvl === null) return null;

    const byLewis = lewis !== null && lewis > LEWIS_MV;
    const byAvl = rAvl !== null && rAvl > R_AVL_MV;
    if (!byLewis && !byAvl) return false;

    /* Whichever criterion fired takes the margin. When both do, the more
       convincing one wins — a finding is as strong as its best evidence,
       not as weak as its worst. */
    const m = Math.max(
      byLewis ? margin(lewis as number, LEWIS_MV, LEWIS_DECISIVE_MV) : 0,
      byAvl ? margin(rAvl as number, R_AVL_MV, R_AVL_DECISIVE_MV) : 0,
    );

    const young = ctx.patient.ageYears !== undefined && ctx.patient.ageYears < YOUNG_AGE;
    return {
      evidence: [
        { label: 'Lewis index', value: lewis === null ? '-' : lewis.toFixed(2) + ' mV' },
        { label: 'R in aVL', value: fmtMv(rAvl) },
        { label: 'Thresholds', value: LEWIS_MV.toFixed(1) + ' / ' + R_AVL_MV.toFixed(1) + ' mV' },
      ],
      margin: young ? Math.min(m, 0.4) : m,
      leads: byAvl ? ['aVL'] : ['I', 'III'],
      focus: 'qrs',
      scale: byAvl
        ? { value: rAvl as number, unit: 'mV', min: 0, max: 2.5, normalLow: 0, normalHigh: R_AVL_MV }
        : { value: lewis as number, unit: 'mV', min: -2, max: 3.5, normalLow: -2, normalHigh: LEWIS_MV },
    };
  },
};

// v1.0.0 — Lewis index or R in aVL past the limb-lead LVH thresholds.
