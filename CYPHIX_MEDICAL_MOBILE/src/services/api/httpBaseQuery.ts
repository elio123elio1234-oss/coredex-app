/* ==================================================================
   HTTP baseQuery — behavioural twin of
   CYPHIX_MEDICAL_WEB/src/services/api/httpBaseQuery.ts (parity is
   mandatory, root CLAUDE.md §2.2):
     • same { url, method, body } request / { status, message } error
     • Authorization: Bearer <access token> on every call
     • one transparent retry after a single-flight refresh on 401
   Endpoint definitions written against this are portable to web as-is.
   ================================================================== */

import { fetchBaseQuery, type BaseQueryFn } from '@reduxjs/toolkit/query';
import type { ApiError, ApiRequest } from '@cyphix/shared';
import { API_VERSION_PATH } from '@cyphix/shared';
import { ENV } from '@/config/env';
import { clearSession, getAccessToken, refreshSession } from './tokenStore';

const rawQuery = fetchBaseQuery({
  baseUrl: `${ENV.apiBaseUrl.replace(/\/+$/, '')}${API_VERSION_PATH}`,
  prepareHeaders: (headers) => {
    const token = getAccessToken();
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

export const httpBaseQuery: BaseQueryFn<ApiRequest, unknown, ApiError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const user = await refreshSession(); // single-flight across parallel 401s
    if (user) {
      result = await rawQuery(args, api, extraOptions);
    } else {
      await clearSession();
    }
  }

  if (result.error) {
    const status = typeof result.error.status === 'number' ? result.error.status : 0;
    const data = result.error.data as { error?: { message?: string } } | undefined;
    return { error: { status, message: data?.error?.message ?? 'Request failed' } };
  }
  return { data: result.data };
};

// v0.1.0 — Bearer auth + 401→refresh→retry, mirroring web httpBaseQuery.
