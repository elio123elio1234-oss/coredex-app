/* ==================================================================
   baseApi — the single RTK Query API instance (same pattern as web:
   endpoints are injected from feature-adjacent files; the baseQuery is
   the only transport-aware line in the app).
   ================================================================== */

import { createApi } from '@reduxjs/toolkit/query/react';
import { ENV } from '@/config/env';
import { localBaseQuery } from './localBaseQuery';
import { offlineBaseQuery } from './offlineBaseQuery';

export const baseApi = createApi({
  reducerPath: 'api',
  /* THE SWAP (web CLAUDE.md §4.1, mirrored): EXPO_PUBLIC_API_BASE_URL set →
     the real CYPHIX server; empty → the on-device store. Both speak the
     same { url, method, body } / { status, message } contract, so no
     endpoint, hook or screen knows which one is active.

     ★ The server side of the swap is `offlineBaseQuery`, not
     `httpBaseQuery` — it reads the device's own copy first and wraps the
     HTTP one for everything it does not hold. That is a change in WHERE
     the answer comes from, never in what the answer looks like: the two
     still return the same shapes for the same routes, which is the only
     reason a whole offline layer could be added without touching a single
     endpoint definition or screen. */
  baseQuery: ENV.hasBackend ? offlineBaseQuery : localBaseQuery,
  tagTypes: ['Patient', 'Condition', 'Encounter', 'Recording', 'Message'],
  endpoints: () => ({}),
});

// v0.3.0 — The backend path now goes through offlineBaseQuery (device-first
//          reads over the HTTP transport) instead of httpBaseQuery directly.
// v0.2.0 — Live swap point: localBaseQuery (on-device Scan History) when no
//          backend is configured, httpBaseQuery when one is.
