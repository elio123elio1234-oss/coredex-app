/* ==================================================================
   The demo patient card — the SAME fictitious patient the web app shows
   (mock-0001, "Test Patient Alpha"), assembled from its seed files so the
   two platforms display identical content OFFLINE.

   ⚠️ 100% FICTITIOUS (web CLAUDE.md §7.4). A reviewer must be able to
   tell at a glance the data is synthetic. Never put a real person here.

   ★ v0.21.0 — this is now the OFFLINE card only. Connected to a server,
   the Profile screen renders `GET /patients/:id/card` and this file is
   never read. It is deliberately NOT used as a fallback for a signed-in
   account whose card fails to load: showing a real patient someone else's
   blood type and medications, under their own name, is the worst failure
   this screen has available. `usePatientCard` builds an empty card from
   the session instead.

   The shape is the shared `PatientCardModel`, so the two paths are one
   type and the screen cannot tell them apart.
   ================================================================== */

import type { PatientCardModel } from '@cyphix/shared';

const SNOMED = 'http://snomed.info/sct';
const BIRTH_DATE = '1988-04-12';

function ageFrom(birthDate: string): number {
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

const HEIGHT_CM = 168;
const WEIGHT_KG = 72;

export const DEMO_CARD: PatientCardModel = {
  id: 'mock-0001',
  displayName: 'Test Patient Alpha',
  mrn: 'MOCK-0001',
  gender: 'female',
  ageYears: ageFrom(BIRTH_DATE),
  phone: '+1-555-0101',
  city: 'Testville',
  bloodType: 'A+',
  heightCm: HEIGHT_CM,
  weightKg: WEIGHT_KG,
  bmi: Math.round((WEIGHT_KG / (HEIGHT_CM / 100) ** 2) * 10) / 10,
  conditions: [
    { display: 'Essential hypertension', code: '59621000', system: SNOMED },
    { display: 'Atrial fibrillation', code: '49436004', system: SNOMED },
  ],
  allergies: [
    { display: 'Penicillin', code: '373270004', system: SNOMED },
    { display: 'Pollen', code: '256259004', system: SNOMED },
  ],
  medications: [
    { name: 'Lisinopril', dose: '10 mg · once daily' },
    { name: 'Apixaban', dose: '5 mg · twice daily' },
  ],
  familyHistory: ['Father — coronary artery disease', 'Mother — hypertension'],
  emergencyContact: { name: 'Test Contact Alpha', relation: 'Spouse', phone: '+1-555-0111' },
  careTeam: {
    id: 'MOCK-CLINICIAN-0001',
    name: 'Dr. Demo Clinician',
    role: 'Cardiologist',
    clinic: 'CYPHIX Demo Clinic',
    kind: 'clinician',
  },
};

// v2.0.0 — Typed as the shared PatientCardModel, and demoted to the OFFLINE
//          card only: a real account never falls back to this record.
