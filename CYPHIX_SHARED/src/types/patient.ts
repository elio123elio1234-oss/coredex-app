/* ==================================================================
   The patient MEDICAL CARD — the assembled, minimized projection every
   platform renders on its Profile screen, and the one definition of its
   shape (root CLAUDE.md §2.1).

   ── Why a "card" and not the Patient resource ──
   Data minimization (web CLAUDE.md §7.3). The server owns the FHIR
   Patient, the encrypted health profile, the conditions and the care
   relationship; `GET /patients/:id/card` opens all four, projects them
   down to what a screen actually draws, and returns THAT. No client ever
   receives a raw clinical resource to pick through, and no client
   re-implements the assembly — which is also why the web and the phone
   cannot disagree about what "age" or "BMI" means.

   Clinical entries keep their code + system beside the human label, so
   nothing here is free-text-only (web CLAUDE.md §5).

   The web still declares these in its own `src/types/viewModels.ts` and
   the server in `src/types.ts`; both are this shape. Migrating them onto
   this file is tracked in PARITY.md — until then an edit belongs in all
   three, or one platform starts rendering a field another does not send.
   ================================================================== */

import type { AdministrativeGender } from '../auth/contract';

/** A coded clinical concept flattened for display (label + optional code). */
export interface CodedItem {
  display: string;
  code?: string;
  /** Short system label, e.g. "ICD-10" / "SNOMED CT". */
  system?: string;
}

/** A medication line: name + human dosage text. */
export interface MedicationItem {
  name: string;
  dose?: string;
  code?: string;
}

/** Next-of-kin. Fictitious in all mock data (web CLAUDE.md §7.4). */
export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

/** How the patient is connected to care. */
export type CareConnectionKind = 'clinician' | 'clinic';

/** A member of the patient's care team (also the chat counterpart). A
    `clinician` is messaged 1:1; a `clinic` receives triaged consult requests. */
export interface CareContact {
  id: string;
  name: string;
  /** Role/speciality, e.g. "Cardiologist", or a clinic strapline. */
  role: string;
  clinic?: string;
  kind: CareConnectionKind;
  online?: boolean;
  lastSeen?: string;
}

/** The assembled patient medical card (identity + health summary). */
export interface PatientCardModel {
  id: string;
  displayName: string;
  /** Business identifier. Never a real MRN. */
  mrn?: string;
  gender?: AdministrativeGender;
  /** Derived server-side, so every platform ages the patient identically. */
  ageYears?: number;
  birthDate?: string;
  phone?: string;
  city?: string;
  bloodType?: string;
  heightCm?: number;
  weightKg?: number;
  /** Derived from height + weight (kg/m²), rounded to 1 dp. */
  bmi?: number;
  conditions: CodedItem[];
  allergies: CodedItem[];
  medications: MedicationItem[];
  familyHistory: string[];
  emergencyContact?: EmergencyContact;
  careTeam?: CareContact;
}

/**
 * The patient portrait, as its own request.
 *
 * Deliberately NOT part of the card: it is up to ~1.5 MB of data-URL
 * against a card of a few hundred bytes, and the card is re-fetched
 * whenever a condition or a measurement changes. One endpoint each means
 * the picture is fetched once and cached for the session while the facts
 * stay fresh. It lives INSIDE the encrypted health profile server-side,
 * so it follows the person across devices rather than sitting in one
 * device's storage.
 */
export interface PatientPhoto {
  photo: string | null;
}

/** Patient-scoped routes, relative to API_VERSION_PATH. Named here so no
    two platforms can drift onto different URLs for the same record. */
export const PATIENT_ROUTES = {
  card: (id: string) => `patients/${id}/card`,
  photo: (id: string) => `patients/${id}/photo`,
} as const;

// v1.0.0 — The medical-card contract (card, portrait, routes) shared by web,
//          iOS and Android.
