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
  network: 'authErrNetwork',
  unknown: 'authErrUnknown',
};

export function authErrorKey(code: AuthErrorCode | null | undefined): TranslationKey | null {
  return code ? ERROR_KEY[code] : null;
}

// v1.0.0 — AuthErrorCode → translation key (for the Account sheets).
