/* ==================================================================
   useSessions — the "Devices & sessions" list (server v0.12.0). The
   mobile twin of the web hook of the same name.

   Not in the auth slice on purpose: it is a list with a lifetime of one
   open sheet, loaded when asked and thrown away after. Async is modelled
   the house way — idle | loading | success | error — and screens call
   these, never the service.
   ================================================================== */

import { useCallback, useState } from 'react';
import { AuthError, type AuthErrorCode, type SessionView } from '@cyphix/shared';
import { authService } from '@/services/auth/authService';

export type SessionsStatus = 'idle' | 'loading' | 'success' | 'error';

export function useSessions() {
  const [status, setStatus] = useState<SessionsStatus>('idle');
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  /** A revoke in flight — distinct from `loading`, so the list stays on
      screen while one row is being signed out. */
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      setSessions(await authService.listSessions());
      setStatus('success');
    } catch (err) {
      setError(err instanceof AuthError ? err.code : 'unknown');
      setStatus('error');
    }
  }, []);

  const revoke = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await authService.revokeSession(id);
        await load();
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const revokeOthers = useCallback(async () => {
    setBusy(true);
    try {
      const n = await authService.revokeOtherSessions();
      await load();
      return n;
    } finally {
      setBusy(false);
    }
  }, [load]);

  return { status, sessions, error, busy, load, revoke, revokeOthers };
}

// v1.0.0 — Devices & sessions: list, revoke one, revoke all others (server v0.12.0).
