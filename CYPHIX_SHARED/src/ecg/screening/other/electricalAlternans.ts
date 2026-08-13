/* Electrical alternans — the QRS amplitude swinging beat to beat.

   A heart swinging inside a pericardium full of fluid changes its distance
   from the electrodes with every beat, so the recorded amplitude alternates.
   With a tachycardia and low voltage it is the classic triad of cardiac
   tamponade, which is why it is urgent.

   ★ THE TEST IS NOT "AMPLITUDES VARY" — every recording's do. It is that
   they ALTERNATE, and the first version of this rule failed exactly there:
   at 15 % swing and 80 % sign-flipping it fired on 1 in 7 simulated HEALTHY
   subjects, because on ten beats ordinary jitter splits into "even" and
   "odd" groups differing by 15 % surprisingly often.

   Three conditions now, and the third is the one that actually works:
     1. the swing exceeds 20 % of the median amplitude
     2. the differences alternate in sign at least 90 % of the time
     3. ★ the gap between the two groups exceeds the scatter WITHIN each
        group. Real alternans makes two tight populations; noise makes one
        loose one. Comparing against the combined spread would be
        self-defeating, since the alternation IS most of that spread. */

import { fmtPct, median, type ScreeningRule } from '../types';

const MIN_BEATS = 8;
const SWING_RATIO = 0.2;
const MIN_CONSISTENCY = 0.9;
/** The between-group gap must exceed the within-group scatter by this much. */
const SEPARATION = 2;

export const rule: ScreeningRule = {
  id: 'electricalAlternans',
  category: 'other',
  level: 'urgent',
  confidence: 'limited',
  source: 'Electrical alternans — cardiac tamponade (with tachycardia and low voltage)',
  evaluate(ctx) {
    const amps = ctx.beats.map((b) => b.qrsAmpMv);
    if (amps.length < MIN_BEATS) return null;

    const even = amps.filter((_, i) => i % 2 === 0);
    const odd = amps.filter((_, i) => i % 2 === 1);
    const mEven = median(even) ?? 0;
    const mOdd = median(odd) ?? 0;
    const mAll = median(amps) ?? 0;
    if (mAll <= 0) return null;

    const gap = Math.abs(mEven - mOdd);
    const swing = gap / mAll;

    const mad = (group: number[], centre: number): number =>
      median(group.map((v) => Math.abs(v - centre))) ?? 0;
    const scatter = Math.max(mad(even, mEven), mad(odd, mOdd));
    const separated = gap > scatter * SEPARATION;

    let flips = 0;
    let pairs = 0;
    for (let i = 1; i < amps.length - 1; i++) {
      const a = amps[i] - amps[i - 1];
      const b = amps[i + 1] - amps[i];
      if (a !== 0 && b !== 0) {
        pairs++;
        if (Math.sign(a) !== Math.sign(b)) flips++;
      }
    }
    const consistency = pairs > 0 ? flips / pairs : 0;

    if (swing < SWING_RATIO || consistency < MIN_CONSISTENCY || !separated) return false;

    return {
      evidence: [
        { label: 'Amplitude swing', value: fmtPct(swing * 100) },
        { label: 'Alternating', value: fmtPct(consistency * 100) },
        { label: 'Beats', value: String(amps.length) },
      ],
      margin: Math.min(1, (swing - SWING_RATIO) / 0.2),
      leads: ['II'],
      focus: 'rhythm',
      scale: {
        value: swing * 100,
        unit: '%',
        min: 0,
        max: 60,
        normalLow: 0,
        normalHigh: SWING_RATIO * 100,
      },
    };
  },
};

// v1.0.0 — Beat-to-beat QRS amplitude alternation, separated from noise.
