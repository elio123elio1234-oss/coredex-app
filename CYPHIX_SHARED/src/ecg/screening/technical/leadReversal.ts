/* The arm electrodes look swapped.

   ★ NOT A FINDING ABOUT A HEART — a finding about a RECORDING, and the most
   useful thing this engine can say when it fires, because it is fixable in
   five seconds and everything else on the screen is wrong until it is.

   Lead I inverted: its P wave and its net QRS both negative.

   ⚠️ THAT ALONE IS NOT ENOUGH, and the first version of this rule proved it
   by firing on ordinary marked RIGHT AXIS DEVIATION. A frontal vector at
   +120 degrees inverts lead I on its own, P wave included, so "lead I is
   upside down" cannot distinguish a swapped cable from a rightward heart.

   ★ aVR CAN. It faces the right shoulder, so atrial depolarisation always
   runs AWAY from it and its P wave is negative at every physiological axis —
   measured at -0.09 mV at +45 degrees and still -0.01 mV at +110. Swap the
   arm electrodes and aVR becomes the old -aVL: its P flips POSITIVE
   (+0.73 mV at the reversed geometry). One sign, and it separates the two
   cleanly.

   The rare alternative is dextrocardia, which is not fixable by moving a
   sticker. The copy says so rather than asserting the likely case as fact.

   It SUPPRESSES every finding read off lead I's polarity or off the frontal
   axis it defines — those are not lesser findings, they are artefacts of a
   misplaced cable, and leaving them on screen beside the explanation would
   have a patient reading six frightening rows caused by one sticker. */

import { fmtMv, type ScreeningRule } from '../types';

export const rule: ScreeningRule = {
  id: 'leadReversal',
  category: 'technical',
  level: 'attention',
  confidence: 'moderate',
  source: 'Limb-lead reversal detection — inverted lead I with a positive P in aVR',
  suppresses: [
    'axisLeft',
    'axisRight',
    'axisExtreme',
    'lafb',
    'lpfb',
    'bbbRightPattern',
    'bbbLeftPattern',
    'bbbIndeterminate',
    'stElevationLateral',
    'stDepressionLateral',
    'tInversionLateral',
    'qWavesLateral',
    'lvhVoltage',
  ],
  evaluate(ctx) {
    const pI = ctx.analysis.amplitudes.I?.pMv ?? null;
    const pAvr = ctx.analysis.amplitudes.aVR?.pMv ?? null;
    const netI = ctx.analysis.axis.netI;
    if (pI === null || pAvr === null || netI === null) return null;
    if (pI >= 0 || netI >= 0 || pAvr <= 0) return false;

    return {
      evidence: [
        { label: 'P in I', value: fmtMv(pI) },
        { label: 'P in aVR', value: fmtMv(pAvr) },
        { label: 'Net QRS in I', value: fmtMv(netI) },
      ],
      /* Always decisive: the three signs either line up or they do not.
         There is no "slightly swapped". */
      margin: 1,
      leads: ['I', 'aVR'],
      focus: 'none',
    };
  },
};

// v1.0.0 — Inverted lead I with a POSITIVE P in aVR: a swapped arm electrode.
