/* Wide-complex tachycardia.

   ★ THE ONE RULE IN THIS ENGINE THAT IS DELIBERATELY PESSIMISTIC.

   A wide-complex tachycardia is ventricular tachycardia until proven
   otherwise, and the proof — the concordance and AV-dissociation criteria —
   needs chest leads this device does not have. The alternatives (SVT with
   aberrancy, pre-excitation) are benign by comparison, so the urgency is
   set by the WORST thing it can be rather than the most likely.

   Treating a VT as an SVT can kill someone; the reverse costs an ECG in a
   hospital. Those two errors are not symmetric, and the rule says so. */

import { fmtBpm, fmtMs, margin, type ScreeningRule } from '../types';

const BPM_THRESHOLD = 100;
const QRS_WIDE_MS = 120;
const BPM_DECISIVE = 140;

export const rule: ScreeningRule = {
  id: 'wideComplexTachycardia',
  category: 'rhythm',
  level: 'urgent',
  confidence: 'moderate',
  source: 'Brugada / Vereckei — wide-complex tachycardia is VT until excluded',
  suppresses: [
    'tachycardia',
    'tachycardiaExtreme',
    'svt',
    'ivcd',
    'bbbLeftPattern',
    'bbbRightPattern',
    'bbbIndeterminate',
  ],
  evaluate(ctx) {
    const { bpm } = ctx.analysis.rate;
    const qrs = ctx.analysis.intervals.qrsMs;
    if (bpm === null || qrs === null) return null;
    if (bpm <= BPM_THRESHOLD || qrs < QRS_WIDE_MS) return false;

    return {
      evidence: [
        { label: 'HR', value: fmtBpm(bpm) },
        { label: 'QRS', value: fmtMs(qrs) },
      ],
      margin: margin(bpm, BPM_THRESHOLD, BPM_DECISIVE),
      focus: 'qrs',
      scale: { value: qrs, unit: 'ms', min: 60, max: 200, normalLow: 80, normalHigh: QRS_WIDE_MS },
    };
  },
};

// v1.0.0 — Fast and wide: treated as ventricular until a doctor excludes it.
