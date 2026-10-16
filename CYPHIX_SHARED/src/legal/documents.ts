/* ==================================================================
   Legal documents + consent — the ONE place that says which documents
   exist, which version is current, and where they are read.

   The TEXT is not here. The web app publishes it (public pages at
   LEGAL_DOCS[*].path — the stores want a privacy-policy URL, and a page
   is what a phone opens); the phone links to those pages; the server
   records that a person accepted a given VERSION. Three systems agree on
   ids and versions through this file, and on nothing else — which is
   exactly the part that must not drift.

   Bumping a version here is a product act: every client starts asking
   again, and the server starts refusing the old number. Do it with the
   text change, never alone.
   ================================================================== */

export const LEGAL_DOC_IDS = ['terms', 'privacy'] as const;
export type LegalDocId = (typeof LEGAL_DOC_IDS)[number];

export interface LegalDocMeta {
  id: LegalDocId;
  /** The version a consent is recorded against. */
  version: string;
  /** ISO date the current version was published. */
  updated: string;
  /** Public web path (no session needed). */
  path: string;
}

export const LEGAL_DOCS: Record<LegalDocId, LegalDocMeta> = {
  terms: { id: 'terms', version: '1.0', updated: '2026-10-09', path: '/terms' },
  privacy: { id: 'privacy', version: '1.0', updated: '2026-10-09', path: '/privacy' },
};

/** Where the web app lives until a domain is bought (LAUNCH_PLAN D12).
    The server reads its own WEB_ORIGIN; clients that need to OPEN a page
    (the phone) start from this and may be overridden by config. */
export const WEB_ORIGIN_DEFAULT = 'https://cyphixweb.vercel.app';

export function legalDocUrl(id: LegalDocId, origin: string = WEB_ORIGIN_DEFAULT): string {
  return `${origin.replace(/\/+$/, '')}${LEGAL_DOCS[id].path}`;
}

/** What a client sends: "I accept THIS document at THIS version". */
export interface ConsentInput {
  doc: LegalDocId;
  version: string;
}

/** What the server has on file (latest per document). */
export interface ConsentRecord extends ConsentInput {
  acceptedAt: string;
}

/** `GET /consents`: the account's latest acceptance per document, and
    the versions the server currently considers current — so a client
    can tell "accepted" from "accepted an older text". */
export interface ConsentsResult {
  consents: ConsentRecord[];
  current: Record<LegalDocId, string>;
}

/** `POST /consents` → 201. */
export interface ConsentRecordedResult {
  recorded: true;
  consent: ConsentRecord;
}

/** The set a sign-up carries (RegistrationInput.consents): every
    document, at its current version. */
export const REQUIRED_CONSENTS: readonly ConsentInput[] = LEGAL_DOC_IDS.map((id) => ({
  doc: id,
  version: LEGAL_DOCS[id].version,
}));

/* ── Documents an ORGANIZATION accepts (LAUNCH_PLAN 7.3; R4) ──────────
   The Data Processing Agreement is signed by the clinic / hospital that
   entrusts its patients' data to CYPHIX — by its first admin at
   registration — never by a patient. It therefore lives beside
   LEGAL_DOCS, not inside it: REQUIRED_CONSENTS (a sign-up) is unchanged,
   and only an organization's registration carries ORG_REQUIRED_CONSENTS. */

export const ORG_LEGAL_DOC_IDS = ['dpa'] as const;
export type OrgLegalDocId = (typeof ORG_LEGAL_DOC_IDS)[number];
export type AnyLegalDocId = LegalDocId | OrgLegalDocId;

export interface OrgLegalDocMeta {
  id: OrgLegalDocId;
  version: string;
  updated: string;
  path: string;
}
export const ORG_LEGAL_DOCS: Record<OrgLegalDocId, OrgLegalDocMeta> = {
  dpa: { id: 'dpa', version: '1.0', updated: '2026-10-16', path: '/dpa' },
};
export function orgLegalDocUrl(id: OrgLegalDocId, origin: string = WEB_ORIGIN_DEFAULT): string {
  return `${origin.replace(/\/+$/, '')}${ORG_LEGAL_DOCS[id].path}`;
}
/** "The organization accepts THIS document at THIS version" — recorded
    against the registering admin's account, like a person's consents. */
export interface OrgConsentInput {
  doc: OrgLegalDocId;
  version: string;
}
export const ORG_REQUIRED_CONSENTS: readonly OrgConsentInput[] = ORG_LEGAL_DOC_IDS.map((id) => ({
  doc: id,
  version: ORG_LEGAL_DOCS[id].version,
}));
/** Every version in force, person's and organization's, in one map. */
export const ALL_LEGAL_VERSIONS: Record<AnyLegalDocId, string> = {
  terms: LEGAL_DOCS.terms.version,
  privacy: LEGAL_DOCS.privacy.version,
  dpa: ORG_LEGAL_DOCS.dpa.version,
};

/** Relative to API_VERSION_PATH. Signed in. */
export const CONSENT_ROUTES = {
  /** GET → ConsentsResult. */
  list: '/consents',
  /** POST ConsentInput → ConsentRecordedResult (400 `stale_version` for an old number). */
  record: '/consents',
} as const;

/**
 * What a platform's auth service does about consent. Separate, like the
 * other auth contracts, so each platform adopts it in its own change-set.
 */
export interface ConsentContract {
  /** `GET /consents` for the signed-in account. */
  listConsents(): Promise<ConsentsResult>;
  /** `POST /consents`. Rejects (400 `stale_version`) when the number is old. */
  recordConsent(input: ConsentInput): Promise<ConsentRecord>;
}

/** Which documents this account has NOT accepted at the current version
    (judged against `current` as the server reports it, so a server that
    moved ahead of this build is still answered honestly). */
export function missingConsents(
  consents: readonly ConsentRecord[],
  current: Record<LegalDocId, string> = {
    terms: LEGAL_DOCS.terms.version,
    privacy: LEGAL_DOCS.privacy.version,
  },
): LegalDocId[] {
  return LEGAL_DOC_IDS.filter(
    (id) => !consents.some((c) => c.doc === id && c.version === current[id]),
  );
}

// v1.1.0 — ORG_LEGAL_DOCS: the Data Processing Agreement v1.0 at /dpa, OrgConsentInput,
//          ORG_REQUIRED_CONSENTS, ALL_LEGAL_VERSIONS (LAUNCH_PLAN 7.3; R4). REQUIRED_CONSENTS unchanged.
// v1.0.0 — Legal document ids/versions/paths, the consent contract, REQUIRED_CONSENTS,
//          CONSENT_ROUTES, missingConsents (server v0.13.0, LAUNCH_PLAN 1.8).
