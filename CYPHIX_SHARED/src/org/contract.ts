/* ==================================================================
   Organizations — a clinic, hospital or practice as a THING with a
   status, its members with their org roles, and the team invitation
   that gets a colleague in (LAUNCH_PLAN 4.1; holes A5, A6).

   What exists on the server since v0.1.0: `organizations` (a sealed
   name) and `organization_members` (user × org × org_role), written by
   the super-admin only. What phase 4 adds, and this file names:

     • an organization REGISTERS ITSELF (`pending`) together with its
       first admin, and a super-admin approves it — the same door as a
       clinician's (auth/clinician.ts), one level up;
     • an org_admin — a MEMBERSHIP role, not a global one — reads and
       edits their organization and runs its team: list, change a role,
       remove, and INVITE a colleague by e-mail;
     • the invitation is a one-time link to the web (`/join-team`): a
       person with an account accepts it signed in; a person without one
       registers first (as a clinician through 3.7's door) and the link
       then adds the membership.

   Global `Role` (admin / clinician / technician / patient) says what a
   person may DO; `OrgRole` says what they are TO the organization. A
   clinician can be the org_admin of their own practice; a technician
   (front desk) can be one too. The server enforces both.
   ================================================================== */

import type { ConsentInput } from '../legal/documents';
import type { UserStatus } from '../auth/clinician';

/** The global role (the server's `user_role` enum; the web's and the
    phone's `Role` minus `guest`). The RBAC matrix itself is still per
    app (X3 🔁) — this is only the name a member row carries. */
export type GlobalRole = 'admin' | 'clinician' | 'technician' | 'patient';

/* ── The organization ─────────────────────────────────────────────── */

export type OrganizationType = 'clinic' | 'hospital' | 'practice';
export const ORGANIZATION_TYPES: readonly OrganizationType[] = ['clinic', 'hospital', 'practice'];

/** Mirrors `UserStatus` one level up: a self-registered organization is
    `pending` until a super-admin approves it; `suspended` ends every
    member's access to its patients (their own accounts stay). */
export type OrganizationStatus = 'pending' | 'active' | 'suspended';

/** What a member IS to the organization (server `org_role` enum, v0.1.0). */
export type OrgRole = 'org_admin' | 'clinician' | 'technician';
export const ORG_ROLES: readonly OrgRole[] = ['org_admin', 'clinician', 'technician'];

export const ORG_NAME_MAX_LENGTH = 200;
export const ORG_FIELD_MAX_LENGTH = 200;
export const ORG_TAX_ID_MAX_LENGTH = 40;

/** An organization as its members and the admin see it. The name and
    the address are sealed at rest (service key) and opened for this. */
export interface OrganizationView {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  address: string | null;
  phone: string | null;
  contactName: string | null;
  contactEmail: string | null;
  /** A public URL the organization chose; the server stores no image. */
  logoUrl: string | null;
  /** A hospital's department points at the hospital. */
  parentOrgId: string | null;
  createdAt: string;
  /** The caller's own role in it — present on `ORG_ROUTES.mine`. */
  myRole?: OrgRole;
  memberCount?: number;
}

/** `PATCH /organizations/:id` (org_admin or admin). Absent = unchanged;
    `null` clears. The type and the status are not here: the status is
    the admin's (ADMIN_ORG_ROUTES), the type is set at registration. */
export interface OrganizationPatch {
  name?: string;
  address?: string | null;
  phone?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  logoUrl?: string | null;
}

/* ── Self-registration (A5): the organization AND its first admin ──── */

/** `POST /organizations/register` (public, CAPTCHA when the policy is on).
    One transaction: the organization `pending`, the person `pending`
    with the global role they chose, and the membership `org_admin`.
    A clinician registering their own practice gives the same licence
    details as through `/auth/register-clinician`. */
export interface OrganizationRegistrationInput {
  organization: {
    name: string;
    type: OrganizationType;
    address?: string;
    phone?: string;
    /** Kept for the invoice (phase 6); sealed, shown to the admin only. */
    taxId?: string;
    contactName?: string;
    contactEmail?: string;
  };
  admin: {
    fullName: string;
    email: string;
    password: string;
    /** What the first admin IS: a doctor, or the front desk. */
    role: Extract<GlobalRole, 'clinician' | 'technician'>;
    /** Required when `role` is `clinician` (the 3.7 rule). */
    specialty?: string;
    licenseNo?: string;
  };
  consents?: ConsentInput[];
  captchaToken?: string;
}
export interface OrganizationRegistrationResult {
  status: 'pending';
  id: string;
  userId: string;
}

/* ── The team (A6) ────────────────────────────────────────────────── */

export interface OrgMemberView {
  userId: string;
  email: string;
  displayName: string;
  role: GlobalRole;
  orgRole: OrgRole;
  status: UserStatus;
  emailVerified: boolean;
  /** The clinician's speciality (`users.title`), null for the rest. */
  title: string | null;
}

/** `PATCH /organizations/:id/members/:userId` (org_admin). The last
    org_admin cannot be demoted or removed — 409. */
export interface OrgMemberPatch {
  orgRole: OrgRole;
}

export const ORG_INVITE_TTL_DAYS = 7;

/** `POST /organizations/:id/invites` (org_admin). The e-mail gets a
    one-time link; the row below is what the team screen lists. */
export interface OrgInviteInput {
  email: string;
  orgRole: OrgRole;
}
export type OrgInviteState = 'open' | 'accepted' | 'expired' | 'cancelled';
export interface OrgInviteView {
  id: string;
  email: string;
  orgRole: OrgRole;
  invitedByName: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  state: OrgInviteState;
}
export interface OrgInvitesResult {
  invites: OrgInviteView[];
}

/** `GET /organizations/invites/:token` (public): what the link's holder
    may learn before deciding — enough to sign in or register with the
    right address, nothing a stranger could use. */
export interface OrgInvitePeek {
  organizationName: string;
  orgRole: OrgRole;
  /** Masked (`m***@example.com`): the holder knows their own address. */
  email: string;
  /** Sign in, or register first? */
  accountExists: boolean;
  expiresAt: string;
}
/** `POST /organizations/invites/accept` (signed in). The signed-in
    address must be the invited one — 403 otherwise, 400 `invalid_token`
    for a dead link, 409 when already a member. */
export interface OrgInviteAcceptInput {
  token: string;
}
export interface OrgInviteAcceptResult {
  organizationId: string;
  organizationName: string;
  orgRole: OrgRole;
}

/** The web page the invitation e-mail opens (`?token=`). The web owns
    the page; the phone has no team screen (a clinician's tool, M13). */
export const ORG_INVITE_PATH = '/join-team';
export function orgInviteUrl(token: string, origin: string): string {
  return `${origin.replace(/\/+$/, '')}${ORG_INVITE_PATH}?token=${encodeURIComponent(token)}`;
}

/* ── Routes (relative to API_VERSION_PATH, like CARE_ROUTES) ──────── */

export const ORG_ROUTES = {
  /** Public. POST OrganizationRegistrationInput → 202 OrganizationRegistrationResult. */
  register: 'organizations/register',
  /** GET → OrganizationView[] with `myRole` (the caller's memberships). */
  mine: 'organizations/mine',
  /** GET → OrganizationView (member or admin) · PATCH OrganizationPatch (org_admin). */
  organization: (id: string) => `organizations/${encodeURIComponent(id)}`,
  /** GET → { members: OrgMemberView[] } (member or admin). */
  members: (id: string) => `organizations/${encodeURIComponent(id)}/members`,
  /** PATCH OrgMemberPatch · DELETE → 204 (org_admin; never the last org_admin). */
  member: (id: string, userId: string) =>
    `organizations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
  /** GET → OrgInvitesResult · POST OrgInviteInput → 201 OrgInviteView (org_admin). */
  invites: (id: string) => `organizations/${encodeURIComponent(id)}/invites`,
  /** DELETE → 204 (open → cancelled; accepted → 409). */
  invite: (id: string, inviteId: string) =>
    `organizations/${encodeURIComponent(id)}/invites/${encodeURIComponent(inviteId)}`,
  /** Public. GET → OrgInvitePeek, 400 `invalid_token` for a dead link. */
  invitePeek: (token: string) => `organizations/invites/${encodeURIComponent(token)}`,
  /** Signed in. POST OrgInviteAcceptInput → OrgInviteAcceptResult. */
  inviteAccept: 'organizations/invites/accept',
} as const;

/* ── The super-admin's side (the cockpit, phase 5, extends these) ─── */

export interface PendingOrganizationView extends OrganizationView {
  taxId: string | null;
  adminName: string;
  adminEmail: string;
  submittedAt: string;
}
/** `PATCH /admin/organizations/:id/status`. `active` approves (and
    activates the pending first admin); `suspended` ends the members'
    access to its patients. */
export interface OrganizationStatusPatch {
  status: Exclude<OrganizationStatus, 'pending'>;
  note?: string;
}
export const ADMIN_ORG_ROUTES = {
  /** GET ?status= → { items: PendingOrganizationView[] }. */
  organizations: 'admin/organizations',
  organizationStatus: (id: string) => `admin/organizations/${encodeURIComponent(id)}/status`,
} as const;

// v1.0.0 — OrganizationView / Patch / Registration (A5), the team: OrgMemberView,
//          OrgMemberPatch, the e-mail invitation (input, view, peek, accept, the
//          /join-team page) (A6), ORG_ROUTES + ADMIN_ORG_ROUTES (LAUNCH_PLAN 4.1).
