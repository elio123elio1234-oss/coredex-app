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

/**
 * A request reached the server and came back. The server is up and this
 * device can talk to it, whatever it answered about the resource.
 *
 * ★ Why this is the reachability signal, rather than a connectivity API.
 * `@react-native-community/netinfo` is a NATIVE module and so cannot
 * reach an installed build over the air (mobile CLAUDE.md §5A.1) — and it
 * would answer the wrong question anyway. "The radio has an IP address"
 * is not "CYPHIX is reachable": a captive portal, a sleeping container
 * and a DNS failure all report a healthy connection. The transport is the
 * only layer that knows the truth, because it is the one actually
 * talking.
 */
export const serverReachable = createAction('auth/serverReachable');

/**
 * A request did not come back — no answer, or an answer that means the
 * server itself could not serve it (5xx). The device is on its own copy.
 *
 * Deliberately NOT dispatched for a 4xx: a 403 or a 404 is the server
 * being perfectly reachable and telling us something true, and treating
 * it as "offline" would put a notice on screen saying the opposite of
 * what happened.
 */
export const serverUnreachable = createAction('auth/serverUnreachable');

// v1.1.0 — Adds sessionConfirmed, so a refresh that succeeds anywhere in the
//          app reaches the slice. Without it, reconnecting was invisible.
// v1.0.0 — sessionExpired action bridging services → auth slice.
