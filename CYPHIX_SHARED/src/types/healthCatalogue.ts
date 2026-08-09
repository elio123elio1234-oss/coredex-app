/* ==================================================================
   The pick-lists behind editing a patient's medical card, and the shape
   of an edit.

   ══ WHY A CATALOGUE AT ALL ══
   A free-text allergy field produces "asprin", "Aspirin ", "ASA" and
   "acetylsalicylic acid" for one substance, and nothing downstream can
   tell they are the same. That is tolerable in a notes app and is not
   here: the whole point of recording that someone reacts to iodinated
   contrast is that a system can act on it later.

   So the common answers are a LIST, chosen for cardiac care specifically
   — the things that change how this patient is treated — and anything
   outside it is still accepted as free text under `OTHER_CODE`. A list
   that cannot express the patient's actual answer is worse than no list,
   because it teaches people to pick the nearest wrong thing.

   ══ ⚠️ THESE ARE NOT SNOMED CODES, AND THEY DO NOT PRETEND TO BE ⚠️ ══
   Every entry carries `system: CYPHIX_CATALOGUE_SYSTEM`, which is a URI
   for *this list*. The codes are stable identifiers for matching across
   web, phone and server — nothing more.

   Inventing SNOMED CT or RxNorm codes would be worse than shipping none:
   a wrong code is machine-readable, travels into other systems, and is
   believed. Mapping this list to a real terminology needs a licensed
   source and a clinician to sign it off, and until that happens the
   honest thing is a namespace that says out loud whose list it is.
   Recorded in PARITY.md as outstanding.

   ══ WHAT THIS FILE MAY NOT DO ══
   Same rule as the rest of the clinical stack: it offers vocabulary, it
   does not offer opinions. Nothing here is marked common, likely,
   dangerous or recommended, and the order is alphabetical within a group
   rather than "most important first" — an ordering that would be a
   clinical judgement about a patient the list has never met.
   ================================================================== */

/** The URI stamped on every coded item this list produces. */
export const CYPHIX_CATALOGUE_SYSTEM = 'https://cyphix.health/fhir/CodeSystem/cyphix-catalogue';

/** The code used when the patient's answer is not on the list. */
export const OTHER_CODE = 'other';

export interface CatalogueEntry {
  code: string;
  /** English display. Localised at the UI layer via `catalogueLabelKey`. */
  display: string;
}

/**
 * Substances worth recording for someone having an ECG or cardiac care.
 *
 * The selection principle is "would a cardiologist or a cath lab change
 * what they do because of this?" — which is why adhesive is on the list
 * (ECG electrodes) and pollen is not.
 */
export const ALLERGY_CATALOGUE: readonly CatalogueEntry[] = [
  { code: 'ace-inhibitor', display: 'ACE inhibitors' },
  { code: 'adhesive', display: 'Adhesive / plaster' },
  { code: 'amiodarone', display: 'Amiodarone' },
  { code: 'aspirin', display: 'Aspirin' },
  { code: 'beta-blocker', display: 'Beta blockers' },
  { code: 'clopidogrel', display: 'Clopidogrel' },
  { code: 'contrast-iodine', display: 'Iodinated contrast dye' },
  { code: 'heparin', display: 'Heparin' },
  { code: 'latex', display: 'Latex' },
  { code: 'local-anaesthetic', display: 'Local anaesthetic (lidocaine)' },
  { code: 'nsaid', display: 'NSAIDs (ibuprofen, naproxen)' },
  { code: 'penicillin', display: 'Penicillin' },
  { code: 'statin', display: 'Statins' },
  { code: 'sulfonamide', display: 'Sulfa drugs' },
] as const;

/** Medicines that change how an ECG is read, or how this patient is treated. */
export const MEDICATION_CATALOGUE: readonly CatalogueEntry[] = [
  { code: 'amiodarone', display: 'Amiodarone' },
  { code: 'amlodipine', display: 'Amlodipine' },
  { code: 'apixaban', display: 'Apixaban' },
  { code: 'aspirin', display: 'Aspirin' },
  { code: 'atorvastatin', display: 'Atorvastatin' },
  { code: 'bisoprolol', display: 'Bisoprolol' },
  { code: 'carvedilol', display: 'Carvedilol' },
  { code: 'clopidogrel', display: 'Clopidogrel' },
  { code: 'digoxin', display: 'Digoxin' },
  { code: 'diltiazem', display: 'Diltiazem' },
  { code: 'furosemide', display: 'Furosemide' },
  { code: 'insulin', display: 'Insulin' },
  { code: 'levothyroxine', display: 'Levothyroxine' },
  { code: 'lisinopril', display: 'Lisinopril' },
  { code: 'losartan', display: 'Losartan' },
  { code: 'metformin', display: 'Metformin' },
  { code: 'metoprolol', display: 'Metoprolol' },
  { code: 'ramipril', display: 'Ramipril' },
  { code: 'rivaroxaban', display: 'Rivaroxaban' },
  { code: 'rosuvastatin', display: 'Rosuvastatin' },
  { code: 'spironolactone', display: 'Spironolactone' },
  { code: 'valsartan', display: 'Valsartan' },
  { code: 'warfarin', display: 'Warfarin' },
] as const;

/**
 * Family history that bears on a cardiac assessment.
 *
 * Kept short on purpose. A family-history list long enough to be complete
 * is one nobody reads to the end of, and the entries below are the ones a
 * cardiologist asks about out loud.
 */
export const FAMILY_HISTORY_CATALOGUE: readonly CatalogueEntry[] = [
  { code: 'arrhythmia', display: 'Arrhythmia or atrial fibrillation' },
  { code: 'cardiomyopathy', display: 'Cardiomyopathy' },
  { code: 'chd', display: 'Coronary heart disease' },
  { code: 'diabetes', display: 'Diabetes' },
  { code: 'high-cholesterol', display: 'High cholesterol' },
  { code: 'hypertension', display: 'High blood pressure' },
  { code: 'long-qt', display: 'Long QT syndrome' },
  { code: 'mi', display: 'Heart attack' },
  { code: 'stroke', display: 'Stroke' },
  { code: 'sudden-death', display: 'Sudden cardiac death' },
] as const;

/* Blood groups are NOT redeclared here. `auth/contract` already owns
   `BLOOD_TYPES` (with the "unknown" member, because a guessed blood type
   is more dangerous than a blank), and two lists of the same eight
   strings is how they come to disagree. The compiler caught the
   duplicate export the moment it was written, which is the argument for
   a flat barrel file made better than any comment could. */

/** Which list a category is edited from. */
export type CatalogueKind = 'allergy' | 'medication' | 'familyHistory';

export function catalogueFor(kind: CatalogueKind): readonly CatalogueEntry[] {
  switch (kind) {
    case 'allergy':
      return ALLERGY_CATALOGUE;
    case 'medication':
      return MEDICATION_CATALOGUE;
    case 'familyHistory':
      return FAMILY_HISTORY_CATALOGUE;
  }
}

/**
 * The i18n key for one entry, so the phone and the web translate it the
 * same way and neither ships a second copy of the vocabulary.
 *
 * `display` is the fallback when a locale has no line for it — an English
 * substance name is worth far more to a clinician than a blank.
 */
export function catalogueLabelKey(kind: CatalogueKind, code: string): string {
  return `cat_${kind}_${code.replace(/-/g, '_')}`;
}

/* ══════════════════ The edit ══════════════════ */

/** One coded answer, as it is stored and sent. */
export interface CodedAnswer {
  display: string;
  code?: string;
  system?: string;
}

/**
 * A medicine, in the shape the card already uses.
 *
 * ⚠️ `name`, NOT `display` — and that is not a style choice. `types/patient`
 * `MedicationItem` has used `name` since the first version, the server
 * stores it that way and the web renders it that way. This was written
 * as `display` for symmetry with `CodedAnswer` and the server's compiler
 * caught it immediately: a new contract that quietly renames a field of
 * an old one does not create symmetry, it creates two shapes for one
 * thing and a migration nobody asked for.
 */
export interface MedicationAnswer {
  name: string;
  /** Free text, e.g. "5 mg, mornings". Never parsed, only shown. */
  dose?: string;
  code?: string;
  system?: string;
}

/** Build a medication answer from a catalogue pick. */
export function medicationFromCatalogue(entry: CatalogueEntry, dose?: string): MedicationAnswer {
  return { name: entry.display, code: entry.code, system: CYPHIX_CATALOGUE_SYSTEM, dose };
}

/** Build a medication answer from something the patient typed. */
export function medicationFromFreeText(text: string, dose?: string): MedicationAnswer {
  return {
    name: text.trim().slice(0, FREE_TEXT_MAX),
    code: OTHER_CODE,
    system: CYPHIX_CATALOGUE_SYSTEM,
    dose,
  };
}

export interface EmergencyContactAnswer {
  name: string;
  relation: string;
  phone: string;
}

/**
 * What a client may change about a medical card.
 *
 * ★ Every field is OPTIONAL and absent means "leave it alone" — this is a
 * PATCH, not a PUT. A client that only knows how to edit allergies must
 * be able to send allergies without silently erasing the emergency
 * contact it never rendered, and a phone on an old build must not delete
 * a field a newer web app added. `null` is how a value is actually
 * cleared, so "unchanged" and "removed" are different words.
 *
 * ⚠️ `conditions` is NOT here. Those are FHIR `Condition` resources in
 * their own table with their own provenance, and a diagnosis is not the
 * same kind of fact as a phone number — it is recorded BY someone, ABOUT
 * a date, and letting a patient edit one through a settings sheet would
 * quietly turn a clinical record into a self-report. Tracked in
 * PARITY.md.
 */
export interface PatientCardPatch {
  bloodType?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  allergies?: CodedAnswer[];
  medications?: MedicationAnswer[];
  familyHistory?: string[];
  emergencyContact?: EmergencyContactAnswer | null;
}

/** Bounds the server enforces and the UI should respect. Adults and children. */
export const HEIGHT_CM_RANGE: readonly [number, number] = [50, 260];
export const WEIGHT_KG_RANGE: readonly [number, number] = [2, 400];
/** Free text is capped everywhere it is accepted; a card is not a notebook. */
export const FREE_TEXT_MAX = 120;
/** Nobody has 200 allergies, and a list that long is a bug or an attack. */
export const LIST_MAX = 40;

/** Build the coded answer for a catalogue pick. */
export function codedFromCatalogue(entry: CatalogueEntry): CodedAnswer {
  return { display: entry.display, code: entry.code, system: CYPHIX_CATALOGUE_SYSTEM };
}

/** Build the coded answer for something the patient typed. */
export function codedFromFreeText(text: string): CodedAnswer {
  return { display: text.trim().slice(0, FREE_TEXT_MAX), code: OTHER_CODE, system: CYPHIX_CATALOGUE_SYSTEM };
}

// v1.0.0 — Cardiac-relevant pick-lists for allergies, medicines and family
//          history, plus the PATCH contract for a medical card. The codes are
//          CYPHIX's OWN and say so: inventing SNOMED or RxNorm identifiers
//          would be worse than shipping none, because a wrong code is
//          machine-readable, travels, and is believed. Every patch field is
//          optional so a client that edits one category cannot erase the ones
//          it never rendered.
