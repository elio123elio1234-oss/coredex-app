/* ==================================================================
   baseApi — the single RTK Query API instance (same pattern as web:
   endpoints are injected from feature-adjacent files; the baseQuery is
   the only transport-aware line in the app).
   ================================================================== */

import { createApi } from '@reduxjs/toolkit/query/react';
import { ENV } from '@/config/env';
import { httpBaseQuery } from './httpBaseQuery';
import { localBaseQuery } from './localBaseQuery';

export const baseApi = createApi({
  reducerPath: 'api',
  /* THE SWAP (web CLAUDE.md §4.1, mirrored): EXPO_PUBLIC_API_BASE_URL set →
     the real CYPHIX server (bearer auth + 401→refresh→retry); empty → the
     on-device store. Both speak the same { url, method, body } /
     { status, message } contract, so no endpoint, hook or screen knows
     which one is active. This is the same line web's baseApi carries. */
  baseQuery: ENV.hasBackend ? httpBaseQuery : localBaseQuery,
  tagTypes: ['Patient', 'Condition', 'Encounter', 'Recording', 'Message'],
  endpoints: () => ({}),
});

// v0.2.0 — Live swap point: localBaseQuery (on-device Scan History) when no
//          backend is configured, httpBaseQuery when one is.
