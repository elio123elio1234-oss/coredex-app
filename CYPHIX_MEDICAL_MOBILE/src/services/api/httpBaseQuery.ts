/* ==================================================================
   HTTP baseQuery — behavioural twin of
   CYPHIX_MEDICAL_WEB/src/services/api/httpBaseQuery.ts (parity is
   mandatory, root CLAUDE.md §2.2):
     • same { url, method, body } request / { status, message } error
     • Authorization: Bearer <access token> on every call
     • one transparent retry after a single-flight refresh on 401
   Endpoint definitions written against this are portable to web as-is.

   ── It is no longer the OUTERMOST layer ──
   `offlineBaseQuery` now wraps this one and is what `baseApi` installs.
   This file stays exactly what it was — "talk to the server, correctly" —
   and knows nothing about the device's cache. The two responsibilities are
   kept apart on purpose: everything below is transport, everything above
   is what the phone already knows.
   ================================================================== */

import { fetchBaseQuery, type BaseQueryFn } from '@reduxjs/toolkit/query';
import type { ApiError, ApiRequest } from '@cyphix/shared';
import { API_VERSION_PATH } from '@cyphix/shared';
import { ENV } from '@/config/env';
import { sessionExpired } from '@/services/auth/authEvents';
import { clearSession, getAccessToken, refreshSession } from './tokenStore';

/**
 * What a baseQuery reports ABOUT the answer, as opposed to the answer.
 *
 * `etag` is the validator the caching layer stores so it can make the next
 * request conditional; `fromCache` is how a screen (or a test) can tell
 * that nothing left the device. Both are diagnostics for the layer above —
 * no endpoint, hook or component reads them.
 */
export interface HttpMeta {
  status: number;
  etag?: string;
  fromCache?: boolean;
}

const rawQuery = fetchBaseQuery({
  baseUrl: `${ENV.apiBaseUrl.replace(/\/+$/, '')}${API_VERSION_PATH}`,
  prepareHeaders: (headers) => {
    const token = getAccessToken();
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

export const httpBaseQuery: BaseQueryFn<ApiRequest, unknown, ApiError, object, HttpMeta> = async (
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
      /* The session is genuinely over (or unreachable). Clearing alone
         would leave the app rendering a signed-in shell over 401s, so the
         slice is told to drop the principal and show the door — the same
         `sessionExpired` bridge the web uses. */
      await clearSession();
      api.dispatch(sessionExpired());
    }
  }

  /* The response headers are the only place a validator can come from, and
     `fetchBaseQuery` hands them over on BOTH paths — which matters, because
     a 304 is delivered as an "error" and a 304 is precisely the case the
     caching layer cares most about. */
  const response = result.meta?.response;
  const meta: HttpMeta = {
    status: response?.status ?? (typeof result.error?.status === 'number' ? result.error.status : 0),
    etag: response?.headers.get('etag') ?? undefined,
  };

  if (result.error) {
    const status = typeof result.error.status === 'number' ? result.error.status : 0;
    const data = result.error.data as { error?: { message?: string } } | undefined;
    return { error: { status, message: data?.error?.message ?? 'Request failed' }, meta };
  }
  return { data: result.data, meta };
};

// v1.1.0 — Reports HttpMeta (status + ETag) on both the success and the error
//          path, so the caching layer above can make conditional requests and
//          recognise a 304 for what it is.
// v1.0.0 — Refresh is real now: a failed one clears the enclave AND dispatches
//          sessionExpired, so the app cannot sit signed-in over 401s.
