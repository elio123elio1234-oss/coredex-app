/* ==================================================================
   THE RULE CONTRACT — what every one of the 43 screening rules is.

   ══ WHY THIS FILE EXISTS ══
   The first version of the screening engine was one 900-line function
   with 43 inline `rule(...)` calls. It worked and it was validated, and it
   was still the wrong shape for three specific reasons that only showed up
   once a person used it:

   1. A finding could not EXPLAIN ITSELF. The screen could print "Low
      voltage — largest QRS 0.48 mV, threshold 0.50 mV" and nothing else,
      because nothing else existed. The reader's question was "why is this
      yellow and should I be scared", and the engine had no field that
      answered it.
   2. A finding 4 % past its threshold looked identical to one 200 % past
      it. `margin` below is the fix, and it is the difference between a
      screen a healthy person trusts and one they learn to ignore.
   3. Adding a disease meant editing the file every other disease lives in.

   So a rule is now a DECLARATIVE OBJECT in its own file, carrying its
   threshold, its published source, the evidence it produces, how far past
   the line the patient actually is, and what to draw to show them why.

   ══ THE THREE-WAY RETURN, AND WHY IT IS NOT A BOOLEAN ══
   `evaluate` returns `null | false | RuleHit`, and collapsing the first
   two would destroy the engine's most important property:

     null    the rule COULD NOT RUN — its measurement was unavailable
     false   the rule RAN and did not fire
     RuleHit the rule RAN and fired

   "No abnormal finding" is only meaningful beside "41 of 43 checks ran".
   A boolean cannot tell a clean recording from an unreadable one, and both
   would draw the same green mark.
   ================================================================== */

import type { LimbLeadName } from '../../types/ecg';
import type { EcgAnalysis } from '../../types/ecgAnalysis';
import type {
  FindingCategory,
  FindingConfidence,
  FindingId,
  FindingLevel,
  ScreeningContext,
  ScreeningEvidence,
} from '../../types/ecgScreening';

/* ══════════════════ What a rule is given ══════════════════ */

/** One beat's width, height and timing on the reference lead. */
export interface BeatMetric {
  rIdx: number;
  qrsMs: number;
  qrsAmpMv: number;
  premature: boolean;
  wide: boolean;
}

/**
 * Everything measured once, up front, and handed to all 43 rules.
 *
 * Rules do NOT measure. If a rule needs a number nothing else provides, the
 * measurement goes in `measures/` and is computed here — because the ST
 * level a rule fires on must be the same ST level the "why" sheet draws,
 * and two independent measurements of one quantity eventually disagree.
 */
export interface RuleContext {
  analysis: EcgAnalysis;
  leads: Record<LimbLeadName, Float32Array>;
  fs: number;
  /** Median ST level at J+60 ms per lead, against the PR baseline. */
  st: Record<LimbLeadName, number | null>;
  beats: BeatMetric[];
  /**
   * Longest R-to-R from the RAW peak list.
   *
   * ⚠️ NOT `analysis.rate.rrMaxMs`, which is computed from intervals already
   * filtered to 300–1500 ms — correct for a rate estimate, and it makes a
   * 2.4 s pause literally invisible, because the interval carrying it is
   * discarded before it is reported.
   */
  maxRrMs: number | null;
  patient: ScreeningContext;
  /** Facts several rules would otherwise each recompute. */
  derived: {
    regular: boolean;
    pAbsent: boolean;
    wideQrs: boolean;
    ectopicCount: number;
    ectopyPct: number | null;
  };
}

/* ══════════════════ What a rule gives back ══════════════════ */

/**
 * Which part of the patient's own beat made this fire.
 *
 * The "why is this yellow" sheet draws their representative beat and
 * highlights exactly this segment. It is on the rule rather than on the UI
 * because only the rule knows what it looked at — a UI switch on finding
 * id would be a second copy of that knowledge, and it would rot.
 */
export type BeatFocus =
  | 'p'
  | 'pr'
  | 'qrs'
  | 'st'
  | 't'
  | 'qt'
  /** About the spacing of beats, not the shape of one — draw the rhythm strip. */
  | 'rhythm'
  /** Nothing on the waveform illustrates it (e.g. a swapped cable). */
  | 'none';

/**
 * The one number that fired the rule, on a scale a person can read.
 *
 * Drives the range bar in the explain sheet: "your 0.48 sits here, the
 * normal band is there". A patient cannot do anything with "0.48 mV"; they
 * can do a great deal with seeing it sit one pixel outside a green band.
 */
export interface RuleScale {
  value: number;
  unit: string;
  /** Axis bounds. Chosen per rule so the value is never off the end. */
  min: number;
  max: number;
  /** The band a typical adult falls in. */
  normalLow: number;
  normalHigh: number;
}

export interface RuleHit {
  evidence: ScreeningEvidence[];
  /**
   * ★ HOW FAR PAST THE LINE, NORMALISED: 0 = exactly at the threshold,
   * 1 = unambiguous.
   *
   * This is the field that exists because of a real report. A healthy
   * person measured 0.48 mV against a 0.50 mV low-voltage threshold — 4 %
   * over — and was shown the same amber verdict as someone with a genuine
   * finding. They read it as "something is wrong with my heart" and had no
   * way to tell it was a hair's breadth.
   *
   * Below `BORDERLINE_MARGIN` a finding is marked `borderline` and DOES NOT
   * raise the overall verdict. It is still listed, still explainable, still
   * in the PDF — it just stops turning a well person's screen amber.
   *
   * Compute it as `(value − threshold) / (decisive − threshold)`, clamped
   * to 0…1, where `decisive` is the value at which no reasonable reader
   * would call it borderline.
   */
  margin: number;
  leads?: LimbLeadName[];
  focus: BeatFocus;
  scale?: RuleScale;
  /**
   * Escalate beyond the rule's declared level.
   *
   * Only for rules whose severity is genuinely conditional — peaked T waves
   * are a metabolic hint alone and the start of an arrest sequence when the
   * QRS is widening and the P waves have gone. Splitting that into two
   * findings would report one process twice.
   */
  level?: FindingLevel;
}

/** `null` = could not run · `false` = ran, did not fire · `RuleHit` = fired. */
export type RuleResult = RuleHit | false | null;

/* ══════════════════ The rule itself ══════════════════ */

export interface ScreeningRule {
  id: FindingId;
  category: FindingCategory;
  /** The level when it fires, unless `evaluate` escalates it. */
  level: FindingLevel;
  confidence: FindingConfidence;
  /**
   * Where the threshold comes from — a citation, not a rationale.
   *
   * Printed in the PDF's interpretation page, because a doctor handed an
   * automated finding is entitled to know which criterion produced it, and
   * "our algorithm" is not an answer they can check.
   */
  source: string;
  /** Findings this one makes redundant or wrong. See `runner.ts`. */
  suppresses?: readonly FindingId[];
  evaluate(ctx: RuleContext): RuleResult;
}

/**
 * Below this margin a finding does not raise the verdict.
 *
 * 0.15 rather than 0: a threshold is a line drawn through a continuum, and
 * measurement noise on a dry-electrode wearable is easily a few per cent.
 * Treating the first sliver past the line as equal to the middle of the
 * abnormal range asserts a precision this device does not have.
 */
export const BORDERLINE_MARGIN = 0.15;

/** Clamp a raw margin into 0…1. Every rule ends with this. */
export function margin(value: number, threshold: number, decisive: number): number {
  const span = decisive - threshold;
  if (span === 0) return 1;
  return Math.max(0, Math.min(1, (value - threshold) / span));
}

/* ══════════════════ formatting helpers, shared by every rule ══════════════════ */

export function fmtMs(v: number | null): string {
  return v === null ? '—' : `${Math.round(v)} ms`;
}

export function fmtBpm(v: number | null): string {
  return v === null ? '—' : `${Math.round(v)} BPM`;
}

/** Signed millivolts — the sign is often the finding, so it is always shown. */
export function fmtMv(v: number | null): string {
  if (v === null) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)} mV`;
}

export function fmtPct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v)} %`;
}

export function fmtDeg(v: number | null): string {
  return v === null ? '—' : `${Math.round(v)}°`;
}

/** Magnitude of a negative deflection; 0 when the wave never went below
    baseline. Every criterion that "adds an S" means adding its DEPTH. */
export function depth(mv: number | null): number {
  return mv !== null && mv < 0 ? -mv : 0;
}

export function median(values: number[]): number | null {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return null;
  const sorted = [...clean].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/* ══════════════════ Lead groups ══════════════════ */

/** The inferior wall — right coronary territory. */
export const INFERIOR: readonly LimbLeadName[] = ['II', 'III', 'aVF'];
/** The high lateral wall — circumflex / diagonal territory. */
export const LATERAL: readonly LimbLeadName[] = ['I', 'aVL'];

// v1.0.0 — The declarative rule contract: one object per disease, carrying its
//          threshold, its citation, its evidence, how far past the line the
//          patient is (`margin`), and what to draw to show them why.
