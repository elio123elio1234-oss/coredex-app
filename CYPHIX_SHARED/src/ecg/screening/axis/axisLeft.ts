/* Left axis deviation.

   The mean direction the ventricles depolarise in, tilted leftward.
   On its own this is very often normal — it drifts left with age, weight
   and a horizontal heart — which is why confidence is `limited` and the
   copy leads with that. When it is pathological it is usually a left
   anterior fascicular block, and that rule suppresses this one whenever its
   full criteria are met, so the more specific finding wins */

import { fmtDeg, margin, type ScreeningRule } from '../types';

const NORMAL_LOW = -30;
const NORMAL_HIGH = 90;

export const rule: ScreeningRule = {
  id: 'axisLeft',
  category: 'axis',
  level: 'attention',
  confidence: 'limited',
  source: 'Frontal-plane QRS axis; normal range -30 to +90 degrees',
  evaluate(ctx) {
    const deg = ctx.analysis.axis.degrees;
    if (deg === null) return null;
    if (ctx.analysis.axis.classification !== 'left') return false;

    return {
      evidence: [
        { label: 'Axis', value: fmtDeg(deg) },
        { label: 'Normal range', value: '-30 to +90 deg' },
      ],
      margin: margin(deg, NORMAL_LOW, -60),
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

// v1.0.0 — Frontal axis left of -30 degrees.
