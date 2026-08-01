/* ==================================================================
   baseApi — the single RTK Query API instance (same pattern as web:
   endpoints are injected from feature-adjacent files; the baseQuery is
   the only transport-aware line in the app).
   ================================================================== */

import { createApi } from '@reduxjs/toolkit/query/react';
import { httpBaseQuery } from './httpBaseQuery';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: httpBaseQuery,
  tagTypes: ['Patient', 'Condition', 'Encounter', 'Recording', 'Message'],
  endpoints: () => ({}),
});

// v0.1.0 — Single API instance, tag types mirroring web baseApi.
