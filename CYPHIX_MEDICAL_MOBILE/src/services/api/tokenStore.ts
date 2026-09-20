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

import AsyncStorage from '@react-native-async-storage/async-storage';
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

/**
 * ★ WHY EVERY KEYCHAIN CALL BELOW PASSES THIS, AND WHAT IT COST NOT TO.
 *
 * `expo-secure-store` defaults to `WHEN_UNLOCKED`, which means the item
 * is unreadable AND UNWRITABLE while the screen is locked. Combined with
 * rotating refresh tokens, that default produces a spontaneous sign-out
 * by two separate routes — reported as "I'm using the app and suddenly it
 * jumps to the login screen on its own":
 *
 *   ① a refresh runs while the device is locked → the READ comes back
 *     empty → the exchange reads it as "there is no token" → `rejected`
 *     → the door.
 *   ② worse: the refresh SUCCEEDS, the server rotates the old token out,
 *     and the WRITE of the new one fails because the device is locked.
 *     The enclave keeps a token the server has already revoked, and the
 *     next refresh presents it — which the server correctly treats as a
 *     replay, kills the entire token family, and answers 401. One
 *     swallowed write, total logout, minutes later, for no visible reason.
 *
 * `AFTER_FIRST_UNLOCK` is the standard choice for a credential that must
 * work when the app is not in the foreground: still device-bound, still
 * hardware-encrypted, still unreadable on a phone that has not been
 * unlocked since boot. It gives up only "locked right now", which is
 * exactly the window that was breaking this.
 *
 * iOS-only; Android ignores it. Accessibility is fixed at WRITE time, so
 * existing items keep the old attribute until the next successful write —
 * i.e. this heals itself on the first refresh after the update.
 */
const KEYCHAIN = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK } as const;

const REFRESH_TOKEN_KEY = 'cyphix.refreshToken';
/** The principal that refresh token belongs to. Same enclave, on purpose
    — see the header, and `PersistedPrincipal` in shared. */
const PRINCIPAL_KEY = 'cyphix.principal';

let accessToken: string | null = null;
let refreshInFlight: Promise<RefreshOutcome> | null = null;

/**
 * ★ THE NEWEST REFRESH TOKEN THIS PROCESS HAS EVER SEEN.
 *
 * Not a cache of the enclave — a correction for it. With rotation, the
 * server retires the presented token the moment it answers, so the ONLY
 * token that is still worth anything is the one that came back in that
 * reply. If persisting it fails, the enclave is left holding a token the
 * server has already revoked, and presenting that is exactly what the
 * server's replay detection kills a whole token family for.
 *
 * `storeSession` used to log that failure and carry on, reporting
 * `refreshed` either way — so the app behaved perfectly for the ~15
 * minutes the access token had left and then signed the patient out with
 * nothing on screen connecting the two. The retry there reduced how often
 * the write fails; it could not make a failure survivable.
 *
 * This does. It is assigned BEFORE the write is attempted, so it is
 * correct whether or not the write lands, and `doRefresh` prefers it over
 * the enclave. The enclave is then what it should always have been: the
 * COLD-START source, read once when this variable is still null.
 *
 * It holds a credential, so it is cleared by `clearSession` alongside the
 * enclave — a live token in a module variable after a sign-out is the
 * same defect in a different place.
 */
let memoryRefreshToken: string | null = null;

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
    raw = await SecureStore.getItemAsync(PRINCIPAL_KEY, KEYCHAIN);
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
    await SecureStore.setItemAsync(PRINCIPAL_KEY, JSON.stringify(principal), KEYCHAIN);
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
    return (await SecureStore.getItemAsync(APP_LOCK_STORAGE_KEY, KEYCHAIN)) === '1';
  } catch {
    /* An enclave that will not answer is not a reason to drop a security
       control the patient switched on — but it is also not evidence one
       exists. False is the only answer that does not invent state. */
    return false;
  }
}

export async function setAppLock(enabled: boolean): Promise<void> {
  try {
    if (enabled) await SecureStore.setItemAsync(APP_LOCK_STORAGE_KEY, '1', KEYCHAIN);
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
  /* ★ BEFORE the write, not after it, and not conditional on it. This is
     what makes a failed enclave write survivable for the rest of the run
     — see `memoryRefreshToken`. */
  memoryRefreshToken = tokens.refreshToken;
  const now = Date.now();

  /**
   * ★ THIS WRITE IS NOT ALLOWED TO FAIL QUIETLY, AND IT USED TO.
   *
   * With rotating tokens the server has ALREADY revoked the previous one
   * by the time we get here. So a swallowed failure does not mean "we
   * lost the new token" — it means the enclave still holds a REVOKED one,
   * and presenting that is precisely what the server's theft detection
   * looks for: it kills the whole token family and answers 401. One
   * silent write failure therefore produced a total sign-out minutes
   * later, with nothing on screen connecting the two. Reported as "I'm in
   * the app and suddenly it jumps to the login screen on its own".
   *
   * Retried once, because the overwhelming cause is transient — the
   * screen was locked for the moment the write landed — and recorded when
   * it still fails, so the diagnostic can name it instead of leaving
   * another unexplained logout.
   */
  let stored = false;
  for (let attempt = 0; attempt < 2 && !stored; attempt++) {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken, KEYCHAIN);
      stored = true;
    } catch {
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  /* Still recorded, and still worth recording: this run survives it via
     `memoryRefreshToken`, but a COLD START after it does not — the enclave
     would then hand back a token the server retired, and the only thing
     standing between that and a sign-out is the server's undelivered-
     successor grace window. So it is a real fault, just no longer an
     immediate one, and the diagnostic must keep saying so. */
  if (!stored) await noteSessionEvent('enclave write failed — token held in memory only');

  await writePrincipal({
    user: tokens.user,
    refreshExpiresAt: refreshExpiryFrom(tokens.refreshExpiresInSec, now),
    lastVerifiedAt: new Date(now).toISOString(),
  });
}

export async function readRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY, KEYCHAIN);
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
  /* A live refresh token left in a module variable after a sign-out is the
     same defect as one left in the enclave — see `memoryRefreshToken`. */
  memoryRefreshToken = null;
  await Promise.all([
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(PRINCIPAL_KEY).catch(() => {}),
  ]);
}

/**
 * The last thing that happened to this session, in plain words.
 *
 * ★ AsyncStorage, deliberately, and not the enclave: it has to survive a
 * sign-out — which clears the enclave — because "why am I looking at this
 * screen?" is the exact question it exists to answer. It holds no
 * credential and names no secret, only what happened and at what time.
 */
const LAST_EVENT_KEY = 'cyphix.lastSessionEvent';

export async function noteSessionEvent(what: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_EVENT_KEY, `${what} @ ${new Date().toISOString().slice(11, 19)}`);
  } catch {
    /* A diagnostic that cannot be written is not worth failing over. */
  }
}

async function lastSessionEvent(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_EVENT_KEY);
  } catch {
    return null;
  }
}

/**
 * What the enclave actually holds, as one short line for Settings › About.
 *
 * ★ The same reasoning that put `GLASS_MATERIAL` on that screen: "it sent
 * me to the sign-in screen" has several indistinguishable causes — no
 * token, a token with no principal, an expired principal, a Keychain that
 * will not answer — and from a Windows machine none of them can be told
 * apart. Two rounds of this were spent guessing, and each guess cost a
 * release. It is a fact about the device, never advice, and it names no
 * secret: whether a token exists, not what it is.
 */
export async function sessionDiagnostic(): Promise<string> {
  let token: string | null;
  try {
    token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY, KEYCHAIN);
  } catch {
    return 'enclave unreadable';
  }
  let raw: string | null = null;
  try {
    raw = await SecureStore.getItemAsync(PRINCIPAL_KEY, KEYCHAIN);
  } catch {
    return token ? 'token, principal unreadable' : 'no token, principal unreadable';
  }
  /* The last event is appended to every answer, because the enclave's
     CURRENT contents and the reason it got that way are two different
     facts and a bug report needs both. "no stored session · last: refresh
     rejected by server @ 14:02" says what "no stored session" alone
     cannot. */
  const last = await lastSessionEvent();
  const tail = last ? ` · last: ${last}` : '';
  if (!token && !raw) return `no stored session${tail}`;
  if (token && !raw) return `token only — will recover on next launch${tail}`;
  if (!token && raw) return `⚠ principal without token${tail}`;
  const usable = (await readPrincipal()) !== null;
  return `${usable ? 'token + principal' : 'token + EXPIRED principal'}${tail}`;
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
  if (memoryRefreshToken) {
    /* ★ The enclave is the COLD-START source, not the authority. Whenever
       this process has already adopted a pair, the token that came back in
       that reply is by construction the newest one in existence — and if
       persisting it failed, it is the only correct one. Reading the
       enclave here would present a token the server retired. */
    refreshToken = memoryRefreshToken;
  } else {
    try {
      refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY, KEYCHAIN);
    } catch {
      return { kind: 'offline' };
    }
  }
  if (!refreshToken) {
    /**
     * ★ An empty read is not automatically "there is no session".
     *
     * The token and the principal are written together and cleared
     * together — always, and `clearSession` is the only thing that removes
     * either. So a principal sitting there with no token beside it is not
     * a revoked session; it is a read that did not work, and on iOS the
     * overwhelming reason is that the screen was locked when it ran.
     * Reporting `rejected` here signed people out mid-session for exactly
     * that.
     *
     * Both absent IS the real "nobody is signed in" — and unlike
     * `offline`, no amount of waiting will change it.
     */
    if ((await readPrincipal()) !== null) {
      await noteSessionEvent('token unreadable beside a live principal — treated as offline');
      return { kind: 'offline' };
    }
    return { kind: 'rejected' };
  }

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
   * ★ ONLY 401 AND 403 END A SESSION. Narrowed in v0.71.0, and the
   * previous rule — "any 4xx" — was too wide in a way that mattered.
   *
   * "An authority refused you" is what 401 and 403 mean, and nothing else
   * in 400–499 means it:
   *
   *   • 429 — `app.ts` registers `@fastify/rate-limit` GLOBALLY at 300/min
   *     keyed on `req.ip` with `trustProxy`, and `/auth/refresh` is not
   *     covered by the tighter login limiter. Behind clinic Wi-Fi or
   *     carrier CGNAT, that ip is shared; against a cold Render container
   *     a burst of retries can reach it on its own. A 429 is the server
   *     saying "not right now", and it was signing people out permanently.
   *   • 404 — a base URL typo, a rollback, a proxy answering during a
   *     deploy. That would have signed out every user at once.
   *   • 400 / 408 / 413 from anything between us and the server.
   *
   * None of those is evidence about the session, and the rule this file
   * already states for 5xx applies to them unchanged: we learned nothing,
   * so we change nothing, keep the token and ask again later.
   */
  if (!res.ok) {
    if (res.status !== 401 && res.status !== 403) {
      await noteSessionEvent(`refresh could not be served (${res.status}) — kept the session`);
      return { kind: 'offline' };
    }
    /* The one path that genuinely ends a session. Recorded before the
       enclave is cleared, so the sign-in screen can say WHY it is being
       shown rather than leaving another unexplained logout. */
    await noteSessionEvent(`refresh refused by server (${res.status})`);
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

// v2.3.0 — Two more paths to a sign-out nobody asked for, closed.
//          (a) ONLY 401/403 end a session. "Any 4xx" also covered 429 — and
//              /auth/refresh inherits the GLOBAL 300/min limiter keyed on a
//              shared ip — plus 404 from a rollback or a base-URL typo, which
//              would have signed out every user at once. Those are now
//              `offline`, which is what they always meant.
//          (b) `memoryRefreshToken`: the newest token this process has seen is
//              presented in preference to the enclave's copy. A failed enclave
//              write used to leave a REVOKED token on disk while the app
//              reported `refreshed` and carried on for ~15 minutes — then the
//              server's replay detection killed the family. The write is still
//              recorded when it fails, because a cold start after one is still
//              exposed; it is no longer fatal to the session in progress.
// v2.2.0 — Fixes a spontaneous MID-SESSION sign-out with two causes, both from
//          expo-secure-store defaulting to WHEN_UNLOCKED — the keychain item is
//          unreadable AND UNWRITABLE while the screen is locked. Every call now
//          passes AFTER_FIRST_UNLOCK, ★ including the refresh-token WRITE, which
//          the first pass at this missed and which is the dangerous one: with
//          rotation, a swallowed write leaves a REVOKED token in the enclave,
//          the next refresh presents it, and the server's replay detection kills
//          the whole family. That write is now retried and recorded, never
//          swallowed. Beyond that, an empty token read beside a LIVE principal
//          is `offline`, not `rejected` — they are written and cleared together,
//          so that combination is a failed read, not a revocation. Plus
//          `noteSessionEvent`, so a logout can say why it happened.
// v2.1.0 — An enclave that will not ANSWER is no longer read as a server that
//          REFUSED: a transient Keychain error used to surface as `rejected`
//          and sign the patient out. Adds `sessionDiagnostic()` for Settings ›
//          About, because "it sent me to sign-in" has four indistinguishable
//          causes and guessing at them costs a release each time.
// v2.0.0 — Refresh reports THREE outcomes instead of two, and the principal is
//          persisted beside the token. `SessionUser | null` could not say
//          "offline" — so every caller read it as signed-out, and a cold start
//          with no signal (or a sleeping server) threw the patient back to the
//          sign-in screen holding a valid token. 5xx is now unreachable, not
//          refused. Also holds the app-lock flag — in the enclave, never in
//          AsyncStorage, and outliving any single session.
// v1.0.0 — Real refresh against CYPHIX_SERVER: enclave-stored rotating token,
//          single-flight exchange, offline-≠-signed-out semantics.
