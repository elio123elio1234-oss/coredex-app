/* ==================================================================
   The current principal, and what it may do.

   ★ THE ONE FILE AUTH LANDS IN — and, as of the onboarding flow, the one
   place where the app KNOWS BETTER and says so.

   There IS a real signed-in account now (`features/auth/authSlice`), and
   its role is `patient`. This file still answers with `DEMO_USER`, a
   clinician, ON PURPOSE: every viewer tool in Scan History — calipers,
   filters, annotations, compare, export — is gated on clinician
   permissions, so wiring the RBAC principal to the new session would
   silently strip a finished module down to a read-only trace with no way
   to switch back. That is a decision about who this product is for, not
   a wiring detail, and it is not one to make as a side effect of adding
   a login screen.

   The swap is one line here once "preview as role" exists (the web's
   demo control). Tracked in PARITY.md. Until then:
     • WHO the patient is (name, profile) comes from `useAuth()` and is
       real — that is what the greeting and Settings show.
     • WHAT they may do comes from here and is the demo clinician.

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

// v1.1.0 — Unchanged behaviour, now a DELIBERATE divergence: a real session
//          exists, but the RBAC principal stays the demo clinician so History's
//          tools remain reachable. See the header and PARITY.md.
