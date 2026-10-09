/* ==================================================================
   Care links — how a patient and their care are connected, as every
   platform must see it (LAUNCH_PLAN phase 2; server v0.16.0).

   THE MODEL (server `care_relationships` + `invite_tokens`, unchanged
   since the first schema): a clinician or a clinic mints a one-time
   CODE; the patient redeems it; redemption IS the recorded consent;
   either side can revoke. What phase 2 adds is the UI for it on every
   platform, and the few facts the UI needs that the server did not yet
   say: what state an invite is in, who in a clinic will follow the
   patient, a label on an invite so a list of them is legible, and the
   link a QR code carries.

   Two views, one per side of the link:
     • CareRelationshipView — a link as the patient sees it ("my care
       team") and as staff see it ("my patients"): the OTHER party is
       `counterpart*`, whichever side is asking.
     • InviteSummary — an invite as the staff who minted it see it. The
       code itself is NEVER in a list: it is returned exactly once, at
       creation, and stored only as a hash.
   ================================================================== */

import { WEB_ORIGIN_DEFAULT } from '../legal/documents';
import type { CareConnectionKind } from '../types/patient';

export type CareRelationshipStatus = 'invited' | 'active' | 'revoked';

export interface CareRelationshipView {
  id: string;
  kind: CareConnectionKind;
  status: CareRelationshipStatus;
  patientId: string;
  /** The other party's name: the clinician / clinic for a patient, the
      patient for staff. */
  counterpartName: string;
  /** Role or speciality for a clinician ("Cardiologist"), "Clinic" for a
      clinic, "Patient" for a patient — what a row's second line shows. */
  counterpartRole: string;
  /** ISO — when the patient redeemed the code (their consent). */
  consentedAt: string | null;
  createdAt: string;
  /** Clinic links only: the clinician in the clinic who follows this
      patient, when the invite named one (phase 4 lets the clinic change it). */
  assignedClinicianId: string | null;
  assignedClinicianName: string | null;
}

/** Derived server-side from the row's timestamps, so both apps agree. */
export type InviteState = 'open' | 'used' | 'expired' | 'cancelled';

export interface InviteSummary {
  id: string;
  kind: CareConnectionKind;
  /** A free label the inviter typed ("Mrs. Cohen, Tuesday") so the list
      reads as people, not ids. Sealed at rest; never shown to the patient. */
  patientHint: string | null;
  assignedClinicianId: string | null;
  assignedClinicianName: string | null;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  state: InviteState;
}

export interface InviteCreateInput {
  kind: CareConnectionKind;
  patientHint?: string;
  /** Clinic invites only; must be a member of the inviter's clinic. */
  assignedClinicianId?: string;
}

/** `POST /care/invites` → 201. The one and only time the code is sent. */
export interface InviteCreated {
  id: string;
  code: string;
  kind: CareConnectionKind;
  expiresAt: string;
  /** What a QR code or a share carries: the web URL (`careLinkUrl`),
      which any camera app opens and which offers the app on a phone. */
  link: string;
}

export interface InvitesResult {
  invites: InviteSummary[];
}

/** `POST /care/link` — the patient redeems a code. */
export interface CareLinkInput {
  code: string;
}
export interface CareLinkResult {
  id: string;
  kind: CareConnectionKind;
  status: 'active';
  counterpartName: string;
  counterpartRole: string;
}

/* ── The code ─────────────────────────────────────────────────────── */

/** No 0/O/1/I/L: a code read over the phone or off a screen must not
    have two characters that look alike. The server mints from this
    alphabet (`routes/care.ts`) — an edit here is an edit there. */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;
export const INVITE_TTL_DAYS = 7;
export const INVITE_HINT_MAX_LENGTH = 80;

/** Upper-case, and drop anything a person adds while typing or reading:
    spaces, dashes, dots. */
export function normalizeInviteCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Shape only — the server is the judge. Lets a form disable its own
    button and lets a deep link be refused before any request is made. */
export function isInviteCodeShaped(raw: string): boolean {
  const code = normalizeInviteCode(raw);
  if (code.length !== INVITE_CODE_LENGTH) return false;
  for (const ch of code) if (!INVITE_CODE_ALPHABET.includes(ch)) return false;
  return true;
}

/** `ABCDEFGH` → `ABCD-EFGH`, for showing and reading aloud. */
export function formatInviteCode(raw: string): string {
  const code = normalizeInviteCode(raw);
  return code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/* ── Routes (relative to API_VERSION_PATH, for RTK endpoints) ──────── */

export const CARE_ROUTES = {
  /** GET → CareRelationshipView[] (the caller's side). */
  relationships: 'care/relationships',
  /** DELETE → 204 (either party, or admin). */
  relationship: (id: string) => `care/relationships/${encodeURIComponent(id)}`,
  /** Staff. GET → InvitesResult · POST InviteCreateInput → InviteCreated. */
  invites: 'care/invites',
  /** Staff. DELETE → 204 (an OPEN invite is cancelled; a used one is 409). */
  invite: (id: string) => `care/invites/${encodeURIComponent(id)}`,
  /** Patient. POST CareLinkInput → CareLinkResult; 404 for a wrong, used,
      expired or cancelled code (one answer for all four, on purpose). */
  link: 'care/link',
} as const;

/* ── The link a QR / a share carries ──────────────────────────────── */

/** The WEB path. A camera app opens it as a page; the phone claims the
    same path on its scheme (`cyphix://link/CODE`) and the Expo dev client
    wraps it in `/--/`. `parseCareLinkUrl` (care/links.ts) reads all three. */
export const CARE_LINK_PATH = '/link';

export function careLinkUrl(code: string, origin: string = WEB_ORIGIN_DEFAULT): string {
  return `${origin.replace(/\/+$/, '')}${CARE_LINK_PATH}/${normalizeInviteCode(code)}`;
}

// v1.0.0 — CareRelationshipView, InviteSummary (+ state), the create / link shapes,
//          the code's alphabet + helpers, CARE_ROUTES, careLinkUrl (LAUNCH_PLAN 2.1).
