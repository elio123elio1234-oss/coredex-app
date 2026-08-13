/* A dropped ventricular beat.

   One RR close to twice its neighbours, in a rhythm that is otherwise not
   irregular, with P waves present.

   ⚠️ This deliberately does NOT classify Mobitz I versus Mobitz II. Telling
   them apart needs the PR trend across the dropped beat, which needs more
   consecutive conducted beats than ten seconds usually contains — and the
   distinction matters enormously (Mobitz I is often benign, Mobitz II
   progresses to complete block). Naming one without the evidence would be
   worse than naming neither. */

import { fmtMs, margin, median, type ScreeningRule } from '../types';

const RR_RATIO_LOW = 1.7;
const RR_RATIO_HIGH = 2.3;
const P_PRESENT_MIN_PCT = 60;
const MIN_PEAKS = 4;

export const rule: ScreeningRule = {
  id: 'avBlock2Suspected',
  category: 'conduction',
  level: 'attention',
  confidence: 'limited',
  source: 'Second-degree AV block — a non-conducted P wave leaves an RR near 2x the prevailing one',
  evaluate(ctx) {
    const { rPeaks } = ctx.analysis;
    const { pBeforeQrsPct, rrMeanMs } = ctx.analysis.rate;
    if (rPeaks.length < MIN_PEAKS || pBeforeQrsPct === null) return null;
    if (pBeforeQrsPct < P_PRESENT_MIN_PCT) return false;

    const gaps: number[] = [];
    for (let i = 1; i < rPeaks.length; i++) gaps.push(rPeaks[i] - rPeaks[i - 1]);
    const rough = median(gaps);
    if (rough === null || rough <= 0) return null;
    /* Re-take the median EXCLUDING the long gaps, so one dropped beat does
       not drag the very baseline it is supposed to stand out from. */
    const typical = median(gaps.filter((g) => g < rough * 1.5)) ?? rough;
    if (typical <= 0) return null;

    const dropped = gaps.find((g) => g >= typical * RR_RATIO_LOW && g <= typical * RR_RATIO_HIGH);
    if (dropped === undefined) return false;

    const ratio = dropped / typical;
    return {
      evidence: [
        { label: 'Longest gap', value: fmtMs(ctx.maxRrMs) },
        { label: 'Usual gap', value: fmtMs(rrMeanMs) },
        { label: 'Ratio', value: ratio.toFixed(2) + 'x' },
      ],
      margin: margin(Math.abs(ratio - 2), 0.3, 0),
      focus: 'rhythm',
    };
  },
};

// v1.0.0 — One RR near double the prevailing one, with P waves present.
