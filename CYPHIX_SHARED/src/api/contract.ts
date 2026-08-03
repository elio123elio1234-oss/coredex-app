/* ==================================================================
   API contract — the ONE communication envelope every platform speaks
   with CYPHIX_SERVER. Web's httpBaseQuery/mockBaseQuery and the mobile
   httpBaseQuery all implement exactly this shape, so RTK Query endpoint
   definitions are portable between platforms unchanged.
   ================================================================== */

/** All server routes are versioned under this prefix. */
export const API_VERSION_PATH = '/api/v1';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** The request shape every baseQuery accepts ({ url, method, body }). */
export interface ApiRequest {
  url: string;
  method?: ApiMethod;
  body?: unknown;
}

/** The normalized error every baseQuery returns ({ status, message }). */
export interface ApiError {
  status: number;
  message: string;
}

/**
 * Auth behaviour contract (parity is mandatory — root CLAUDE.md §2.2):
 *  • every call carries `Authorization: Bearer <access token>`
 *  • on 401: ONE single-flight refresh, then ONE transparent retry
 *  • refresh failure ⇒ clear session + emit a session-expired event
 * Web reference implementation: CYPHIX_MEDICAL_WEB/src/services/api/httpBaseQuery.ts
 */
export interface SessionUser {
  id: string;
  role: 'admin' | 'clinician' | 'technician' | 'patient' | 'guest';
  displayName: string;
  /**
   * For patient-role users: the Patient resource this account IS.
   *
   * ★ This is what makes one account the same person on every platform.
   * The server derives it from `users.patient_id` and returns it from
   * login / refresh / `GET /auth/me`; every row-scoped request
   * (`patients/:id/...`, a recording's `subject`) is answered against it.
   * A client that drops this field can still sign in and will then ask
   * for records it does not own — which the server correctly answers 403.
   */
  linkedPatientId?: string;
}

/**
 * What `POST /auth/login`, `/auth/register` and `/auth/refresh` return.
 *
 * The refresh token is ROTATED on every use and its whole family is
 * revoked if a rotated-out one is ever replayed, so a client must persist
 * the newest one it was handed and nothing older. `accessToken` is a
 * ~15-minute JWT and belongs in memory only, on every platform.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
  user: SessionUser;
}

// v1.1.0 — SessionUser carries linkedPatientId (the cross-platform identity
//          link) + the AuthTokens envelope every platform's auth client stores.
