/* ==================================================================
   authMessages — a stable AuthErrorCode → a translation key, so a sheet
   never renders a raw service/server string. The mobile twin of the
   web's `features/auth/authMessages.ts`. `OnboardingScreen` keeps its
   own copy of the same map (it predates this file); both are exhaustive
   on purpose — a new code without words is a compile error.
   ================================================================== */

import type { AuthErrorCode } from '@cyphix/shared';
import type { TranslationKey } from '@/i18n/config';

const ERROR_KEY: Record<AuthErrorCode, TranslationKey> = {
  'email-taken': 'authErrEmailTaken',
  'invalid-credentials': 'authErrInvalidCredentials',
  'weak-password': 'authErrWeakPassword',
  'invalid-link': 'authErrInvalidLink',
  'rate-limited': 'authErrRateLimited',
  'wrong-password': 'authErrWrongPassword',
  'captcha-required': 'authErrCaptchaRequired',
  'captcha-failed': 'authErrCaptchaFailed',
  network: 'authErrNetwork',
  unknown: 'authErrUnknown',
};

export function authErrorKey(code: AuthErrorCode | null | undefined): TranslationKey | null {
  return code ? ERROR_KEY[code] : null;
}

// v1.1.0 — captcha-required / captcha-failed (shared v1.23.0, server v0.15.0).
// v1.0.0 — AuthErrorCode → translation key (for the Account sheets).
