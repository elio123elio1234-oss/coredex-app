/* A few extra beats.

   Extremely common and, in a structurally normal heart, harmless — most
   people have some. It is reported at all because a patient who FELT the
   skipped beat deserves to see it named rather than be told nothing was
   found, and because a doctor can dismiss it in seconds.

   ★ Its margin is 0 by construction, so it can never raise the verdict on
   its own. One or two extra beats in ten seconds is a normal finding, and
   turning a well person's screen amber for it is exactly the failure this
   engine has already been corrected for once. */

import { type ScreeningRule } from '../types';

const MIN_BEATS = 6;
const FREQUENT_AT = 3;

export const rule: ScreeningRule = {
  id: 'ectopyOccasional',
  category: 'rhythm',
  level: 'attention',
  confidence: 'limited',
  source: 'Ectopy is present in most healthy adults on ambulatory monitoring',
  evaluate(ctx) {
    const { beats, derived } = ctx;
    if (beats.length < MIN_BEATS) return null;
    if (derived.ectopicCount === 0 || derived.ectopicCount >= FREQUENT_AT) return false;

    return {
      evidence: [{ label: 'Extra beats', value: derived.ectopicCount + ' / ' + beats.length }],
      margin: 0,
      focus: 'rhythm',
    };
  },
};

// v1.0.0 — One or two premature beats. Reported, never escalated.
