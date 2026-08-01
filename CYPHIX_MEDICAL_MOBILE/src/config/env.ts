/* ==================================================================
   Environment — mirrors web's src/config/env.ts contract.
   EXPO_PUBLIC_API_BASE_URL set → the real CYPHIX server;
   empty → offline/mock behaviour (no backend calls).
   ================================================================== */

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim();

export const ENV = {
  apiBaseUrl,
  hasBackend: apiBaseUrl.length > 0,
} as const;

// v0.1.0 — EXPO_PUBLIC_API_BASE_URL swap point, twin of web ENV.
