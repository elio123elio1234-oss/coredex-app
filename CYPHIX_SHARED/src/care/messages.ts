/* ==================================================================
   Messages — the patient ↔ care thread, as every platform must see it
   (server routes/messages.ts since v0.1.0; LAUNCH_PLAN 3.1).

   The THREAD is the active care relationship of a kind: a `clinician`
   thread is 1:1 prose; a `clinic` thread receives triaged consult
   REQUESTS (a message that carries a coded reason). The web has
   carried these shapes in `types/viewModels.ts` since its first chat;
   they move here so the phone's messageApi (3.8) and the clinic
   portal's inbox (3.5) read the same words. The web keeps its copy
   until it imports from here — an edit to one is an edit to both.
   ================================================================== */

import type { CareConnectionKind, CareContact, CodedItem } from '../types/patient';

/** An ECG recording attached to a message (reference only, no waveform). */
export interface ChatAttachment {
  recordingId: string;
  label: string;
}

/** Where the latest request in a clinic thread stands, as the thread
    itself reports it (derived from the messages). The request ENTITY
    (clinic/contract.ts, server v0.17.0) carries the fuller RequestStatus. */
export type ConsultStatus = 'new' | 'in-progress' | 'answered';

export interface ChatMessage {
  id: string;
  /** Who sent it — decides the bubble side (patient = mine). */
  from: 'patient' | 'clinician';
  /** A plain message, a structured consult request, or a system status note. */
  kind?: 'message' | 'request' | 'system';
  /** Coded reason for a consult request (clinic mode). */
  reason?: CodedItem;
  /** User-typed body. */
  text?: string;
  /** i18n key for a seeded demo message (resolved in the UI; mock only). */
  demoKey?: string;
  /** ISO 8601. */
  sentAt: string;
  status?: 'sent' | 'delivered' | 'read';
  attachment?: ChatAttachment;
}

/** The whole conversation: who it's with, the mode, and the messages. */
export interface ChatThread {
  contact: CareContact;
  mode: CareConnectionKind;
  /** Present in clinic mode: where the open request stands. */
  requestStatus?: ConsultStatus;
  messages: ChatMessage[];
}

/** `POST /patients/:id/messages/:mode`. A `reason` makes it a REQUEST. */
export interface SendMessageInput {
  text: string;
  attachment?: ChatAttachment;
  reason?: CodedItem;
}

/** Relative to API_VERSION_PATH, for RTK endpoints. GET → ChatThread
    (404 when no active link of that kind); POST SendMessageInput →
    ChatMessage (201). Staff see THEIR thread with the patient. */
export const MESSAGE_ROUTES = {
  thread: (patientId: string, mode: CareConnectionKind) =>
    `patients/${encodeURIComponent(patientId)}/messages/${mode}`,
} as const;

// v1.0.0 — ChatAttachment / ChatMessage / ChatThread / ConsultStatus / SendMessageInput
//          + MESSAGE_ROUTES, lifted from the web's viewModels (LAUNCH_PLAN 3.1).
