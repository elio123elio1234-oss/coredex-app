/* Low voltage — small QRS complexes in EVERY limb lead.

   The classic causes are things sitting between the heart and the
   electrodes: a pericardial effusion, obesity, emphysema, or an
   infiltrative muscle disease.

   ⚠️⚠️ READ THIS BEFORE TRUSTING THE THRESHOLD.
   0.5 mV is the criterion for a STANDARD 12-lead ECG: wet gel electrodes,
   on the torso and limbs, at fixed anatomical positions. This device is a
   watch on one wrist and a fingertip on the crown. That geometry records a
   genuinely smaller signal than a torso hookup does, for reasons that have
   nothing to do with the heart.

   A real user reported this finding at 0.48 mV against the 0.50 threshold —
   4 % over — and read the amber verdict as something being wrong with them.
   The `margin` machinery exists partly because of that report and keeps a
   borderline result from raising the verdict. But that is a mitigation, not
   a validation: **until this threshold has been checked against a corpus of
   real recordings from this hardware, treat a low-voltage finding as a
   statement about the recording at least as much as about the heart.**
   That is why the copy leads with "there are several causes". */

import { fmtMv, margin, type ScreeningRule } from '../types';
import { LIMB_LEAD_ORDER } from '../../../types/ecg';

const THRESHOLD_MV = 0.5;
const DECISIVE_MV = 0.3;

export const rule: ScreeningRule = {
  id: 'lowVoltage',
  category: 'other',
  level: 'attention',
  confidence: 'moderate',
  source: 'Low-voltage QRS <0.5 mV in all limb leads (12-lead criterion; see header)',
  evaluate(ctx) {
    const amps = ctx.analysis.amplitudes;
    const values = LIMB_LEAD_ORDER.map((l) => amps[l]?.qrsAmplitudeMv ?? null);
    if (values.some((v) => v === null)) return null;

    const largest = Math.max(...(values as number[]));
    if (largest >= THRESHOLD_MV) return false;

    return {
      evidence: [
        { label: 'Largest QRS', value: fmtMv(largest) },
        { label: 'Lower limit', value: fmtMv(THRESHOLD_MV) },
      ],
      margin: margin(largest, THRESHOLD_MV, DECISIVE_MV),
      focus: 'qrs',
      scale: {
        value: largest,
        unit: 'mV',
        min: 0,
        max: 2,
        normalLow: THRESHOLD_MV,
        normalHigh: 2,
      },
    };
  },
};

// v1.0.0 — QRS under 0.5 mV in every limb lead. Threshold not yet validated
//          against this hardware — see the header.
