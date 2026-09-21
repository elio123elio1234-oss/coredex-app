/* ==================================================================
   Consult reasons — the coded options a patient picks when opening a
   request with the clinic.

   Copied from `CYPHIX_MEDICAL_WEB/src/config/consultReasons.ts`, ids,
   codes and order unchanged. ⚠️ These are not display strings: the `code`
   is what reaches the server's `reason.code` and is stored on the
   request, so a mobile request and a web request of the same kind have to
   be the same coded thing. **If a code changes there, change it here.**

   Symptom reasons carry a SNOMED CT code — a request is not free-text
   only (web CLAUDE.md §5) — and administrative ones are deliberately
   uncoded, because "I want an appointment" is not a clinical finding and
   coding it as one would put an observation on a record that nobody
   observed. The human label is bilingual through i18n; the code and the
   system stay stable across languages.
   ================================================================== */

import type { TranslationKey } from '@/i18n/config';

export interface ConsultReasonOption {
  id: string;
  labelKey: TranslationKey;
  code?: string;
  /** Short system label for display, e.g. "SNOMED CT". */
  systemLabel?: string;
}

export const CONSULT_REASONS: ConsultReasonOption[] = [
  { id: 'palpitations', labelKey: 'reasonPalpitations', code: '80313002', systemLabel: 'SNOMED CT' },
  { id: 'chest', labelKey: 'reasonChest', code: '29857009', systemLabel: 'SNOMED CT' },
  { id: 'breathless', labelKey: 'reasonBreathless', code: '267036007', systemLabel: 'SNOMED CT' },
  { id: 'results', labelKey: 'reasonResults' },
  { id: 'medication', labelKey: 'reasonMedication' },
  { id: 'appointment', labelKey: 'reasonAppointment' },
];

// v1.0.0 — Coded consult-request reasons, mirrored from the web verbatim so the
//          same request means the same thing on both platforms.
