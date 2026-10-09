/* ==================================================================
   The admin cockpit (LAUNCH_PLAN phase 5; §2.2; hole A17) — what the
   super-admin's screens ask, as one contract: the overview's numbers,
   the people (staff and patients) as rows with queries, every request
   in the system with its age against the SLA, the audit trail as pages
   (and a capped CSV), and what the system itself reports.

   Two rules carried from the plan's decisions:
     • D4 — the admin sees a request's METADATA (who, where, when, what
       state), never its text or its reason's free text;
     • a patient's full card opens for an admin ONLY with a stated
       reason, and the reason is audited with the read (§2.2 Patients).

   The approval queues (a clinician, a clinic) are the ones phase 3 and
   phase 4 already serve: `ADMIN_ROUTES` (auth/clinician.ts) and
   `ADMIN_ORG_ROUTES` (org/contract.ts). This file names the rest.
   ================================================================== */

import type { UserStatus } from '../auth/clinician';
import type { PagedResult, RequestStatus, RequestView } from '../clinic/contract';
import type { GlobalRole, OrganizationStatus, OrganizationType, OrgRole } from '../org/contract';
import type { CareConnectionKind } from '../types/patient';

/* ── Overview ─────────────────────────────────────────────────────── */

/** A request older than this and still open is "overdue" (§2.2). */
export const REQUEST_SLA_HOURS = 48;
/** The overview's daily series covers this many days, oldest first. */
export const OVERVIEW_DAYS = 30;

export interface AdminOverviewStats {
  generatedAt: string;
  organizations: { total: number; pending: number; active: number; suspended: number };
  staff: { admins: number; clinicians: number; technicians: number; pendingClinicians: number };
  /** `linked` = with at least one active care link. */
  patients: { total: number; linked: number };
  recordings: { total: number; last7d: number; last30d: number };
  requests: { open: number; overdue: number; answered30d: number };
  /** One point per day, zero-filled, oldest first (`day` = yyyy-mm-dd). */
  recordingsPerDay: Array<{ day: string; count: number }>;
  /** What needs a human today. */
  attention: {
    pendingClinicians: number;
    pendingOrganizations: number;
    overdueRequests: number;
    /** v1.1.0 (server v0.23.0): leads not yet contacted, tickets not yet
        answered. Optional on the wire — an older server sends neither. */
    newLeads?: number;
    openSupport?: number;
    /** v1.2.0 (server v0.25.0): subscriptions past due. Optional. */
    pastDue?: number;
  };
  /** v1.1.0: the two doors of contact/contract.ts, counted. Optional. */
  contact?: { leads: number; newLeads: number; tickets: number; openSupport: number };
  /** v1.2.0 (server v0.25.0): the money, from billing/contract.ts — the
      forecast of the live subscriptions' next invoices (MRR), what is
      issued and unpaid, and the subscriptions by state. Optional. */
  billing?: { mrrMinor: number; outstandingMinor: number; trial: number; active: number; pastDue: number };
}

/* ── People ───────────────────────────────────────────────────────── */

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  role: GlobalRole;
  status: UserStatus;
  emailVerified: boolean;
  /** A clinician's speciality (`users.title`), null for the rest. */
  title: string | null;
  organizations: Array<{ id: string; name: string; orgRole: OrgRole }>;
  /** Patients their links reach (0 for admins and for the front desk). */
  patientCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}
export interface AdminUsersQuery {
  role?: Exclude<GlobalRole, 'patient'>;
  status?: UserStatus;
  /** Name or e-mail, case-insensitive. */
  q?: string;
  limit?: number;
  offset?: number;
}

export interface AdminPatientRow {
  id: string;
  displayName: string;
  ageYears?: number;
  gender?: string;
  mrn?: string;
  /** Who follows them — names only (§2.2 Patients). */
  care: Array<{ kind: CareConnectionKind; name: string }>;
  recordingCount: number;
  lastRecordingAt: string | null;
  createdAt: string;
  /** false once erased (crypto-shredded) or scheduled for deletion. */
  active: boolean;
}
export interface AdminPatientsQuery {
  /** Name, e-mail or MRN. */
  q?: string;
  limit?: number;
  offset?: number;
}

export const PATIENT_VIEW_REASON_MIN_LENGTH = 5;
export const PATIENT_VIEW_REASON_MAX_LENGTH = 200;
/** `POST /admin/patients/:id/view` — the full card, for a stated reason
    that is audited with the read (`patient:read`, detail = the reason). */
export interface AdminPatientViewInput {
  reason: string;
}

/* ── Requests across the system (D4: metadata only) ───────────────── */

/** A request as the admin sees it: `text` and `reason.display` are
    NOT here — the clinic's inbox has them; the admin has who, where and
    how long. */
export interface AdminRequestRow
  extends Omit<RequestView, 'text' | 'reason' | 'attachment' | 'patientName'> {
  /** The patient, as a name only. */
  patientName: string;
  /** Where it went: the clinic's name, or the private doctor's. */
  target: string;
  ageHours: number;
  overdue: boolean;
}
export interface AdminRequestsQuery {
  status?: RequestStatus | 'open';
  overdue?: boolean;
  limit?: number;
  offset?: number;
}

/* ── Audit ────────────────────────────────────────────────────────── */

export type AuditOutcome = 'success' | 'failure';
export interface AuditRow {
  id: number;
  ts: string;
  actorUserId: string | null;
  /** Resolved when read — not stored. */
  actorName: string | null;
  actorRole: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  outcome: AuditOutcome;
  detail: string | null;
  ip: string | null;
}
export interface AuditQuery {
  actorId?: string;
  /** A prefix, so `care:` finds every care action. */
  action?: string;
  resourceType?: string;
  resourceId?: string;
  outcome?: AuditOutcome;
  /** ISO timestamps, inclusive. */
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}
export type AuditResult = PagedResult<AuditRow>;
/** `GET /admin/audit.csv` stops here, newest first, and says so in the last line. */
export const AUDIT_EXPORT_MAX_ROWS = 5000;

/* ── System ───────────────────────────────────────────────────────── */

export interface AdminSystemInfo {
  generatedAt: string;
  serverVersion: string;
  demoMode: boolean;
  email: 'on' | 'off';
  captcha: 'turnstile' | 'off';
  webOrigin: string;
  uptimeSec: number;
  dbSizeBytes: number | null;
  migrations: { count: number; latest: string | null };
  outbox: { pending: number; failed: number };
}

/* ── Organizations, as the admin lists them ───────────────────────── */

export interface AdminOrganizationRow {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  memberCount: number;
  patientCount: number;
  recordings30d: number;
  createdAt: string;
}

/* ── Routes (relative to API_VERSION_PATH; all behind the admin guard) ── */

export const ADMIN_COCKPIT_ROUTES = {
  /** GET → AdminOverviewStats. */
  overview: 'admin/stats/overview',
  /** GET AdminUsersQuery → PagedResult<AdminUserRow> (the status queue
      of 3.7 is `?status=pending`). */
  users: 'admin/users',
  /** PATCH UserStatusPatch (auth/clinician.ts). */
  userStatus: (id: string) => `admin/users/${encodeURIComponent(id)}/status`,
  /** GET AdminPatientsQuery → PagedResult<AdminPatientRow>. */
  patients: 'admin/patients',
  /** POST AdminPatientViewInput → the patient card (audited with the reason). */
  patientView: (id: string) => `admin/patients/${encodeURIComponent(id)}/view`,
  /** GET AdminRequestsQuery → PagedResult<AdminRequestRow>. */
  requests: 'admin/requests',
  /** GET ?status= → { items: PendingOrganizationView[] } (org/contract.ts) ·
      the cockpit's list with counts is `organizationsList`. */
  organizations: 'admin/organizations',
  /** GET → PagedResult<AdminOrganizationRow>. */
  organizationsList: 'admin/organizations/list',
  organizationStatus: (id: string) => `admin/organizations/${encodeURIComponent(id)}/status`,
  /** GET AuditQuery → AuditResult. */
  audit: 'admin/audit',
  /** GET AuditQuery → text/csv, capped at AUDIT_EXPORT_MAX_ROWS. */
  auditCsv: 'admin/audit.csv',
  /** GET → AdminSystemInfo. */
  system: 'admin/system',
} as const;

// v1.2.0 — attention.pastDue + the `billing` block (MRR, outstanding, subscriptions by state) — 6.1.
// v1.1.0 — attention.newLeads / openSupport + the `contact` block (leads & support, 5.4).
// v1.0.0 — The cockpit's contract: overview stats, users / patients / requests rows and
//          queries, the reason-gated patient view, audit rows + query + CSV cap, system
//          info, the organizations row, ADMIN_COCKPIT_ROUTES (LAUNCH_PLAN 5.1).
