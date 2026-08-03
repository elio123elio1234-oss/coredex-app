/* ==================================================================
   The current principal, and what it may do.

   ★ THE FILE AUTH LANDS IN — and, since v0.20.0, the file that stops
   guessing when there is a server to ask.

   ── Two modes, and the reason they differ ──
   • CONNECTED (`EXPO_PUBLIC_API_BASE_URL` set): the principal is the
     SIGNED-IN ACCOUNT, role included. It has to be. The server enforces
     its own RBAC and row scoping on every request, so a client that
     pretends to be a clinician while the server knows it is a patient
     draws a toolbar of buttons whose requests come back 403 — the worst
     of both worlds: nothing is unlocked and everything looks broken.
     `linkedPatientId` matters just as much: it is what makes a recording
     saved on this phone belong to the same Patient the web app opens.
   • OFFLINE (no URL): `DEMO_USER`, a fictitious clinician. With no server
     there is no authority to defer to, and demoting the demo to `patient`
     would hide most of Scan History — calipers, filters, annotations,
     compare — behind a role nobody could switch out of. The offline demo
     is a showcase; showing it as a clinician is the whole point.

   The previous version returned DEMO_USER unconditionally and said so
   loudly; that was right while every account was device-local. It stops
   being right the moment a real server answers, which is exactly when
   this switches over.

   PII in the demo principal is fictitious per web CLAUDE.md §7.4 and
   obviously so.
   ================================================================== */

import { useMemo } from 'react';
import { ENV } from '@/config/env';
import { useAppSelector } from '@/store/hooks';
import { roleCan, type AuthUser, type Permission, type Role } from '@/types/rbac';

/** Fictitious. `MOCK-` prefixes make that visible at a glance. */
export const DEMO_USER: AuthUser = {
  id: 'MOCK-USER-0001',
  displayName: 'Dr. Test Clinician',
  role: 'clinician',
};

export function useCurrentUser(): AuthUser | null {
  const sessionUser = useAppSelector((s) => s.auth.user);

  return useMemo(() => {
    if (!ENV.hasBackend) return DEMO_USER;
    if (!sessionUser) return null;
    /* Projected, not spread: the slice's user is the server's answer and
       may grow fields the RBAC layer has no business seeing (data
       minimization, web CLAUDE.md §7.3). */
    return {
      id: sessionUser.id,
      displayName: sessionUser.displayName,
      role: sessionUser.role,
      linkedPatientId: sessionUser.linkedPatientId,
    };
  }, [sessionUser]);
}

export interface Permissions {
  user: AuthUser | null;
  can: (permission: Permission) => boolean;
  roleAllowed: (allow: readonly Role[]) => boolean;
}

export function usePermissions(): Permissions {
  const user = useCurrentUser();
  return useMemo(
    () => ({
      user,
      can: (permission: Permission) => (user ? roleCan(user.role, permission) : false),
      roleAllowed: (allow: readonly Role[]) => (user ? allow.includes(user.role) : false),
    }),
    [user],
  );
}

// v2.0.0 — Connected mode uses the REAL signed-in principal (role + linked
//          patient) so the client and the server agree on who is asking; the
//          demo clinician survives only as the offline stand-in.
