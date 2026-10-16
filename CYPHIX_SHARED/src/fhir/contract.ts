/* ==================================================================
   FHIR R4 — the OUTBOUND API (LAUNCH_PLAN 7.3; §1.4 "ייבוא/ייצוא למערכת
   קיימת"). A hospital's information system reads what CYPHIX holds in
   the vocabulary it already speaks: a `Patient` as stored (the record
   IS a FHIR R4 Patient at rest), and an ECG recording as an
   `Observation` — LOINC 11524-6, one component per measured lead
   carrying `SampledData`, one per summary metric. Read-only, by design:
   CYPHIX writes its own records; an EHR reads them.

   Three things are decided here so every platform agrees:
     • the routes and the media type;
     • the CODES — LOINC where a code is certain, MDC (ISO 11073-10101)
       for the leads, and a CYPHIX code system for the two numbers whose
       standard code was not certain enough to assert (the frontal-plane
       QRS axis, the signal-quality index). Honest beats pretend;
     • the BUILDER: `buildEcgObservation` is pure, so the web and the
       phone can produce the very same Observation for an export and the
       server for the API. The server keeps a verbatim copy (it does not
       import this package) — edit both, and run the vector check.

   WHO MAY READ: a signed-in staff member (their usual patient scope), or
   an organization's API KEY — minted by its org_admin, shown once,
   stored hashed, scoped to the organization's linked patients, revocable.
   Every read is audited with the key as the actor.
   ================================================================== */

import type { RecordingSummary, StoredRecording } from '../types/recording';
import { decodeChannel } from '../ecg/recordingCodec';

/* ── Routes + media type (relative to API_VERSION_PATH) ───────────── */

export const FHIR_JSON = 'application/fhir+json';
export const FHIR_VERSION = '4.0.1';
export const FHIR_PAGE_DEFAULT = 20;
export const FHIR_PAGE_MAX = 100;

export const FHIR_ROUTES = {
  /** Public. GET → CapabilityStatement. */
  metadata: 'fhir/metadata',
  /** GET ?_count&_offset → Bundle<Patient> (the caller's scope). */
  patients: 'fhir/Patient',
  patient: (id: string) => `fhir/Patient/${encodeURIComponent(id)}`,
  /** GET ?patient=<id>&_count&_offset → Bundle<Observation> SUMMARIES
      (every component, no waveform `data`). `patient` is required. */
  observations: 'fhir/Observation',
  /** GET → the full Observation: every lead with its `SampledData.data`. */
  observation: (id: string) => `fhir/Observation/${encodeURIComponent(id)}`,
} as const;

/* ── Code systems + the codes ─────────────────────────────────────── */

export const LOINC = 'http://loinc.org';
export const MDC = 'urn:iso:std:iso:11073:10101';
export const UCUM = 'http://unitsofmeasure.org';
export const OBSERVATION_CATEGORY = 'http://terminology.hl7.org/CodeSystem/observation-category';
/** Where no standard code was certain enough to assert. */
export const CYPHIX_CODE_SYSTEM = 'https://cyphix.app/fhir/CodeSystem/ecg';
export const CYPHIX_TAG_SYSTEM = 'https://cyphix.app/fhir/tags';

export interface FhirCoding {
  system: string;
  code: string;
  display?: string;
}
export interface FhirCodeableConcept {
  coding: FhirCoding[];
  text?: string;
}
export interface FhirQuantity {
  value: number;
  unit: string;
  system: string;
  code: string;
}
export interface FhirSampledData {
  origin: FhirQuantity;
  /** Milliseconds between samples. */
  period: number;
  /** Multiply each datum by this to reach `origin`'s unit. */
  factor?: number;
  lowerLimit?: number;
  upperLimit?: number;
  dimensions: number;
  /** Space-separated numbers; absent on a summary. */
  data?: string;
}

export const ECG_STUDY_CODE: FhirCoding = { system: LOINC, code: '11524-6', display: 'EKG study' };
export const ECG_CATEGORY: FhirCoding = { system: OBSERVATION_CATEGORY, code: 'procedure', display: 'Procedure' };

/** The measured channels — MDC_ECG_LEAD_I / _II; the second Lead II
    electrode copy has no standard code (it is CYPHIX's own raw artefact). */
export const ECG_LEAD_CODES: Record<keyof StoredRecording['channels'], FhirCoding> = {
  leadI: { system: MDC, code: '131329', display: 'MDC_ECG_LEAD_I' },
  leadII: { system: MDC, code: '131330', display: 'MDC_ECG_LEAD_II' },
  leadIIb: { system: CYPHIX_CODE_SYSTEM, code: 'lead-ii-b', display: 'Lead II, second electrode copy (raw)' },
};

export type EcgMetricKey = 'bpm' | 'prMs' | 'qrsMs' | 'qtcMs' | 'axisDegrees' | 'sqi';
export const ECG_METRIC_CODES: Record<EcgMetricKey, { coding: FhirCoding; unit: string; ucum: string }> = {
  bpm: { coding: { system: LOINC, code: '8867-4', display: 'Heart rate' }, unit: '/min', ucum: '/min' },
  prMs: { coding: { system: LOINC, code: '8625-6', display: 'P-R interval' }, unit: 'ms', ucum: 'ms' },
  qrsMs: { coding: { system: LOINC, code: '8633-0', display: 'QRS duration' }, unit: 'ms', ucum: 'ms' },
  qtcMs: { coding: { system: LOINC, code: '8636-3', display: 'Q-T interval corrected' }, unit: 'ms', ucum: 'ms' },
  axisDegrees: { coding: { system: CYPHIX_CODE_SYSTEM, code: 'qrs-axis', display: 'QRS axis, frontal plane' }, unit: 'deg', ucum: 'deg' },
  sqi: { coding: { system: CYPHIX_CODE_SYSTEM, code: 'sqi', display: 'Rhythm steadiness index 0–100' }, unit: '1', ucum: '1' },
};
export const ECG_METRIC_ORDER: readonly EcgMetricKey[] = ['bpm', 'prMs', 'qrsMs', 'qtcMs', 'axisDegrees', 'sqi'];

export const SIMULATED_TAG: FhirCoding = { system: CYPHIX_TAG_SYSTEM, code: 'simulated', display: 'Bench simulator — not a patient' };
export const INSUFFICIENT_TAG: FhirCoding = { system: CYPHIX_TAG_SYSTEM, code: 'insufficient-beats', display: 'Too few clean beats to trust the metrics' };

/* ── The resources we emit (the subset of R4 we use; not the whole spec) ── */

export interface FhirObservationComponent {
  code: FhirCodeableConcept;
  valueQuantity?: FhirQuantity;
  valueSampledData?: FhirSampledData;
}
export interface FhirEcgObservation {
  resourceType: 'Observation';
  id: string;
  meta?: { lastUpdated?: string; tag?: FhirCoding[] };
  status: 'final';
  category: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: { reference: string };
  effectiveDateTime: string;
  device?: { display: string };
  note?: Array<{ text: string }>;
  component: FhirObservationComponent[];
}
export interface FhirBundleEntry<T> {
  fullUrl?: string;
  resource: T;
  search?: { mode: 'match' };
}
export interface FhirBundle<T> {
  resourceType: 'Bundle';
  type: 'searchset';
  total: number;
  link?: Array<{ relation: 'self' | 'next' | 'previous'; url: string }>;
  entry: FhirBundleEntry<T>[];
}
export interface FhirOperationOutcome {
  resourceType: 'OperationOutcome';
  issue: Array<{ severity: 'error' | 'warning' | 'information'; code: string; diagnostics?: string }>;
}
/** The part of a CapabilityStatement we publish. */
export interface FhirCapabilityStatement {
  resourceType: 'CapabilityStatement';
  status: 'active';
  date: string;
  kind: 'instance';
  fhirVersion: string;
  format: string[];
  software: { name: string; version: string };
  rest: Array<{
    mode: 'server';
    security?: { description: string };
    resource: Array<{ type: string; interaction: Array<{ code: 'read' | 'search-type' }>; searchParam?: Array<{ name: string; type: string }> }>;
  }>;
}

/* ── The pure builder ─────────────────────────────────────────────── */

/** What the builder needs — a stored recording's fields, with the
    channels already DECODED to millivolts (or absent, for a summary). */
export interface EcgObservationInput {
  id: string;
  /** FHIR reference, e.g. "Patient/xxx". */
  subject: string;
  recordedAt: string;
  sampleRate: number;
  durationSec: number;
  isSimulated: boolean;
  deviceLabel?: string;
  note?: string;
  summary: RecordingSummary;
  channels?: { leadI: Float32Array; leadII: Float32Array; leadIIb?: Float32Array };
}
export interface EcgObservationOptions {
  /** Emit each lead's `SampledData.data` (the search bundle does not). */
  includeWaveform: boolean;
  lastUpdated?: string;
}

/** Millivolts → the SampledData text: integer MICROVOLTS, space-separated,
    with `factor: 0.001` on the component so a reader lands back in mV.
    Integers keep the text a third of the size of "0.123" floats. */
export function sampledDataText(mV: Float32Array): string {
  const parts = new Array<string>(mV.length);
  for (let i = 0; i < mV.length; i++) parts[i] = String(Math.round((mV[i] ?? 0) * 1000));
  return parts.join(' ');
}

const quantity = (value: number, unit: string, code: string): FhirQuantity => ({ value, unit, system: UCUM, code });

/** One ECG recording as a FHIR Observation. Deterministic: the same input
    gives the same JSON on every platform (the server's copy is diffed
    against this one). */
export function buildEcgObservation(input: EcgObservationInput, opts: EcgObservationOptions): FhirEcgObservation {
  const component: FhirObservationComponent[] = [];
  for (const key of ECG_METRIC_ORDER) {
    const v = input.summary[key];
    if (v === null || v === undefined || Number.isNaN(v)) continue;
    const m = ECG_METRIC_CODES[key];
    component.push({ code: { coding: [m.coding] }, valueQuantity: quantity(v, m.unit, m.ucum) });
  }
  const period = 1000 / input.sampleRate;
  const lead = (key: keyof StoredRecording['channels'], samples: Float32Array | undefined) => {
    const sd: FhirSampledData = {
      origin: quantity(0, 'mV', 'mV'),
      period,
      factor: 0.001,
      dimensions: 1,
      ...(opts.includeWaveform && samples ? { data: sampledDataText(samples) } : {}),
    };
    component.push({ code: { coding: [ECG_LEAD_CODES[key]] }, valueSampledData: sd });
  };
  lead('leadI', input.channels?.leadI);
  lead('leadII', input.channels?.leadII);
  /* The second copy is present only on a dual-Lead-II recording; when the
     channels are not loaded (a summary) we cannot know, so it is omitted —
     the full read says. */
  if (input.channels?.leadIIb) lead('leadIIb', input.channels.leadIIb);

  const tag: FhirCoding[] = [];
  if (input.isSimulated) tag.push(SIMULATED_TAG);
  if (input.summary.insufficient) tag.push(INSUFFICIENT_TAG);
  const meta = { ...(opts.lastUpdated ? { lastUpdated: opts.lastUpdated } : {}), ...(tag.length ? { tag } : {}) };

  return {
    resourceType: 'Observation',
    id: input.id,
    ...(Object.keys(meta).length ? { meta } : {}),
    status: 'final',
    category: [{ coding: [ECG_CATEGORY] }],
    code: { coding: [ECG_STUDY_CODE], text: `ECG, ${input.durationSec} s at ${input.sampleRate} Hz` },
    subject: { reference: input.subject },
    effectiveDateTime: input.recordedAt,
    ...(input.deviceLabel ? { device: { display: input.deviceLabel } } : {}),
    ...(input.note ? { note: [{ text: input.note }] } : {}),
    component,
  };
}

/** A stored recording (channels base64 Float32 mV, as every client holds
    them) → the Observation. The web's and the phone's export path. */
export function ecgObservationFromStored(rec: StoredRecording, opts: EcgObservationOptions): FhirEcgObservation {
  return buildEcgObservation(
    {
      id: rec.id,
      subject: rec.subject,
      recordedAt: rec.recordedAt,
      sampleRate: rec.sampleRate,
      durationSec: rec.durationSec,
      isSimulated: rec.isSimulated,
      ...(rec.deviceLabel ? { deviceLabel: rec.deviceLabel } : {}),
      ...(rec.note ? { note: rec.note } : {}),
      summary: rec.summary,
      ...(opts.includeWaveform
        ? {
            channels: {
              leadI: decodeChannel(rec.channels.leadI),
              leadII: decodeChannel(rec.channels.leadII),
              ...(rec.channels.leadIIb ? { leadIIb: decodeChannel(rec.channels.leadIIb) } : {}),
            },
          }
        : {}),
    },
    opts,
  );
}

/* ── API keys: an organization's EHR system as a principal ─────────── */

export type ApiKeyScope = 'fhir:read';
export const API_KEY_SCOPES: readonly ApiKeyScope[] = ['fhir:read'];
export const API_KEY_PREFIX = 'cyk_';
export const API_KEY_NAME_MAX_LENGTH = 80;
export const ORG_API_KEYS_MAX = 20;

export interface ApiKeyView {
  id: string;
  name: string;
  /** The first characters after the prefix — enough to tell keys apart. */
  prefix: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  createdByName: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
}
export interface ApiKeyInput {
  name: string;
  scopes?: ApiKeyScope[];
}
/** `POST …/api-keys` → 201. The secret is shown ONCE; the server keeps a hash. */
export interface ApiKeyCreated {
  key: ApiKeyView;
  secret: string;
}
export interface ApiKeysResult {
  keys: ApiKeyView[];
}
export function validateApiKeyInput(input: ApiKeyInput): Array<keyof ApiKeyInput> {
  const bad: Array<keyof ApiKeyInput> = [];
  const name = (input.name ?? '').trim();
  if (name.length < 2 || name.length > API_KEY_NAME_MAX_LENGTH) bad.push('name');
  if (input.scopes && (input.scopes.length === 0 || input.scopes.some((s) => !API_KEY_SCOPES.includes(s)))) bad.push('scopes');
  return bad;
}
export const API_KEY_ROUTES = {
  /** GET → ApiKeysResult · POST ApiKeyInput → 201 ApiKeyCreated (org_admin of an ACTIVE organization). */
  keys: (orgId: string) => `organizations/${encodeURIComponent(orgId)}/api-keys`,
  /** DELETE → 204 (revoked; the key stops working at once). */
  key: (orgId: string, keyId: string) =>
    `organizations/${encodeURIComponent(orgId)}/api-keys/${encodeURIComponent(keyId)}`,
} as const;

// v1.0.0 — FHIR_ROUTES + media type, the ECG codes (LOINC / MDC / CYPHIX), the resource
//          shapes we emit, the pure ECG Observation builder (+ from a stored recording),
//          API keys for an organization's EHR system (LAUNCH_PLAN 7.3).
