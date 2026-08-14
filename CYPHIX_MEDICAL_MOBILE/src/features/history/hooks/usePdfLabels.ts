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

      leadMapTitle: tr('pdfLeadMapTitle'),
      leadMapCaption: tr('pdfLeadMapCap'),
      wallInferior: tr('pdfWallInferior'),
      wallLateral: tr('pdfWallLateral'),
      wallNotSeen: tr('pdfWallNotSeen'),
      blindTitle: tr('scrBlindTitle'),
      disclaimer: `${tr('scrDisclaimer')} ${tr('analysisDisclaimer')}`,
      noteTitle: tr('noteTitle'),

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

// v1.0.0 — Resolves the printed report's copy. Chrome as fields, the engine's
//          enumerated vocabulary as resolvers, so adding a rule never means
//          remembering to edit this file.
