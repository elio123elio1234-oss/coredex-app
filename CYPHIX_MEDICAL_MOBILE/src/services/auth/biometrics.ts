/* ==================================================================
   Biometric unlock — Face ID / Touch ID / fingerprint, wrapped so the
   sign-in screen asks ONE question ("may I offer this?") and performs
   ONE action ("unlock").

   Three conditions must ALL hold before the button is drawn:
     1. the device has the hardware,
     2. something is actually enrolled on it,
     3. this device remembers an account to unlock.
   Any of them missing and the offer could not be honoured, so it is not
   made. A dead "Use Face ID" button on a phone with no face enrolled is
   the kind of thing that makes someone distrust the rest of the app.

   What it authorises today is a LOCAL session for the remembered account
   (see `authService.signInRemembered`). Against a real server the same
   gesture releases a refresh token from the enclave instead — same
   sequence, different last step.
   ================================================================== */

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import type { TranslationKey } from '@/i18n/config';
import { authService } from './authService';

export async function canUseBiometrics(): Promise<boolean> {
  try {
    const [hasHardware, enrolled, remembered] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      authService.rememberedAccount(),
    ]);
    return hasHardware && enrolled && remembered !== null;
  } catch {
    /* An OS that will not answer is an OS we do not offer this on. */
    return false;
  }
}

/**
 * Which words to put on the button. The platform's own name matters:
 * "Use Face ID" on a phone that does fingerprints is wrong, and on
 * Android the honest generic is "biometric unlock" because the OEM
 * decides what the sensor is.
 */
export async function biometricLabelKey(): Promise<TranslationKey> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (Platform.OS === 'ios') {
      return types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
        ? 'authUseFaceId'
        : 'authUseTouchId';
    }
    return 'authUseBiometrics';
  } catch {
    return 'authUseBiometrics';
  }
}

export interface BiometricResult {
  ok: boolean;
  /** True when the patient dismissed the prompt — not an error to shout about. */
  cancelled: boolean;
}

/**
 * Can this device stand behind an APP LOCK?
 *
 * Deliberately a different question from `canUseBiometrics` above, and the
 * difference is the fallback. That one gates an OFFER — a button that must
 * not be drawn if it cannot be honoured — so it insists on enrolled
 * biometrics. This one gates a session the patient has already asked us to
 * protect, and the device passcode is an entirely respectable way to prove
 * you own the phone. Requiring a face here would mean someone who uses a
 * passcode could not have an app lock at all.
 *
 * `isEnrolledAsync` covers passcode-only devices too on both platforms, so
 * this is one call rather than a platform branch.
 */
export async function canUseAppLock(): Promise<boolean> {
  try {
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

/**
 * Prove the person holding the phone is the person it belongs to.
 *
 * ★ `disableDeviceFallback: false`, the opposite of the sign-in button
 * below, and for the reason above: this is the ONLY way past the lock, so
 * a wet thumb or a face the sensor will not take must not be a dead end.
 * The device passcode is the OS's own fallback and is exactly as strong as
 * the assertion being made here — "this phone is yours".
 */
export async function unlockApp(promptMessage: string): Promise<BiometricResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      disableDeviceFallback: false,
    });
    if (result.success) return { ok: true, cancelled: false };
    const cancelled = result.error === 'user_cancel' || result.error === 'system_cancel';
    return { ok: false, cancelled };
  } catch {
    return { ok: false, cancelled: false };
  }
}

/** Prompt, and on success open the remembered account's session. */
export async function unlockWithBiometrics(promptMessage: string): Promise<BiometricResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      /* No PIN fallback: the password field is right there on the same
         screen, and it is the honest fallback for this app. */
      disableDeviceFallback: true,
    });
    if (!result.success) {
      const cancelled = result.error === 'user_cancel' || result.error === 'system_cancel';
      return { ok: false, cancelled };
    }
    const session = await authService.signInRemembered();
    return { ok: session !== null, cancelled: false };
  } catch {
    return { ok: false, cancelled: false };
  }
}

// v1.1.0 — Adds the APP LOCK pair (`canUseAppLock` / `unlockApp`), which allow
//          the device passcode as a fallback where the sign-in offer does not:
//          the lock is the only way in, so a sensor that will not read must not
//          be a dead end.
// v1.0.0 — Face ID / fingerprint unlock for the remembered account.
