/* ==================================================================
   useSaveRecording — persist a finished capture into Scan History.

   ══ SAVES ONCE, AUTOMATICALLY, AND NEVER SILENTLY FAILS ══
   The patient has just held an awkward position for ten seconds with both
   hands occupied. Asking them to then press "Save" is one more chance to
   lose the recording, so the save fires on its own the moment a report
   exists.

   Firing automatically makes idempotency essential: a re-render, an
   orientation change (this screen has one, right at the end of the capture)
   or a Fast Refresh must not produce three copies of the same study. The
   guard is a ref keyed on the capture's timestamp — not component state,
   because state updates are async and two effects can both read "not saved
   yet" before either commits.

   If the save fails (device storage full is the realistic case) the error
   is returned for the UI to show. A recording that did not persist must
   never look like one that did.
   ================================================================== */

import { useEffect, useRef, useState } from 'react';
import type { MeasurementType, RecordingSummary } from '@cyphix/shared';
import type { LimbReport } from '@/features/measurement/hooks/useLimbRecorder';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { logAudit } from '@/services/audit/auditLogger';
import { useCreateRecordingMutation } from '@/services/api/endpoints/recordingApi';

/**
 * Subject used when the principal is not linked to a Patient resource —
 * i.e. someone measuring themselves in the demo. Obviously synthetic (web
 * CLAUDE.md §7.4) and never a real MRN.
 */
export const SELF_SUBJECT = 'Patient/MOCK-SELF';

function summarise(report: LimbReport): RecordingSummary {
  const { analysis } = report;
  return {
    bpm: analysis.rate.bpm,
    sqi: analysis.quality.sqi,
    qrsMs: analysis.intervals.qrsMs,
    qtcMs: analysis.intervals.qtcBazettMs,
    prMs: analysis.intervals.prMs,
    axisDegrees: analysis.axis.degrees,
    beatsAnalyzed: analysis.rate.beatsAnalyzed,
    insufficient: analysis.quality.insufficient,
  };
}

export interface SaveRecordingState {
  saved: boolean;
  saving: boolean;
  error: string | null;
}

export function useSaveRecording(
  report: LimbReport | null,
  type: MeasurementType,
  deviceLabel?: string,
): SaveRecordingState {
  const user = useCurrentUser();
  const [createRecording] = useCreateRecordingMutation();

  /** Timestamps already persisted — survives re-renders, unlike state. */
  const savedKeyRef = useRef<string | null>(null);
  const [state, setState] = useState<SaveRecordingState>({
    saved: false,
    saving: false,
    error: null,
  });

  useEffect(() => {
    if (!report) {
      savedKeyRef.current = null;
      setState({ saved: false, saving: false, error: null });
      return;
    }

    const key = report.recordedAt.toISOString();
    if (savedKeyRef.current === key) return;
    savedKeyRef.current = key; // claim it BEFORE awaiting — see header

    const actor = { id: user?.id ?? 'anonymous', role: user?.role ?? 'guest' };
    const subject = user?.linkedPatientId ? `Patient/${user.linkedPatientId}` : SELF_SUBJECT;
    setState({ saved: false, saving: true, error: null });

    createRecording({
      subject,
      recordedAt: key,
      type,
      sampleRate: report.sampleRate,
      rawLeadI: report.rawLeadI,
      rawLeadII: report.rawLeadII,
      isSimulated: report.isSimulated,
      deviceLabel,
      summary: summarise(report),
    })
      .unwrap()
      .then((saved) => {
        setState({ saved: true, saving: false, error: null });
        logAudit({
          actor,
          action: 'recording:create',
          resourceType: 'EcgRecording',
          resourceId: saved.id,
        });
      })
      .catch((err: unknown) => {
        // Release the claim so a retry (e.g. after freeing storage) can work.
        savedKeyRef.current = null;
        const message =
          typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Could not save the recording.';
        setState({ saved: false, saving: false, error: message });
        logAudit({
          actor,
          action: 'recording:create',
          resourceType: 'EcgRecording',
          outcome: 'failure',
        });
      });
  }, [report, type, deviceLabel, user, createRecording]);

  return state;
}

// v1.0.0 — Auto-persists a finished capture into Scan History, once, with audit
//          and a surfaced failure.
