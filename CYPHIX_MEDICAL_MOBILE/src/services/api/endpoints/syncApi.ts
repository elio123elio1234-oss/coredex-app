/* ==================================================================
   syncApi — the one endpoint that asks "what changed?", rather than
   asking for the data.

   It is an RTK Query endpoint and not a bare `fetch` for one reason
   that matters: the token, the single-flight 401→refresh→retry and the
   session-expired bridge all live in the transport. A sync that bypassed
   it would be the one request in the app that silently stops working
   fifteen minutes after sign-in, and it would fail in the background
   where nobody is looking.

   ── Not cached, deliberately ──
   `keepUnusedDataFor: 0`. A delta is a DIFF, not a resource: it is true
   only relative to the cursor it was asked with, it is applied to disk the
   moment it arrives, and holding on to it would mean holding a description
   of a change that has already happened. The durable copy is the mirror.
   ================================================================== */

import { SYNC_ROUTES, type RecordingSyncDelta } from '@cyphix/shared';
import { baseApi } from '@/services/api/baseApi';

export const syncApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** `null` ⇒ no cursor on this device: ask for a full snapshot. */
    pullRecordingDelta: build.query<RecordingSyncDelta, string | null>({
      query: (since) => ({ url: SYNC_ROUTES.recordings(since) }),
      keepUnusedDataFor: 0,
    }),
  }),
  overrideExisting: false,
});

// v1.0.0 — The recordings delta endpoint, run imperatively by the sync engine.
