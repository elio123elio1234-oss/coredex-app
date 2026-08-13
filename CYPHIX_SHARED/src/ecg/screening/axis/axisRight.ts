/* Right axis deviation.

   Common and usually benign in tall thin young people, and a normal
   finding in children. When it means something it usually means the right
   ventricle is working harder than it should — lung disease, pulmonary
   hypertension — none of which this device can see. Hence `limited` */

import { fmtDeg, margin, type ScreeningRule } from '../types';

const NORMAL_LOW = -30;
const NORMAL_HIGH = 90;

export const rule: ScreeningRule = {
  id: 'axisRight',
  category: 'axis',
  level: 'attention',
  confidence: 'limited',
  source: 'Frontal-plane QRS axis; normal range -30 to +90 degrees',
  evaluate(ctx) {
    const deg = ctx.analysis.axis.degrees;
    if (deg === null) return null;
    if (ctx.analysis.axis.classification !== 'right') return false;

    return {
      evidence: [
        { label: 'Axis', value: fmtDeg(deg) },
        { label: 'Normal range', value: '-30 to +90 deg' },
      ],
      margin: margin(deg, NORMAL_HIGH, 120),
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

// v1.0.0 — Frontal axis right of +90 degrees.
