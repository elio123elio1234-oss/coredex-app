/* ==================================================================
   useAuth — the ONE way a screen touches sign-in. Mirrors the web hook
   of the same name: components dispatch nothing themselves, they call
   these.

   The error is exposed as a CODE, not a sentence: mapping a failure to
   words is the locale's job, and a raw message from a future server must
   never reach a patient (web CLAUDE.md §9).
   ================================================================== */

import { useCallback, useMemo } from 'react';
import type {
  Credentials,
  EmailChangeConfirmInput,
  EmailChangeInput,
  EmailVerifyInput,
  PasswordChangeInput,
  PasswordResetInput,
  RegistrationInput,
  TotpLoginInput,
} from '@cyphix/shared';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  changePassword as changePasswordThunk,
  clearAuthError,
  confirmEmailChange as confirmEmailChangeThunk,
  loginUser,
  loginTotp as loginTotpThunk,
  logoutUser,
  registerUser,
  requestEmailChange as requestEmailChangeThunk,
  requestEmailVerification as requestEmailVerificationThunk,
  resetPassword as resetPasswordThunk,
  totpChallengeCancelled,
  verifyEmail as verifyEmailThunk,
} from './authSlice';

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, profile, status, error, totpChallenge } = useAppSelector((s) => s.auth);

  const login = useCallback(
    (credentials: Credentials) => dispatch(loginUser(credentials)).unwrap(),
    [dispatch],
  );

  /* Two-factor (server v0.24.0): the code step spends the parked
     challenge, or drops it. */
  const loginTotp = useCallback(
    (input: TotpLoginInput) => dispatch(loginTotpThunk(input)).unwrap(),
    [dispatch],
  );
  const cancelTotp = useCallback(() => {
    dispatch(totpChallengeCancelled());
  }, [dispatch]);

  const register = useCallback(
    (input: RegistrationInput) => dispatch(registerUser(input)).unwrap(),
    [dispatch],
  );

  const logout = useCallback(() => dispatch(logoutUser()).unwrap(), [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  /* Account recovery (server v0.11.0). `unwrap()` rejects with the
     AuthErrorCode, so a screen can tell 'invalid-link' from the rest. */
  const resetPassword = useCallback(
    (input: PasswordResetInput) => dispatch(resetPasswordThunk(input)).unwrap(),
    [dispatch],
  );
  const verifyEmail = useCallback(
    (input: EmailVerifyInput) => dispatch(verifyEmailThunk(input)).unwrap(),
    [dispatch],
  );
  const requestEmailVerification = useCallback(
    () => dispatch(requestEmailVerificationThunk()).unwrap(),
    [dispatch],
  );

  /* Account self-service (server v0.12.0). Sessions are not here: they
     are a list with its own loading state — see useSessions. */
  const changePassword = useCallback(
    (input: PasswordChangeInput) => dispatch(changePasswordThunk(input)).unwrap(),
    [dispatch],
  );
  const requestEmailChange = useCallback(
    (input: EmailChangeInput) => dispatch(requestEmailChangeThunk(input)).unwrap(),
    [dispatch],
  );
  const confirmEmailChange = useCallback(
    (input: EmailChangeConfirmInput) => dispatch(confirmEmailChangeThunk(input)).unwrap(),
    [dispatch],
  );

  return useMemo(
    () => ({
      user,
      profile,
      status,
      error,
      totpChallenge,
      isSignedIn: user !== null,
      isBusy: status === 'loading',
      login,
      loginTotp,
      cancelTotp,
      register,
      logout,
      clearError,
      resetPassword,
      verifyEmail,
      requestEmailVerification,
      changePassword,
      requestEmailChange,
      confirmEmailChange,
    }),
    [
      user,
      profile,
      status,
      error,
      totpChallenge,
      login,
      loginTotp,
      cancelTotp,
      register,
      logout,
      clearError,
      resetPassword,
      verifyEmail,
      requestEmailVerification,
      changePassword,
      requestEmailChange,
      confirmEmailChange,
    ],
  );
}

// v1.3.0 — loginTotp / cancelTotp / totpChallenge (two-factor sign-in, server v0.24.0).
// v1.2.0 — changePassword / requestEmailChange / confirmEmailChange (account self-service).
// v1.1.0 — resetPassword / verifyEmail / requestEmailVerification (account recovery).
// v1.0.0 — Sign-in/registration hook (the only auth surface a screen sees).
