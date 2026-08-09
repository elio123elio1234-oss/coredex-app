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

import type { PatientCardModel, PatientCardPatch } from '@cyphix/shared';
import { PATIENT_ROUTES } from '@cyphix/shared';
import { baseApi } from '@/services/api/baseApi';

export const profileApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPatientCard: build.query<PatientCardModel | undefined, string>({
      query: (id) => ({ url: PATIENT_ROUTES.card(id), method: 'GET' }),
      providesTags: (_r, _e, id) => [{ type: 'Patient' as const, id }],
    }),

    /**
     * Edit the card. A PATCH: whatever is omitted is left alone.
     *
     * ★ Only the category being edited is ever sent. The sheet that edits
     * allergies sends `{ allergies }` and nothing else — never the whole
     * card it happens to be holding — because a client that echoes back
     * every field it rendered will silently revert anything changed
     * elsewhere since it loaded. That failure is invisible on one device
     * and inevitable with two.
     *
     * The tag invalidation is what makes the screen update: the card
     * re-fetches from the server rather than being patched locally, so
     * what is on screen is what was actually stored — including the
     * values the server derived (BMI) and any it rejected.
     */
    updatePatientCard: build.mutation<
      { updated: string[] },
      { id: string; patch: PatientCardPatch }
    >({
      query: ({ id, patch }) => ({
        url: PATIENT_ROUTES.card(id),
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Patient' as const, id }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetPatientCardQuery, useUpdatePatientCardMutation } = profileApi;

// v1.1.0 — Adds the card PATCH. Only the edited category is sent, never the
//          whole card: a client that echoes back every field it rendered
//          reverts anything changed elsewhere since it loaded — invisible on
//          one device, inevitable with two.
// v1.0.0 — Patient medical-card endpoint, mirroring the web app's.
