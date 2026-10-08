/* ==================================================================
   Auth contract — the ONE definition of what an account IS, what
   registration carries, and how sign-in fails, shared by every platform
   (root CLAUDE.md §2.1: a data shape crossing a boundary is defined
   here FIRST, then consumed).

   The web app predates this package and still carries its own copy in
   `src/services/auth/authTypes.ts`; the shapes below are that file,
   moved. Until the web imports from here, ANY edit must be made in both
   places — the migration is tracked in PARITY.md.

   Deliberately NOT here: the service implementations. Storing a token is
   `localStorage` on web and the Keychain/Keystore on mobile, so each
   platform writes its own `authService` against this contract.
   ================================================================== */

import type { SessionUser } from '../api/contract';

/** FHIR R4 `AdministrativeGender`, spelled out so shared stays dependency
    free. Registration records sex assigned at birth: ECG interpretation
    thresholds differ by it, which is why the flow asks at all. */
export type AdministrativeGender = 'male' | 'female' | 'other' | 'unknown';

/** ABO/Rh groups the emergency card may carry, plus the honest
    "not stated" — a guessed blood type is more dangerous than a blank. */
export const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as const;
export type BloodType = (typeof BLOOD_TYPES)[number] | 'unknown';

/** Health/identity details captured during registration. Every field is
    optional: each of these steps can be skipped, and a half-filled profile
    is a valid account (the app asks again later rather than blocking). */
export interface RegistrationProfile {
  birthDate?: string; // ISO yyyy-mm-dd
  sex?: AdministrativeGender;
  phone?: string;
  bloodType?: BloodType;
  heightCm?: number;
  weightKg?: number;
  emergencyName?: string;
  emergencyPhone?: string;
  /** How the emergency contact is related — free-form label from a fixed
      set the UI offers, never a clinical code. */
  emergencyRelation?: string;
  /** Local URI of the account photo, or an avatar tone when there is none.
      The image itself never leaves the device in this stage. */
  photoUri?: string;
  avatarTone?: string;
}

export interface RegistrationInput extends RegistrationProfile {
  fullName: string;
  email: string;
  password: string;
}

export interface Credentials {
  email: string;
  password: string;
}

/** What a successful sign-in returns. `token` is opaque — no platform
    inspects it; the server issues a short-lived JWT here. */
export interface AuthSession {
  user: SessionUser;
  token: string;
  profile: RegistrationProfile;
}

export type AuthErrorCode =
  | 'email-taken'
  | 'invalid-credentials'
  | 'weak-password'
  /** An e-mailed link that is expired, already used, or not ours. The
      server answers every one of those with the same 400 `invalid_token`
      on purpose; the client has nothing finer to show either. */
  | 'invalid-link'
  /** 429 — the server's per-IP fence on anything that sends mail. */
  | 'rate-limited'
  /** 400 `wrong_password` — a signed-in person mistyped their CURRENT
      password while changing it or their e-mail. Distinct from
      'invalid-credentials' because the message is different: nothing is
      wrong with the account, only with what was just typed. */
  | 'wrong-password'
  | 'network'
  | 'unknown';

/** Typed failure so each UI maps a stable code → its own translated
    message, and a raw server string never reaches a patient. */
export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AuthError';
  }
}

export interface AuthServiceContract {
  /** Return the persisted session if the token is still valid, else null. */
  restore(): Promise<AuthSession | null>;
  login(credentials: Credentials): Promise<AuthSession>;
  register(input: RegistrationInput): Promise<AuthSession>;
  logout(): Promise<void>;
}

/* ── Account recovery + mailbox proof (server v0.11.0) ─────────────── */

/** `POST /auth/password/forgot`. The reply is the same whether or not the
    address exists — that is the point of it. */
export interface PasswordForgotInput {
  email: string;
}
export interface PasswordForgotResult {
  status: 'sent';
}

/** `POST /auth/password/reset`. Succeeds with the LOGIN envelope: the
    server has already revoked every other session and signed this device
    in, so the client stores the tokens exactly as after a sign-in. */
export interface PasswordResetInput {
  token: string;
  password: string;
}

/** `POST /auth/email/verify/confirm`. No session needed. */
export interface EmailVerifyInput {
  token: string;
}
export interface EmailVerifyResult {
  verified: true;
}

/** `POST /auth/email/verify/request` (signed in). `sent` is also what the
    server says inside its 60 s per-user cooldown — nothing to enumerate. */
export interface EmailVerifyRequestResult {
  status: 'sent' | 'already_verified';
}

/**
 * What a platform's auth service does with an e-mailed link.
 *
 * A SEPARATE interface rather than four more members on
 * AuthServiceContract, so a platform can adopt it in its own change-set
 * without the shared edit breaking the other platform's typecheck first
 * (root CLAUDE.md §4: a shared change is a change to three apps). An
 * implementation that has it declares `implements AuthServiceContract,
 * AuthRecoveryContract`; PARITY.md says who does.
 */
export interface AuthRecoveryContract {
  /** Resolves on 202. Never rejects for "no such address". */
  requestPasswordReset(input: PasswordForgotInput): Promise<void>;
  /** Spends the link; on success the device is signed in. Rejects with
      `invalid-link` or `weak-password`. */
  resetPassword(input: PasswordResetInput): Promise<AuthSession>;
  /** Spends the link. Rejects with `invalid-link`. */
  verifyEmail(input: EmailVerifyInput): Promise<void>;
  /** For the signed-in account. */
  requestEmailVerification(): Promise<EmailVerifyRequestResult>;
}

/* ── Account self-service (server v0.12.0, LAUNCH_PLAN 1.4b) ──────── */

/** `POST /auth/password/change` (signed in). The server ends every OTHER
    session of the account — this one stays — and mails "your password was
    changed". Rejects with `wrong-password` or `weak-password`. */
export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}
export interface PasswordChangeResult {
  changed: true;
  /** How many other devices were signed out. */
  revokedSessions: number;
}

/** `POST /auth/email/change` (signed in). A confirmation link goes to the
    NEW address and a notice to the old one; nothing changes until the
    link is spent. 202 `{status:'sent'}`. Rejects with `wrong-password`,
    `email-taken` (409) or — if the new address is the current one — a
    plain 400 the UI prevents before sending. */
export interface EmailChangeInput {
  newEmail: string;
  password: string;
}
export interface EmailChangeRequestResult {
  status: 'sent';
}

/** `POST /auth/email/change/confirm`. Public — the link may be opened on
    any device. On success the account's address IS the new one, and it
    counts as verified (the click proved the mailbox). */
export interface EmailChangeConfirmInput {
  token: string;
}
export interface EmailChangeConfirmResult {
  changed: true;
  email: string;
}

/** One signed-in device, as `GET /auth/sessions` lists it: a refresh-token
    family, named by the family id. What the server knows about a device
    is what the request carried — an address and a user-agent string —
    and `describeUserAgent` (auth/userAgent.ts) turns the latter into
    words the same way everywhere. */
export interface SessionView {
  id: string;
  /** When this device first signed in (ISO). */
  createdAt: string;
  /** The last time it exchanged a token — "last used", to within the
      access token's 15-minute life (ISO). */
  lastSeenAt: string;
  /** When it signs itself out if never used again (ISO). */
  expiresAt: string;
  ip: string | null;
  userAgent: string | null;
  /** The session the request itself came from. */
  current: boolean;
}
export interface SessionsResult {
  sessions: SessionView[];
}
/** `DELETE /auth/sessions` — "sign out everywhere else". */
export interface SessionsRevokedResult {
  revoked: number;
}

/**
 * What a signed-in person may do to their own account. A third separate
 * interface, for the same reason AuthRecoveryContract is one: a platform
 * adopts it in its own change-set, and `implements` is what makes a
 * forgotten method a compile error rather than a dead row in Settings.
 */
export interface AuthAccountContract {
  changePassword(input: PasswordChangeInput): Promise<PasswordChangeResult>;
  /** Resolves on 202. */
  requestEmailChange(input: EmailChangeInput): Promise<void>;
  /** Spends the link. Rejects with `invalid-link` or `email-taken`. */
  confirmEmailChange(input: EmailChangeConfirmInput): Promise<EmailChangeConfirmResult>;
  listSessions(): Promise<SessionView[]>;
  /** Signs that one device out. Allowed on the current session too —
      which then ends this one. */
  revokeSession(id: string): Promise<void>;
  /** Signs out every device but this one; resolves with how many. */
  revokeOtherSessions(): Promise<number>;
}

/**
 * Where an e-mailed link lands. The WEB app owns these pages (public —
 * the person may open them on a device that has never signed in). The
 * phone handles the same paths as deep links on its scheme
 * (`cyphix://reset-password?token=…`), and the web page offers to open
 * the app. The server builds its links from `WEB_ORIGIN` + these paths
 * (`CYPHIX_SERVER/src/email/templates.ts`, WEB_LINK_PATHS) — an edit
 * here is an edit there.
 */
export const AUTH_LINK_PATHS = {
  verifyEmail: '/verify-email',
  resetPassword: '/reset-password',
  /** Server v0.12.0 — confirms a NEW address (sent there, not to the old one). */
  changeEmail: '/change-email',
} as const;

/** The query parameter the link carries the token in. */
export const AUTH_LINK_TOKEN_PARAM = 'token';

/** Matches the server policy: at least 6 characters and nothing else
    (`CYPHIX_SERVER/src/policy/password.ts`). The server deploys on its own
    and cannot import this package, so the number lives in both places and
    an edit to one is an edit to both. It was 10 + a letter + a digit until
    2026-10-08, when the user set it to 6 — which is what the web's sign-up
    copy had promised all along. */
export const MIN_PASSWORD_LENGTH = 6;

/**
 * The routes an HTTP implementation calls, relative to API_VERSION_PATH.
 * Named here so web and mobile cannot drift onto different URLs.
 *
 * ⚠️ These are the routes CYPHIX_SERVER actually serves today (verified
 * against `CYPHIX_SERVER/src/routes/auth.ts`). `session` was previously
 * listed as `/auth/session` — the server has never had that path; it is
 * `/auth/me`. A constant that names a route nobody implements is worse
 * than no constant, because it reads as verified.
 */
export const AUTH_ROUTES = {
  login: '/auth/login',
  register: '/auth/register',
  /** Fresh principal for a live access token (the server's session read). */
  me: '/auth/me',
  logout: '/auth/logout',
  refresh: '/auth/refresh',
  /* Server v0.11.0 — e-mailed links (LAUNCH_PLAN 1.3 / 1.4). */
  /** Signed in. 202 `{status:'sent'}` or 200 `{status:'already_verified'}`. */
  verifyEmailRequest: '/auth/email/verify/request',
  /** Public. `{token}` → `{verified:true}`, else 400 `invalid_token`. */
  verifyEmailConfirm: '/auth/email/verify/confirm',
  /** Public. `{email}` → always 202 `{status:'sent'}`. */
  forgotPassword: '/auth/password/forgot',
  /** Public. `{token, password}` → the login envelope, else 400. */
  resetPassword: '/auth/password/reset',
  /* Server v0.12.0 — account self-service (LAUNCH_PLAN 1.4b, S12/S13/A20). */
  /** Signed in. `{currentPassword, newPassword}` → `{changed, revokedSessions}`;
      400 `wrong_password` when the current one is wrong. */
  changePassword: '/auth/password/change',
  /** Signed in. `{newEmail, password}` → 202 `{status:'sent'}`. */
  changeEmail: '/auth/email/change',
  /** Public. `{token}` → `{changed:true, email}`; 400 `invalid_token`; 409 taken. */
  changeEmailConfirm: '/auth/email/change/confirm',
  /** Signed in. GET → `{sessions}`; DELETE → `{revoked}` (all but this one). */
  sessions: '/auth/sessions',
  /** Signed in. DELETE → 204: that one device is signed out. */
  session: (id: string) => `/auth/sessions/${encodeURIComponent(id)}`,
} as const;

/**
 * Routes the product needs and the SERVER DOES NOT IMPLEMENT YET.
 *
 * Kept separate, and deliberately not merged into AUTH_ROUTES, so a client
 * cannot call one by accident and so the gap is impossible to forget: a
 * platform that offers SMS verification today is answering out of its own
 * device, not out of the server (tracked in CYPHIX_MEDICAL_MOBILE/PARITY.md).
 * `requestPasswordReset` left this list on 2026-10-08 — it is real now, as
 * AUTH_ROUTES.forgotPassword; `changePassword` and `sessions` followed the
 * same day (server v0.12.0). Only the phone step remains device-only.
 */
export const AUTH_ROUTES_PLANNED = {
  requestPhoneCode: '/auth/phone/code',
  verifyPhoneCode: '/auth/phone/verify',
} as const;

/** Shape-only email check. Deliverability is the server's business — this
    exists so a form can disable its own submit button, nothing more. */
export function isEmailShaped(email: string): boolean {
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

/** 0–4 password strength, used to drive the meter identically everywhere.
    Length carries most of it (it is what actually resists a guess); a
    non-letter adds the last point. Never a gate — the gate is
    MIN_PASSWORD_LENGTH. */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  const byLength = Math.min(3, Math.floor(password.length / 4));
  const varied = /[^a-zA-Z]/.test(password) ? 1 : 0;
  return Math.min(4, byLength + varied) as 0 | 1 | 2 | 3 | 4;
}

// v1.4.0 — Account self-service (server v0.12.0, LAUNCH_PLAN 1.4b): AuthAccountContract
//          (change password, change e-mail + confirm, list/revoke sessions), the input
//          and result shapes, SessionView, AUTH_LINK_PATHS.changeEmail, four more
//          AUTH_ROUTES (+ `session(id)`), AuthErrorCode 'wrong-password'. The two
//          routes leave AUTH_ROUTES_PLANNED — only the phone step is still device-only.
// v1.3.0 — Account recovery (server v0.11.0): AUTH_ROUTES gains the four e-mailed-link
//          routes; AuthRecoveryContract (separate, so each platform adopts it in its
//          own change-set); AUTH_LINK_PATHS + the token param; AuthErrorCode gains
//          'invalid-link' and 'rate-limited'. AUTH_ROUTES_PLANNED now names
//          changePassword + sessions instead of the reset route that exists.
// v1.2.0 — MIN_PASSWORD_LENGTH 10 → 6 (user decision 2026-10-08); matches server v0.8.0.
// v1.1.0 — AUTH_ROUTES now matches what CYPHIX_SERVER really serves (/auth/me,
//          not /auth/session); unimplemented routes moved to AUTH_ROUTES_PLANNED.
