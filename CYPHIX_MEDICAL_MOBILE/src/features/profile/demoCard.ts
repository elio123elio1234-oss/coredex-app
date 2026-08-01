/* ==================================================================
   The demo patient card — the SAME fictitious patient the web app shows
   (mock-0001, "Test Patient Alpha"), assembled from its seed files so
   the two platforms display identical content until the profile
   endpoint is wired to CYPHIX_SERVER.

   ⚠️ 100% FICTITIOUS (web CLAUDE.md §7.4). A reviewer must be able to
   tell at a glance the data is synthetic. Never put a real person here.

   When `profileApi` lands this file is deleted and the screen consumes
   the shared endpoint instead — the shape below is deliberately the web's
   PatientCardModel so that swap needs no UI change.
   ================================================================== */

export interface CodedItem {
  display: string;
  code?: string;
  system?: string;
}

export interface MedicationItem {
  name: string;
  dose?: string;
}

export interface PatientCard {
  id: string;
  displayName: string;
  mrn?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  ageYears?: number;
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
  emergencyContact?: { name: string; relation: string; phone: string };
  careTeam?: { name: string; role: string; clinic?: string };
}

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

export const DEMO_CARD: PatientCard = {
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
  careTeam: { name: 'Dr. Demo Clinician', role: 'Cardiologist', clinic: 'CYPHIX Demo Clinic' },
};

// v1.0.0 — Fictitious demo card mirroring the web seed for mock-0001.
