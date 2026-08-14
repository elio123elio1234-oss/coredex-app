/* ==================================================================
   patientContext — WHO a screening may be personalised for, in one place.

   Sex moves the long-QT threshold by 10 ms; age moves voltage criteria.
   `usePatientCard` returns the ACTIVE patient, which is not necessarily
   the subject of the recording being screened — a clinician opening
   someone else's study would otherwise have that person screened against
   the wrong limit, silently. So the subject reference is compared first,
   and a mismatch passes NO context at all, which makes the engine fall
   back to the more conservative default. Under-calling a borderline QT is
   recoverable; screening a woman against a man's threshold because of a
   UI coincidence is not.

   This rule used to live inside `useScreening` alone. It now has three
   consumers — the Findings tab, the History digest backfill, and (next)
   the PDF export — and three hand copies of a safety rule is how one of
   them drifts. The rule lives here; everyone imports it.
   ================================================================== */

import type { PatientCardModel, ScreeningContext } from '@cyphix/shared';

/** Whole years between an ISO birth date and now; undefined when unusable. */
export function ageYearsFrom(birthDate: string | undefined): number | undefined {
  if (!birthDate) return undefined;
  const born = new Date(birthDate);
  if (!Number.isFinite(born.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age--;
  return age >= 0 && age < 130 ? age : undefined;
}

export interface ResolvedScreeningContext {
  context: ScreeningContext;
  /** Stable identity of the context actually applied — what the digest
      cache stores, so a changed card invalidates exactly once. '' means
      "no context was applied". */
  ctxKey: string;
}

/**
 * The context a recording with this `subject` reference may be screened
 * with, given the active patient's card. Empty unless the recording
 * provably belongs to that patient.
 */
export function screeningContextFor(
  subject: string | undefined,
  card: PatientCardModel,
  patientId: string | null,
  isDemo: boolean,
): ResolvedScreeningContext {
  /* "Patient/pat-001" → "pat-001". The recording stores a FHIR-style
     reference; the card stores a bare id. */
  const subjectId = subject?.split('/').pop() ?? null;
  const isOwnRecord = !isDemo && patientId !== null && subjectId === patientId;

  if (!isOwnRecord) return { context: {}, ctxKey: '' };

  const sex = card.gender;
  const ageYears = ageYearsFrom(card.birthDate);

  const context: ScreeningContext = {};
  if (sex) context.sex = sex;
  if (ageYears !== undefined) context.ageYears = ageYears;

  return { context, ctxKey: `${sex ?? ''}|${ageYears ?? ''}` };
}

// v1.0.0 — The "provably theirs" rule extracted from useScreening, so the
//          Findings tab, the History digest backfill and the PDF export apply
//          one rule rather than three copies of it.
