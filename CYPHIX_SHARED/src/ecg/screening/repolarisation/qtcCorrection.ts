/* ==================================================================
   WHICH RATE CORRECTION A QT FINDING MAY FIRE ON.

   ⚠️ THIS FILE EXISTS BECAUSE OF A MEASURED FAILURE, and it is shared by
   all three QT rules so they can never disagree about it.

   Bazett (QT/sqrt(RR)) is what every report form prints, and it is accurate
   only between roughly 60 and 100 bpm. Outside that band it is not slightly
   off — it is wrong in a direction: it OVER-corrects when fast and
   UNDER-corrects when slow. A tachycardic healthy adult is therefore handed
   a QTc near the torsades threshold, and a bradycardic genuine long QT is
   hidden.

   Measured, before this file existed: the urgent long-QT finding fired on
   3.6 % of 3 000 synthetic healthy adults — one emergency alarm per 28 well
   people — purely from the formula.

   Fridericia (QT/cbrt(RR)) is far flatter across rate; that is the entire
   reason it exists. So the correction is chosen BY RATE, which is also the
   clinical convention:

     60–100 bpm   Bazett      its accurate range, and the printed one
     outside      Fridericia  where Bazett is known to mislead

   The report still prints both, unchanged. This governs only what FIRES.
   ================================================================== */

import type { EcgAnalysis } from '../../../types/ecgAnalysis';

export interface QtcReading {
  /** The value a finding is allowed to fire on. */
  primary: number;
  /** The other correction, carried for the evidence trail. */
  other: number;
  primaryLabel: string;
  otherLabel: string;
  /** True when Bazett was chosen, i.e. the rate sat in its valid band. */
  usedBazett: boolean;
}

export function readQtc(analysis: EcgAnalysis): QtcReading | null {
  const b = analysis.intervals.qtcBazettMs;
  const f = analysis.intervals.qtcFridericiaMs;
  const bpm = analysis.rate.bpm;
  if (b === null || f === null) return null;

  const usedBazett = bpm !== null && bpm >= 60 && bpm <= 100;
  return {
    primary: usedBazett ? b : f,
    other: usedBazett ? f : b,
    primaryLabel: usedBazett ? 'QTc (Bazett)' : 'QTc (Fridericia)',
    otherLabel: usedBazett ? 'QTc (Fridericia)' : 'QTc (Bazett)',
    usedBazett,
  };
}

/** The sex-specific upper limit. Unknown sex takes the HIGHER (female)
    limit, so an unprofiled screen under-calls rather than over-calls. */
export function qtcLimitFor(sex: string | undefined): number {
  return sex === 'male' ? 450 : 460;
}

export const QTC_SEVERE_MS = 500;
export const QTC_SHORT_MS = 340;

// v1.0.0 — Rate-gated QTc selection, shared by the three QT rules.
