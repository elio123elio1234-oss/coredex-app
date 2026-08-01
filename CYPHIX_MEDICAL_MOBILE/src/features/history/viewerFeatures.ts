/* ==================================================================
   ★ THE ONE FILE THAT DECIDES WHO SEES WHICH ECG TOOL ★
   Ported from the web app's `features/history/viewerFeatures.ts`, rationale
   text included — the reasoning is the point of the file, and a port that
   kept only the table would leave the next reader guessing.

   Every optional capability in the Scan History viewer is declared here with
   the permission that unlocks it. To open a tool to another role you change
   ONE line — either the permission on the feature below, or that
   permission's membership in `ROLE_PERMISSIONS` (types/rbac.ts).

   Components never ask "is this user a doctor?". They ask
   `features.has('calipers')`. That indirection is the whole point:

     • The role check lives in one place, so it cannot drift between the
       toolbar, the gesture, and the export sheet.
     • "Doctors only" is a POLICY DECISION, recorded here in a diff you can
       point at during a compliance review, not scattered as
       `role === 'clinician'` across twenty components.
     • A tool that is hidden is also disabled: the gate is read before the
       handler runs, not just before the button renders.

   ══ ALWAYS-ON vs GATED ══
   Reading your own trace, zooming, panning, focusing one lead and seeing the
   rate are NOT in this list — they are unconditional. Those controls change
   how the same truth is drawn, and nothing about them can mislead.
   Everything listed here either PRODUCES A NUMBER a clinician is trained to
   act on, CHANGES THE SIGNAL, or LEAVES THE BUILDING (export, deletion).
   ================================================================== */

import type { TranslationKey } from '@/i18n/config';
import type { Permission } from '@/types/rbac';

export type ViewerFeatureId =
  | 'calipers'
  | 'filters'
  | 'annotate'
  | 'compare'
  | 'exportPdf'
  | 'exportRaw'
  | 'delete';

export interface ViewerFeatureSpec {
  id: ViewerFeatureId;
  /** Holding this permission unlocks the feature. */
  permission: Permission;
  labelKey: TranslationKey;
  /** Why it is gated. Kept in code so the reasoning survives staff turnover. */
  rationale: string;
}

export const VIEWER_FEATURES: Record<ViewerFeatureId, ViewerFeatureSpec> = {
  calipers: {
    id: 'calipers',
    permission: 'ecg:measure',
    labelKey: 'vfCalipers',
    rationale:
      'Produces intervals in ms and amplitudes in mV. The numbers only mean ' +
      'something against reference ranges a clinician knows; without that ' +
      'frame they generate alarm rather than understanding.',
  },
  filters: {
    id: 'filters',
    permission: 'ecg:filter',
    labelKey: 'vfFilters',
    rationale:
      'Changes what the waveform LOOKS like. Whoever holds this must know ' +
      'that a filter can hide ST shift and flatten P waves — and must be ' +
      'able to justify which view they read.',
  },
  annotate: {
    id: 'annotate',
    permission: 'ecg:annotate',
    labelKey: 'vfAnnotate',
    rationale:
      'Writes into the clinical record and is attributed to its author. ' +
      'Only roles accountable for what the record says may add to it.',
  },
  compare: {
    id: 'compare',
    permission: 'ecg:compare',
    labelKey: 'vfCompare',
    rationale:
      'Overlaying two studies is how change over time is judged. Reading ' +
      '"my heart changed" off a ghost trace without training is exactly the ' +
      'kind of self-diagnosis that sends people to an ER at 3 a.m.',
  },
  exportPdf: {
    id: 'exportPdf',
    permission: 'ecg:export:pdf',
    labelKey: 'vfExportPdf',
    rationale:
      'Data portability — a patient is entitled to a copy of their own ' +
      'recording (GDPR Art. 15/20, HIPAA right of access), so this is open ' +
      'to the patient role by design.',
  },
  exportRaw: {
    id: 'exportRaw',
    permission: 'ecg:export:raw',
    labelKey: 'vfExportRaw',
    rationale:
      'Unfiltered sample-level data for research or a second-opinion tool. ' +
      'Leaves the system entirely, so it follows the clinical roles.',
  },
  delete: {
    id: 'delete',
    permission: 'recording:delete',
    labelKey: 'vfDelete',
    rationale:
      'Destroys a clinical record. Restricted, and audit-logged wherever it ' +
      'is invoked.',
  },
};

export const VIEWER_FEATURE_IDS = Object.keys(VIEWER_FEATURES) as ViewerFeatureId[];

// v1.0.0 — Viewer tool → RBAC permission map, ported from web verbatim.
