/* ==================================================================
   usePdfLabels — resolves every word the printed report needs.

   The PDF builder holds no locale by design: it is a pure function so the
   whole document can be generated and asserted on in Node, without a React
   tree or a printer. That means SOMETHING has to translate, and this is it.

   ══ WHY THE DOMAIN VOCABULARY IS RESOLVERS, NOT FIELDS ══
   The report's own chrome is a fixed list and is spelled out. The engine's
   enumerated vocabulary — 43 finding names, their meanings, their causes,
   four levels, nine categories, three confidences, five blind spots — is
   not: copying ~130 strings into an object literal would mean editing this
   file every time a rule is added, and forgetting to would print a raw
   identifier into a document a doctor reads.

   Passing `tr` through as a resolver makes that structurally impossible:
   the keys are built from the id, and the locale union checks them.
   ================================================================== */

import { useMemo } from 'react';
import type {
  BlindSpotId,
  FindingCategory,
  FindingConfidence,
  FindingId,
  ScreeningLevel,
} from '@cyphix/shared';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import { AXIS_KEY, REGULARITY_KEY } from '@/components/organisms/EcgAnalysisSheet';
import { INTERPRETATION_ENABLED } from '@/config/featureFlags';
import type { PdfLabels } from '@/services/export/pdf/labels';

const CATEGORY_KEY: Record<FindingCategory, TranslationKey> = {
  rate: 'scrCatRate',
  rhythm: 'scrCatRhythm',
  conduction: 'scrCatConduction',
  repolarisation: 'scrCatRepolarisation',
  axis: 'scrCatAxis',
  chamber: 'scrCatChamber',
  ischaemia: 'scrCatIschaemia',
  other: 'scrCatOther',
  technical: 'scrCatTechnical',
};

const CONFIDENCE_KEY: Record<FindingConfidence, TranslationKey> = {
  high: 'scrConfHigh',
  moderate: 'scrConfModerate',
  limited: 'scrConfLimited',
};

const BLIND_KEY: Record<BlindSpotId, TranslationKey> = {
  anteriorSeptal: 'scrBlindAnteriorSeptal',
  posterior: 'scrBlindPosterior',
  chamberPrecordial: 'scrBlindChamberPrecordial',
  paroxysmal: 'scrBlindParoxysmal',
  singleTimepoint: 'scrBlindSingleTimepoint',
};

const LEVEL_KEY: Record<ScreeningLevel, { headline: TranslationKey; action: TranslationKey }> = {
  clear: { headline: 'scrLevelClear', action: 'scrActClear' },
  attention: { headline: 'scrLevelAttention', action: 'scrActAttention' },
  urgent: { headline: 'scrLevelUrgent', action: 'scrActUrgent' },
  inconclusive: { headline: 'scrLevelInconclusive', action: 'scrActInconclusive' },
};

export function usePdfLabels(): PdfLabels {
  const { t: tr } = useTranslation();

  return useMemo<PdfLabels>(
    () => ({
      brand: 'CYPHIX MEDICAL',
      title: tr('reportLimbTitle'),
      recorded: tr('reportRecorded'),
      duration: tr('reportDuration'),
      leads: tr('reportLeads'),
      leadSet: tr('reportLeadSetShort'),
      sampleRate: tr('reportSampleRate'),
      device: tr('histDevice'),
      patient: tr('pdfPatient'),
      simulated: tr('reportSimulated'),

      pageEcg: tr('pdfPageEcg'),
      pageInterpretation: tr('pdfPageInterpretation'),
      pageMeasurements: tr('pdfPageMeasurements'),
      pageStatistics: tr('pdfPageStatistics'),
      pageReference: tr('pdfPageReference'),
      sheetWindow: tr('pdfSheetWindow'),
      pageOf: tr('pdfPageOf'),
      continued: tr('pdfContinued'),

      checksRan: tr('scrChecksLine'),
      findingsTitle: tr('scrFindingsTitle'),
      noFindings: tr('pdfNoFindings'),
      criterion: tr('pdfCriterion'),
      borderlineNote: tr('pdfBorderline'),
      auditTitle: tr('pdfAuditTitle'),
      auditNote: tr('pdfAuditNote'),
      medianBeatTitle: tr('pdfMedianBeatTitle'),
      medianBeatCaption: tr('pdfMedianBeatCap'),

      statsRate: tr('secRate'),
      statsIntervals: tr('secIntervals'),
      statsAxis: tr('secAxis'),
      statsVariability: tr('pdfStatsVariability'),
      statsAmplitudes: tr('secAmplitudes'),
      statsQuality: tr('secQuality'),
      refRange: tr('refRange'),
      measureCol: tr('pdfColMeasure'),
      resultCol: tr('pdfColResult'),
      refCol: tr('pdfColRef'),

      mBpm: tr('mBpm'),
      mRrMean: tr('mRrMean'),
      mRrRange: tr('mRrRange'),
      mSdnn: tr('mSdnn'),
      mRmssd: tr('mRmssd'),
      mRrVariation: tr('mRrVariation'),
      mBeats: tr('mBeats'),
      mSqi: tr('qSqi'),
      mAnalysed: tr('qAnalysed'),
      mEctopy: tr('scrStatEctopy'),

      poincareCaption: tr('pdfPoincareCap'),
      tachogramCaption: tr('pdfTachogramCap'),
      axisCaption: tr('pdfAxisCap'),

      ampLead: tr('ampLead'),
      ampUnit: tr('ampUnit'),

      /* ── The measurements page ── */
      heroKicker: tr('pdfHeroKicker'),
      bpmUnit: tr('bpm'),
      beatsUnit: tr('pdfBeatsUnit'),
      mRegularity: tr('mRegularity'),
      mPBefore: tr('mPBefore'),
      iPr: tr('iPR'),
      iQrs: tr('iQRS'),
      iQt: tr('iQT'),
      iQtcB: tr('iQTcB'),
      iQtcF: tr('iQTcF'),
      intervalsNote: tr('intervalsNote'),
      axisSector: tr('axisNormalRange'),
      axisNetI: tr('axisNetI'),
      axisNetAvf: tr('axisNetAvf'),
      ampP: tr('ampP'),
      ampQ: tr('ampQ'),
      ampR: tr('ampR'),
      ampS: tr('ampS'),
      ampT: tr('ampT'),
      ampPp: tr('pdfAmpPp'),
      ampScale: tr('pdfAmpScale'),
      qualityBody: tr('pdfQualityBody'),

      procTitle: tr('pdfProcTitle'),
      procBody: tr('pdfProcBody'),
      leadMapTitle: tr('pdfLeadMapTitle'),
      leadMapCaption: tr('pdfLeadMapCap'),
      wallInferior: tr('pdfWallInferior'),
      wallLateral: tr('pdfWallLateral'),
      wallNotSeen: tr('pdfWallNotSeen'),
      blindTitle: tr('scrBlindTitle'),
      /* ★ v0.60.0 — the first half of this sentence was "This is a screening
         result, not a diagnosis", and since v0.59.0 the report contains no
         screening result to disclaim. A legal statement that describes a
         section the document does not have is worse than none: it tells the
         reader to look for a verdict, and the honest statement — measurements
         only, not a diagnosis — is the second half, which was always there. */
      disclaimer: INTERPRETATION_ENABLED
        ? `${tr('scrDisclaimer')} ${tr('analysisDisclaimer')}`
        : tr('analysisDisclaimer'),
      noteTitle: tr('noteTitle'),

      /* The measurement layer's own two classifications. Same tables the
         app's Values screen reads, so the paper and the screen can never
         call one recording "slightly variable" and the other "regular". */
      regularityName: (r) => tr(REGULARITY_KEY[r]),
      axisClassName: (c) => tr(AXIS_KEY[c]),

      /* ★ ANNOTATED, NOT CAST. The template-literal type is checked against
         the locale key union, so adding a rule to the engine is a COMPILE
         ERROR here until both languages carry its three strings — which is
         the only reliable way to stop a raw identifier reaching a document
         somebody treats a patient from. */
      finding: (id: FindingId) => {
        const name: TranslationKey = `scrF_${id}`;
        const meaning: TranslationKey = `scrM_${id}`;
        const cause: TranslationKey = `scrCause_${id}`;
        return { name: tr(name), meaning: tr(meaning), cause: tr(cause) };
      },
      level: (l: ScreeningLevel) => ({
        headline: tr(LEVEL_KEY[l].headline),
        action: tr(LEVEL_KEY[l].action),
      }),
      category: (c: FindingCategory) => tr(CATEGORY_KEY[c]),
      confidence: (c: FindingConfidence) => tr(CONFIDENCE_KEY[c]),
      blindSpot: (b: BlindSpotId) => tr(BLIND_KEY[b]),
    }),
    [tr],
  );
}

// v1.3.0 — Resolves the processing-provenance copy (`procTitle`/`procBody`).
// v1.2.0 — The disclaimer no longer opens with "This is a screening result":
//          since v0.59.0 the document contains no screening result to
//          disclaim, and a legal sentence describing a section that is not
//          there tells the reader to go looking for a verdict.
// v1.1.0 — Adds the measurements page's copy, plus the two measurement-layer
//          classifications (rhythm, axis) resolved from the SAME tables the
//          app's Values screen reads — so the paper and the screen cannot call
//          one recording "slightly variable" and the other "regular".
// v1.0.0 — Resolves the printed report's copy. Chrome as fields, the engine's
//          enumerated vocabulary as resolvers, so adding a rule never means
//          remembering to edit this file.
