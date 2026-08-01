/* ==================================================================
   RBAC — Roles & Permissions. A 1:1 mirror of the web app's
   `src/types/rbac.ts` (web CLAUDE.md §7.1, which applies here verbatim).

   ★ WHY THIS IS A COPY AND NOT IN `@cyphix/shared` (yet)
   It could be, and probably should be once the server owns the matrix.
   But the web's copy is the live authority today, the server has its own
   `policy/permissions.ts`, and quietly making mobile the third dialect of
   a security decision is worse than an honest duplicate that says so.
   ⚠️ Any change to the matrix must be made in all three, or a tool opens
   on one platform and not another.

   Mobile has no sign-in yet. `features/auth/demoUser.ts` supplies the
   principal, so every gate below is REAL code running against a stand-in
   identity — which means auth lands as a swap of that one file, not as a
   retrofit of permission checks into finished screens.
   ================================================================== */

export type Role = 'admin' | 'clinician' | 'technician' | 'patient' | 'guest';

/** Fine-grained capabilities. Keep verbs + subject explicit. */
export type Permission =
  | 'scan:run'
  | 'patient:read'
  | 'patient:read:self'
  | 'patient:write'
  | 'encounter:read'
  | 'encounter:write'
  | 'audit:read'
  | 'settings:manage'
  /* ── Scan History: who may see recordings ── */
  | 'history:read'
  | 'history:read:self'
  | 'recording:delete'
  /* ── Scan History: which VIEWER TOOLS are available ──
     Split finely on purpose. "Can open the viewer" and "may take calipered
     measurements off it" are genuinely different decisions, and keeping
     them separate is what lets a tool be opened to patients later without
     also handing them the clinical toolbox. Which role gets which is
     decided in ONE place: features/history/viewerFeatures.ts. */
  | 'ecg:measure'
  | 'ecg:filter'
  | 'ecg:annotate'
  | 'ecg:compare'
  | 'ecg:export:pdf'
  | 'ecg:export:raw';

/** The authenticated principal. Shape is auth-provider agnostic. */
export interface AuthUser {
  id: string;
  displayName: string;
  role: Role;
  /** For patient-role users: which Patient resource they map to (self-access). */
  linkedPatientId?: string;
}

/**
 * Static role → permission matrix. Single source of truth for `can()`.
 *
 * ══ THE PATIENT ROW IS A DELIBERATE POSITION, NOT AN OVERSIGHT ══
 * A patient CAN see their own recordings, read the rate/rhythm summary,
 * zoom and pan the trace, and export their own copy. Data portability is a
 * right under GDPR and HIPAA, and a person who cannot look at their own
 * heart tracing is being managed rather than treated.
 *
 * A patient CANNOT take calipered measurements, toggle the DSP filters,
 * annotate, or compare studies. Those are not withheld to be paternalistic
 * — they are the tools whose OUTPUT is only meaningful next to clinical
 * training. A caliper reporting "QT 480 ms" to someone with no reference
 * frame manufactures alarm; a filter toggle lets anyone change what the
 * waveform looks like and then believe the version they preferred.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: [
    'scan:run',
    'patient:read',
    'patient:write',
    'encounter:read',
    'encounter:write',
    'audit:read',
    'settings:manage',
    'history:read',
    'recording:delete',
    'ecg:measure',
    'ecg:filter',
    'ecg:annotate',
    'ecg:compare',
    'ecg:export:pdf',
    'ecg:export:raw',
  ],
  clinician: [
    'scan:run',
    'patient:read',
    'patient:write',
    'encounter:read',
    'encounter:write',
    'history:read',
    'recording:delete',
    'ecg:measure',
    'ecg:filter',
    'ecg:annotate',
    'ecg:compare',
    'ecg:export:pdf',
    'ecg:export:raw',
  ],
  technician: [
    'scan:run',
    'patient:read',
    'encounter:read',
    'encounter:write',
    'history:read',
    // Records the study and checks it is usable; does not interpret it.
    'ecg:filter',
    'ecg:export:pdf',
  ],
  patient: [
    'scan:run',
    'patient:read:self',
    'history:read:self',
    // Their own data, their own copy — see the note above.
    'ecg:export:pdf',
    // A patient may DELETE their own recordings (GDPR right to erasure). The
    // server scopes every delete to that patient, so this cannot reach anyone
    // else's record. Mirrored in CYPHIX_SERVER policy/permissions.ts.
    'recording:delete',
  ],
  guest: ['scan:run'],
} as const;

export function roleCan(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// v1.0.0 — Roles + permission matrix, mirrored from the web app 1:1.
