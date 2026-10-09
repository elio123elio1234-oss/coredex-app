/* ==================================================================
   Contact endpoints — "Contact support" from Settings (server v0.23.0,
   LAUNCH_PLAN 5.4). A 1:1 mirror of the web's
   `services/api/endpoints/contactApi.ts` for the part the phone uses:
   the routes and shapes come from @cyphix/shared so the two cannot
   drift. The request goes out with the bearer token the transport
   holds, so the server attaches the account, uses its address and
   asks no CAPTCHA. Leads (the landing page's form) and the admin's
   lists are web-only (PARITY.md).
   ================================================================== */

import { CONTACT_ROUTES, type SupportCreated, type SupportInput } from '@cyphix/shared';
import { baseApi } from '@/services/api/baseApi';

export const contactApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** 201 { id, status, createdAt }; 400 on a field, 429 when too many. */
    createSupportTicket: build.mutation<SupportCreated, SupportInput>({
      query: (body) => ({ url: CONTACT_ROUTES.support, method: 'POST', body }),
    }),
  }),
});

export const { useCreateSupportTicketMutation } = contactApi;

// v1.0.0 — POST /support from a signed-in phone (server v0.23.0).
