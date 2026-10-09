/* ==================================================================
   The clinic portal's contract (LAUNCH_PLAN phase 3; server v0.17.0).

   Three things a clinician's screens need that the server did not
   yet say, each defined here FIRST (root CLAUDE.md §2.1):

     • PatientSummary — a patient as a LIST sees them: a name, an age,
       when they last recorded, whether a request is waiting. Not the
       FHIR resource (the old `GET /patients` keeps returning that;
       this is a second, minimized route — A10).
     • RequestView — a consult request as an ENTITY with a status and
       an assignee (A9). Until now a request was a message with a
       reason, and nobody could change where it stood.
     • NotificationView — "a patient recorded", "the doctor answered",
       as references to things, never their contents (A11).

   Pagination (A22): every list here is `PagedResult<T>` and takes
   `limit` / `offset` as query params. One shape, so a screen written
   for one list works for the next.
   ================================================================== */

import type { CareConnectionKind, CodedItem } from '../types/patient';
import type { AdministrativeGender } from '../auth/contract';
import type { ChatAttachment, ChatMessage } from '../care/messages';

/* ── Pagination ───────────────────────────────────────────────────── */

export interface PagedResult<T> {
  items: T[];
  /** How many match in all, so a screen can say "12 of 340". */
  total: number;
  limit: number;
  offset: number;
}

export const LIST_LIMIT_DEFAULT = 50;
export const LIST_LIMIT_MAX = 200;

/* ── Patients, as a list ──────────────────────────────────────────── */

export interface PatientSummary {
  id: string;
  displayName: string;
  gender?: AdministrativeGender;
  ageYears?: number;
  /** Business identifier, when the resource has one. Never a real MRN. */
  mrn?: string;
  /** How this patient is linked to the asker: 1:1 or through the clinic. */
  careKind: CareConnectionKind;
  relationshipId: string;
  /** ISO — when the patient redeemed the code. */
  linkedAt: string;
  /** Clinic links only: who follows this patient. */
  assignedClinicianName: string | null;
  recordingCount: number;
  lastRecordingAt: string | null;
  /** Requests not yet answered or closed. */
  openRequests: number;
}

/** `GET /patients/summary?limit&offset&q` (staff; `q` filters on the
    name). The caller's patients only — the same scope as everything
    else; admin sees all. */
export const PATIENT_SUMMARY_ROUTE = 'patients/summary';

/* ── Requests ─────────────────────────────────────────────────────── */

export type RequestStatus = 'new' | 'in-progress' | 'answered' | 'closed';
export const REQUEST_STATUSES: readonly RequestStatus[] = ['new', 'in-progress', 'answered', 'closed'];

/**
 * The request state machine, as pure data (X5): which moves are legal.
 * `answered` is reached by a REPLY (the server sets it); staff may also
 * mark it by hand. `closed` is final but may be reopened. The server
 * refuses anything not listed here with 409; the UI greys it out.
 */
export const REQUEST_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  new: ['in-progress', 'answered', 'closed'],
  'in-progress': ['new', 'answered', 'closed'],
  answered: ['in-progress', 'closed'],
  closed: ['in-progress'],
};

export function canTransitionRequest(from: RequestStatus, to: RequestStatus): boolean {
  return from !== to && REQUEST_TRANSITIONS[from].includes(to);
}

/** Open = still waiting for care: `new` or `in-progress`. */
export const OPEN_REQUEST_STATUSES: readonly RequestStatus[] = ['new', 'in-progress'];
export const isOpenRequest = (s: RequestStatus): boolean => OPEN_REQUEST_STATUSES.includes(s);

export interface RequestView {
  id: string;
  patientId: string;
  patientName: string;
  relationshipId: string;
  kind: CareConnectionKind;
  reason?: CodedItem;
  /** What the patient wrote with it. */
  text?: string;
  attachment?: ChatAttachment;
  /** ISO — when the patient sent it. */
  openedAt: string;
  status: RequestStatus;
  assignedToId: string | null;
  assignedToName: string | null;
  updatedAt: string;
  answeredAt: string | null;
  /** Messages that followed the request in its thread. */
  replyCount: number;
}

/** `GET /requests/:id` — the request with its whole thread, so the
    inbox can read and answer in place. */
export interface RequestDetail extends RequestView {
  messages: ChatMessage[];
}

/** `PATCH /requests/:id` (staff). A status move must be legal
    (`canTransitionRequest`); an assignee must be a clinician who may
    see the patient. `null` unassigns. */
export interface RequestPatch {
  status?: RequestStatus;
  assignedToId?: string | null;
}

/** `POST /requests/:id/reply` (staff): a message into the thread; the
    request becomes `answered` and the patient is notified. */
export interface RequestReplyInput {
  text: string;
  attachment?: ChatAttachment;
}

export interface RequestsQuery {
  /** A status, or `open` for new + in-progress. Absent = all. */
  status?: RequestStatus | 'open';
  patientId?: string;
  limit?: number;
  offset?: number;
}

export const REQUEST_ROUTES = {
  /** GET RequestsQuery → PagedResult<RequestView>. Staff: across their
      patients; a patient: their own. */
  list: 'requests',
  /** GET → RequestDetail · PATCH RequestPatch → RequestView (409 for an
      illegal move). */
  request: (id: string) => `requests/${encodeURIComponent(id)}`,
  /** POST RequestReplyInput → ChatMessage (201). */
  reply: (id: string) => `requests/${encodeURIComponent(id)}/reply`,
} as const;

/* ── Notifications ────────────────────────────────────────────────── */

export type NotificationKind =
  /** A patient of yours opened a request (staff). */
  | 'request:new'
  /** Your request was answered (patient). */
  | 'request:answered'
  /** Your request's status changed (patient). */
  | 'request:status'
  /** A patient of yours filed a recording (staff). */
  | 'recording:new'
  /** A patient redeemed your code (staff), or you were linked (patient). */
  | 'care:linked'
  /** The other side ended the link. */
  | 'care:revoked'
  /** An organization registered itself (super-admin) / was approved (its
      first admin) / a colleague accepted a team invitation (its
      org_admins) — LAUNCH_PLAN 4.1. */
  | 'org:pending'
  | 'org:approved'
  | 'team:joined'
  /** A clinician registered and awaits review (admins; server v0.18.0). */
  | 'clinician:pending'
  /** Your account was approved (the clinician). */
  | 'account:approved'
  /** Billing (server v0.25.0): a period closed and an invoice is out (the
      org's admins / the clinician); the subscription fell past due. */
  | 'invoice:issued'
  | 'subscription:past_due';

/** References only — the audit rule. The words are the client's, from
    the kind and the names it already has. */
export interface NotificationView {
  id: string;
  kind: NotificationKind;
  createdAt: string;
  readAt: string | null;
  patientId: string | null;
  resourceType: 'Request' | 'Recording' | 'CareRelationship' | 'User' | 'Organization' | null;
  resourceId: string | null;
  /** The other party's display name, resolved when read — not stored. */
  actorName: string | null;
}

export interface NotificationsResult {
  items: NotificationView[];
  /** Unread in all, not only on this page. */
  unread: number;
}

export const NOTIFICATION_ROUTES = {
  /** GET ?limit&offset&unread=1 → NotificationsResult. */
  list: 'notifications',
  /** POST → NotificationView (read now). */
  read: (id: string) => `notifications/${encodeURIComponent(id)}/read`,
  /** POST → { read: number }. */
  readAll: 'notifications/read-all',
} as const;

/* ── Permissions the portal needs (X3) ────────────────────────────── */

/**
 * The matrix itself is NOT unified here — that is a 🔁 (three copies:
 * web, mobile, server) deferred for approval. These are the NAMES the
 * portal's guards use, added to each copy the same way, so the day the
 * matrix moves here nothing has to be renamed.
 */
export const CLINIC_PERMISSIONS = [
  'request:read',
  'request:manage',
  'invite:create',
  'notification:read',
] as const;
export type ClinicPermission = (typeof CLINIC_PERMISSIONS)[number];

// v1.3.0 — NotificationKind gains 'invoice:issued' / 'subscription:past_due' (billing, 6.1).
// v1.2.0 — NotificationKind gains 'org:pending' / 'org:approved' / 'team:joined'; resourceType
//          gains 'Organization' (LAUNCH_PLAN 4.1).
// v1.1.0 — NotificationKind gains 'clinician:pending' / 'account:approved'; resourceType
//          gains 'User' (server v0.18.0, LAUNCH_PLAN 3.7).
// v1.0.0 — PatientSummary + PATIENT_SUMMARY_ROUTE, the request entity (status machine,
//          RequestView / Detail / Patch / Reply, REQUEST_ROUTES), notifications,
//          PagedResult, the portal's permission names (LAUNCH_PLAN 3.1).
