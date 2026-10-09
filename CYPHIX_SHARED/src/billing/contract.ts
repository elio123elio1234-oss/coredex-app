/* ==================================================================
   Billing (LAUNCH_PLAN phase 6; §3 "every track, modelled, no payment
   processing"; decisions D5 + D6). Server v0.25.0.

   What is modelled: PLANS (the tracks of §3.1 — a private doctor's flat
   fee, a clinic per seat, a clinic per active patient, per recording,
   a flat contract, the B2C plan that exists but is not offered — D5),
   SUBSCRIPTIONS (an organization OR a standalone clinician on a plan,
   with a 30-day trial, monthly periods), USAGE COUNTERS (computed by a
   server job, never in real time: active patients, recordings, seats)
   and INVOICES (created when a period closes, VAT added, e-mailed,
   marked paid BY HAND in the cockpit — a payment processor is a later,
   separate phase; `externalRef` is its future id).

   Money is in MINOR units (agorot) as integers, currency ILS, VAT 18 %
   (D6). The pricing rule is `priceLines` — pure, here, so the cockpit
   can show what the next invoice WILL be from the same arithmetic the
   server bills with.

   §3.3, the one rule that matters: `past_due` shows a banner in the
   clinic portal and stops NEW invitations. It never blocks a patient
   from their own data, nor a clinician from reading what exists.
   ================================================================== */

export const BILLING_CURRENCY = 'ILS';
/** 18 % as basis points, so the maths stays in integers. */
export const VAT_RATE_BP = 1800;
export const TRIAL_DAYS = 30;
/** "Active" = at least one recording in this many days (§3.1, track C). */
export const ACTIVE_PATIENT_WINDOW_DAYS = 30;

/* ── Plans ─────────────────────────────────────────────────────── */

/** §3.1 — A: flat · B: seat · C: patient · D: usage · F: b2c. E (a
    hospital's annual contract) is `flat` with a large price and a
    manual invoice; H (trial) is a subscription state, not a plan. */
export type PlanKind = 'flat' | 'seat' | 'patient' | 'usage' | 'b2c';
export const PLAN_KINDS: readonly PlanKind[] = ['flat', 'seat', 'patient', 'usage', 'b2c'];

export interface PlanView {
  id: string;
  /** Stable handle (`clinic-seat`), unique, never shown to a patient. */
  code: string;
  name: string;
  kind: PlanKind;
  /** The monthly price: the fee (flat / b2c), per seat (seat), per active
      patient (patient), or the monthly MINIMUM (usage). */
  priceMinor: number;
  currency: string;
  includedSeats: number;
  includedPatients: number;
  perExtraPatientMinor: number;
  perRecordingMinor: number;
  /** Offered to new subscriptions. An inactive plan keeps its existing
      subscribers (B2C is modelled inactive — D5). */
  active: boolean;
  createdAt: string;
}

export interface PlanInput {
  code: string;
  name: string;
  kind: PlanKind;
  priceMinor: number;
  includedSeats?: number;
  includedPatients?: number;
  perExtraPatientMinor?: number;
  perRecordingMinor?: number;
  active?: boolean;
}

/** Absent = unchanged. The code and the kind never change — a different
    kind is a different plan. */
export interface PlanPatch {
  name?: string;
  priceMinor?: number;
  includedSeats?: number;
  includedPatients?: number;
  perExtraPatientMinor?: number;
  perRecordingMinor?: number;
  active?: boolean;
}

export const PLAN_LIMITS = { code: 40, name: 120, priceMinorMax: 100_000_000 } as const;

export function planInputProblems(p: Partial<PlanInput>): string[] {
  const out: string[] = [];
  if (!p.code || !/^[a-z0-9][a-z0-9-]{1,39}$/.test(p.code)) out.push('code');
  if (!p.name || p.name.trim().length < 2 || p.name.length > PLAN_LIMITS.name) out.push('name');
  if (!p.kind || !PLAN_KINDS.includes(p.kind)) out.push('kind');
  const money = (v: unknown) => v == null || (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= PLAN_LIMITS.priceMinorMax);
  if (!Number.isInteger(p.priceMinor) || (p.priceMinor as number) < 0) out.push('priceMinor');
  if (!money(p.perExtraPatientMinor)) out.push('perExtraPatientMinor');
  if (!money(p.perRecordingMinor)) out.push('perRecordingMinor');
  return out;
}

/* ── Subscriptions ─────────────────────────────────────────────── */

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled';

export interface UsageCounterView {
  /** The period the numbers belong to (ISO). */
  periodStart: string;
  /** Distinct patients linked to the subscriber with a recording inside
      ACTIVE_PATIENT_WINDOW_DAYS. */
  activePatients: number;
  /** Recordings by those patients inside the period so far. */
  recordings: number;
  /** Clinician seats in use (members who are not front desk); 1 for a
      standalone clinician. */
  seatsUsed: number;
  computedAt: string;
}

export interface SubscriptionView {
  id: string;
  /** Exactly one of the two: an organization, or a standalone clinician. */
  orgId: string | null;
  orgName: string | null;
  userId: string | null;
  userName: string | null;
  planId: string;
  planCode: string;
  planName: string;
  planKind: PlanKind;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  /** Seats bought (seat plans). The invoice bills max(seats, seatsUsed). */
  seats: number;
  /** The admin's note on the last status change, never shown to the subscriber. */
  note: string | null;
  createdAt: string;
  updatedAt: string;
  /** The current period's counters when the server has them. */
  usage?: UsageCounterView | null;
}

/** `POST /admin/billing/subscriptions`. One of `orgId` / `userId`. */
export interface SubscriptionInput {
  orgId?: string;
  userId?: string;
  planId: string;
  seats?: number;
  /** Start with a 30-day trial (the default) or straight on the plan. */
  trial?: boolean;
}

/** `PATCH /admin/billing/subscriptions/:id`. `trial` is not a destination. */
export interface SubscriptionPatch {
  status?: 'active' | 'past_due' | 'cancelled';
  planId?: string;
  seats?: number;
  note?: string;
}

export interface SubscriptionsQuery {
  status?: SubscriptionStatus;
  orgId?: string;
  limit?: number;
  offset?: number;
}

/* ── Invoices ──────────────────────────────────────────────────── */

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void';

export interface InvoiceLine {
  description: string;
  qty: number;
  unitMinor: number;
  totalMinor: number;
}

export interface InvoiceView {
  id: string;
  /** `INV-2026-00042` — sequential, never reused. */
  number: string;
  subscriptionId: string;
  orgId: string | null;
  orgName: string | null;
  userId: string | null;
  userName: string | null;
  /** `yyyy-mm` of the period's start. */
  period: string;
  periodStart: string;
  periodEnd: string;
  subtotalMinor: number;
  vatMinor: number;
  amountMinor: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  /** The payment processor's id, once one exists (6.4). */
  externalRef: string | null;
  note: string | null;
  lines: InvoiceLine[];
  createdAt: string;
}

/** `PATCH /admin/billing/invoices/:id/status`. `issued → paid | void`;
    `paid` and `void` are final. */
export interface InvoiceStatusPatch {
  status: 'paid' | 'void';
  externalRef?: string;
  note?: string;
}

export interface InvoicesQuery {
  status?: InvoiceStatus;
  orgId?: string;
  /** `yyyy-mm`. */
  period?: string;
  limit?: number;
  offset?: number;
}

/* ── What the subscriber sees ──────────────────────────────────── */

/** `GET /billing/mine` (signed in). An org_admin / member sees the
    organization's; a standalone clinician their own; a patient — nothing
    (D5: free in the pilot). */
export interface BillingMine {
  subscription: SubscriptionView | null;
  /** What the NEXT invoice will be, from today's counters and the
      plan's rule (`priceLines`) — a forecast, not a bill. */
  forecast: InvoiceLine[];
  invoices: InvoiceView[];
  /** §3.3 — the banner, and no new invitations. */
  pastDue: boolean;
}

/* ── The cockpit's revenue view ────────────────────────────────── */

export interface RevenueMonth {
  month: string;
  invoicedMinor: number;
  paidMinor: number;
  invoices: number;
  byOrg: Array<{ orgId: string | null; name: string; invoicedMinor: number; paidMinor: number }>;
}

export interface RevenueReport {
  currency: string;
  /** Oldest first. */
  months: RevenueMonth[];
  /** The forecast of the live subscriptions' next invoices, summed. */
  mrrMinor: number;
  /** Issued and unpaid, summed. */
  outstandingMinor: number;
  subscriptions: { trial: number; active: number; pastDue: number; cancelled: number };
}

/** `POST /admin/billing/run` — the daily job, by hand. */
export interface BillingRunResult {
  ranAt: string;
  subscriptionsCounted: number;
  periodsClosed: number;
  invoicesIssued: number;
}

/* ── Routes ────────────────────────────────────────────────────── */

export const BILLING_ROUTES = {
  /** GET → BillingMine. */
  mine: 'billing/mine',
  /** GET → InvoiceView (the subscriber's own). */
  invoice: (id: string) => `billing/invoices/${encodeURIComponent(id)}`,
} as const;

export const ADMIN_BILLING_ROUTES = {
  /** GET → { items: PlanView[] } (inactive included) · POST PlanInput → 201 PlanView. */
  plans: 'admin/billing/plans',
  /** PATCH PlanPatch → PlanView. */
  plan: (id: string) => `admin/billing/plans/${encodeURIComponent(id)}`,
  /** GET SubscriptionsQuery → PagedResult<SubscriptionView> · POST SubscriptionInput → 201. */
  subscriptions: 'admin/billing/subscriptions',
  /** GET → SubscriptionView (+ usage) · PATCH SubscriptionPatch → SubscriptionView. */
  subscription: (id: string) => `admin/billing/subscriptions/${encodeURIComponent(id)}`,
  /** GET InvoicesQuery → PagedResult<InvoiceView>. */
  invoices: 'admin/billing/invoices',
  /** GET → InvoiceView. */
  invoice: (id: string) => `admin/billing/invoices/${encodeURIComponent(id)}`,
  /** PATCH InvoiceStatusPatch → InvoiceView. */
  invoiceStatus: (id: string) => `admin/billing/invoices/${encodeURIComponent(id)}/status`,
  /** GET ?months=12 → RevenueReport. */
  revenue: 'admin/billing/revenue',
  /** POST → BillingRunResult. */
  run: 'admin/billing/run',
} as const;

/* ── The pricing rule (pure) ───────────────────────────────────── */

/** The lines a period costs on this plan with these counters. Shared so
    the server bills and the cockpit forecasts with ONE arithmetic. */
export function priceLines(
  plan: Pick<PlanView, 'kind' | 'name' | 'priceMinor' | 'includedSeats' | 'includedPatients' | 'perExtraPatientMinor' | 'perRecordingMinor'>,
  usage: Pick<UsageCounterView, 'activePatients' | 'recordings' | 'seatsUsed'>,
  seats: number,
): InvoiceLine[] {
  const line = (description: string, qty: number, unitMinor: number): InvoiceLine => ({
    description,
    qty,
    unitMinor,
    totalMinor: qty * unitMinor,
  });
  switch (plan.kind) {
    case 'flat':
    case 'b2c':
      return [line(plan.name, 1, plan.priceMinor)];
    case 'seat': {
      const billedSeats = Math.max(seats, usage.seatsUsed, plan.includedSeats > 0 ? 0 : 1);
      const out = [line(`${plan.name} — seats`, billedSeats, plan.priceMinor)];
      const extra = Math.max(0, usage.activePatients - plan.includedPatients);
      if (extra > 0 && plan.perExtraPatientMinor > 0) {
        out.push(line('Active patients above the included number', extra, plan.perExtraPatientMinor));
      }
      return out;
    }
    case 'patient':
      return [line(`${plan.name} — active patients`, usage.activePatients, plan.priceMinor)];
    case 'usage': {
      const out = [line(`${plan.name} — recordings`, usage.recordings, plan.perRecordingMinor)];
      const sum = out[0]!.totalMinor;
      if (sum < plan.priceMinor) out.push(line('Monthly minimum', 1, plan.priceMinor - sum));
      return out;
    }
  }
}

export function invoiceTotals(lines: InvoiceLine[], vatBp = VAT_RATE_BP): {
  subtotalMinor: number;
  vatMinor: number;
  amountMinor: number;
} {
  const subtotalMinor = lines.reduce((s, l) => s + l.totalMinor, 0);
  const vatMinor = Math.round((subtotalMinor * vatBp) / 10_000);
  return { subtotalMinor, vatMinor, amountMinor: subtotalMinor + vatMinor };
}

/** ₪1,234.50 — the same string on every platform. */
export function formatMinor(minor: number, currency = BILLING_CURRENCY, locale = 'en-IL'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

/** `yyyy-mm` of an ISO instant, in UTC — the invoice's period label. */
export const periodLabel = (iso: string): string => iso.slice(0, 7);

// v1.0.0 — Billing (LAUNCH_PLAN 6.1; §3.2, D5, D6): PlanView / Input / Patch + kinds,
//          SubscriptionView / Input / Patch / Query + statuses, UsageCounterView, InvoiceView /
//          Line / StatusPatch / Query, BillingMine, RevenueReport, BillingRunResult,
//          BILLING_ROUTES + ADMIN_BILLING_ROUTES, the pure pricing rule (priceLines,
//          invoiceTotals), formatMinor, periodLabel (server v0.25.0).
