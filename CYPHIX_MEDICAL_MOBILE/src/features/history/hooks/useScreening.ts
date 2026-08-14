/* ==================================================================
   useScreening — turn a MEASURED recording into a screening result.

        useRecordingView  →  { leads, analysis }
                                    │
                                    ▼  screenLimbEcg(+ patient context)
                              EcgScreening

   All the maths is in `@cyphix/shared`; this hook only decides two
   things, and both are about honesty rather than arithmetic.

   ══ 1. A SIMULATED RECORDING IS NOT SCREENED. IT RETURNS null. ══
   Mobile CLAUDE.md §4: "Synthetic data must never be presentable as a
   measurement." A verdict is a much stronger claim than a measurement, so
   the rule binds harder here, not less. Returning `null` — rather than a
   result the UI is trusted to caveat — means no future refactor of the
   screen can accidentally present a simulator's output as a reading of
   somebody's heart. The screen shows what the recording IS instead.

   (This is not hypothetical: the bench simulator's T wave sits at a fixed
   offset from the QRS, so its QT does not shorten with rate and every
   simulated strip measures a QTc near 280 ms. Screened, ~90 % of them
   would report a short QT interval. The engine is right and the signal is
   not a heart.)

   ══ 2. THE PATIENT CONTEXT IS PASSED ONLY WHEN IT IS PROVABLY THEIRS ══
   The rule itself lives in `patientContext.ts` — it now has three
   consumers (this tab, the History digest backfill, the PDF export) and
   three hand copies of a safety rule is how one of them drifts. Short
   version: the recording's `subject` is compared to the active patient
   first, and a mismatch passes NO context, so the engine falls back to
   the more conservative threshold.
   ================================================================== */

import { useMemo } from 'react';
import { screenLimbEcg, type EcgScreening, type StoredRecording } from '@cyphix/shared';
import { screeningContextFor } from '@/features/history/patientContext';
import { usePatientCard } from '@/features/profile/usePatientCard';
import type { RecordingView } from '@/features/history/hooks/useRecordingView';

export function useScreening(
  recording: StoredRecording | undefined,
  view: RecordingView | null,
): EcgScreening | null {
  const { card, patientId, isDemo } = usePatientCard();

  const { context, ctxKey } = screeningContextFor(recording?.subject, card, patientId, isDemo);

  return useMemo(() => {
    if (!view || !recording) return null;
    if (recording.isSimulated) return null;

    return screenLimbEcg(view.leads, view.analysis, context);
    /* Keyed on the STUDY and on the context's stable key, not on `view` or
       the context object — both are fresh references whenever something
       recomputes, and 43 rules over six leads on the JS thread is not
       something to re-run on a scroll. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording?.id, recording?.isSimulated, view, ctxKey]);
}

// v1.1.0 — The "provably theirs" context rule moved to patientContext.ts so the
//          Findings tab, the History digests and the PDF export share one copy.
// v1.0.0 — Screens a measured recording. Refuses to screen simulated data
//          (returns null), and passes patient sex/age only when the study
//          provably belongs to the active patient.
