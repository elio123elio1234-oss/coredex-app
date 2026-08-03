/* ==================================================================
   usePortrait — take / choose / remove the patient's portrait.

   The screen gets four things: three actions and one status. Everything
   else — the permission dance, the resize, the encode, the upload, the
   audit entry — happens here, because a component that renders a circle
   should not know what a data-URL is (mobile CLAUDE.md §2).

   ── Three failures, three different answers ──
   • the OS refused the camera/library  → `denied`. The UI explains; it is
     not an error, it is a decision the patient made.
   • the image could not be encoded      → `failed`. Rare (a corrupt file),
     but it must not look like a successful save.
   • the upload failed                   → `failed`, and the optimistic
     cache patch in `photoApi` is rolled back, so the old portrait comes
     back rather than the new one appearing to have stuck.

   A photo saved here is on the SERVER, so it is on the browser too — that
   is the whole reason the portrait moved off the device.
   ================================================================== */

import { useCallback, useState } from 'react';
import { useSetPatientPhotoMutation } from '@/services/api/endpoints/photoApi';
import { logAudit } from '@/services/audit/auditLogger';
import { pickPhoto, takePhoto, toPortraitDataUrl, type PhotoResult } from '@/services/media/photoPicker';
import { useCurrentUser } from '@/features/auth/useCurrentUser';

/** What the last attempt did. `saving` covers resize + encode + upload —
    they are one wait as far as the patient is concerned. */
export type PortraitStatus = 'idle' | 'saving' | 'denied' | 'failed';

export interface Portrait {
  status: PortraitStatus;
  busy: boolean;
  take: () => void;
  pick: () => void;
  remove: () => void;
  /** Dismiss a `denied` / `failed` message once it has been read. */
  clearStatus: () => void;
}

export function usePortrait(patientId: string | null): Portrait {
  const [status, setStatus] = useState<PortraitStatus>('idle');
  const [setPhoto] = useSetPatientPhotoMutation();
  const user = useCurrentUser();

  const audit = useCallback(
    (detail: string, outcome: 'success' | 'failure') => {
      if (!patientId) return;
      logAudit({
        actor: { id: user?.id ?? 'anonymous', role: user?.role ?? 'guest' },
        action: 'patient:update',
        resourceType: 'Patient',
        resourceId: patientId,
        outcome,
        // A reference, never the image itself (web CLAUDE.md §7.2).
        detail,
      });
    },
    [patientId, user],
  );

  const save = useCallback(
    async (photo: string | null, what: string) => {
      if (!patientId) return;
      setStatus('saving');
      try {
        await setPhoto({ patientId, photo }).unwrap();
        setStatus('idle');
        audit(what, 'success');
      } catch {
        setStatus('failed');
        audit(what, 'failure');
      }
    },
    [patientId, setPhoto, audit],
  );

  const handle = useCallback(
    async (result: PhotoResult) => {
      if (result === 'denied') return setStatus('denied');
      if (!result) return; // backed out — not a failure, and not a message
      setStatus('saving');
      const dataUrl = await toPortraitDataUrl(result.uri);
      if (!dataUrl) {
        setStatus('failed');
        audit('portrait encode failed', 'failure');
        return;
      }
      await save(dataUrl, 'portrait set');
    },
    [save, audit],
  );

  return {
    status,
    busy: status === 'saving',
    take: useCallback(() => void takePhoto().then(handle), [handle]),
    pick: useCallback(() => void pickPhoto().then(handle), [handle]),
    remove: useCallback(() => void save(null, 'portrait removed'), [save]),
    clearStatus: useCallback(() => setStatus('idle'), []),
  };
}

// v1.0.0 — Take/choose/remove the server-side portrait, with the three
//          failures the flow can actually produce kept apart.
