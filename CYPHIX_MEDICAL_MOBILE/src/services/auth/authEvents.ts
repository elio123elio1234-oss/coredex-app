/* ==================================================================
   Auth events — actions the SERVICE layer dispatches upward without
   importing from features/ (dependency direction, mobile CLAUDE.md §2).
   The auth slice listens for these in extraReducers. Exact twin of the
   web's `services/auth/authEvents.ts`.
   ================================================================== */

import { createAction } from '@reduxjs/toolkit';
import type { SessionUser } from '@cyphix/shared';

/** The HTTP layer could not refresh the session (revoked, expired, or the
    server detected a replayed token and killed the family). The auth slice
    clears the principal and AuthGate shows the onboarding flow. */
export const sessionExpired = createAction('auth/sessionExpired');

/**
 * The HTTP layer DID refresh: a server answered and re-issued.
 *
 * ★ The mirror image of `sessionExpired`, and it exists because without
 * it the app could be demonstrably online and still say it was not. Only
 * `revalidateSession` used to set `live`, and that runs once per account
 * — so an app that opened while the server was asleep and reconnected two
 * minutes later (through any ordinary query's 401 → refresh → retry, which
 * is most of them) had no way to tell the slice. The strip would sit on
 * "Offline · showing saved data" over data that had just been fetched.
 *
 * The refresh is single-flight, so this fires once per real exchange
 * rather than once per screen that provoked it.
 */
export const sessionConfirmed = createAction<SessionUser>('auth/sessionConfirmed');

// v1.1.0 — Adds sessionConfirmed, so a refresh that succeeds anywhere in the
//          app reaches the slice. Without it, reconnecting was invisible.
// v1.0.0 — sessionExpired action bridging services → auth slice.
