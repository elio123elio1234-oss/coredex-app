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
   ================================================================== */

import * as SecureStore from 'expo-secure-store';
import { API_VERSION_PATH, AUTH_ROUTES, type AuthTokens, type SessionUser } from '@cyphix/shared';
import { ENV } from '@/config/env';

const REFRESH_TOKEN_KEY = 'cyphix.refreshToken';

let accessToken: string | null = null;
let refreshInFlight: Promise<SessionUser | null> | null = null;

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

/** Adopt a freshly issued pair. Always the NEWEST refresh token — the
    server rotated the previous one out the moment it answered. */
export async function storeSession(tokens: AuthTokens): Promise<void> {
  accessToken = tokens.accessToken;
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  } catch {
    /* A device that refuses the enclave still has a working session for
       as long as the app is open; only "stay signed in" is lost. Failing
       the sign-in over it would be a worse trade. */
  }
}

export async function readRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  accessToken = null;
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    /* Nothing to clear, or the enclave is unavailable — either way the
       in-memory access token is gone, which is what ends the session. */
  }
}

/**
 * Exchange the stored refresh token for a fresh session. Single-flight.
 *
 * Returns the principal on success, `null` when there is no session to
 * restore. Behaviourally identical to web's `refreshSession`, including
 * the distinction that matters most on a phone:
 *
 *   • the server REJECTED us  ⇒ clear the token; the session is over.
 *   • the network failed      ⇒ KEEP the token and return null. Offline is
 *     not signed-out, and a patient in a lift must not lose their session
 *     because a request timed out.
 */
export function refreshSession(): Promise<SessionUser | null> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function doRefresh(): Promise<SessionUser | null> {
  if (!ENV.hasBackend) return null;
  const refreshToken = await readRefreshToken();
  if (!refreshToken) return null;

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
    return null; // offline — see the contract above
  }

  if (!res.ok) {
    await clearSession();
    return null;
  }
  const tokens = (await res.json()) as AuthTokens;
  await storeSession(tokens);
  return tokens.user;
}

// v1.0.0 — Real refresh against CYPHIX_SERVER: enclave-stored rotating token,
//          single-flight exchange, offline-≠-signed-out semantics.
