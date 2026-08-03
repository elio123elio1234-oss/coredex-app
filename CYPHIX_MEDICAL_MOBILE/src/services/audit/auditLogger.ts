/* ==================================================================
   Audit Logger — "Who / What / Which record / When".

   Web CLAUDE.md §7.2 applies here verbatim (root CLAUDE.md §3.4): every
   create / read-of-sensitive / update / delete / export goes through this.
   Today it prints a structured line and keeps a bounded in-memory ring
   buffer, exactly as the web placeholder does; when the server owns the
   audit table this becomes one POST and no caller changes.

   ⚠️ NEVER pass PII values here — log REFERENCES (resourceType + id), not
   contents. The `detail` field is for a machine-ish discriminator like
   'csv' or 'move', not for a note's text.
   ================================================================== */

export type AuditOutcome = 'success' | 'failure';

export interface AuditActor {
  id: string;
  role: string;
}

/** The actions this app can take. A closed set, so a typo is a type error. */
export type AuditAction =
  /* Who came in and who left. The actor is the account id + role — never
     the address they typed, and never anything from the password field. */
  | 'auth:login'
  | 'auth:logout'
  /* A change to the medical record itself — today only the portrait, which
     IS part of the record (it is stored inside the encrypted health
     profile, not beside it). Logged as a reference, never the image. */
  | 'patient:update'
  | 'recording:read'
  | 'recording:create'
  | 'recording:delete'
  | 'recording:export'
  | 'recording:annotate'
  | 'scan:start'
  | 'scan:stop';

export interface AuditEntry {
  timestamp: string;
  actor: AuditActor;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  outcome: AuditOutcome;
  detail?: string;
}

const RING_CAPACITY = 500;
const ring: AuditEntry[] = [];

export interface LogAuditInput {
  actor: AuditActor;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  outcome?: AuditOutcome;
  detail?: string;
}

/** Record a single audit event. */
export function logAudit(input: LogAuditInput): AuditEntry {
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    actor: input.actor,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    outcome: input.outcome ?? 'success',
    detail: input.detail,
  };

  ring.push(entry);
  if (ring.length > RING_CAPACITY) ring.shift();

  /* The one sanctioned console sink in this app, matching the web's
     `utils/logger` role (web CLAUDE.md §9: no console.log in committed code
     EXCEPT the logger and this file). */
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.info(
      `[AUDIT] ${entry.actor.role}:${entry.actor.id} ${entry.action} ` +
        `${entry.resourceType ?? '-'}/${entry.resourceId ?? '-'} → ${entry.outcome}` +
        (entry.detail ? ` (${entry.detail})` : ''),
    );
  }

  return entry;
}

/**
 * Wrap a critical action so audit logging cannot be forgotten.
 * Logs success on resolve, failure on throw, then re-throws.
 */
export async function withAudit<T>(
  meta: Omit<LogAuditInput, 'outcome'>,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    const result = await fn();
    logAudit({ ...meta, outcome: 'success' });
    return result;
  } catch (err) {
    logAudit({
      ...meta,
      outcome: 'failure',
      detail: err instanceof Error ? err.message : 'unknown error',
    });
    throw err;
  }
}

/** Read-only snapshot of the in-memory buffer (future Audit view). */
export function getAuditTrail(): readonly AuditEntry[] {
  return [...ring];
}

// v1.1.0 — Adds auth:login / auth:logout to the action set, so who came in
//          and who left is on the same trail as who read a recording.
// v1.1.0 — Adds patient:update — the portrait is part of the medical record
//          (it lives inside the encrypted health profile), so changing it is
//          an audited event. The reference is logged, never the image.
// v1.0.0 — Audit logger + withAudit() wrapper, mirroring the web placeholder
//          (references only, never PII).
