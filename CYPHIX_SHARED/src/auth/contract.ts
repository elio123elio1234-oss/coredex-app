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

/** Matches the server policy (≥10 chars; letter + digit enforced there). */
export const MIN_PASSWORD_LENGTH = 10;

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
} as const;

/**
 * Routes the product needs and the SERVER DOES NOT IMPLEMENT YET.
 *
 * Kept separate, and deliberately not merged into AUTH_ROUTES, so a client
 * cannot call one by accident and so the gap is impossible to forget: a
 * platform that offers "forgot password" or SMS verification today is
 * answering out of its own device, not out of the server (tracked in
 * CYPHIX_MEDICAL_MOBILE/PARITY.md).
 */
export const AUTH_ROUTES_PLANNED = {
  requestPasswordReset: '/auth/password-reset',
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

// v1.1.0 — AUTH_ROUTES now matches what CYPHIX_SERVER really serves (/auth/me,
//          not /auth/session); unimplemented routes moved to AUTH_ROUTES_PLANNED.
