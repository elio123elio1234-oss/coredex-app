/* ==================================================================
   ECG SCREENING — domain types for INTERPRETATION.

   ⚠️ READ THIS BEFORE TOUCHING ANYTHING HERE ⚠️

   `ecgAnalysis.ts` states, correctly and at length, that it measures and
   never interprets. That file has not changed its mind and must not: it
   is the layer a clinician checks arithmetic against, and a measurement
   that has an opinion cannot be checked.

   THIS is the layer that has the opinion, and it is deliberately a
   SEPARATE MODULE for exactly that reason. The split is the whole design:

     ecgAnalysis  →  "PR is 236 ms."              (a fact, falsifiable)
     ecgScreening →  "236 ms is a first-degree
                      AV block. Worth showing
                      a doctor."                  (a reading, arguable)

   Deleting this file leaves the measurements intact. Deleting the split
   leaves nothing anyone can audit.

   ══ WHAT THIS LAYER IS ALLOWED TO CLAIM ══
   It is a SCREEN, not a diagnosis. Three things follow from that word and
   all three are enforced by the shapes below rather than by good
   intentions:

   1. EVERY finding carries its `evidence` — the numbers that made the rule
      fire. A verdict a reader cannot check is a verdict they must either
      accept or ignore, and both are wrong.
   2. EVERY finding carries a `confidence`, because a QTc of 512 ms and a
      "possible left posterior fascicular block" are not the same kind of
      statement and must not be drawn as though they were.
   3. EVERY screening carries its `blindSpots` — what these six leads
      CANNOT see. An anterior STEMI is invisible to limb leads. A screen
      that returns `clear` without saying so is not merely incomplete, it
      is actively misleading, which is worse than returning nothing.

   ══ REGULATORY NOTE, WRITTEN DOWN ON PURPOSE ══
   Automated interpretation is a higher regulatory class than automated
   measurement (EU MDR / FDA both). Nothing in this file changes that fact
   and nothing here should be read as a claim that the classification has
   been obtained. `ScreeningFinding` deliberately carries no ICD-10 or
   SNOMED code: this layer produces a PATTERN NAME and an urgency, not a
   diagnosis, and coding it would assert otherwise.
   ================================================================== */

import type { LimbLeadName } from './ecg';

/* ══════════════════ Levels ══════════════════ */

/**
 * The single answer the patient actually reads.
 *
 * Four states, and the fourth is the one that matters most: `inconclusive`
 * exists so that "we could not tell" is never rendered as `clear`. A noisy
 * ten seconds and a quiet heart look identical to any rule that only has
 * three outcomes, and collapsing them tells someone with an unreadable
 * recording that they are fine.
 */
export type ScreeningLevel = 'clear' | 'attention' | 'urgent' | 'inconclusive';

/** A finding can only ever be one of the two that carry a finding. */
export type FindingLevel = Extract<ScreeningLevel, 'attention' | 'urgent'>;

/**
 * How much weight a single finding may be given.
 *
 *   `high`     — a threshold on a measurement this device makes well.
 *                QTc ≥ 500 ms. QRS ≥ 120 ms. It either is or it isn't.
 *   `moderate` — a real pattern, with a real differential a limb-lead
 *                strip cannot settle. "Wide QRS with a left-sided
 *                morphology" is honest; "LBBB" needs V1 and V6.
 *   `limited`  — a suggestion. Fires on a shape that has innocent causes
 *                far more often than guilty ones, and is included because
 *                a doctor who is told about it can rule it out in seconds
 *                while a patient who is never told cannot.
 */
export type FindingConfidence = 'high' | 'moderate' | 'limited';

export type FindingCategory =
  | 'rate'
  | 'rhythm'
  | 'conduction'
  | 'repolarisation'
  | 'axis'
  | 'chamber'
  | 'ischaemia'
  | 'other'
  /** Not about the heart at all — about how the recording was taken. */
  | 'technical';

/* ══════════════════ The findings ══════════════════ */

/**
 * Every pattern this engine can name.
 *
 * The names are PATTERNS, not diseases, and the wording is load-bearing:
 * `bbbLeftPattern` rather than `lbbb`, `avBlockCompleteSuspected` rather
 * than `completeHeartBlock`. Six limb leads can see a shape; they cannot
 * confirm the mechanism behind it, and an identifier that claims otherwise
 * makes every downstream label claim it too.
 */
export type FindingId =
  /* ── rate ── */
  | 'bradycardiaSevere'
  | 'bradycardia'
  | 'tachycardia'
  | 'tachycardiaExtreme'
  /* ── rhythm ── */
  | 'atrialFibrillation'
  | 'atrialFlutter'
  | 'svt'
  | 'wideComplexTachycardia'
  | 'ectopyFrequent'
  | 'ectopyOccasional'
  | 'irregularRhythm'
  | 'pause'
  | 'pauseLong'
  /* ── conduction ── */
  | 'avBlock1'
  | 'avBlock1Marked'
  | 'avBlock2Suspected'
  | 'avBlockCompleteSuspected'
  | 'ivcd'
  | 'bbbLeftPattern'
  | 'bbbRightPattern'
  | 'bbbIndeterminate'
  | 'lafb'
  | 'lpfb'
  /* ── repolarisation ── */
  | 'qtLong'
  | 'qtLongSevere'
  | 'qtShort'
  | 'tInversionInferior'
  | 'tInversionLateral'
  /* ── axis ── */
  | 'axisLeft'
  | 'axisRight'
  | 'axisExtreme'
  /* ── chamber ── */
  | 'lvhVoltage'
  | 'raEnlargement'
  /* ── ischaemia ── */
  | 'stElevationInferior'
  | 'stElevationLateral'
  | 'stDepressionInferior'
  | 'stDepressionLateral'
  | 'qWavesInferior'
  | 'qWavesLateral'
  /* ── other ── */
  | 'hyperkalaemiaPattern'
  | 'lowVoltage'
  | 'electricalAlternans'
  /* ── technical ── */
  | 'leadReversal';

/**
 * One measurement that made a rule fire, already formatted.
 *
 * Formatted rather than numeric because the unit and the precision are
 * part of the claim: "0.12" is not evidence, "ST II +0.12 mV" is. The
 * engine knows which it measured; a UI reformatting a bare number would
 * have to re-derive that and would eventually get one wrong.
 */
export interface ScreeningEvidence {
  /** Symbol or short name — `QTc`, `PR`, `ST II`. Not translated: these
      are the international ECG symbols and are the same in every locale. */
  label: string;
  /** The value WITH its unit — `512 ms`, `+0.12 mV`, `31 %`. */
  value: string;
}

/** Which part of the patient's own beat to highlight when explaining it. */
export type BeatFocus = 'p' | 'pr' | 'qrs' | 'st' | 't' | 'qt' | 'rhythm' | 'none';

/** The number that fired the rule, placed on a scale a person can read. */
export interface FindingScale {
  value: number;
  unit: string;
  min: number;
  max: number;
  normalLow: number;
  normalHigh: number;
}

export interface ScreeningFinding {
  id: FindingId;
  category: FindingCategory;
  level: FindingLevel;
  confidence: FindingConfidence;
  /** The arithmetic behind the claim. Never empty. */
  evidence: ScreeningEvidence[];
  /** Which leads carried it, for the per-lead findings. */
  leads?: LimbLeadName[];

  /**
   * ★ HOW FAR PAST THE THRESHOLD, 0…1.
   *
   * 0 = exactly on the line, 1 = unambiguous. Added after a real report: a
   * healthy person measured 0.48 mV against a 0.50 mV limit — 4 % over —
   * and was shown the same amber verdict as someone with a genuine finding.
   * They read it as "something is wrong with my heart", which is what a
   * screen that cannot express degree will always eventually say.
   */
  margin: number;
  /**
   * True when `margin` is below `BORDERLINE_MARGIN`.
   *
   * A borderline finding is still listed, still explainable and still in
   * the PDF — it simply DOES NOT RAISE THE VERDICT. That is the whole point
   * of it: the green mark survives a measurement that is a hair past a
   * line, because a threshold is a line drawn through a continuum and this
   * device's precision does not justify treating the first sliver past it
   * as equal to the middle of the abnormal range.
   */
  borderline: boolean;
  /** Which part of the beat to draw when explaining this finding. */
  focus: BeatFocus;
  /** The firing number on its own axis, for the explain sheet's range bar. */
  scale?: FindingScale;
  /**
   * The published criterion behind the threshold.
   *
   * Printed in the PDF, because a doctor handed an automated finding is
   * entitled to know which criterion produced it, and "our algorithm" is
   * not an answer they can check.
   */
  source: string;
}

/* ══════════════════ What six leads cannot see ══════════════════ */

/**
 * The honest half of the answer.
 *
 * A `clear` screen means "none of the rules below fired on what these six
 * leads can observe". It does not mean a healthy heart, and the difference
 * is not a nuance — the anterior wall of the left ventricle is invisible
 * here, and that is where a large share of infarcts happen.
 */
export type BlindSpotId =
  /** V1–V4 territory: anterior and septal walls. Not observable at all. */
  | 'anteriorSeptal'
  /** Posterior wall — needs V7–V9, or the mirror change in V1–V2. */
  | 'posterior'
  /** Precordial voltage criteria (Sokolow, Cornell) need chest leads. */
  | 'chamberPrecordial'
  /** Ten seconds cannot see something that happens twice a week. */
  | 'paroxysmal'
  /** One strip is not a trend, and this engine reads one strip. */
  | 'singleTimepoint';

/* ══════════════════ Statistics ══════════════════ */

/**
 * The countable part of the screen.
 *
 * `rulesEvaluated` vs `rulesTotal` is the number that makes a `clear`
 * result mean something: 41 of 43 checks ran is a screen, 6 of 43 is a
 * recording that mostly could not be read. Without it the same green
 * circle would be shown for both.
 */
export interface ScreeningStats {
  rulesEvaluated: number;
  rulesTotal: number;
  /** Beats that were early and/or wide, as a percentage of all beats. */
  ectopyBurdenPct: number | null;
  beatsAnalyzed: number;
  analysedSeconds: number;
  /** Carried through from `SignalQuality.sqi` so one screen has one number. */
  signalQuality: number;
}

/* ══════════════════ The result ══════════════════ */

/**
 * What happened to ONE rule.
 *
 * ★ ADDED BECAUSE A COUNT IS NOT AN AUDIT. "43 of 43 checks ran" tells a
 * reader how much of the screen was possible; it does not tell them WHAT
 * was looked for. A clinician handed an automated report wants the negative
 * list at least as much as the positive one — "atrial fibrillation: not
 * present" is a clinical statement, and its absence is why an automated
 * "no abnormal finding" reads as an empty gesture.
 */
export interface ScreeningCheck {
  id: FindingId;
  category: FindingCategory;
  /**
   * `found`        the pattern is present
   * `notPresent`   the rule ran and the pattern is absent — the useful negative
   * `notEvaluated` the measurement it needs was unavailable, so NOTHING is
   *                claimed either way. Never collapse this into `notPresent`.
   */
  status: 'found' | 'notPresent' | 'notEvaluated';
}

export interface EcgScreening {
  /** The worst level among the findings — or `clear` / `inconclusive`. */
  level: ScreeningLevel;
  /** Sorted: urgent first, then by confidence, then by category order. */
  findings: ScreeningFinding[];
  /** Every rule and what happened to it, in registry order. */
  checks: ScreeningCheck[];
  blindSpots: BlindSpotId[];
  stats: ScreeningStats;
}

/**
 * Optional patient facts that change a THRESHOLD, never a rule.
 *
 * Only two are accepted, and both earn their place: the QTc upper limit is
 * genuinely sex-specific (450 ms vs 460 ms), and several voltage criteria
 * are age-dependent in a way that produces false positives in the young.
 * Everything is optional and the engine states which default it used, so a
 * screen run without a profile is still a valid screen rather than a
 * silently male one.
 */
export interface ScreeningContext {
  sex?: 'male' | 'female' | 'other' | 'unknown';
  ageYears?: number;
}

// v1.0.0 — Domain types for limb-lead ECG SCREENING: pattern names, urgency,
//          per-finding evidence and confidence, and the blind spots six leads
//          cannot cover. Deliberately separate from ecgAnalysis, which measures
//          and does not interpret.
