/* ==================================================================
   useTwoFactor — Settings → Account → "Two-factor sign-in" (server
   v0.24.0, LAUNCH_PLAN 5.5). The mobile twin of the web hook of the
   same name.

   Not in the auth slice on purpose: the setup (a pending secret, the
   recovery codes shown once) has the lifetime of one open sheet and is
   thrown away with it — a global store entry would keep a secret alive
   longer than the sheet does. The one fact that outlives the sheet, "is
   the factor on", is pushed to the principal (`totpEnabledChanged`) so
   the Settings row says so at once.
   ================================================================== */

import { useCallback, useMemo, useState } from 'react';
import { AuthError, type AuthErrorCode, type TotpSetup, type TotpStatus } from '@cyphix/shared';
import { authService } from '@/services/auth/authService';
import { useAppDispatch } from '@/store/hooks';
import { totpEnabledChanged } from './authSlice';

export type TwoFactorPhase = 'idle' | 'loading' | 'success' | 'error';

const codeOf = (err: unknown): AuthErrorCode => (err instanceof AuthError ? err.code : 'unknown');

export function useTwoFactor() {
  const dispatch = useAppDispatch();
  const [phase, setPhase] = useState<TwoFactorPhase>('idle');
  const [status, setStatus] = useState<TotpStatus | null>(null);
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  /** A request in flight on an already-loaded sheet (enable / disable). */
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setPhase('loading');
    setError(null);
    try {
      setStatus(await authService.totpStatus());
      setPhase('success');
    } catch (err) {
      setError(codeOf(err));
      setPhase('error');
    }
  }, []);

  /** A fresh pending secret. Nothing is enforced until `enable`. */
  const beginSetup = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setSetup(await authService.totpSetup());
    } catch (err) {
      setError(codeOf(err));
    } finally {
      setBusy(false);
    }
  }, []);

  /** The app's code proves it holds the secret; the factor turns on and
      the recovery codes come back ONCE. Rejects with `totp-invalid`. */
  const enable = useCallback(
    async (code: string): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        const r = await authService.totpEnable({ code });
        setRecoveryCodes(r.recoveryCodes);
        setSetup(null);
        setStatus({
          enabled: true,
          enabledAt: r.enabledAt,
          recoveryCodesLeft: r.recoveryCodes.length,
          eligible: true,
        });
        dispatch(totpEnabledChanged(true));
        return true;
      } catch (err) {
        setError(codeOf(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [dispatch],
  );

  /** The password AND a code (or a recovery code). */
  const disable = useCallback(
    async (password: string, code: string): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        await authService.totpDisable({ password, code });
        setStatus((s) => ({
          enabled: false,
          enabledAt: null,
          recoveryCodesLeft: 0,
          eligible: s?.eligible ?? true,
        }));
        dispatch(totpEnabledChanged(false));
        return true;
      } catch (err) {
        setError(codeOf(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [dispatch],
  );

  /** Forget the secret and the codes — on close, always. */
  const reset = useCallback(() => {
    setSetup(null);
    setRecoveryCodes(null);
    setError(null);
    setBusy(false);
    setPhase('idle');
    setStatus(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return useMemo(
    () => ({ phase, status, setup, recoveryCodes, error, busy, load, beginSetup, enable, disable, reset, clearError }),
    [phase, status, setup, recoveryCodes, error, busy, load, beginSetup, enable, disable, reset, clearError],
  );
}

// v1.0.0 — Two-factor sign-in: status / setup / enable / disable for the Settings sheet
//          (server v0.24.0, LAUNCH_PLAN 5.5).
