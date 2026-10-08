/* ==================================================================
   useConsents — what this account has accepted (Settings → About), and
   the one action: accept what is missing or outdated, now. The mobile
   twin of the web hook of the same name.

   `missing` is judged against the versions THE SERVER says are current,
   so a server that moved ahead of this build is answered honestly
   ("accepted an older text") rather than "all good".
   ================================================================== */

import { useCallback, useState } from 'react';
import {
  AuthError,
  LEGAL_DOCS,
  missingConsents,
  type AuthErrorCode,
  type ConsentRecord,
  type ConsentsResult,
  type LegalDocId,
} from '@cyphix/shared';
import { authService } from '@/services/auth/authService';

export type ConsentsStatus = 'idle' | 'loading' | 'success' | 'error';

const CURRENT_HERE: Record<LegalDocId, string> = {
  terms: LEGAL_DOCS.terms.version,
  privacy: LEGAL_DOCS.privacy.version,
};

export function useConsents() {
  const [status, setStatus] = useState<ConsentsStatus>('idle');
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [current, setCurrent] = useState<Record<LegalDocId, string>>(CURRENT_HERE);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = (r: ConsentsResult) => {
    setConsents(r.consents);
    setCurrent(r.current);
  };

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      apply(await authService.listConsents());
      setStatus('success');
    } catch (err) {
      setError(err instanceof AuthError ? err.code : 'unknown');
      setStatus('error');
    }
  }, []);

  /** Accept every document that is missing or outdated, at the versions
      this build knows. Resolves with how many were recorded. */
  const acceptMissing = useCallback(async () => {
    setBusy(true);
    try {
      const docs = missingConsents(consents, current);
      for (const doc of docs) {
        await authService.recordConsent({ doc, version: CURRENT_HERE[doc] });
      }
      apply(await authService.listConsents());
      return docs.length;
    } finally {
      setBusy(false);
    }
  }, [consents, current]);

  return {
    status,
    consents,
    current,
    error,
    busy,
    missing: missingConsents(consents, current),
    load,
    acceptMissing,
  };
}

// v1.0.0 — Consent on record + "accept what is missing" (server v0.13.0).
