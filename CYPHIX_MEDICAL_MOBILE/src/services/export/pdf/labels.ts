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
  BlindSpotId,
  FindingCategory,
  FindingConfidence,
  FindingId,
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
  pageStatistics: string;
  pageReference: string;
  sheetOf: string;
  /** "0.0-7.1 s of 9.9 s recorded" — the window against the total. */
  sheetWindow: string;
  pageOf: string;
  continued: string;

  /* ── Interpretation page ── */
  checksRan: string;
  findingsTitle: string;
  noFindings: string;
  evidenceTitle: string;
  criterion: string;
  borderlineNote: string;
  /** The 43-check audit. */
  auditTitle: string;
  auditNote: string;
  medianBeatTitle: string;
  /** Carries {used} and {rejected}. */
  medianBeatCaption: string;
  confidenceTitle: string;

  /* ── Statistics page ── */
  statsRate: string;
  statsIntervals: string;
  statsAxis: string;
  statsVariability: string;
  statsAmplitudes: string;
  statsQuality: string;
  refRange: string;

  mBpm: string;
  mRrMean: string;
  mRrRange: string;
  mSdnn: string;
  mRmssd: string;
  mRrVariation: string;
  mBeats: string;
  mPBefore: string;
  mSqi: string;
  mAnalysed: string;
  mEctopy: string;

  poincareTitle: string;
  poincareCaption: string;
  tachogramTitle: string;
  tachogramCaption: string;
  axisCaption: string;

  ampLead: string;
  ampUnit: string;

  /* ── Reference page ── */
  leadMapTitle: string;
  leadMapCaption: string;
  wallInferior: string;
  wallLateral: string;
  wallNotSeen: string;
  blindTitle: string;
  howToReadTitle: string;
  howToRead: string[];
  disclaimer: string;
  noteTitle: string;

  /* ── Resolvers for the engine's own vocabulary ── */
  finding: (id: FindingId) => { name: string; meaning: string; cause: string };
  level: (l: ScreeningLevel) => { headline: string; action: string };
  category: (c: FindingCategory) => string;
  confidence: (c: FindingConfidence) => string;
  blindSpot: (b: BlindSpotId) => string;
}

// v1.0.0 — The report's copy contract: static chrome spelled out, the engine's
//          enumerated vocabulary resolved by callback so adding a rule does not
//          touch this file.
