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
  EmailVerifyInput,
  PasswordResetInput,
  RegistrationInput,
} from '@cyphix/shared';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearAuthError,
  loginUser,
  logoutUser,
  registerUser,
  requestEmailVerification as requestEmailVerificationThunk,
  resetPassword as resetPasswordThunk,
  verifyEmail as verifyEmailThunk,
} from './authSlice';

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, profile, status, error } = useAppSelector((s) => s.auth);

  const login = useCallback(
    (credentials: Credentials) => dispatch(loginUser(credentials)).unwrap(),
    [dispatch],
  );

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

  return useMemo(
    () => ({
      user,
      profile,
      status,
      error,
      isSignedIn: user !== null,
      isBusy: status === 'loading',
      login,
      register,
      logout,
      clearError,
      resetPassword,
      verifyEmail,
      requestEmailVerification,
    }),
    [
      user,
      profile,
      status,
      error,
      login,
      register,
      logout,
      clearError,
      resetPassword,
      verifyEmail,
      requestEmailVerification,
    ],
  );
}

// v1.1.0 — resetPassword / verifyEmail / requestEmailVerification (account recovery).
// v1.0.0 — Sign-in/registration hook (the only auth surface a screen sees).
