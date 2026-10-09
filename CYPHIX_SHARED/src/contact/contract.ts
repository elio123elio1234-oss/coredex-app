/* ==================================================================
   Leads & support (LAUNCH_PLAN 5.4; holes A16, L1) — the two doors a
   stranger can knock on, and what the super-admin sees behind them.

   A LEAD is a prospect: a clinic, a hospital, a private practice or a
   person who filled the landing page's "Request access" form. It is a
   business contact — a name, an address, a sentence — and the admin
   works it through a small status ladder (new → contacted → converted
   / closed). Nothing clinical belongs in it, and the form says so.

   A SUPPORT TICKET is a question or a problem, from someone with an
   account (the app's Settings → "Contact support", the account attached)
   or without one (the web's public /support page — "I cannot sign in"
   is the whole point). Its body may name an account, a device, a
   symptom: the server seals it at rest and opens it ONLY for an admin,
   and that read is audited (`support:read`). The lists carry no body.

   Both doors are public, rate-limited, and behind the same CAPTCHA gate
   as sign-up (auth/captcha.ts; the server decides); a signed-in caller
   is already past it and sends no token.

   There is no reply channel here: the admin answers by e-mail, outside
   the system, and marks the ticket. The sender gets an acknowledgement
   mail at once, and the admins a notice, both through the outbox.
   ================================================================== */

import type { OrganizationType } from '../org/contract';

/* ── Leads ────────────────────────────────────────────────────────── */

/** Who is asking. The three organization types, a person, or other. */
export type LeadOrgType = OrganizationType | 'patient' | 'other';
export const LEAD_ORG_TYPES: readonly LeadOrgType[] = ['clinic', 'hospital', 'practice', 'patient', 'other'];

/** Which door it came through. */
export type ContactSource = 'landing' | 'web' | 'mobile';
export const CONTACT_SOURCES: readonly ContactSource[] = ['landing', 'web', 'mobile'];

export type ContactLang = 'he' | 'en';

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'closed';
export const LEAD_STATUSES: readonly LeadStatus[] = ['new', 'contacted', 'converted', 'closed'];

export const LEAD_LIMITS = {
  nameMin: 2,
  nameMax: 80,
  organizationMax: 120,
  phoneMax: 32,
  messageMax: 1000,
} as const;

/** `POST /leads` — public. */
export interface LeadInput {
  name: string;
  email: string;
  orgType: LeadOrgType;
  /** The clinic's / hospital's name, when there is one. */
  organization?: string;
  phone?: string;
  message?: string;
  source: ContactSource;
  lang?: ContactLang;
  /** Required when the CAPTCHA policy names a provider (auth/captcha.ts). */
  captchaToken?: string;
}

/** What `POST /leads` answers (201). */
export interface LeadCreated {
  id: string;
  createdAt: string;
}

/** A lead as the admin's list shows it. */
export interface LeadRow {
  id: string;
  name: string;
  email: string;
  orgType: LeadOrgType;
  organization: string | null;
  phone: string | null;
  message: string | null;
  source: ContactSource;
  lang: ContactLang | null;
  status: LeadStatus;
  /** The admin's own note (what was said, what was agreed). */
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface LeadsQuery {
  /** `open` = new + contacted. */
  status?: LeadStatus | 'open';
  /** Name, e-mail or organization, case-insensitive. */
  q?: string;
  limit?: number;
  offset?: number;
}
export const LEAD_NOTE_MAX_LENGTH = 500;
/** `PATCH /admin/leads/:id/status`. */
export interface LeadStatusPatch {
  status: LeadStatus;
  note?: string;
}

/* ── Support tickets ──────────────────────────────────────────────── */

export type SupportCategory = 'account' | 'app' | 'device' | 'data' | 'billing' | 'other';
export const SUPPORT_CATEGORIES: readonly SupportCategory[] = ['account', 'app', 'device', 'data', 'billing', 'other'];

export type SupportStatus = 'open' | 'answered' | 'closed';
export const SUPPORT_STATUSES: readonly SupportStatus[] = ['open', 'answered', 'closed'];

export const SUPPORT_LIMITS = {
  subjectMin: 3,
  subjectMax: 120,
  bodyMin: 10,
  bodyMax: 2000,
} as const;

/** `POST /support` — public; with a bearer token the account is attached
    and the CAPTCHA is not asked. */
export interface SupportInput {
  /** Where the answer goes. A signed-in caller may omit it: the
      account's address is used. */
  email?: string;
  subject: string;
  body: string;
  category: SupportCategory;
  source: ContactSource;
  lang?: ContactLang;
  /** What the sender was running — helps the answer, costs nothing. */
  appVersion?: string;
  platform?: string;
  captchaToken?: string;
}

/** What `POST /support` answers (201). */
export interface SupportCreated {
  id: string;
  status: SupportStatus;
  createdAt: string;
}

/** A ticket as the admin's list shows it — NO body. */
export interface SupportTicketRow {
  id: string;
  /** The account behind it, when there was one. */
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  email: string;
  subject: string;
  category: SupportCategory;
  status: SupportStatus;
  source: ContactSource;
  lang: ContactLang | null;
  appVersion: string | null;
  platform: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  answeredAt: string | null;
  closedAt: string | null;
}
/** `GET /admin/support/:id` — the body opened; the read is audited. */
export interface SupportTicketView extends SupportTicketRow {
  body: string;
}
export interface SupportQuery {
  status?: SupportStatus;
  /** Subject, e-mail or name, case-insensitive. */
  q?: string;
  limit?: number;
  offset?: number;
}
export const SUPPORT_NOTE_MAX_LENGTH = 500;
/** `PATCH /admin/support/:id/status`. */
export interface SupportStatusPatch {
  status: SupportStatus;
  note?: string;
}

/* ── Routes (relative to API_VERSION_PATH) ────────────────────────── */

export const CONTACT_ROUTES = {
  /** POST LeadInput → 201 LeadCreated. Public. */
  leads: 'leads',
  /** POST SupportInput → 201 SupportCreated. Public; bearer optional. */
  support: 'support',
} as const;

export const ADMIN_CONTACT_ROUTES = {
  /** GET ?status&q&limit&offset → PagedResult<LeadRow>. */
  leads: 'admin/leads',
  /** PATCH LeadStatusPatch → { id, status }. */
  leadStatus: (id: string) => `admin/leads/${encodeURIComponent(id)}/status`,
  /** GET ?status&q&limit&offset → PagedResult<SupportTicketRow>. */
  support: 'admin/support',
  /** GET → SupportTicketView (the body; audited `support:read`). */
  supportTicket: (id: string) => `admin/support/${encodeURIComponent(id)}`,
  /** PATCH SupportStatusPatch → { id, status }. */
  supportStatus: (id: string) => `admin/support/${encodeURIComponent(id)}/status`,
} as const;

/* ── Helpers ──────────────────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Client-side shape check on a lead — the same rules the server's
    schema enforces, so a form can refuse before the round-trip. Returns
    the field names that are wrong, in order; empty = good. */
export function leadInputProblems(input: Partial<LeadInput>): Array<keyof LeadInput> {
  const bad: Array<keyof LeadInput> = [];
  const name = (input.name ?? '').trim();
  if (name.length < LEAD_LIMITS.nameMin || name.length > LEAD_LIMITS.nameMax) bad.push('name');
  if (!EMAIL_RE.test((input.email ?? '').trim())) bad.push('email');
  if (!input.orgType || !LEAD_ORG_TYPES.includes(input.orgType)) bad.push('orgType');
  if ((input.organization ?? '').length > LEAD_LIMITS.organizationMax) bad.push('organization');
  if ((input.phone ?? '').length > LEAD_LIMITS.phoneMax) bad.push('phone');
  if ((input.message ?? '').length > LEAD_LIMITS.messageMax) bad.push('message');
  return bad;
}

/** The same for a ticket. `email` is checked only when given (a
    signed-in caller may leave it out). */
export function supportInputProblems(input: Partial<SupportInput>): Array<keyof SupportInput> {
  const bad: Array<keyof SupportInput> = [];
  const subject = (input.subject ?? '').trim();
  const body = (input.body ?? '').trim();
  if (input.email !== undefined && input.email !== '' && !EMAIL_RE.test(input.email.trim())) bad.push('email');
  if (subject.length < SUPPORT_LIMITS.subjectMin || subject.length > SUPPORT_LIMITS.subjectMax) bad.push('subject');
  if (body.length < SUPPORT_LIMITS.bodyMin || body.length > SUPPORT_LIMITS.bodyMax) bad.push('body');
  if (!input.category || !SUPPORT_CATEGORIES.includes(input.category)) bad.push('category');
  return bad;
}

// v1.0.0 — Leads (the landing form) + support tickets (Settings / the public page): inputs,
//          rows, queries, status patches, routes, the shape checks (server v0.23.0,
//          LAUNCH_PLAN 5.4).
