/* ==================================================================
   Environment — mirrors web's src/config/env.ts contract.
   EXPO_PUBLIC_API_BASE_URL set → the real CYPHIX server;
   empty → offline/mock behaviour (no backend calls).
   EXPO_PUBLIC_WEB_ORIGIN → where the web app (and its public pages —
   /terms, /privacy) lives; defaults to the shared constant until a
   domain is bought (LAUNCH_PLAN D12).
   ================================================================== */

import { WEB_ORIGIN_DEFAULT } from '@cyphix/shared';

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim();
const webOrigin = (process.env.EXPO_PUBLIC_WEB_ORIGIN ?? '').trim() || WEB_ORIGIN_DEFAULT;

export const ENV = {
  apiBaseUrl,
  hasBackend: apiBaseUrl.length > 0,
  /** The web app's origin — the phone opens its public legal pages there. */
  webOrigin,
} as const;

// v0.2.0 — `webOrigin` (EXPO_PUBLIC_WEB_ORIGIN, default shared WEB_ORIGIN_DEFAULT) for the
//          legal pages the phone opens (LAUNCH_PLAN 1.8).
// v0.1.0 — EXPO_PUBLIC_API_BASE_URL swap point, twin of web ENV.
