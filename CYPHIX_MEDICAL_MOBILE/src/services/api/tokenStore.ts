/* ==================================================================
   Token store — mobile twin of web's services/auth/tokenStore.
   Access token lives in memory; the refresh token persists in the
   OS-secure enclave (Keychain / Android Keystore via expo-secure-store).
   NEVER AsyncStorage for tokens (root CLAUDE.md §3.4).
   ================================================================== */

import * as SecureStore from 'expo-secure-store';
import type { SessionUser } from '@cyphix/shared';

const REFRESH_TOKEN_KEY = 'cyphix.refreshToken';

let accessToken: string | null = null;
let refreshInFlight: Promise<SessionUser | null> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export async function persistRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function readRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearSession(): Promise<void> {
  accessToken = null;
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Single-flight session refresh — same contract as web (ApiError envelope,
 * one refresh shared across parallel 401s). The endpoint wiring lands with
 * the auth feature; until then it resolves null (= session expired).
 * TODO(auth): POST /auth/refresh against CYPHIX_SERVER, matching web's
 * refreshSession exactly.
 */
export function refreshSession(): Promise<SessionUser | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

// v0.1.0 — SecureStore-backed token store, single-flight refresh stub.
