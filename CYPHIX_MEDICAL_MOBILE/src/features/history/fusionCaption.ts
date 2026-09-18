/* ==================================================================
   fusionCaption — what was done to this recording's Lead II, in one line.

   A dual-Lead-II recording (firmware v3+) has its two Lead II copies fused
   before anything is drawn or measured. That is a processing step a reader
   is entitled to know about, and it has three outcomes that must not look
   alike:

     fused      "Lead II fused from two electrodes · noise 26 → 9 µV"
     declined   the fusion ran, judged the second copy unusable, and fell
                back to the first — WITH the reason, because a second
                channel that was silently ignored looks exactly like one
                that was used
     off        the reader switched it off in the viewer

   and one non-outcome: a recording with a single copy says NOTHING. Every
   recording made before the second electrode existed is that recording,
   and a line on all of them announcing a feature they do not have would be
   noise on the screens this app has spent releases quieting.

   Pure, and takes the translator as an argument, so the viewer and the
   end-of-exam report share one wording without either owning it. (The PDF
   has its own, longer paragraph — `pdfFusion*` — built from the same
   `FUSION_FALLBACK_KEY` table via `usePdfLabels`.)
   ================================================================== */

import type { LeadFusionFallback, LeadFusionInfo } from '@cyphix/shared';
import type { TranslationKey } from '@/i18n/config';
import type { TranslationParams } from '@/i18n/I18nContext';

/** Why the fusion declined, in plain words. A `Record`, so a new fallback in
    `@cyphix/shared` is a COMPILE error here, not a raw identifier on screen. */
export const FUSION_FALLBACK_KEY: Record<LeadFusionFallback, TranslationKey> = {
  'no-second-copy': 'fusionWhyNoCopy',
  'length-mismatch': 'fusionWhyLength',
  'too-short': 'fusionWhyShort',
  'not-finite': 'fusionWhyNotFinite',
  flat: 'fusionWhyFlat',
  'not-same-lead': 'fusionWhyNotSameLead',
};

export function fusionCaption(
  hasSecondCopy: boolean,
  fusion: LeadFusionInfo | null,
  tr: (key: TranslationKey, params?: TranslationParams) => string,
): string | null {
  if (!hasSecondCopy) return null;
  if (!fusion) return tr('fusionOff');
  if (fusion.mode === 'fused') {
    /* Whole microvolts, the same rounding the PDF uses: a decimal would claim
       a precision a robust RMS over ten seconds does not have. */
    return tr('fusionFused', {
      from: Math.round(fusion.noiseCopyAUv),
      to: Math.round(fusion.noiseOutputUv),
    });
  }
  return tr('fusionDeclined', {
    reason: tr(FUSION_FALLBACK_KEY[fusion.fallback ?? 'no-second-copy']),
  });
}

// v1.0.0 — One line saying what the dual-Lead-II fusion did (fused / declined,
//          with the reason / switched off), and nothing at all for a recording
//          with a single copy.
