/* ==================================================================
   useAuth — the ONE way a screen touches sign-in. Mirrors the web hook
   of the same name: components dispatch nothing themselves, they call
   these.

   The error is exposed as a CODE, not a sentence: mapping a failure to
   words is the locale's job, and a raw message from a future server must
   never reach a patient (web CLAUDE.md §9).
   ================================================================== */

import { useCallback, useMemo } from 'react';
import type { Credentials, RegistrationInput } from '@cyphix/shared';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAuthError, loginUser, logoutUser, registerUser } from './authSlice';

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
    }),
    [user, profile, status, error, login, register, logout, clearError],
  );
}

// v1.0.0 — Sign-in/registration hook (the only auth surface a screen sees).
