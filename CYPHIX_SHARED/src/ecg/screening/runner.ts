/* ==================================================================
   THE RUNNER — measure once, evaluate 43 rules, resolve one answer.

   Everything clinical lives in the rule files. This file knows only how to
   run them, and it owns exactly four decisions, all of which are about
   HONESTY rather than about hearts:

     1. count a rule that could not run, instead of skipping it
     2. demote a borderline finding so it does not raise the verdict
     3. suppress findings another finding makes redundant or wrong
     4. refuse to answer at all when the signal was not readable

   ══ WHY MEASUREMENT HAPPENS HERE AND NOT IN THE RULES ══
   The ST level a rule fires on must be the same ST level the explain sheet
   draws. Two independent computations of one quantity eventually disagree,
   and the failure mode is the worst one available to this feature: a screen
   showing a patient evidence that contradicts the finding it is evidence
   for.
   ================================================================== */

import { type LimbLeadName } from '../../types/ecg';
import type { EcgAnalysis } from '../../types/ecgAnalysis';
import type {
  EcgScreening,
  FindingId,
  ScreeningContext,
  ScreeningCheck,
  ScreeningFinding,
  ScreeningLevel,
} from '../../types/ecgScreening';
import { delineateBeat } from '../ecgAnalysis';
import { measureBeats, measureLongestRr, measureStLevels } from './measures';
import { ALL_RULES } from './registry';
import { BORDERLINE_MARGIN, type RuleContext } from './types';

/* Regularity and P-presence bounds, shared by the rules through `derived`
   so a dozen files cannot each pick their own idea of "regular". */
const REGULAR_MAX_VARIATION_PCT = 6;
const P_ABSENT_MAX_PCT = 40;
const WIDE_QRS_MS = 120;
const MIN_BEATS_FOR_ANY_ANSWER = 3;

/** Display order within a level: the categories a reader triages by, first. */
const CATEGORY_ORDER: Record<ScreeningFinding['category'], number> = {
  technical: 0,
  ischaemia: 1,
  rhythm: 2,
  conduction: 3,
  repolarisation: 4,
  rate: 5,
  chamber: 6,
  axis: 7,
  other: 8,
};

const CONFIDENCE_ORDER: Record<ScreeningFinding['confidence'], number> = {
  high: 0,
  moderate: 1,
  limited: 2,
};

/**
 * Six limb leads always have the same blind spots, so this is a constant —
 * and it is returned on EVERY screen, including a perfectly clear one. The
 * moment it becomes conditional, the condition will eventually be "we found
 * nothing", which is precisely when it most needs saying.
 */
const LIMB_LEAD_BLIND_SPOTS = [
  'anteriorSeptal',
  'posterior',
  'chamberPrecordial',
  'paroxysmal',
  'singleTimepoint',
] as const;

/** Measure everything the rules will need, once. */
function buildContext(
  leads: Record<LimbLeadName, Float32Array>,
  analysis: EcgAnalysis,
  patient: ScreeningContext,
): RuleContext {
  const fs = analysis.sampleRate;
  const reference = leads.II;
  const rrMeanSamples =
    analysis.rate.rrMeanMs !== null
      ? (analysis.rate.rrMeanMs / 1000) * fs
      : Math.round(fs * 0.8);

  const delineated = reference
    ? analysis.rPeaks.map((r) => delineateBeat(reference, r, rrMeanSamples, fs))
    : [];
  const st = measureStLevels(leads, delineated, fs);
  const beats = reference ? measureBeats(reference, analysis.rPeaks, rrMeanSamples, fs) : [];

  const ectopicCount = beats.filter((b) => b.premature).length;
  const ectopyPct = beats.length > 0 ? (ectopicCount / beats.length) * 100 : null;
  const qrs = analysis.intervals.qrsMs;

  return {
    analysis,
    leads,
    fs,
    st,
    beats,
    maxRrMs: measureLongestRr(analysis.rPeaks, fs),
    patient,
    derived: {
      regular:
        analysis.rate.rrVariationPct !== null &&
        analysis.rate.rrVariationPct <= REGULAR_MAX_VARIATION_PCT,
      pAbsent:
        analysis.rate.pBeforeQrsPct !== null && analysis.rate.pBeforeQrsPct < P_ABSENT_MAX_PCT,
      wideQrs: qrs !== null && qrs >= WIDE_QRS_MS,
      ectopicCount,
      ectopyPct,
    },
  };
}

/**
 * Screen a measured limb-lead recording.
 *
 * @param leads    the SAME filtered waveforms `analysis` was measured from
 * @param analysis the output of `analyseLimbEcg` over those waveforms
 * @param patient  optional facts that move a THRESHOLD, never a rule
 */
export function screenLimbEcg(
  leads: Record<LimbLeadName, Float32Array>,
  analysis: EcgAnalysis,
  patient: ScreeningContext = {},
): EcgScreening {
  const ctx = buildContext(leads, analysis, patient);

  const fired: ScreeningFinding[] = [];
  /* ★ The AUDIT, not just the count. A clinician wants the negative list at
     least as much as the positive one: "atrial fibrillation: not present" is
     a clinical statement, and its absence is why an automated "no abnormal
     finding" reads as an empty gesture. */
  const checks: ScreeningCheck[] = [];
  let rulesEvaluated = 0;

  for (const rule of ALL_RULES) {
    let result;
    try {
      result = rule.evaluate(ctx);
    } catch {
      /* A rule that throws is a rule that did not run. It must not take the
         other 42 with it, and it must not be counted as having passed —
         silently reporting "clear" because a rule crashed is the single
         worst outcome available here. */
      checks.push({ id: rule.id, category: rule.category, status: 'notEvaluated' });
      continue;
    }

    /* `null` means the measurement was unavailable: the rule did not run,
       so it is not counted as evaluated. This is the distinction the whole
       checks-run denominator rests on. */
    if (result === null) {
      checks.push({ id: rule.id, category: rule.category, status: 'notEvaluated' });
      continue;
    }
    rulesEvaluated++;
    if (result === false) {
      checks.push({ id: rule.id, category: rule.category, status: 'notPresent' });
      continue;
    }
    checks.push({ id: rule.id, category: rule.category, status: 'found' });

    fired.push({
      id: rule.id,
      category: rule.category,
      level: result.level ?? rule.level,
      confidence: rule.confidence,
      source: rule.source,
      evidence: result.evidence,
      leads: result.leads,
      margin: result.margin,
      borderline: result.margin < BORDERLINE_MARGIN,
      focus: result.focus,
      scale: result.scale,
    });
  }

  /* ── Suppression ──
     Two jobs in one table, and both are "do not show this beside that":
       REDUNDANT  `avBlock1Marked` already says everything `avBlock1` says,
                  and a list of findings is read as a COUNT.
       WRONG      `leadReversal` invalidates every conclusion drawn from
                  lead I's polarity. Those are artefacts of a misplaced
                  sticker, and leaving them beside the explanation would
                  have a patient reading six frightening rows caused by one.
     A suppressed finding is dropped entirely rather than dimmed: a reader
     asked to discount a row they can still see will not. */
  const firedIds = new Set(fired.map((f) => f.id));
  const suppressed = new Set<FindingId>();
  for (const rule of ALL_RULES) {
    if (!firedIds.has(rule.id)) continue;
    for (const victim of rule.suppresses ?? []) suppressed.add(victim);
  }

  /* A suppressed finding is not `found` on the audit sheet. It was explained
     away by a stronger or more specific rule, and listing it as present
     beside the rule that supersedes it would report one fact twice. */
  for (const c of checks) if (c.status === 'found' && suppressed.has(c.id)) c.status = 'notPresent';

  const findings = fired
    .filter((f) => !suppressed.has(f.id))
    .sort(
      (a, b) =>
        (a.level === 'urgent' ? 0 : 1) - (b.level === 'urgent' ? 0 : 1) ||
        /* Borderline findings sink within their level: they are the least
           actionable thing on the screen and must not be the first thing
           read. */
        Number(a.borderline) - Number(b.borderline) ||
        CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence] ||
        CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] ||
        b.margin - a.margin,
    );

  const stats = {
    rulesEvaluated,
    rulesTotal: ALL_RULES.length,
    ectopyBurdenPct:
      ctx.derived.ectopyPct === null ? null : Math.round(ctx.derived.ectopyPct * 10) / 10,
    beatsAnalyzed: analysis.rate.beatsAnalyzed,
    analysedSeconds: analysis.quality.analysedSeconds,
    signalQuality: analysis.quality.sqi,
  };

  /* ★ THE BRANCH THAT MATTERS MOST.
     Too few clean beats and nothing above is trustworthy — including the
     ABSENCE of findings. `inconclusive` is returned rather than `clear`,
     and the heart findings are dropped rather than shown at a discount,
     because a list of hedged findings still reads as a list of findings.
     The TECHNICAL finding survives: "your electrodes look swapped" is the
     most useful thing that can be said about an unreadable recording, and
     it is the one conclusion that does not depend on beat quality. */
  if (analysis.quality.insufficient || analysis.rate.beatsAnalyzed < MIN_BEATS_FOR_ANY_ANSWER) {
    return {
      level: 'inconclusive',
      findings: findings.filter((f) => f.category === 'technical'),
      checks,
      blindSpots: [...LIMB_LEAD_BLIND_SPOTS],
      stats,
    };
  }

  /* ★ BORDERLINE FINDINGS DO NOT RAISE THE VERDICT — BUT URGENT ONES ARE
       NEVER BORDERLINE.

     The first half is the fix for a real report: 0.48 mV against a 0.50 mV
     limit turned a healthy person's screen amber, and they read it as a
     statement about their heart rather than about the fourth significant
     figure of an electrode contact.

     ⚠️ THE SECOND HALF IS THERE BECAUSE THE FIRST HALF, ALONE, SHIPPED A
     FAR WORSE BUG THAN THE ONE IT FIXED. Validation caught a QTc of 515 ms
     — three per cent past the torsades threshold — being demoted to
     borderline and returning a GREEN verdict. Silencing an urgent finding
     is not a milder version of over-calling a benign one; it is the
     opposite error, and the two do not cost the same.

     So the demotion is deliberately asymmetric. `attention` means "worth a
     doctor's time", and a hair past a line does not clear that bar.
     `urgent` means "the cost of being wrong is severe", and a finding whose
     whole justification is the cost of a miss may not be dropped for being
     near its own threshold — being barely past the line that marks danger
     is still past it. */
  const deciding = findings.filter((f) => f.level === 'urgent' || !f.borderline);
  const level: ScreeningLevel = deciding.some((f) => f.level === 'urgent')
    ? 'urgent'
    : deciding.length > 0
      ? 'attention'
      : 'clear';

  return { level, findings, checks, blindSpots: [...LIMB_LEAD_BLIND_SPOTS], stats };
}

// v2.1.0 — Reports the AUDIT (`checks`): every rule and whether the pattern was
//          found, ruled out, or could not be evaluated. A count says how much of
//          the screen was possible; only the list says what was looked for.
// v2.0.0 — Rebuilt as a runner over 43 independent rule files. Adds `margin`
//          and the borderline demotion that keeps a hair-past-threshold
//          measurement from turning a well person's screen amber, and catches a
//          throwing rule rather than letting it report the other 42 as clear.
