/* ==================================================================
   Session persistence policy — what "still signed in" MEANS when the
   server cannot be reached, defined once for every platform.

   ══ THE BUG THIS FILE EXISTS TO MAKE IMPOSSIBLE ══
   A refresh attempt has THREE outcomes and every client so far modelled
   TWO. `refreshSession(): Promise<SessionUser | null>` collapses "the
   server revoked you" and "the request never left the phone" into the
   same `null`, and the caller — having no way to tell them apart — must
   pick one. Both choices are wrong:

     • treat null as signed-out ⇒ a patient in a lift, on a plane, or
       simply opening the app before a sleeping server has woken up is
       thrown back to the sign-in screen. Their token is still perfectly
       valid; nothing was revoked; the app just could not ask.
     • treat null as still-signed-in ⇒ a revoked session survives, which
       is the one thing revocation exists to prevent.

   So the distinction is not a nicety, it is the whole problem, and it is
   expressed as a TYPE here rather than a convention in each app — because
   a convention is exactly what got collapsed the first time.

   ══ WHY A SIGNED-OUT-LOOKING APP IS NOT "FAILING SAFE" ══
   Bouncing an offline patient to the sign-in screen feels like the
   cautious choice and is not one: the refresh token stays in the enclave
   either way (nothing was revoked, so nothing may be discarded), so the
   bounce revokes nothing. It only stops the person from reading their own
   record — the copy already on their own phone — and teaches them the app
   is unreliable. Security theatre that costs usability and buys nothing.

   ══ WHAT AN OFFLINE SESSION ACTUALLY GRANTS ══
   Nothing new. The access token is memory-only on every platform, so it
   is gone after a cold start and every request 401s until a REAL refresh
   succeeds. The server remains the only authority over data; an offline
   session changes what the client RENDERS from its own cache, never what
   it is allowed to fetch. Revocation still lands the moment the device
   has signal — see `RefreshOutcome.rejected`, which is the only outcome
   that ends a session.
   ================================================================== */

import type { SessionUser } from '../api/contract';

/* ── The ceiling ─────────────────────────────────────────────────── */

/**
 * How long a refresh token is issued for, in days.
 *
 * ⚠️ This is a FALLBACK, not the authority. The server owns the number
 * (`REFRESH_TTL_DAYS`, its own env, defaulting to this) and now states it
 * per session in `AuthTokens.refreshExpiresInSec`. A client must prefer
 * what it was told and use this only when talking to a server old enough
 * not to say — otherwise lowering the server's TTL would silently leave
 * every phone believing in a longer one.
 */
export const DEFAULT_REFRESH_TTL_DAYS = 30;

/** The same policy in seconds, which is the unit the wire uses. */
export const DEFAULT_REFRESH_TTL_SEC = DEFAULT_REFRESH_TTL_DAYS * 86_400;

/* ── The three outcomes ──────────────────────────────────────────── */

/**
 * What happened when a client tried to exchange its refresh token.
 *
 * The names are chosen to be unmistakable at the call site: `rejected`
 * says an authority answered and said no, `offline` says no authority was
 * reached. A caller that treats them alike has to type out the mistake.
 */
export type RefreshOutcome =
  /** The server issued a new pair. The session is live and confirmed. */
  | { kind: 'refreshed'; user: SessionUser; refreshExpiresAt: string }
  /**
   * The server ANSWERED and refused: the token was revoked, expired,
   * rotated out, or replayed and its family killed. This is the only
   * outcome that ends a session, and it must clear the enclave.
   */
  | { kind: 'rejected' }
  /**
   * The request never got an answer — no signal, DNS, a timeout, a cold
   * container still booting. Nothing is known about the session's
   * validity, so nothing about it may be changed: keep the token, keep
   * the principal, try again later.
   */
  | { kind: 'offline' };

/* ── The persisted principal ─────────────────────────────────────── */

/**
 * How a signed-in session survives a cold start with no network.
 *
 * ★ WHY THE ENCLAVE, NOT ORDINARY STORAGE. This record is the answer to
 * "may this app open straight into a medical record?", which makes it
 * part of the same secret as the refresh token it accompanies. Written
 * together, cleared together — a principal with no credential behind it
 * and a credential whose owner has been forgotten are the two worst
 * states a client can hold, and both are reachable the moment these live
 * in separate places with separate lifetimes.
 *
 * It carries no clinical data at all: an id, a display name, a role. What
 * the patient actually READS offline is the device cache, which is
 * governed separately.
 */
export interface PersistedPrincipal {
  /** The minimal principal — same projection every platform holds. */
  user: SessionUser;
  /**
   * ISO instant after which the enclave's refresh token is provably dead
   * and no amount of signal can revive this session.
   *
   * Recorded when the token is ISSUED rather than computed at read time,
   * so a phone whose clock is wrong drifts by the clock error instead of
   * granting an unbounded session.
   */
  refreshExpiresAt: string;
  /** ISO instant of the last time a server confirmed this session. */
  lastVerifiedAt: string;
}

/**
 * Require a device unlock (biometric, or the device passcode) before a
 * persisted session may be opened.
 *
 * ★ Deliberately NOT a field on the principal above, and not an ordinary
 * preference either. It outlives any single session — someone who asked
 * for a lock has not withdrawn that by signing out, and re-issuing tokens
 * (which happens on every refresh) must not quietly switch it off. But it
 * still belongs in the secure enclave rather than plain storage: plain
 * storage is a file, and a security control that a file edit can disable
 * is decoration. Same store as the token, its own lifetime.
 *
 * Named here so every platform that grows an app lock uses one key rather
 * than inventing its own.
 */
export const APP_LOCK_STORAGE_KEY = 'cyphix.appLock';

/**
 * Is this persisted session still allowed to open the app offline?
 *
 * The only bound is the refresh token's own lifetime, and that is not a
 * chosen number — past it the token cannot be exchanged for anything by
 * anyone, so an "offline session" beyond it would be a client rendering a
 * record on the strength of a credential that no longer exists. Everything
 * before it is a session the server would still honour if asked.
 *
 * `now` is a parameter so this is a pure function and can be tested
 * against a clock rather than the machine's.
 */
export function isPrincipalUsable(
  principal: PersistedPrincipal,
  now: number = Date.now(),
): boolean {
  const expiresAt = Date.parse(principal.refreshExpiresAt);
  /* An unparseable date is a record written by a different program (an
     older build, a corrupted write). It is untrusted input, and the safe
     reading of "I cannot tell when this expires" is that it has. */
  if (!Number.isFinite(expiresAt)) return false;
  return now < expiresAt;
}

/** ISO instant this session's refresh token dies, from what the server
    said — falling back to the shared default when it said nothing. */
export function refreshExpiryFrom(refreshExpiresInSec?: number, now = Date.now()): string {
  const seconds =
    typeof refreshExpiresInSec === 'number' && Number.isFinite(refreshExpiresInSec)
      ? refreshExpiresInSec
      : DEFAULT_REFRESH_TTL_SEC;
  return new Date(now + seconds * 1000).toISOString();
}

/* ── What the app is currently running on ────────────────────────── */

/**
 * `live`    — a server confirmed this session during this app run.
 * `offline` — it is being carried on the persisted principal alone.
 *
 * Surfaced in the UI, because a patient looking at a record is entitled
 * to know whether what they are reading was just confirmed or is the last
 * thing this phone was told.
 */
export type SessionMode = 'live' | 'offline';

// v1.0.0 — The three-outcome refresh contract, the persisted principal that
//          lets a session survive a cold start with no network, and the
//          refresh-token ceiling that bounds it.
