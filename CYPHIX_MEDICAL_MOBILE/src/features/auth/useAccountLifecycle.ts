/* ==================================================================
   useAccountLifecycle — Settings → Privacy "Export my data" and
   Settings → Account "Delete account" (server v0.14.0, LAUNCH_PLAN 1.9).
   The web hook, on a phone: the export is fetched as ONE JSON document
   and handed to the OS share sheet (Files, Mail, AirDrop…) instead of a
   browser download; deletion is request / status / cancel, unchanged.
   Async is modelled (`idle|busy|done|error`), never guessed.
   ================================================================== */

import { useCallback, useState } from 'react';
import {
  AuthError,
  accountExportFilename,
  type AuthErrorCode,
  type DeletionStatus,
} from '@cyphix/shared';
import { authService } from '@/services/auth/authService';
import { shareFile } from '@/services/export/recordingExport';

export type ExportState = 'idle' | 'busy' | 'done' | 'error';
export type DeletionLoadState = 'idle' | 'loading' | 'success' | 'error';

export function useAccountLifecycle() {
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [deletion, setDeletion] = useState<DeletionStatus | null>(null);
  const [deletionState, setDeletionState] = useState<DeletionLoadState>('idle');
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [busy, setBusy] = useState(false);

  const loadDeletion = useCallback(async () => {
    setDeletionState('loading');
    setError(null);
    try {
      setDeletion(await authService.deletionStatus());
      setDeletionState('success');
    } catch (err) {
      setError(err instanceof AuthError ? err.code : 'unknown');
      setDeletionState('error');
    }
  }, []);

  /** Fetch the document and offer it through the OS share sheet. `done`
      only when the sheet took it; a dismissed or unavailable sheet is
      not a delivery. */
  const exportAndShare = useCallback(async (dialogTitle: string) => {
    setExportState('busy');
    try {
      const doc = await authService.exportData();
      const r = await shareFile(
        accountExportFilename(doc.exportedAt),
        JSON.stringify(doc, null, 2),
        'application/json',
        dialogTitle,
      );
      setExportState(r.shared ? 'done' : 'idle');
    } catch {
      setExportState('error');
    }
  }, []);

  /** Rejects with an AuthError (`wrong-password`); the sheet says so. */
  const requestDeletion = useCallback(async (password: string) => {
    setBusy(true);
    try {
      const status = await authService.requestDeletion({ password });
      setDeletion(status);
      return status;
    } finally {
      setBusy(false);
    }
  }, []);

  const cancelDeletion = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setDeletion(await authService.cancelDeletion());
    } catch (err) {
      setError(err instanceof AuthError ? err.code : 'unknown');
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    exportState,
    exportAndShare,
    deletion,
    deletionState,
    error,
    busy,
    loadDeletion,
    requestDeletion,
    cancelDeletion,
  };
}

// v1.0.0 — Export via the share sheet + scheduled deletion (request / status / cancel), server v0.14.0.
