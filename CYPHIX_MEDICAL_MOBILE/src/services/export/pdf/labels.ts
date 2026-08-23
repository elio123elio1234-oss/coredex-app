/* ==================================================================
   The report's copy contract.

   ══ WHY THE SERVICE HOLDS NO LOCALE ══
   This folder emits HTML and knows nothing about `useTranslation`. The
   caller resolves every word and hands it in, which keeps the builder pure
   — it can be run in Node, asserted on, and diffed without a React tree.

   ══ STATIC STRINGS vs RESOLVERS ══
   The report's own chrome (headings, column names, captions) is a fixed
   list and is spelled out field by field. The DOMAIN vocabulary — 43
   finding names, their meanings, their plain-language causes, the levels,
   the categories — is not: it is an enumerated set the engine owns, and
   copying 130 fields into this interface would mean editing it every time
   a rule is added. Those come in as resolver functions instead, so adding a
   disease changes the locale and nothing here.
   ================================================================== */

import type {
  AxisClass,
  BlindSpotId,
  FindingCategory,
  FindingConfidence,
  FindingId,
  RegularityClass,
  ScreeningLevel,
} from '@cyphix/shared';

export interface PdfLabels {
  /* ── Identity and provenance ── */
  brand: string;
  title: string;
  recorded: string;
  duration: string;
  leads: string;
  leadSet: string;
  sampleRate: string;
  device: string;
  patient: string;
  simulated: string;

  /* ── Page titles ── */
  pageEcg: string;
  pageInterpretation: string;
  pageMeasurements: string;
  pageStatistics: string;
  pageReference: string;
  /** "0.0-7.1 s of 9.9 s recorded" — the window against the total. */
  sheetWindow: string;
  pageOf: string;
  continued: string;

  /* ── Interpretation page ── */
  checksRan: string;
  findingsTitle: string;
  noFindings: string;
  criterion: string;
  borderlineNote: string;
  /** The 43-check audit. */
  auditTitle: string;
  auditNote: string;
  medianBeatTitle: string;
  /** Carries {used} and {rejected}. */
  medianBeatCaption: string;

  /* ── Statistics page ── */
  statsRate: string;
  statsIntervals: string;
  statsAxis: string;
  statsVariability: string;
  statsAmplitudes: string;
  statsQuality: string;
  refRange: string;
  /* Measurement-table column heads. */
  measureCol: string;
  resultCol: string;
  refCol: string;

  mBpm: string;
  mRrMean: string;
  mRrRange: string;
  mSdnn: string;
  mRmssd: string;
  mRrVariation: string;
  mBeats: string;
  mSqi: string;
  mAnalysed: string;
  mEctopy: string;

  poincareCaption: string;
  tachogramCaption: string;
  axisCaption: string;

  ampLead: string;
  ampUnit: string;

  /* ── Measurements page (the redesigned A4, v0.60.0) ──
     Everything here names a QUANTITY. Nothing here judges one: there is
     deliberately no "within range" / "outside range" string in this
     interface, because the handoff had one and it was dropped — a report
     that stopped interpreting in v0.59.0 does not get to say a value is
     fine in v0.60.0. */
  /** The band's kicker — "Electrocardiogram report". */
  heroKicker: string;
  /** "BPM". A unit, not a sentence, and the same word in both languages. */
  bpmUnit: string;
  /** "beats", for the provenance chip. */
  beatsUnit: string;
  mRegularity: string;
  mPBefore: string;
  iPr: string;
  iQrs: string;
  iQt: string;
  iQtcB: string;
  iQtcF: string;
  /** "Shaded bands are typical adult ranges shown for context…" */
  intervalsNote: string;
  /** "Shaded sector: −30° to +90°" */
  axisSector: string;
  axisNetI: string;
  axisNetAvf: string;
  ampP: string;
  ampQ: string;
  ampR: string;
  ampS: string;
  ampT: string;
  /** "P–P" — the peak-to-peak row under each lead's bars. */
  ampPp: string;
  /** Carries {max} — "mV, scale ±1.0". */
  ampScale: string;
  /** Carries {beats}. Says what the ring measured, not whether it is good. */
  qualityBody: string;

  /* ── Reference page ──
     v0.56.0: the layperson "how to read" list is gone (it was addressed to
     the wrong reader, and its fourth sentence had been false since v0.49);
     the signal-quality table renders in its place. */
  leadMapTitle: string;
  leadMapCaption: string;
  /** "How this recording was processed" — provenance, never a finding.
      `{notch}` is filled from the shared NOTCH_HZ constant. */
  procTitle: string;
  procBody: string;
  wallInferior: string;
  wallLateral: string;
  wallNotSeen: string;
  blindTitle: string;
  disclaimer: string;
  noteTitle: string;

  /* ── Resolvers for the engine's own vocabulary ── */
  /**
   * The two classifications that come from the MEASUREMENT layer rather
   * than the screening engine — `analyseLimbEcg` produces both, and the app
   * has always shown them. They are resolvers for the same reason the
   * finding names are: the enumerations belong to `@cyphix/shared`, and a
   * new member should be a compile error here, not a raw identifier printed
   * into a document.
   */
  regularityName: (r: RegularityClass) => string;
  axisClassName: (c: AxisClass) => string;
  finding: (id: FindingId) => { name: string; meaning: string; cause: string };
  level: (l: ScreeningLevel) => { headline: string; action: string };
  category: (c: FindingCategory) => string;
  confidence: (c: FindingConfidence) => string;
  blindSpot: (b: BlindSpotId) => string;
}

// v1.3.0 — Adds `procTitle` / `procBody`: the signal chain, stated on the
//          paper for the first time. Provenance, not interpretation — it
//          describes what the software did, never what the heart did, so it
//          is allowed on a report that stopped giving verdicts in v0.59.0.
// v1.2.0 — Adds the measurements page's vocabulary, and the two measurement-
//          layer classifications (rhythm regularity, axis class) as resolvers.
//          There is deliberately no "within/outside range" string: the handoff
//          had one and it was dropped, because this report stopped
//          interpreting in v0.59.0.
// v1.1.0 — Dead labels removed (declared, never rendered: sheetOf,
//          evidence/confidence/poincare/tachogram titles, mPBefore, the
//          how-to-read list); the quality vocabulary (mSqi/mAnalysed/mBeats/
//          mRrRange/mEctopy/statsQuality) finally has a table to appear in.
// v1.0.0 — The report's copy contract: static chrome spelled out, the engine's
//          enumerated vocabulary resolved by callback so adding a rule does not
//          touch this file.
