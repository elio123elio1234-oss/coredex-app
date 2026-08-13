/* Long QT — past the sex-specific upper limit but under 500 ms.

   The heart takes longer than usual to reset electrically. Causes worth a
   doctor checking, roughly in order of how often they turn out to be it:
   medicines (many, including some antibiotics and antidepressants), low
   potassium or magnesium, and inherited long QT syndrome.

   Sex matters: 450 ms for men, 460 for women. An unprofiled screen takes
   the higher limit, so it under-calls rather than over-calls. */

import { fmtMs, margin, type ScreeningRule } from '../types';
import { QTC_SEVERE_MS, qtcLimitFor, readQtc } from './qtcCorrection';

export const rule: ScreeningRule = {
  id: 'qtLong',
  category: 'repolarisation',
  level: 'attention',
  confidence: 'high',
  source: 'AHA/ACCF/HRS 2009 — QTc upper limits 450 ms (male) / 460 ms (female)',
  evaluate(ctx) {
    const q = readQtc(ctx.analysis);
    if (q === null) return null;

    const b = ctx.analysis.intervals.qtcBazettMs as number;
    const f = ctx.analysis.intervals.qtcFridericiaMs as number;
    if (b >= QTC_SEVERE_MS && f >= QTC_SEVERE_MS) return false;

    const limit = qtcLimitFor(ctx.patient.sex);
    if (q.primary <= limit) return false;

    return {
      evidence: [
        { label: q.primaryLabel, value: fmtMs(q.primary) },
        { label: q.otherLabel, value: fmtMs(q.other) },
        { label: 'Upper limit', value: fmtMs(limit) },
      ],
      margin: margin(q.primary, limit, QTC_SEVERE_MS),
      focus: 'qt',
      scale: { value: q.primary, unit: 'ms', min: 300, max: 560, normalLow: 350, normalHigh: limit },
    };
  },
};

// v1.0.0 — Rate-appropriate QTc past the sex-specific limit, under 500 ms.
