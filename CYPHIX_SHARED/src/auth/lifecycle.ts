/* ==================================================================
   Account lifecycle — the two things a person may do to their account
   that the law gives them a right to: take their data with them (GDPR
   art. 20, Israeli Privacy Protection Law) and have it erased (art. 17;
   Apple requires in-app deletion). Server v0.14.0, LAUNCH_PLAN 1.9.

   DELETION IS SCHEDULED, NOT INSTANT. The request proves the password,
   records the moment, and the account is erased DELETION_GRACE_DAYS
   later by a server sweep — crypto-shred of the patient key, every
   session ended, the user row anonymised. Until then the account works
   and the request can be cancelled from Settings; an e-mail says so at
   each step. A mis-tap must not destroy a medical record, and a stolen
   session must not be able to either (the password gate).

   THE EXPORT IS ONE JSON DOCUMENT, machine-readable and complete: the
   FHIR Patient resource, the health profile, every recording with its
   waveforms (the same StoredRecording the apps already read), every
   message thread, the consents. Delivery — a download in a browser, a
   share sheet on a phone — is each platform's own.
   ================================================================== */

import type { ConsentRecord } from '../legal/documents';
import type { CareContact, CodedItem } from '../types/patient';
import type { StoredRecording } from '../types/recording';

export const DELETION_GRACE_DAYS = 14;

/** Relative to API_VERSION_PATH. All signed in. */
export const ACCOUNT_LIFECYCLE_ROUTES = {
  /** GET → AccountExport (rate-limited: it decrypts everything). */
  export: '/auth/me/export',
  /** GET → DeletionStatus · POST DeletionRequestInput → DeletionStatus
      (400 `wrong_password`). */
  deletion: '/auth/me/deletion',
  /** POST → DeletionStatus (no longer scheduled). */
  deletionCancel: '/auth/me/deletion/cancel',
} as const;

export interface DeletionStatus {
  scheduled: boolean;
  /** ISO, when the person asked. */
  requestedAt: string | null;
  /** ISO, when the sweep may erase — requestedAt + DELETION_GRACE_DAYS. */
  executeAfter: string | null;
}

export interface DeletionRequestInput {
  password: string;
}

export interface ExportedMessage {
  id: string;
  from: 'patient' | 'clinician';
  kind?: 'message' | 'request' | 'system';
  text?: string;
  reason?: CodedItem;
  sentAt: string;
  attachment?: { recordingId: string; label: string };
}

export interface ExportedThread {
  relationshipId: string;
  kind: 'clinician' | 'clinic';
  contact: CareContact;
  messages: ExportedMessage[];
}

export interface ExportedCareRelationship {
  id: string;
  kind: 'clinician' | 'clinic';
  status: string;
  createdAt: string;
  consentedAt: string | null;
  revokedAt: string | null;
}

export interface AccountExport {
  format: 'cyphix-export/1';
  exportedAt: string;
  account: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    createdAt: string;
    emailVerified: boolean;
  };
  /** Null for a staff account (no patient record). */
  patient: null | {
    id: string;
    /** The FHIR R4 Patient resource, exactly as stored. */
    resource: unknown;
    healthProfile: unknown | null;
    /** FHIR Condition resources, exactly as stored. */
    conditions: unknown[];
  };
  recordings: StoredRecording[];
  messages: ExportedThread[];
  careRelationships: ExportedCareRelationship[];
  consents: ConsentRecord[];
}

/** File name for the document, the same on every platform. */
export function accountExportFilename(exportedAt: string): string {
  return `cyphix-export-${exportedAt.slice(0, 10)}.json`;
}

/**
 * What a platform's auth service does about the account's lifecycle. A
 * separate interface, like the others, adopted per platform.
 */
export interface AuthLifecycleContract {
  exportData(): Promise<AccountExport>;
  deletionStatus(): Promise<DeletionStatus>;
  /** Rejects with `wrong-password`. */
  requestDeletion(input: DeletionRequestInput): Promise<DeletionStatus>;
  cancelDeletion(): Promise<DeletionStatus>;
}

// v1.0.0 — Export (one JSON document) + scheduled deletion with a 14-day grace,
//          the routes, the shapes and the contract (server v0.14.0, LAUNCH_PLAN 1.9).
