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
   Sex moves the long-QT threshold by 10 ms. `usePatientCard` returns the
   ACTIVE patient, which is not necessarily the subject of the recording
   being viewed — a clinician opening someone else's study would otherwise
   have that person screened against the wrong limit, silently. The
   subject reference is compared first, and a mismatch passes no context
   at all, which makes the engine fall back to the more conservative
   limit. Under-calling a borderline QT is recoverable; screening a woman
   against a man's threshold because of a UI coincidence is not.
   ================================================================== */

import { useMemo } from 'react';
import {
  screenLimbEcg,
  type EcgScreening,
  type ScreeningContext,
  type StoredRecording,
} from '@cyphix/shared';
import { usePatientCard } from '@/features/profile/usePatientCard';
import type { RecordingView } from '@/features/history/hooks/useRecordingView';

/** Whole years between an ISO birth date and now; null when unusable. */
function ageFrom(birthDate: string | undefined): number | undefined {
  if (!birthDate) return undefined;
  const born = new Date(birthDate);
  if (!Number.isFinite(born.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age--;
  return age >= 0 && age < 130 ? age : undefined;
}

export function useScreening(
  recording: StoredRecording | undefined,
  view: RecordingView | null,
): EcgScreening | null {
  const { card, patientId, isDemo } = usePatientCard();

  /* "Patient/pat-001" → "pat-001". The recording stores a FHIR-style
     reference; the card stores a bare id. */
  const subjectId = recording?.subject?.split('/').pop() ?? null;
  const isOwnRecord = !isDemo && patientId !== null && subjectId === patientId;

  const sex = isOwnRecord ? card.gender : undefined;
  const ageYears = isOwnRecord ? ageFrom(card.birthDate) : undefined;

  return useMemo(() => {
    if (!view || !recording) return null;
    if (recording.isSimulated) return null;

    const context: ScreeningContext = {};
    if (sex) context.sex = sex;
    if (ageYears !== undefined) context.ageYears = ageYears;

    return screenLimbEcg(view.leads, view.analysis, context);
    /* Keyed on the STUDY and on the two context values, not on `view` — the
       view object is a fresh reference whenever the filters recompute, and
       43 rules over six leads on the JS thread is not something to re-run
       on a scroll. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording?.id, recording?.isSimulated, view, sex, ageYears]);
}

// v1.0.0 — Screens a measured recording. Refuses to screen simulated data
//          (returns null), and passes patient sex/age only when the study
//          provably belongs to the active patient.
