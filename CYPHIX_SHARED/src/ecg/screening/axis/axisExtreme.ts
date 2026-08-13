/* Extreme axis deviation (the "northwest" quadrant).

   The vector points up and to the right, away from everything. Unlike
   the two ordinary deviations this one has no common benign explanation:
   it belongs to ventricular rhythms, severe right ventricular overload,
   hyperkalaemia — or, far more often than any of those, to swapped arm
   electrodes. The lead-reversal rule suppresses this one when it fires,
   so a swapped cable is explained rather than dressed up as a finding */

import { fmtDeg, margin, type ScreeningRule } from '../types';

const NORMAL_LOW = -30;
const NORMAL_HIGH = 90;

export const rule: ScreeningRule = {
  id: 'axisExtreme',
  category: 'axis',
  level: 'attention',
  confidence: 'moderate',
  source: 'Frontal-plane QRS axis; normal range -30 to +90 degrees',
  evaluate(ctx) {
    const deg = ctx.analysis.axis.degrees;
    if (deg === null) return null;
    if (ctx.analysis.axis.classification !== 'extreme') return false;

    return {
      evidence: [
        { label: 'Axis', value: fmtDeg(deg) },
        { label: 'Normal range', value: '-30 to +90 deg' },
      ],
      margin: margin(Math.abs(deg), 90, 140),
      focus: 'qrs',
      scale: {
        value: deg,
        unit: 'deg',
        min: -180,
        max: 180,
        normalLow: NORMAL_LOW,
        normalHigh: NORMAL_HIGH,
      },
    };
  },
};

// v1.0.0 — Frontal axis in the northwest quadrant.
