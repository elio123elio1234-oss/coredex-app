/* ==================================================================
   Clinician self-registration (LAUNCH_PLAN 3.7; holes A4, A21;
   decision D3 — a clinician is approved BY HAND before they can sign
   in). Server v0.18.0.

   A clinician registers like a patient — name, address, password, the
   consents — plus what a reviewer needs: a speciality and a licence
   number. The account is created `pending` and NO session is issued:
   until an admin flips it to `active`, sign-in answers 401
   `account_pending` (only after the password verified — a stranger
   learns nothing). Approval is an admin route (the cockpit's queue is
   phase 5; until then the API), and the person is told by e-mail and
   by a notification.
   ================================================================== */

import type { ConsentInput } from '../legal/documents';

/** `users.status` (X2). Every account before v0.18.0 is `active`. */
export type UserStatus = 'pending' | 'active' | 'suspended';

export interface ClinicianRegistrationInput {
  fullName: string;
  email: string;
  password: string;
  /** What the card and the portal show as the clinician's role —
      "Cardiologist", "General practitioner". Free text, ≤ 120. */
  specialty: string;
  /** The professional licence number. Sealed at rest; shown to the
      reviewing admin only. */
  licenseNo: string;
  consents?: ConsentInput[];
  captchaToken?: string;
}

/** `POST /auth/register-clinician` → 202. No tokens: nothing to sign in to yet. */
export interface ClinicianRegistrationResult {
  status: 'pending';
  id: string;
}

export const LICENSE_NO_MAX_LENGTH = 40;
export const SPECIALTY_MAX_LENGTH = 120;

/** What an admin reviews (`GET /admin/users?status=pending`). */
export interface PendingClinicianView {
  id: string;
  email: string;
  displayName: string;
  specialty: string | null;
  licenseNo: string;
  submittedAt: string;
  emailVerified: boolean;
}

/** `PATCH /admin/users/:id/status` (admin). `active` approves a pending
    account; `suspended` ends sign-in for any account; `pending` is not
    a destination. */
export interface UserStatusPatch {
  status: Exclude<UserStatus, 'pending'>;
  /** Kept with the review, never shown to the person. */
  note?: string;
}

export const ADMIN_ROUTES = {
  /** GET ?status=pending → { items: PendingClinicianView[] }. */
  users: 'admin/users',
  /** PATCH UserStatusPatch → { id, status }. */
  userStatus: (id: string) => `admin/users/${encodeURIComponent(id)}/status`,
} as const;

// v1.0.0 — UserStatus, ClinicianRegistrationInput / Result, PendingClinicianView,
//          UserStatusPatch, ADMIN_ROUTES (server v0.18.0, LAUNCH_PLAN 3.7).
