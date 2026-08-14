/* ==================================================================
   useReportContext — who the printed report is ABOUT, safely.

   `buildRecordingHtml` has accepted `patientName` and a `ScreeningContext`
   since v0.48 — and nothing ever passed them. The letterhead printed no
   patient, the identification grid printed "Patient —", and the PDF's
   screening ran without sex/age while the on-screen Findings tab used
   them: the paper could disagree with the screen it was exported from.

   The safety rule is the same one `useScreening` follows, from the same
   file (`patientContext.ts`): the ACTIVE patient's name and context are
   attached ONLY when the recording's subject provably is that patient.
   A clinician exporting someone else's study gets a report with no name
   and the conservative thresholds — an anonymous correct report, never a
   mislabelled one.
   ================================================================== */

import type { ScreeningContext, StoredRecording } from '@cyphix/shared';
import { screeningContextFor } from '@/features/history/patientContext';
import { usePatientCard } from '@/features/profile/usePatientCard';

export interface ReportContext {
  /** The subject's display name — only when provably theirs. */
  patientName: string | undefined;
  /** Sex/age for the screening thresholds — same guard. */
  context: ScreeningContext;
}

export function useReportContext(recording: StoredRecording | undefined): ReportContext {
  const { card, patientId, isDemo } = usePatientCard();
  const { context, ctxKey } = screeningContextFor(recording?.subject, card, patientId, isDemo);

  /* `ctxKey !== ''` means the subject-match guard passed AND the card had
     something to contribute; the name check must not be looser than the
     context check, so it re-derives the same guard directly. */
  const subjectId = recording?.subject?.split('/').pop() ?? null;
  const isOwnRecord = !isDemo && patientId !== null && subjectId === patientId;
  void ctxKey;

  return {
    patientName: isOwnRecord ? card.displayName : undefined,
    context,
  };
}

// v1.0.0 — Attaches the patient's name and screening context to the printed
//          report, under the same "provably theirs" guard the Findings tab
//          uses — the paper can no longer disagree with the screen.
