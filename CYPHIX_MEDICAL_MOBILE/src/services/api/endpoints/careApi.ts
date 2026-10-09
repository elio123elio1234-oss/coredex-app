/* ==================================================================
   Care endpoints — the links between a patient and their care, and the
   invites staff mint (server v0.16.0, LAUNCH_PLAN 2.4).

   A 1:1 mirror of the web's `services/api/endpoints/careApi.ts` (root
   CLAUDE.md §2.2); the routes and shapes come from @cyphix/shared so
   the two cannot drift. A new link, or a broken one, changes who the
   medical card names, so the mutations invalidate the card as well.
   ================================================================== */

import {
  CARE_ROUTES,
  type CareLinkInput,
  type CareLinkResult,
  type CareRelationshipView,
  type InviteCreated,
  type InviteCreateInput,
  type InviteSummary,
  type InvitesResult,
} from '@cyphix/shared';
import { baseApi } from '@/services/api/baseApi';

export const careApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCareRelationships: build.query<CareRelationshipView[], void>({
      query: () => ({ url: CARE_ROUTES.relationships, method: 'GET' }),
      providesTags: (result) =>
        result
          ? [
              ...result.map((r) => ({ type: 'Care' as const, id: r.id })),
              { type: 'Care' as const, id: 'LIST' },
            ]
          : [{ type: 'Care' as const, id: 'LIST' }],
    }),

    /** The patient redeems a code. 404 for a wrong / used / expired /
        cancelled one alike; 409 when already connected to that party. */
    linkCare: build.mutation<CareLinkResult, CareLinkInput>({
      query: (body) => ({ url: CARE_ROUTES.link, method: 'POST', body }),
      invalidatesTags: [{ type: 'Care', id: 'LIST' }, 'Patient', 'Message'],
    }),

    unlinkCare: build.mutation<void, string>({
      query: (id) => ({ url: CARE_ROUTES.relationship(id), method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Care', id },
        { type: 'Care', id: 'LIST' },
        'Patient',
        'Message',
      ],
    }),

    /* Staff (a future clinician-lite, LAUNCH_PLAN 7.4). */
    getInvites: build.query<InviteSummary[], void>({
      query: () => ({ url: CARE_ROUTES.invites, method: 'GET' }),
      transformResponse: (r: InvitesResult) => r.invites,
      providesTags: [{ type: 'Care', id: 'INVITES' }],
    }),
    createInvite: build.mutation<InviteCreated, InviteCreateInput>({
      query: (body) => ({ url: CARE_ROUTES.invites, method: 'POST', body }),
      invalidatesTags: [{ type: 'Care', id: 'INVITES' }],
    }),
    cancelInvite: build.mutation<void, string>({
      query: (id) => ({ url: CARE_ROUTES.invite(id), method: 'DELETE' }),
      invalidatesTags: [{ type: 'Care', id: 'INVITES' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCareRelationshipsQuery,
  useLinkCareMutation,
  useUnlinkCareMutation,
  useGetInvitesQuery,
  useCreateInviteMutation,
  useCancelInviteMutation,
} = careApi;

// v1.0.0 — Care relationships (list / link / unlink) + staff invites, mirror of the web.
