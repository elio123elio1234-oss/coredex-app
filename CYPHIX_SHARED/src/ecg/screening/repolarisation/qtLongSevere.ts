/* Very long QT — 500 ms or more.

   500 ms is where the risk of torsades de pointes rises steeply, and it is
   the same number for everyone regardless of sex. Urgent, and the commonest
   cause is a DRUG — which is why the copy points at medicines: this is one
   of the few urgent ECG findings a patient can often act on the same day by
   phoning whoever prescribed it.

   ★ THE ONLY REPOLARISATION FINDING THAT REQUIRES BOTH CORRECTIONS.
   No alarm carrying "get seen now" may rest on a single formula at the edge
   of its validity. `qtLong` — an "ask your doctor" finding — does not need
   that corroboration, because the cost of ITS false positive is a
   conversation rather than an emergency room. */

import { fmtMs, margin, type ScreeningRule } from '../types';
import { QTC_SEVERE_MS, readQtc } from './qtcCorrection';

const DECISIVE_MS = 550;

export const rule: ScreeningRule = {
  id: 'qtLongSevere',
  category: 'repolarisation',
  level: 'urgent',
  confidence: 'high',
  source: 'AHA/ACCF/HRS 2009 — QTc >=500 ms, markedly increased torsades risk',
  suppresses: ['qtLong'],
  evaluate(ctx) {
    const q = readQtc(ctx.analysis);
    if (q === null) return null;
    const b = ctx.analysis.intervals.qtcBazettMs as number;
    const f = ctx.analysis.intervals.qtcFridericiaMs as number;
    if (b < QTC_SEVERE_MS || f < QTC_SEVERE_MS) return false;

    return {
      evidence: [
        { label: q.primaryLabel, value: fmtMs(q.primary) },
        { label: q.otherLabel, value: fmtMs(q.other) },
        { label: 'QT', value: fmtMs(ctx.analysis.intervals.qtMs) },
      ],
      /* Off the RATE-APPROPRIATE correction, not off whichever of the two
         happens to be lower. Both had to clear 500 ms for this to fire at
         all; the margin then describes the value we consider authoritative
         rather than the most pessimistic reading of a test already passed. */
      margin: margin(q.primary, QTC_SEVERE_MS, DECISIVE_MS),
      focus: 'qt',
      scale: {
        value: q.primary,
        unit: 'ms',
        min: 300,
        max: 600,
        normalLow: 350,
        normalHigh: 450,
      },
    };
  },
};

// v1.0.0 — Both corrections at or above 500 ms.
