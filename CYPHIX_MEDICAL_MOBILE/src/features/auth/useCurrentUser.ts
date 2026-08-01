/* ==================================================================
   The current principal, and what it may do.

   ★ THE ONE FILE AUTH LANDS IN. There is no sign-in on mobile yet, so
   `DEMO_USER` below stands in for the authenticated user. Every RBAC gate
   in the app — the History viewer's tools, delete, export — is REAL code
   running against it. When `refreshSession` starts returning a real
   principal, this file reads it from the store and nothing else changes.

   The stand-in is the `clinician` role deliberately: History is the
   doctor-facing module (CYPHIX UX direction), and demoing it as a patient
   would hide the calipers, the filters, annotations and compare — i.e.
   most of what was built — behind a role nobody can currently switch out
   of. `Preview as role` (the web's demo control) is the follow-up that
   makes this switchable; it is tracked in PARITY.md.

   PII is fictitious per web CLAUDE.md §7.4 and obviously so.
   ================================================================== */

import { useMemo } from 'react';
import { roleCan, type AuthUser, type Permission, type Role } from '@/types/rbac';

/** Fictitious. `MOCK-` prefixes make that visible at a glance. */
export const DEMO_USER: AuthUser = {
  id: 'MOCK-USER-0001',
  displayName: 'Dr. Test Clinician',
  role: 'clinician',
};

export function useCurrentUser(): AuthUser | null {
  return DEMO_USER;
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

// v1.0.0 — Demo principal + can()/roleAllowed(), mirroring the web auth hooks.
