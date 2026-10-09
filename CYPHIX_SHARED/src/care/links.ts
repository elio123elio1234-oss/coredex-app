/* ==================================================================
   Care-link parsing — ONE reader for the URL a QR code or a share
   carries (LAUNCH_PLAN 2.2 / 2.4), the twin of auth/links.ts.

   Accepted shapes (host, scheme and case of the scheme do not matter):
     https://cyphixweb.vercel.app/link/ABCDEFGH    (the QR / the share)
     https://cyphixweb.vercel.app/link?code=ABCD-EFGH
     cyphix://link/ABCDEFGH                        (the app scheme)
     exp://192.168.1.5:8081/--/link/ABCDEFGH       (Expo dev client)

   Pure string work, no URL constructor, for the same reason as the auth
   reader: a parser on a path that starts from an untrusted string must
   not be able to throw. Returns the NORMALIZED code, or null.
   ================================================================== */

import { CARE_LINK_PATH, isInviteCodeShaped, normalizeInviteCode } from './contract';

export function parseCareLinkUrl(url: string): string | null {
  const m = /^([a-z][a-z0-9+.-]*):\/\/([^?#]*)(?:\?([^#]*))?/i.exec(url.trim());
  if (!m) return null;
  const scheme = (m[1] ?? '').toLowerCase();
  let rest = m[2] ?? '';
  if (scheme === 'http' || scheme === 'https' || scheme === 'exp' || scheme === 'exps') {
    rest = rest.replace(/^[^/]*/, '');
  }
  rest = rest.replace(/^\/?--\//, '/');
  const path = `/${rest.replace(/^\/+|\/+$/g, '')}`;
  if (path !== CARE_LINK_PATH && !path.startsWith(`${CARE_LINK_PATH}/`)) return null;

  let raw = path.length > CARE_LINK_PATH.length ? path.slice(CARE_LINK_PATH.length + 1) : '';
  if (!raw) {
    raw =
      (m[3] ?? '')
        .split('&')
        .map((pair) => pair.split('='))
        .find(([key]) => key === 'code')?.[1] ?? '';
  }
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return isInviteCodeShaped(decoded) ? normalizeInviteCode(decoded) : null;
}

// v1.0.0 — parseCareLinkUrl: web URL (path or ?code=), cyphix:// scheme or Expo dev-client
//          URL → the normalized invite code, or null.
