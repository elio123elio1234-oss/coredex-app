/* ==================================================================
   The mobile auth surface — the shared `AuthServiceContract` plus the
   handful of things only a phone's sign-in flow asks for.

   ★ Why this file exists at all: there are now TWO implementations
   (`MockAuthService` on-device, `HttpAuthService` against CYPHIX_SERVER)
   and the swap between them is a single line in `authService.ts`. For
   that swap to be safe, the compiler — not a reviewer — has to be the one
   that notices when one of them stops answering a question the wizard
   asks. The interface below is what makes that true.

   The four extras are NOT in @cyphix/shared on purpose: they are how the
   ONBOARDING FLOW behaves on a device (biometric re-entry, an SMS step, a
   forgot-password screen), not part of the platform-neutral account
   contract the web also implements. If the web grows the same screens,
   they move to shared then — not before.
   ================================================================== */

import type { AuthServiceContract, AuthSession, RefreshOutcome } from '@cyphix/shared';

/** The account this device last signed in as. Name only — it is shown
    above the biometric button so the patient knows WHOSE record is about
    to open, and nothing else about them is needed to draw that. */
export interface RememberedAccount {
  id: string;
  displayName: string;
}

export interface MobileAuthService extends AuthServiceContract {
  /**
   * Ask the authority whether the session `restore()` just opened is
   * still real, and report which of the three things happened.
   *
   * ★ Separate from `restore()` on purpose, and the separation is the
   * whole offline-session design: restoring is a disk read that always
   * succeeds or fails immediately, revalidating is a round trip that may
   * never come back. Fusing them is what made a cold start with no signal
   * — or with a server still waking up — land on the sign-in screen.
   * `RefreshOutcome` is returned whole so the caller can tell "the server
   * refused" from "there was no server to ask"; see @cyphix/shared
   * `auth/session.ts`, where the reasoning lives.
   */
  revalidate(): Promise<RefreshOutcome>;
  /**
   * Is there a credential on this device, whoever it belongs to?
   *
   * Separate from `restore()` because `restore()` may not touch the
   * network and this is the one thing it therefore cannot always answer.
   * The gate uses it to tell "nobody has signed in here" from "somebody
   * is signed in and we do not yet know who" — and only the second of
   * those is worth holding a splash for.
   */
  hasStoredSession(): Promise<boolean>;
  /** Null when this device has no account to offer biometric re-entry to. */
  rememberedAccount(): Promise<RememberedAccount | null>;
  /** Open the remembered account's session. The BIOMETRIC CHECK IS THE
      CALLER'S JOB (`services/auth/biometrics`) and is what authorises it. */
  signInRemembered(): Promise<AuthSession | null>;
  /** Does an account already exist for this address? Used by the sign-up
      step to fail on the field that owns the problem. */
  emailExists(email: string): Promise<boolean>;
  requestPasswordReset(email: string): Promise<void>;
  /** Returns the code to DISPLAY when no SMS was really sent, so nobody
      waits for a text that is not coming. */
  requestPhoneCode(phone: string): Promise<{ devCode: string }>;
  verifyPhoneCode(phone: string, code: string): Promise<boolean>;
}

/** The stand-in SMS code. Obviously synthetic (web CLAUDE.md §7.4) and
    displayed on the screen that asks for it. There is no SMS gateway on
    either side of the wire yet — see AUTH_ROUTES_PLANNED in @cyphix/shared. */
export const MOCK_SMS_CODE = '000000';

// v1.2.0 — Adds `hasStoredSession()`: the question restore() cannot answer off
//          the disk alone, and the one the gate needs before it shows a door.
// v1.1.0 — Adds `revalidate()`: restoring a session (a disk read) and
//          confirming it (a round trip) are now two calls, which is what lets
//          the app open offline without pretending the server agreed.
// v1.0.0 — The two-implementation auth surface: shared contract + the device
//          extras, so swapping mock ⇄ server is a compiler-checked change.
