/* ==================================================================
   CAPTCHA — bot protection on the public doors (LAUNCH_PLAN 1.10, hole
   S8). Server v0.15.0.

   THE SERVER DECIDES, THE CLIENTS ASK. Whether a challenge is required
   is a deployment fact (a provider key in the server's environment),
   not a build fact, so neither app carries a switch of its own: both
   call `GET /auth/captcha` and render a widget only when the answer
   names a provider. No key ⇒ `off` ⇒ every flow is exactly what it was
   before this file existed. Same shape as e-mail: on when configured,
   off when not, never a boot failure.

   THE PROVIDER IS CLOUDFLARE TURNSTILE, and deliberately not an npm
   package on any side: the server verifies with one POST over its own
   `fetch`, the web loads Cloudflare's script tag only when a site key
   arrives, and the phone shows the web app's own public /captcha page
   in a WebView it already ships. Nothing new to audit for egress — the
   only egress IS the challenge, and only once the operator turned it on.

   WHICH DOORS. Today: `POST /auth/register`. The same gate is written to
   take `POST /leads` and `POST /support` when those are born (LAUNCH_PLAN
   5.4) — the field name below is theirs too.
   ================================================================== */

export type CaptchaProvider = 'turnstile' | 'off';

/** What `GET /auth/captcha` answers. Public — a site key is public by
    nature (it sits in the HTML of every page that shows the widget). */
export interface CaptchaPolicy {
  provider: CaptchaProvider;
  /** Present when provider !== 'off'. */
  siteKey?: string;
}

/** Relative to API_VERSION_PATH. Public, no body. */
export const CAPTCHA_ROUTES = {
  policy: '/auth/captcha',
} as const;

/** The JSON field a protected request carries the challenge response
    in. Optional on the wire when the policy is `off`; required — 400
    `captcha_required` — when it is not. */
export const CAPTCHA_TOKEN_FIELD = 'captchaToken';

/** Turnstile's own bound: a response token is at most 2048 characters,
    valid for 300 s, spendable once. */
export const CAPTCHA_TOKEN_MAX_LENGTH = 2048;

/** Cloudflare's widget script. Loaded by the web ONLY after a policy
    named the provider — never at boot. */
export const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

/**
 * The web app's public page that hosts the widget for the PHONE. A
 * WebView loads it with `embed=1` and receives the token as a posted
 * message (CaptchaPageMessage); a plain browser, opened as a fallback,
 * is sent back to the app through `return` (the app's scheme — the page
 * refuses any http(s) target, so it cannot be turned into an open
 * redirect). `lang` picks the widget's language.
 */
export const CAPTCHA_PAGE_PATH = '/captcha';
export const CAPTCHA_PAGE_PARAMS = {
  returnTo: 'return',
  lang: 'lang',
  embed: 'embed',
} as const;

/** Where the browser fallback lands: `cyphix://captcha?token=…`, read by
    `parseAuthLinkUrl` as kind 'captcha'. */
export const CAPTCHA_APP_RETURN = 'cyphix://captcha';

/** What the hosted page posts to its WebView host (JSON-encoded). */
export interface CaptchaPageMessage {
  type: 'cyphix-captcha';
  token: string;
}
export const CAPTCHA_PAGE_MESSAGE_TYPE: CaptchaPageMessage['type'] = 'cyphix-captcha';

export interface CaptchaPageOptions {
  /** App-scheme URL to return to when opened in a browser. */
  returnTo?: string;
  lang?: string;
  /** The page is inside a WebView: post the token instead of leaving. */
  embed?: boolean;
}

export function captchaPageUrl(origin: string, opts: CaptchaPageOptions = {}): string {
  const base = `${origin.replace(/\/+$/, '')}${CAPTCHA_PAGE_PATH}`;
  const q: string[] = [];
  if (opts.returnTo) q.push(`${CAPTCHA_PAGE_PARAMS.returnTo}=${encodeURIComponent(opts.returnTo)}`);
  if (opts.lang) q.push(`${CAPTCHA_PAGE_PARAMS.lang}=${encodeURIComponent(opts.lang)}`);
  if (opts.embed) q.push(`${CAPTCHA_PAGE_PARAMS.embed}=1`);
  return q.length ? `${base}?${q.join('&')}` : base;
}

/** Shape-only check on what a widget handed back; the server is the
    judge. Turnstile tokens are `0.` + base64url-ish runs with dots. */
export function isCaptchaTokenShaped(token: string): boolean {
  return /^[A-Za-z0-9._-]{16,2048}$/.test(token);
}

/**
 * What a platform's auth service answers about the challenge. A
 * separate interface, as every contract added since v1.18.0 has been,
 * so each platform adopts it in its own change-set.
 */
export interface CaptchaContract {
  /** Never rejects for "off" — that is a valid answer. Rejects only on
      transport failure, and a caller may then proceed without a token
      and let the server say. */
  captchaPolicy(): Promise<CaptchaPolicy>;
}

// v1.0.0 — The CAPTCHA contract (Turnstile; server v0.15.0, LAUNCH_PLAN 1.10): policy
//          route + shape, the token field and its bound, the hosted page for the phone
//          (params, posted message, app-scheme return), CaptchaContract.
