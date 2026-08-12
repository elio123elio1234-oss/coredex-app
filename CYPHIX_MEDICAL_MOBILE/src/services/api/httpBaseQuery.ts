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
import { sessionConfirmed, sessionExpired } from '@/services/auth/authEvents';
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
    const outcome = await refreshSession(); // single-flight across parallel 401s
    if (outcome.kind === 'refreshed') {
      /* Tell the slice a server just answered. Any request in the app can
         be the one that reconnects — the app opens on a restored session
         and the first 401 is the usual way it finds the server again —
         and without this the app would keep saying "offline" over data it
         had just fetched. Cheap: the refresh is single-flight, so this is
         one dispatch per real exchange, not one per screen. */
      api.dispatch(sessionConfirmed(outcome.user));
      result = await rawQuery(args, api, extraOptions);
    } else if (outcome.kind === 'rejected') {
      /* The session is genuinely over. Clearing alone would leave the app
         rendering a signed-in shell over 401s, so the slice is told to
         drop the principal and show the door — the same `sessionExpired`
         bridge the web uses. `clearSession` has already run inside the
         token store; this call is the idempotent belt to its braces. */
      await clearSession();
      api.dispatch(sessionExpired());
    }
    /* ★ `offline` deliberately does NOTHING.
       The refresh never reached a server, so nothing is known about this
       session and nothing about it may be changed. This branch used to be
       folded in with `rejected` — a single `null` covered both — and that
       is how a lost signal in the middle of a screen's 401 signed the
       patient out. The request below still fails, the caching layer serves
       the device's copy where it has one, and the next foreground asks
       again. */
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

// v1.2.0 — A 401 whose refresh comes back `offline` no longer signs the patient
//          out. Only `rejected` — a server that ANSWERED and refused — ends a
//          session; a refresh that never reached anyone teaches us nothing and
//          may therefore change nothing.
// v1.1.0 — Reports HttpMeta (status + ETag) on both the success and the error
//          path, so the caching layer above can make conditional requests and
//          recognise a 304 for what it is.
// v1.0.0 — Refresh is real now: a failed one clears the enclave AND dispatches
//          sessionExpired, so the app cannot sit signed-in over 401s.
