/* ==================================================================
   useActivePatientId — WHICH patient the patient-centric screens show.

   The medical card, the portrait and (later) the chat thread are all
   about ONE patient. For a signed-in patient that is their own
   `linkedPatientId`, which the server puts in the session precisely so a
   client never has to guess.

   Returns `null` when there is nobody to ask about — signed out, or a
   CLINICIAN, who has no single "active patient" and needs a picker rather
   than an invented default. Callers render the demo card in that case,
   which is also what keeps the offline demo intact.

   Mirror of the web hook of the same name, written there after pages that
   hard-coded the demo patient id asked the server for a record the
   signed-in patient did not own and got a correct 403.
   ================================================================== */

import { useCurrentUser } from './useCurrentUser';

export function useActivePatientId(): string | null {
  const user = useCurrentUser();
  return user?.linkedPatientId ?? null;
}

// v1.0.0 — Resolves patient-centric screens to the signed-in patient's own id.
