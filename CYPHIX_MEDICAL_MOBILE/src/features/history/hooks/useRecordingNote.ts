/* ==================================================================
   useRecordingNote — save the study-level free-text note.

   Wraps the mutation so the component never touches the API, attaches the
   audit entry in one place, and gates on the annotate permission (a note is
   prose ON a clinical record, so it is written by whoever may annotate it).
   Reuses the `recording:annotate` audit action with detail 'note' — a note
   is an annotation of the whole study, not a new class of action.
   ================================================================== */

import { useCallback } from 'react';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { logAudit } from '@/services/audit/auditLogger';
import { useSetRecordingNoteMutation } from '@/services/api/endpoints/recordingApi';

export interface UseRecordingNoteResult {
  save: (recordingId: string, note: string) => void;
  busy: boolean;
}

export function useRecordingNote(allowed: boolean): UseRecordingNoteResult {
  const user = useCurrentUser();
  const [setNote, state] = useSetRecordingNoteMutation();
  const actorId = user?.id ?? 'anonymous';
  const actorRole = user?.role ?? 'guest';

  const save = useCallback(
    (recordingId: string, note: string) => {
      if (!allowed) return;
      const audit = (ok: boolean) =>
        logAudit({
          actor: { id: actorId, role: actorRole },
          action: 'recording:annotate',
          resourceType: 'EcgRecording',
          resourceId: recordingId,
          outcome: ok ? 'success' : 'failure',
          detail: 'note',
        });
      void setNote({ id: recordingId, note })
        .unwrap()
        .then(() => audit(true))
        .catch(() => audit(false));
    },
    [allowed, setNote, actorId, actorRole],
  );

  return { save, busy: state.isLoading };
}

// v1.0.0 — Saves the study-level clinical note; audited as an annotation with detail 'note'.
