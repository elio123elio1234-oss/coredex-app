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
import type { AuthErrorCode } from '@cyphix/shared';
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
  /** True once the reset e-mail has been "sent" on the forgot screen. */
  resetSent: boolean;
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
  resendCode: () => void;
  finish: () => void;
}

export function useOnboarding(): Onboarding {
  const [draft, dispatch] = useReducer(onboardingReducer, EMPTY_DRAFT);
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [issue, setIssue] = useState<StepIssue | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const { login, register, error, clearError, isBusy } = useAuth();

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
  const createAccount = useCallback(async () => {
    try {
      await register(toRegistrationInput(draft));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('success');
    } catch {
      /* The code is in the slice. Both failures that can land here
         (address taken, password rejected) are about the credentials, so
         that is the step to be standing on when reading the message. */
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStep('signup');
    }
  }, [draft, register]);

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
    if (!canContinue('forgot', draft)) return;
    void authService.requestPasswordReset(draft.email).then(() => setResetSent(true));
  }, [draft]);

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
      devCode,
      patch,
      pressKey,
      go,
      back,
      next,
      skip,
      submitSignIn,
      sendReset,
      resendCode,
      finish: () => void createAccount(),
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
      devCode,
      patch,
      pressKey,
      go,
      back,
      next,
      skip,
      submitSignIn,
      sendReset,
      resendCode,
      createAccount,
    ],
  );
}

// v1.0.0 — The onboarding wizard's hook: draft, step transitions, submission.
