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
}

// v1.0.0 — Shared request/error envelope + auth behaviour contract.
