/* ==================================================================
   Token store — the ONLY place server auth tokens live on the device,
   and the mobile twin of the web's `services/auth/tokenStore.ts`.

   Access token: MEMORY ONLY. It is a ~15-minute JWT; writing it anywhere
   durable buys nothing and creates a second copy to leak.

   Refresh token: the OS secure enclave (Keychain / Android Keystore via
   expo-secure-store) — never AsyncStorage (root CLAUDE.md §3.4). This is
   the piece that makes "signed in on this phone" survive a restart, and
   it is the piece worth stealing, so it lives where the OS guards it.

   `refreshSession` is SINGLE-FLIGHT: several screens can 401 in the same
   frame (History list + Profile + a photo), and each one racing its own
   refresh would present the same token more than once. The server treats
   a replayed rotated-out token as theft and kills the whole family — i.e.
   parallel refreshes would sign the patient out. One in-flight promise,
   shared by every caller, is not an optimisation here; it is correctness.

   ══ THREE OUTCOMES, NOT TWO (v2.0.0) ══
   This file used to return `SessionUser | null`, and that type was the
   bug: it collapsed "the server revoked you" and "the request never left
   the phone" into one value, so every caller had to guess. They guessed
   signed-out, and a patient who opened the app in a lift — or before a
   sleeping server had woken up — was thrown back to the sign-in screen
   holding a perfectly valid token. `RefreshOutcome` (@cyphix/shared)
   makes the distinction unmissable; the reasoning is written out there.

   ══ AND A PERSISTED PRINCIPAL ══
   A valid refresh token alone cannot open the app offline: the app needs
   to know WHO it belongs to, and the only place that used to be recorded
   was the server's answer. So the principal is now written beside the
   token, in the same enclave, by the same call. Nothing clinical is in
   it (id, display name, role) — what the patient actually reads offline
   is the device cache, which `claimCacheFor` governs separately.
   ================================================================== */

import * as SecureStore from 'expo-secure-store';
import {
  API_VERSION_PATH,
  APP_LOCK_STORAGE_KEY,
  AUTH_ROUTES,
  isPrincipalUsable,
  refreshExpiryFrom,
  type AuthTokens,
  type PersistedPrincipal,
  type RefreshOutcome,
} from '@cyphix/shared';
import { ENV } from '@/config/env';

const REFRESH_TOKEN_KEY = 'cyphix.refreshToken';
/** The principal that refresh token belongs to. Same enclave, on purpose
    — see the header, and `PersistedPrincipal` in shared. */
const PRINCIPAL_KEY = 'cyphix.principal';

let accessToken: string | null = null;
let refreshInFlight: Promise<RefreshOutcome> | null = null;

/** `https://host/api/v1` — the one place the version prefix is applied. */
export function apiRoot(): string {
  return `${ENV.apiBaseUrl.replace(/\/+$/, '')}${API_VERSION_PATH}`;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/* ── The persisted principal ─────────────────────────────────────── */

/**
 * Who this device is signed in as, if anyone.
 *
 * Returns null for "nothing stored", "stored but unreadable", and
 * "stored but past the refresh token's lifetime" — all three mean the
 * same thing to every caller: there is no session to open. The expiry
 * check lives HERE rather than at each call site precisely so it cannot
 * be the one that gets forgotten.
 */
export async function readPrincipal(): Promise<PersistedPrincipal | null> {
  let raw: string | null;
  try {
    raw = await SecureStore.getItemAsync(PRINCIPAL_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: PersistedPrincipal;
  try {
    parsed = JSON.parse(raw) as PersistedPrincipal;
  } catch {
    /* Written by a different program (an older build, a partial write).
       Untrusted input — treated as absent rather than trusted. */
    return null;
  }
  if (!parsed?.user?.id || typeof parsed.refreshExpiresAt !== 'string') return null;
  return isPrincipalUsable(parsed) ? parsed : null;
}

async function writePrincipal(principal: PersistedPrincipal): Promise<void> {
  try {
    await SecureStore.setItemAsync(PRINCIPAL_KEY, JSON.stringify(principal));
  } catch {
    /* A device that refuses the enclave keeps a working session for as
       long as the app is open; only "stay signed in" is lost. Failing the
       sign-in over it would be a worse trade. */
  }
}

/* ── The app lock ────────────────────────────────────────────────── */

/**
 * Is a device unlock required before a persisted session may open?
 *
 * In the enclave, under its own key, and deliberately OUTLIVING any one
 * session (see `APP_LOCK_STORAGE_KEY` in shared): re-issuing tokens
 * happens on every refresh, and a lock that switched itself off each time
 * would be worse than no lock — someone would have set it once and
 * believed in it since. Defaults to false: it is a thing the patient asks
 * for, and defaulting it on would put a biometric prompt in front of
 * every existing install without anyone choosing it.
 */
export async function readAppLock(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(APP_LOCK_STORAGE_KEY)) === '1';
  } catch {
    /* An enclave that will not answer is not a reason to drop a security
       control the patient switched on — but it is also not evidence one
       exists. False is the only answer that does not invent state. */
    return false;
  }
}

export async function setAppLock(enabled: boolean): Promise<void> {
  try {
    if (enabled) await SecureStore.setItemAsync(APP_LOCK_STORAGE_KEY, '1');
    else await SecureStore.deleteItemAsync(APP_LOCK_STORAGE_KEY);
  } catch {
    /* Reported to the caller as a failed write would be better; there is
       nothing useful the Settings row could do about it beyond what
       re-reading the value already shows. */
  }
}

/** Adopt a freshly issued pair. Always the NEWEST refresh token — the
    server rotated the previous one out the moment it answered. */
export async function storeSession(tokens: AuthTokens): Promise<void> {
  accessToken = tokens.accessToken;
  const now = Date.now();
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  } catch {
    /* see writePrincipal */
  }
  await writePrincipal({
    user: tokens.user,
    refreshExpiresAt: refreshExpiryFrom(tokens.refreshExpiresInSec, now),
    lastVerifiedAt: new Date(now).toISOString(),
  });
}

export async function readRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * End the session on this device: the token AND the principal.
 *
 * ★ Both, always. Clearing one without the other is what would produce
 * the two worst states this file can be in — a principal the app opens
 * with no credential behind it, or a live credential the app has
 * forgotten the owner of.
 */
export async function clearSession(): Promise<void> {
  accessToken = null;
  await Promise.all([
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(PRINCIPAL_KEY).catch(() => {}),
  ]);
}

/* ── The exchange ────────────────────────────────────────────────── */

/**
 * Exchange the stored refresh token for a fresh session. Single-flight.
 *
 * Answers with a `RefreshOutcome`, and the whole point is that the three
 * cases are distinguishable:
 *
 *   • `refreshed` — the server issued a new pair. Adopted here.
 *   • `rejected`  — the server ANSWERED and refused (revoked, expired,
 *     rotated out, family killed). The enclave is cleared here, because
 *     this is the outcome that ends a session, and it is the only one.
 *   • `offline`   — no answer came back. Nothing is known, so nothing is
 *     changed: the token stays, the principal stays, we try again later.
 *     A patient in a lift must not lose their session to a timeout.
 */
export function refreshSession(): Promise<RefreshOutcome> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function doRefresh(): Promise<RefreshOutcome> {
  /* No backend configured ⇒ there is no server to be rejected BY. This is
     the device-mock build (`MockAuthService`), and reporting `rejected`
     here would have every caller tear down a session no server ever
     issued. */
  if (!ENV.hasBackend) return { kind: 'offline' };

  /**
   * ★ An enclave that will not ANSWER is not a server that refused.
   *
   * `readRefreshToken` swallows a SecureStore failure into `null`, which
   * read here as "there is no token" and therefore as `rejected` — i.e. a
   * transient Keychain error signed the patient out. That is the same
   * mistake this whole release exists to remove, one layer down, and it
   * is why the door still appeared "sometimes". Read it directly so the
   * failure and the absence can be told apart.
   */
  let refreshToken: string | null;
  try {
    refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return { kind: 'offline' };
  }
  /* Genuinely nothing to present. Not a refusal either, but unlike
     `offline` no amount of waiting will produce one. */
  if (!refreshToken) return { kind: 'rejected' };

  let res: Response;
  try {
    res = await fetch(`${apiRoot()}${AUTH_ROUTES.refresh}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      /* The web sends this in a cookie AND in the body; a native app has
         no cookie jar, so the body is the whole story. The server reads
         the body first (`presentedRefreshToken`), which is why the same
         endpoint serves both without a mobile-specific branch. */
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return { kind: 'offline' };
  }

  /**
   * ★ Only a 4xx is a refusal.
   *
   * A 502 from a proxy, a 503 from a container that is still booting, a
   * 504 from a cold start that took too long — those are the SERVER being
   * unreachable dressed as an HTTP status, and treating them as "your
   * session is over" is exactly the bug this release exists to fix. Render
   * answers a sleeping service with a 5xx while it wakes, which is the
   * common case here rather than an exotic one.
   */
  if (!res.ok) {
    if (res.status >= 500) return { kind: 'offline' };
    await clearSession();
    return { kind: 'rejected' };
  }

  let tokens: AuthTokens;
  try {
    tokens = (await res.json()) as AuthTokens;
  } catch {
    /* 200 with a body we cannot read: something is between us and the
       server (a captive portal is the classic). Not a refusal. */
    return { kind: 'offline' };
  }
  if (!tokens?.refreshToken || !tokens.user?.id) return { kind: 'offline' };

  await storeSession(tokens);
  return {
    kind: 'refreshed',
    user: tokens.user,
    refreshExpiresAt: refreshExpiryFrom(tokens.refreshExpiresInSec),
  };
}

// v2.0.0 — Refresh reports THREE outcomes instead of two, and the principal is
//          persisted beside the token. `SessionUser | null` could not say
//          "offline" — so every caller read it as signed-out, and a cold start
//          with no signal (or a sleeping server) threw the patient back to the
//          sign-in screen holding a valid token. 5xx is now unreachable, not
//          refused. Also holds the app-lock flag — in the enclave, never in
//          AsyncStorage, and outliving any single session.
// v1.0.0 — Real refresh against CYPHIX_SERVER: enclave-stored rotating token,
//          single-flight exchange, offline-≠-signed-out semantics.
