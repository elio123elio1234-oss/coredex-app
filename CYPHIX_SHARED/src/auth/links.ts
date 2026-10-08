/* ==================================================================
   E-mailed-link parsing — ONE reader for the two URLs an auth e-mail
   carries (server v0.11.0), shared by the phone (which receives them as
   deep links) and available to the web (which reads them off its own
   location). The same link must mean the same thing on every platform,
   and "which path, which parameter" is exactly the kind of fact that
   drifts when each app spells it out alone.

   Pure string work, no URL constructor: React Native's URL polyfill is
   partial, and a parser that cannot throw is the one you want on a path
   that starts from an untrusted string.

   Accepted shapes (host, scheme and case of the scheme do not matter):
     https://cyphixweb.vercel.app/reset-password?token=…   (the e-mail)
     cyphix://reset-password?token=…                       (the app scheme)
     cyphix:///verify-email?token=…
     exp://192.168.1.5:8081/--/reset-password?token=…      (Expo dev client)
   ================================================================== */

import { AUTH_LINK_PATHS, AUTH_LINK_TOKEN_PARAM } from './contract';

export type AuthLinkKind = 'reset' | 'verify';

export interface AuthLink {
  kind: AuthLinkKind;
  /** The raw one-time token, exactly as the server minted it. */
  token: string;
}

/** What a server-minted token looks like: 32 random bytes, base64url. The
    bound is generous on purpose — the server is the judge; this only
    refuses strings that cannot possibly be one. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{16,128}$/;

export function parseAuthLinkUrl(url: string): AuthLink | null {
  const m = /^([a-z][a-z0-9+.-]*):\/\/([^?#]*)(?:\?([^#]*))?/i.exec(url.trim());
  if (!m) return null;
  const scheme = (m[1] ?? '').toLowerCase();
  let rest = m[2] ?? '';
  /* A web URL has a host before the path; a custom scheme's "host" IS the
     path (cyphix://reset-password). Expo's dev client wraps the path in
     `/--/`. */
  if (scheme === 'http' || scheme === 'https' || scheme === 'exp' || scheme === 'exps') {
    rest = rest.replace(/^[^/]*/, '');
  }
  rest = rest.replace(/^\/?--\//, '/');
  const path = `/${rest.replace(/^\/+|\/+$/g, '')}`;

  const kind: AuthLinkKind | null =
    path === AUTH_LINK_PATHS.resetPassword
      ? 'reset'
      : path === AUTH_LINK_PATHS.verifyEmail
        ? 'verify'
        : null;
  if (!kind) return null;

  const raw = (m[3] ?? '')
    .split('&')
    .map((pair) => pair.split('='))
    .find(([key]) => key === AUTH_LINK_TOKEN_PARAM)?.[1];
  if (!raw) return null;
  let token: string;
  try {
    token = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return TOKEN_SHAPE.test(token) ? { kind, token } : null;
}

// v1.0.0 — parseAuthLinkUrl: web URL, cyphix:// scheme or Expo dev-client URL → { kind, token }.
