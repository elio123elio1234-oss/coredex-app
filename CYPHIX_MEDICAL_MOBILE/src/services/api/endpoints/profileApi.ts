/* ==================================================================
   Profile endpoints — the patient's medical card.

   A 1:1 mirror of the web's `services/api/endpoints/profileApi.ts` (root
   CLAUDE.md §2.2: endpoint definitions mirror each other; only the
   transport differs). One call returns the assembled, MINIMIZED card —
   identity, coded conditions, health extras, care team — because the
   server owns the assembly and two clients re-deriving "age" or "BMI"
   from raw resources is how they end up disagreeing about a patient.

   The screen consumes only the generated hook, so it never learns whether
   this resolved over HTTP or not.
   ================================================================== */

import type { PatientCardModel } from '@cyphix/shared';
import { PATIENT_ROUTES } from '@cyphix/shared';
import { baseApi } from '@/services/api/baseApi';

export const profileApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPatientCard: build.query<PatientCardModel | undefined, string>({
      query: (id) => ({ url: PATIENT_ROUTES.card(id), method: 'GET' }),
      providesTags: (_r, _e, id) => [{ type: 'Patient' as const, id }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetPatientCardQuery } = profileApi;

// v1.0.0 — Patient medical-card endpoint, mirroring the web app's.
