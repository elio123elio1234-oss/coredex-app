/* ==================================================================
   Photo endpoints — the patient portrait.

   Mirror of the web's `services/api/endpoints/photoApi.ts`, and the
   reason the mirror matters: the portrait lives SERVER-SIDE (inside the
   encrypted health profile), so a picture chosen in the browser appears
   on the phone and the other way round. A device-local photo is a photo
   that exists on exactly one device — which is what the web app had
   before v1.46.1, and what this app had until now.
   ================================================================== */

import type { PatientPhoto } from '@cyphix/shared';
import { PATIENT_ROUTES } from '@cyphix/shared';
import { baseApi } from '@/services/api/baseApi';

export const photoApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPatientPhoto: build.query<PatientPhoto, string>({
      query: (patientId) => ({ url: PATIENT_ROUTES.photo(patientId), method: 'GET' }),
      /* Held for the whole session: it is the largest thing the app
         fetches and the least likely to change while someone browses. */
      keepUnusedDataFor: 3600,
      providesTags: (_r, _e, id) => [{ type: 'Patient' as const, id: `photo-${id}` }],
    }),
    setPatientPhoto: build.mutation<PatientPhoto, { patientId: string; photo: string | null }>({
      query: ({ patientId, photo }) => ({
        url: PATIENT_ROUTES.photo(patientId),
        method: 'PUT',
        body: { photo },
      }),
      /* Optimistic, for the same reason as web: every subscriber (the
         profile header, and anything else showing the avatar) updates the
         instant it is chosen rather than after the round trip. Undone if
         the write fails, so a picture never appears to have been saved
         when it was not. */
      async onQueryStarted({ patientId, photo }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          photoApi.util.updateQueryData('getPatientPhoto', patientId, (draft) => {
            draft.photo = photo;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const { useGetPatientPhotoQuery, useSetPatientPhotoMutation } = photoApi;

// v1.0.0 — Server-side portrait (get/set, optimistic), mirroring the web app's.
