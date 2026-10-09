/* ==================================================================
   Two-factor sign-in with an authenticator app (LAUNCH_PLAN 5.5, S14).
   Server v0.24.0.

   TOTP, RFC 6238 over HOTP (RFC 4226): HMAC-SHA1, six digits, a 30 s
   step, a base32 secret — what Google Authenticator, Authy, 1Password
   and every other app read from an `otpauth://` QR code. Offered to the
   STAFF roles (an admin reads every patient; a clinician reads many);
   the patient's own record stays behind the password + the device lock
   until that is decided separately.

   ── The sign-in dance ──
   `POST /auth/login` answers 202 `{ totpRequired: true, challengeToken }`
   for an account with the factor ON — only after the password verified,
   and never with tokens. The client then posts the code with that
   challenge to `POST /auth/login/totp` and receives the ordinary login
   envelope. The challenge lives five minutes, is single-use on success,
   and a wrong code charges the same lockout counter a wrong password
   does. An account with the factor OFF signs in exactly as before —
   nothing about the existing flow changes (D1).

   ── Recovery codes ──
   Enabling mints eight one-time codes, shown ONCE. Each is accepted in
   place of a TOTP code (at sign-in, and to turn the factor off) and is
   then spent. The server keeps only their hashes.

   ── What lives here ──
   The shapes, the routes, the constants, the shape checks — and the
   maths, pure TypeScript, so the offline MOCKS on the web and the phone
   can verify a real authenticator app's code with no server and no
   platform crypto (Hermes has no WebCrypto). The server has its own
   copy over node:crypto (`CYPHIX_SERVER/src/auth/totp.ts`); the test
   vectors of RFC 6238 appendix B pin both to the same answers.
   ================================================================== */

import type { AuthSession } from './contract';

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SEC = 30;
/** Steps either side of "now" a code is accepted at (clock skew). */
export const TOTP_WINDOW_STEPS = 1;
export const TOTP_ISSUER = 'CYPHIX';
export const TOTP_RECOVERY_CODE_COUNT = 8;
/** `XXXXX-XXXXX`: ten characters from the alphabet below, ~50 bits. */
export const TOTP_RECOVERY_CODE_LENGTH = 10;
/** How long a sign-in may wait between the password and the code. */
export const TOTP_CHALLENGE_TTL_SEC = 300;
/** Who the apps offer the row to, and who the server lets enable it. */
export const TOTP_ELIGIBLE_ROLES = ['admin', 'clinician', 'technician'] as const;
export type TotpEligibleRole = (typeof TOTP_ELIGIBLE_ROLES)[number];
export const isTotpEligibleRole = (role: string): role is TotpEligibleRole =>
  (TOTP_ELIGIBLE_ROLES as readonly string[]).includes(role);

/* ── Shapes ─────────────────────────────────────────────────────── */

/** `GET /auth/totp` (signed in). */
export interface TotpStatus {
  enabled: boolean;
  /** When it was turned on (ISO), null while off. */
  enabledAt: string | null;
  /** Unused recovery codes left; 0 while off. */
  recoveryCodesLeft: number;
  /** Whether this account's role may turn it on at all. */
  eligible: boolean;
}

/** `POST /auth/totp/setup` (signed in) → a NEW pending secret. Nothing is
    enforced until `enable` proves the app has it. Calling it again
    replaces the pending secret; 409 `totp_already_enabled` while on. */
export interface TotpSetup {
  /** base32, no padding — for typing into an app by hand. */
  secret: string;
  /** `otpauth://totp/CYPHIX:<email>?secret=…&issuer=CYPHIX&algorithm=SHA1&digits=6&period=30` */
  otpauthUrl: string;
  issuer: string;
  /** The label the app shows under the issuer — the account's e-mail. */
  account: string;
  digits: number;
  periodSec: number;
}

/** `POST /auth/totp/enable` (signed in). A code from the app, computed
    off the pending secret. */
export interface TotpEnableInput {
  code: string;
}
export interface TotpEnableResult {
  enabled: true;
  enabledAt: string;
  /** Shown ONCE — the server keeps hashes only. */
  recoveryCodes: string[];
}

/** `POST /auth/totp/disable` (signed in). The password AND a current
    code (or an unused recovery code): a stolen session must not be able
    to strip the factor. */
export interface TotpDisableInput {
  password: string;
  code: string;
}
export interface TotpDisableResult {
  enabled: false;
}

/** What `POST /auth/login` answers (202) for an account with the factor
    on, after the password verified. No tokens. */
export interface TotpChallenge {
  totpRequired: true;
  challengeToken: string;
  expiresInSec: number;
}

/** `POST /auth/login/totp` (public) → the login envelope (AuthTokens). */
export interface TotpLoginInput {
  challengeToken: string;
  /** A six-digit code, or a recovery code. */
  code: string;
}

export const TOTP_ROUTES = {
  /** GET → TotpStatus. */
  status: '/auth/totp',
  /** POST → TotpSetup. */
  setup: '/auth/totp/setup',
  /** POST TotpEnableInput → TotpEnableResult. 400 `totp_invalid`. */
  enable: '/auth/totp/enable',
  /** POST TotpDisableInput → TotpDisableResult. 400 `wrong_password` / `totp_invalid`. */
  disable: '/auth/totp/disable',
  /** POST TotpLoginInput → AuthTokens. 400 `totp_invalid` / `totp_challenge_expired`. */
  loginTotp: '/auth/login/totp',
} as const;

/**
 * The second step of a sign-in, as the client sees it: `login()` rejects
 * with THIS (code 'totp-required') instead of resolving, carrying the
 * challenge the next call needs. A subclass rather than a new return
 * type, so every `login()` implementation and caller that predates the
 * factor keeps its signature — an account without it never meets this.
 */
export class TotpChallengeRequired extends Error {
  readonly code = 'totp-required' as const;
  readonly name = 'TotpChallengeRequired';
  constructor(public readonly challenge: TotpChallenge) {
    super('A verification code is required');
  }
}

/**
 * What an auth service does about the factor. A separate interface, as
 * every account extension is here, so a platform adopts it in its own
 * change-set; `implements` makes a forgotten method a compile error.
 */
export interface TotpContract {
  totpStatus(): Promise<TotpStatus>;
  totpSetup(): Promise<TotpSetup>;
  /** Rejects with `totp-invalid`. */
  totpEnable(input: TotpEnableInput): Promise<TotpEnableResult>;
  /** Rejects with `wrong-password` or `totp-invalid`. */
  totpDisable(input: TotpDisableInput): Promise<TotpDisableResult>;
  /** Spends the challenge. On success the device is signed in, exactly as
      after `login()`. Rejects with `totp-invalid` (try again on the same
      challenge) or `totp-expired` (start over with the password). */
  loginTotp(input: TotpLoginInput): Promise<AuthSession>;
}

/* ── Shape checks (the server's rules, for the forms) ──────────── */

/** Letters and digits that cannot be misread off a printed sheet: no
    0/O, no 1/I/L. Same idea as the care-invite alphabet. */
export const TOTP_RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Spaces and dashes are how people type both kinds of code; neither
    carries information. Upper-cased so a recovery code compares. */
export function normalizeTotpInput(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}
export const isTotpCodeShaped = (raw: string): boolean =>
  new RegExp(`^\\d{${TOTP_DIGITS}}$`).test(normalizeTotpInput(raw));
export const isRecoveryCodeShaped = (raw: string): boolean => {
  const n = normalizeTotpInput(raw);
  return n.length === TOTP_RECOVERY_CODE_LENGTH && [...n].every((c) => TOTP_RECOVERY_ALPHABET.includes(c));
};
/** Either kind — what the sign-in's code field accepts before sending. */
export const isTotpInputShaped = (raw: string): boolean =>
  isTotpCodeShaped(raw) || isRecoveryCodeShaped(raw);

/** `XXXXX-XXXXX`, for display. */
export function formatRecoveryCode(code: string): string {
  const n = normalizeTotpInput(code);
  return n.length === TOTP_RECOVERY_CODE_LENGTH ? `${n.slice(0, 5)}-${n.slice(5)}` : code;
}

/* ── base32 (RFC 4648), the secret's spelling ───────────────────── */

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/** Tolerant of padding, spaces and case. Throws on a character outside
    the alphabet — a secret is never user-typed on our side. */
export function base32Decode(text: string): Uint8Array {
  const clean = text.replace(/[\s=]/g, '').toUpperCase();
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error('Not base32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

/** The URI an authenticator app reads off the QR code (Key Uri Format). */
export function otpauthUrl(secret: string, account: string, issuer = TOTP_ISSUER): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  return (
    `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}` +
    `&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SEC}`
  );
}

/* ── SHA-1 + HMAC, pure (for the offline mocks only) ───────────────
   RFC 3174, written out because neither a browser mock (no need to go
   async through WebCrypto) nor Hermes (no WebCrypto at all) has HMAC at
   hand. NOT a general-purpose hash and never used for passwords here;
   TOTP is the one place SHA-1 is still what every app on the other side
   of the QR code expects. ~40 lines; checked against node:crypto. */

function sha1(message: Uint8Array): Uint8Array {
  const ml = message.length;
  const withOne = ml + 1;
  const padded = new Uint8Array(Math.ceil((withOne + 8) / 64) * 64);
  padded.set(message);
  padded[ml] = 0x80;
  const bitLen = ml * 8;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
  dv.setUint32(padded.length - 4, bitLen >>> 0);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));

  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const t = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30) >>> 0;
      b = a;
      a = t;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  const out = new Uint8Array(20);
  const ov = new DataView(out.buffer);
  ov.setUint32(0, h0);
  ov.setUint32(4, h1);
  ov.setUint32(8, h2);
  ov.setUint32(12, h3);
  ov.setUint32(16, h4);
  return out;
}

function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const block = 64;
  const k = key.length > block ? sha1(key) : key;
  const kp = new Uint8Array(block);
  kp.set(k);
  const inner = new Uint8Array(block + message.length);
  const outer = new Uint8Array(block + 20);
  for (let i = 0; i < block; i++) {
    inner[i] = kp[i] ^ 0x36;
    outer[i] = kp[i] ^ 0x5c;
  }
  inner.set(message, block);
  outer.set(sha1(inner), block);
  return sha1(outer);
}

/** RFC 4226 §5.3: the dynamic truncation of HMAC-SHA1(secret, counter). */
export function hotp(secret: Uint8Array, counter: number, digits = TOTP_DIGITS): string {
  const msg = new Uint8Array(8);
  const dv = new DataView(msg.buffer);
  dv.setUint32(0, Math.floor(counter / 0x100000000));
  dv.setUint32(4, counter >>> 0);
  const h = hmacSha1(secret, msg);
  const o = h[19] & 15;
  const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}

/** Which 30 s step a moment falls in. */
export const totpStep = (unixSec: number, period = TOTP_PERIOD_SEC): number =>
  Math.floor(unixSec / period);

/** The code an authenticator shows at `unixSec` for this base32 secret. */
export function totpCodeAt(secretBase32: string, unixSec: number): string {
  return hotp(base32Decode(secretBase32), totpStep(unixSec));
}

/**
 * Verify a typed code against the secret at `nowSec`, accepting
 * ±TOTP_WINDOW_STEPS of clock skew, and REFUSING any step at or before
 * `lastStep` — a code is good once (RFC 6238 §5.2), so the same six
 * digits read off a shoulder cannot be replayed inside their window.
 * Returns the step that matched, for the caller to remember.
 */
export function verifyTotpCode(
  secretBase32: string,
  code: string,
  nowSec: number,
  lastStep: number | null,
): { ok: true; step: number } | { ok: false } {
  const typed = normalizeTotpInput(code);
  if (!/^\d+$/.test(typed) || typed.length !== TOTP_DIGITS) return { ok: false };
  const secret = base32Decode(secretBase32);
  const centre = totpStep(nowSec);
  for (let d = -TOTP_WINDOW_STEPS; d <= TOTP_WINDOW_STEPS; d++) {
    const step = centre + d;
    if (lastStep != null && step <= lastStep) continue;
    if (hotp(secret, step) === typed) return { ok: true, step };
  }
  return { ok: false };
}

/** A fresh secret / recovery codes from caller-supplied randomness, so
    this file stays free of platform crypto: pass `crypto.getRandomValues`
    bytes on the web, `expo-crypto`'s on the phone. */
export function secretFromBytes(bytes: Uint8Array): string {
  return base32Encode(bytes);
}
export function recoveryCodesFromBytes(bytes: Uint8Array, count = TOTP_RECOVERY_CODE_COUNT): string[] {
  const codes: string[] = [];
  const n = TOTP_RECOVERY_ALPHABET.length;
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < TOTP_RECOVERY_CODE_LENGTH; j++) {
      const b = bytes[i * TOTP_RECOVERY_CODE_LENGTH + j];
      if (b === undefined) throw new Error('Not enough randomness');
      code += TOTP_RECOVERY_ALPHABET[b % n];
    }
    codes.push(formatRecoveryCode(code));
  }
  return codes;
}
/** How many random bytes `recoveryCodesFromBytes` wants. */
export const TOTP_RECOVERY_RANDOM_BYTES = TOTP_RECOVERY_CODE_COUNT * TOTP_RECOVERY_CODE_LENGTH;
/** 20 bytes = 160 bits, RFC 4226's recommended secret length. */
export const TOTP_SECRET_BYTES = 20;

// v1.0.0 — TOTP two-factor (server v0.24.0, LAUNCH_PLAN 5.5): TotpStatus / Setup / Enable /
//          Disable / Challenge / LoginInput, TOTP_ROUTES, TotpChallengeRequired, TotpContract,
//          the constants, the shape checks, base32 + otpauth URL, and a pure HOTP/TOTP
//          (SHA-1 written out) so the offline mocks verify a real authenticator's code.
