/* ==================================================================
   useOnboarding — the wizard's brain. The screen renders steps; this
   holds the draft, decides what "Continue" means on each one, and is the
   only thing that talks to `useAuth`.

   Everything it exposes is either a value a step shows or a callback a
   step calls. No step component knows what comes after it, which is why
   the ORDER can change in `onboardingModel.ts` alone.
   ================================================================== */

import { useCallback, useMemo, useReducer, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { AuthError, REQUIRED_CONSENTS, type AuthErrorCode, type CaptchaPolicy } from '@cyphix/shared';
import { PHONE_VERIFICATION_STEP } from '@/config/featureFlags';
import { authService } from '@/services/auth/authService';
import { useAuth } from './useAuth';
import {
  EMPTY_DRAFT,
  PROFILE_STEPS,
  backTarget,
  canContinue,
  isProfileStep,
  onboardingReducer,
  toRegistrationInput,
  type DraftPatch,
  type OnboardingDraft,
  type OnboardingStep,
} from './onboardingModel';

/** What the CURRENT step is complaining about, as a stable code the step
    turns into a translated line. Separate from the auth slice's error:
    these are decided here (a taken address, a wrong SMS code) rather than
    by a sign-in attempt. */
export type StepIssue = 'email-taken' | 'wrong-code';

export interface Onboarding {
  step: OnboardingStep;
  draft: OnboardingDraft;
  /** True while an account is being created or a sign-in is in flight. */
  busy: boolean;
  /** Failure code from the last sign-in / registration attempt, or null. */
  error: AuthErrorCode | null;
  /** What this step itself rejected, or null. */
  issue: StepIssue | null;
  /** Whether the current step's primary button is live. */
  ready: boolean;
  /** 0–1 across the six health steps, for the header bar. */
  progress: number;
  /** 1-based index of the current health step; 0 outside them. */
  profileIndex: number;
  /** True once the server has accepted the reset request (202). */
  resetSent: boolean;
  /** The reset request is in flight. */
  resetBusy: boolean;
  /** The reset REQUEST failed (no signal, rate-limited) — never "no such
      address", which the server does not say and this does not invent. */
  resetIssue: AuthErrorCode | null;
  /** The mock SMS code, shown on the OTP step because no text is sent. */
  devCode: string | null;
  patch: (patch: DraftPatch) => void;
  pressKey: (field: 'phone' | 'otp', value: string) => void;
  go: (step: OnboardingStep) => void;
  back: () => void;
  next: () => void;
  skip: () => void;
  submitSignIn: () => void;
  sendReset: () => void;
  /** An e-mailed reset link was opened: keep its token, show the reset step. */
  openResetLink: (token: string) => void;
  /** Spend the link with the new password. Success signs the phone in. */
  submitReset: () => void;
  resendCode: () => void;
  finish: () => void;
  /** The bot check's sheet is up (server v0.15.0 named a provider). */
  captchaOpen: boolean;
  /** The sheet handed back a token: create the account with it. */
  submitCaptcha: (token: string) => void;
  cancelCaptcha: () => void;
}

export function useOnboarding(): Onboarding {
  const [draft, dispatch] = useReducer(onboardingReducer, EMPTY_DRAFT);
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [issue, setIssue] = useState<StepIssue | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetIssue, setResetIssue] = useState<AuthErrorCode | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const { login, register, resetPassword, error, clearError, isBusy } = useAuth();

  const patch = useCallback((next: DraftPatch) => {
    setIssue(null);
    dispatch({ type: 'patch', patch: next });
  }, []);

  const pressKey = useCallback((field: 'phone' | 'otp', value: string) => {
    void Haptics.selectionAsync();
    setIssue(null);
    dispatch({ type: 'key', field, value });
  }, []);

  const go = useCallback(
    (next: OnboardingStep) => {
      clearError();
      setIssue(null);
      setStep(next);
    },
    [clearError],
  );

  const back = useCallback(() => {
    clearError();
    setIssue(null);
    setStep((current) => backTarget(current));
  }, [clearError]);

  /** Create the account. Called at the END of the wizard (the review
      step), not after the credentials step: a patient who abandons the
      flow half way should not leave an account behind. */
  const createAccount = useCallback(
    async (captchaToken?: string) => {
      try {
        /* The review screen's consent box is what lets this run (its button
           stays grey until ticked), so what is sent is what was confirmed:
           both documents at the versions this build knows (server v0.13.0). */
        await register({
          ...toRegistrationInput(draft),
          consents: [...REQUIRED_CONSENTS],
          ...(captchaToken ? { captchaToken } : {}),
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStep('success');
      } catch (code) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        /* The bot check (server v0.15.0): a refused token is spent (they
           are single-use), and a demand this build did not expect is still
           a demand — both raise the challenge sheet again over the review
           screen, where the slice's code reads as the line under the
           summary. */
        if (code === 'captcha-required' || code === 'captcha-failed') {
          setCaptchaOpen(true);
          return;
        }
        /* The code is in the slice. Both failures that can land here
           (address taken, password rejected) are about the credentials, so
           that is the step to be standing on when reading the message. */
        setStep('signup');
      }
    },
    [draft, register],
  );

  /** "Confirm and finish": ask whether the server wants a challenge
      first. `off` — every deployment until Turnstile keys are set — goes
      straight to the account; a named provider raises the sheet, whose
      token then calls createAccount. A failed policy read is not a
      refusal: register, and let the server say. */
  const finish = useCallback(() => {
    setChecking(true);
    authService
      .captchaPolicy()
      .catch((): CaptchaPolicy => ({ provider: 'off' }))
      .then((policy) => {
        setChecking(false);
        if (policy.provider !== 'off') setCaptchaOpen(true);
        else void createAccount();
      });
  }, [createAccount]);

  const submitCaptcha = useCallback(
    (token: string) => {
      setCaptchaOpen(false);
      void createAccount(token);
    },
    [createAccount],
  );
  const cancelCaptcha = useCallback(() => setCaptchaOpen(false), []);

  const advanceProfile = useCallback(
    (from: OnboardingStep) => {
      if (!isProfileStep(from)) return;
      const i = PROFILE_STEPS.indexOf(from);
      go(i === PROFILE_STEPS.length - 1 ? 'review' : PROFILE_STEPS[i + 1]);
    },
    [go],
  );

  const next = useCallback(() => {
    /* The primary button stays TAPPABLE while a step is incomplete (it is
       grey, not disabled — see AuthPrimaryButton), so the refusal has to
       happen here. Advancing anyway is how a profile ends up holding a
       value nobody chose. */
    if (!canContinue(step, draft)) return;

    switch (step) {
      case 'signup': {
        /* Fail on the step that owns the field: finding out at the very
           end that the address was taken is the cruelest possible time. */
        setChecking(true);
        void authService
          .emailExists(draft.email)
          .then((taken) => {
            if (taken) setIssue('email-taken');
            else go('phone');
          })
          .finally(() => setChecking(false));
        return;
      }
      case 'phone':
        /* No SMS gateway exists, so outside DEMO_MODE the code step is
           skipped: the number is kept (it is on the card for a clinician to
           call) and simply not marked verified. In demo the step stays, with
           its fixed code printed on it — see featureFlags. */
        if (!PHONE_VERIFICATION_STEP) {
          go('sex');
          return;
        }
        setChecking(true);
        void authService
          .requestPhoneCode(draft.phone)
          .then(({ devCode: code }) => setDevCode(code))
          .finally(() => setChecking(false));
        go('otp');
        return;
      case 'otp':
        setChecking(true);
        void authService
          .verifyPhoneCode(draft.phone, draft.otp)
          .then((ok) => {
            if (ok) {
              go('sex');
            } else {
              setIssue('wrong-code');
              dispatch({ type: 'patch', patch: { otp: '' } });
            }
          })
          .finally(() => setChecking(false));
        return;
      default:
        advanceProfile(step);
    }
  }, [step, draft, go, advanceProfile]);

  /** Ask for a new code. The countdown that gates this lives in the step;
      what it costs is a second request, so it is a real one. */
  const resendCode = useCallback(() => {
    setIssue(null);
    dispatch({ type: 'patch', patch: { otp: '' } });
    void authService.requestPhoneCode(draft.phone).then(({ devCode: code }) => setDevCode(code));
  }, [draft.phone]);

  /** Skip records that the step was declined, then advances. The value is
      dropped with it, so "Skipped" on the review screen is the truth and
      not a leftover default. */
  const skip = useCallback(() => {
    if (!isProfileStep(step)) return;
    void Haptics.selectionAsync();
    dispatch({ type: 'skip', step });
    advanceProfile(step);
  }, [step, advanceProfile]);

  const submitSignIn = useCallback(() => {
    if (!canContinue('signin', draft)) return;
    void login({ email: draft.email, password: draft.password }).catch(() => {
      /* Rejection is already in the slice as a code and the step renders
         it. Swallowed here so a wrong password does not surface as an
         unhandled rejection over a form the patient can simply retype. */
    });
  }, [login, draft]);

  const sendReset = useCallback(() => {
    if (!canContinue('forgot', draft) || resetBusy) return;
    setResetBusy(true);
    setResetIssue(null);
    authService
      .requestPasswordReset({ email: draft.email.trim() })
      .then(() => setResetSent(true))
      .catch((err: unknown) => setResetIssue(err instanceof AuthError ? err.code : 'unknown'))
      .finally(() => setResetBusy(false));
  }, [draft, resetBusy]);

  const openResetLink = useCallback(
    (token: string) => {
      setResetToken(token);
      dispatch({ type: 'patch', patch: { newPassword: '' } });
      go('reset');
    },
    [go],
  );

  const submitReset = useCallback(() => {
    if (!canContinue('reset', draft) || !resetToken) return;
    resetPassword({ token: resetToken, password: draft.newPassword })
      .then(() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      })
      .catch(() => {
        /* The code is in the slice and the step renders it; a dead link
           also offers "Request a new link" there. */
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      });
  }, [draft, resetToken, resetPassword]);

  const profileIndex = isProfileStep(step) ? PROFILE_STEPS.indexOf(step) + 1 : 0;

  return useMemo(
    () => ({
      step,
      draft,
      busy: isBusy || checking,
      error,
      issue,
      ready: canContinue(step, draft),
      progress: step === 'review' ? 1 : profileIndex / PROFILE_STEPS.length,
      profileIndex,
      resetSent,
      resetBusy,
      resetIssue,
      devCode,
      patch,
      pressKey,
      go,
      back,
      next,
      skip,
      submitSignIn,
      sendReset,
      openResetLink,
      submitReset,
      resendCode,
      finish,
      captchaOpen,
      submitCaptcha,
      cancelCaptcha,
    }),
    [
      step,
      draft,
      isBusy,
      checking,
      error,
      issue,
      profileIndex,
      resetSent,
      resetBusy,
      resetIssue,
      devCode,
      patch,
      pressKey,
      go,
      back,
      next,
      skip,
      submitSignIn,
      sendReset,
      openResetLink,
      submitReset,
      resendCode,
      finish,
      captchaOpen,
      submitCaptcha,
      cancelCaptcha,
    ],
  );
}

// v1.4.0 — finish asks GET /auth/captcha first (server v0.15.0): a named provider raises
//          CaptchaSheet and its token rides the registration; captcha-required /
//          captcha-failed raise it again; `off` is the old path, unchanged.
// v1.3.0 — createAccount sends REQUIRED_CONSENTS with the registration (server v0.13.0);
//          the review screen's box is what lets it run.
// v1.2.0 — Forgot really sends (busy + a failure line); the 'reset' step opened by
//          an e-mailed link spends the token and signs the phone in (server v0.11.0).
// v1.1.0 — Phone → OTP only under PHONE_VERIFICATION_STEP (= DEMO_MODE); otherwise
//          phone → first profile step, number kept as unverified (D2).
// v1.0.0 — The onboarding wizard's hook: draft, step transitions, submission.
