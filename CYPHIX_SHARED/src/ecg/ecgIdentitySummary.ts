/* ==================================================================
   ecgIdentitySummary — the ECG ID, said in words a patient can use.

   ══ WHY THIS EXISTS ══
   Everything in `ecgIdentity.ts` is addressed to someone who already
   knows what a QRS is. "Shape · 3 leads −0.32 (1.00 → 0.68)" is a
   complete, checkable statement and it is worth nothing at all to the
   person whose heart it describes. This turns the same data into the
   three things that person actually asked:

     Is my heart doing what it usually does?
     How much does the app know about me yet?
     What is this thing on my screen?

   ══ ⚠️ THE MISTAKE THIS FILE IS BUILT TO NOT REPEAT ⚠️ ══
   The obvious implementation is "does the latest study carry a marked
   deviation". That is exactly how v0.41.0's alert banner was written, and
   on a real history it reported the same difference on **26 studies out
   of 26** — because `morphology` and `amplitude` clear their thresholds
   on very nearly every recording. A patient-facing sentence built the
   same way would tell someone their heart looks different every single
   time they measured, forever.

   The thresholds are not wrong; they are calibrated for a clinician
   reading one study, where "the shape correlation is 0.95" is a fact to
   weigh, not a verdict. The defect is in promoting them to a verdict.

   ★ So nothing here has an absolute threshold in it. A study is compared
   with THIS PATIENT'S OWN spread of scores: the median of their history
   and its robust deviation. By construction the quiet state is quiet —
   half of anyone's studies sit at or above their own median — and the
   sentence can only turn when a recording is unusual *for them*. That is
   also the honest claim: this app has never had any other one to make.

   ══ NO INTERPRETATION, STILL ══
   Plain language is not permission to diagnose. The strongest thing this
   file will ever say is "this one is not like your usual ones", which is
   a statement about a distance from a baseline — the same statement the
   deviations make, in smaller words. It never says healthy, never says
   abnormal, and never advises.
   ================================================================== */

import type { EcgIdentity } from '../types/ecgIdentity';

/* ══════════════════ Tunables, in units of the patient's own spread ══════════════════ */

/**
 * How many robust σ BELOW their own median a study may sit and still be
 * "one of your usual ones".
 *
 * Two is the ordinary reading of "unremarkable" and it is applied
 * one-sided: a study that matches BETTER than the median is never
 * flagged, which sounds obvious and is exactly the bug a two-sided test
 * would introduce — the patient's cleanest ever recording called unusual.
 */
const TYPICAL_Z = 2;
/** Beyond this, "not like your usual ones" rather than "a little different". */
const DIFFERENT_Z = 3.5;

/**
 * The robust σ may not fall below this many similarity points.
 *
 * Without it, a patient whose studies all score 96–97 has σ ≈ 0.7, and a
 * perfectly ordinary 94 lands 4 σ out and gets called different. Being
 * consistent must not make the app hair-triggered — that would punish
 * exactly the people it is working best for.
 */
const MIN_SIGMA = 4;

/**
 * Studies needed before any verdict is offered at all.
 *
 * Below this there is no "usual" to be unlike. Saying anything would be
 * inventing a comparison out of two numbers.
 */
const MIN_FOR_VERDICT = 4;

/* ══════════════════ What comes out ══════════════════ */

export type PlainVerdict =
  /** Not enough studies yet — the app is still learning this person. */
  | 'learning'
  /** The most recent study sits inside their own usual spread. */
  | 'consistent'
  /** Below their usual, by less than a difference worth the stronger word. */
  | 'slightlyDifferent'
  /** Well outside their own usual spread. Still not a finding. */
  | 'different';

export interface PlainSummary {
  verdict: PlainVerdict;
  /** Studies that sit inside this person's own usual spread. */
  typical: number;
  /** Studies that were scored at all (the denominator for `typical`). */
  scored: number;
  /** The newest scored study, and how it did. */
  latestSimilarity: number | null;
  latestAt: string | null;
  /**
   * How unusual the latest study is FOR THIS PERSON, in robust σ below
   * their own median. 0 = right on their median. Never negative — a
   * better-than-usual study is simply typical.
   *
   * Exposed so a UI can be as vague or as specific as its reader needs
   * without re-deriving the statistic, and so the number behind the
   * sentence is inspectable rather than magic.
   */
  latestZ: number | null;
  /** Studies still needed before the baseline is `established`. */
  remaining: number;
  /** Their usual resting rate, from the baseline. Patients recognise this one. */
  restingBpm: number | null;
  /**
   * The spread the verdict was measured against: this person's median
   * score and the robust σ around it, both in similarity points.
   *
   * Carried so a caller can classify ANY study — the one the reader just
   * tapped, not only the newest — with `plainVerdictOf` below, without
   * re-deriving the statistic and risking a screen where two sentences
   * about the same history disagree because they were computed twice.
   * `null` while there is no established spread to speak of.
   */
  spread: { centre: number; sigma: number } | null;
}

/**
 * Where one study's score sits in this person's own distribution.
 *
 * Returns `null` when there is no spread yet, which callers must render
 * as "not enough history to say" rather than as "typical" — those are
 * different claims and only one of them is supported by data.
 */
export function plainVerdictOf(
  summary: PlainSummary,
  similarity: number,
): { verdict: Exclude<PlainVerdict, 'learning'>; z: number } | null {
  if (!summary.spread) return null;
  const z = Math.max(0, (summary.spread.centre - similarity) / summary.spread.sigma);
  return {
    verdict: z < TYPICAL_Z ? 'consistent' : z < DIFFERENT_Z ? 'slightlyDifferent' : 'different',
    z: Math.round(z * 10) / 10,
  };
}

/* ══════════════════ Small robust helpers ══════════════════ */

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** MAD → σ. The same 1.4826 the rest of the ECG stack uses. */
function robustSigma(values: number[], centre: number): number {
  if (values.length === 0) return 0;
  return median(values.map((v) => Math.abs(v - centre))) * 1.4826;
}

/* ══════════════════ The entry point ══════════════════ */

/**
 * Reduce a built identity to what can honestly be said in one sentence.
 *
 * Pure, cheap and total: an identity with nothing in it returns
 * `learning` with zeroes rather than null, because every caller of this
 * is a screen that has to render something.
 */
export function summariseIdentityPlainly(identity: EcgIdentity | null): PlainSummary {
  const empty: PlainSummary = {
    verdict: 'learning',
    typical: 0,
    scored: 0,
    latestSimilarity: null,
    latestAt: null,
    latestZ: null,
    remaining: 0,
    restingBpm: null,
    spread: null,
  };
  if (!identity) return empty;

  const remaining = Math.max(0, identity.enrollmentTarget - identity.enrolled);
  const restingBpm = identity.intervals.bpm;

  /* Only studies that were actually scored can be typical or not. An
     excluded one has no score to compare — reporting it either way would
     be reporting on a measurement that was never made. `matches` is
     newest-first, which is where `latest` comes from. */
  const scoredMatches = identity.matches.filter((m) => m.excluded === null);
  const scores = scoredMatches.map((m) => m.similarity);
  const latest = scoredMatches[0] ?? null;

  const base: PlainSummary = {
    ...empty,
    remaining,
    restingBpm,
    scored: scores.length,
    latestSimilarity: latest?.similarity ?? null,
    latestAt: latest?.recordedAt ?? null,
  };

  if (identity.maturity !== 'established' || scores.length < MIN_FOR_VERDICT) {
    // Still learning. `typical` is deliberately left at 0 rather than
    // guessed: there is no established spread to be inside yet, and a
    // count implying otherwise would be the screen pretending to know.
    return { ...base, verdict: 'learning' };
  }

  const centre = median(scores);
  const sigma = Math.max(MIN_SIGMA, robustSigma(scores, centre));
  /** How far BELOW their own median a score sits, in their own σ. */
  const zOf = (s: number) => Math.max(0, (centre - s) / sigma);

  const typical = scores.filter((s) => zOf(s) < TYPICAL_Z).length;
  const latestZ = latest ? zOf(latest.similarity) : null;

  const verdict: PlainVerdict =
    latestZ === null || latestZ < TYPICAL_Z
      ? 'consistent'
      : latestZ < DIFFERENT_Z
        ? 'slightlyDifferent'
        : 'different';

  return {
    ...base,
    verdict,
    typical,
    latestZ: latestZ === null ? null : Math.round(latestZ * 10) / 10,
    spread: { centre, sigma },
  };
}

// v1.0.0 — The ECG ID in patient language: one verdict, a count of studies that
//          look like the person's usual, their resting rate, and how much is
//          left to learn. ★ Every judgement is made against THIS PATIENT'S OWN
//          spread of scores — median and robust σ — and never against an
//          absolute threshold. That is not a stylistic choice: v0.41.0's alert
//          banner was written the obvious way, against the per-study deviation
//          thresholds, and told a real user their heart differed on 26 studies
//          out of 26. Thresholds calibrated for a clinician weighing one study
//          cannot be promoted to a verdict addressed to the patient.
