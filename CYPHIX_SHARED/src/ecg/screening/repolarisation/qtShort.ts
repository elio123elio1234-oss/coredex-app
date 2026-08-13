/* Short QT — under 340 ms.

   Uncommon, and the reason it is reported is that short QT syndrome carries
   a real arrhythmia risk despite the ECG looking unremarkable to the eye.
   The likelier explanations are metabolic (high calcium, digoxin) and are
   settled by a blood test.

   ⚠️ A short QT is also what a NON-PHYSIOLOGICAL signal produces, which is
   why simulated recordings are never screened: the bench simulator places
   its T wave at a fixed offset from the QRS, so its QT does not shorten
   with rate and it measures near 280 ms every time. */

import { fmtMs, margin, type ScreeningRule } from '../types';
import { QTC_SHORT_MS, readQtc } from './qtcCorrection';

const DECISIVE_MS = 310;

export const rule: ScreeningRule = {
  id: 'qtShort',
  category: 'repolarisation',
  level: 'attention',
  confidence: 'moderate',
  source: 'Gollob et al. 2011 — short QT syndrome criteria',
  evaluate(ctx) {
    const q = readQtc(ctx.analysis);
    if (q === null) return null;
    if (q.primary <= 0 || q.primary >= QTC_SHORT_MS) return false;

    return {
      evidence: [
        { label: q.primaryLabel, value: fmtMs(q.primary) },
        { label: q.otherLabel, value: fmtMs(q.other) },
        { label: 'Lower limit', value: fmtMs(QTC_SHORT_MS) },
      ],
      margin: margin(q.primary, QTC_SHORT_MS, DECISIVE_MS),
      focus: 'qt',
      scale: {
        value: q.primary,
        unit: 'ms',
        min: 260,
        max: 500,
        normalLow: QTC_SHORT_MS,
        normalHigh: 450,
      },
    };
  },
};

// v1.0.0 — Rate-appropriate QTc under 340 ms.
