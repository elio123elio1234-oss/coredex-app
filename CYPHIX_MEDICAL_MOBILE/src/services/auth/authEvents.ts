/* ==================================================================
   Auth events — actions the SERVICE layer dispatches upward without
   importing from features/ (dependency direction, mobile CLAUDE.md §2).
   The auth slice listens for these in extraReducers. Exact twin of the
   web's `services/auth/authEvents.ts`.
   ================================================================== */

import { createAction } from '@reduxjs/toolkit';

/** The HTTP layer could not refresh the session (revoked, expired, or the
    server detected a replayed token and killed the family). The auth slice
    clears the principal and AuthGate shows the onboarding flow. */
export const sessionExpired = createAction('auth/sessionExpired');

// v1.0.0 — sessionExpired action bridging services → auth slice.
