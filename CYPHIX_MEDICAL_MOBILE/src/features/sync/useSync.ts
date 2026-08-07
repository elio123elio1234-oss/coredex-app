/* ==================================================================
   useSync — what a screen is allowed to know about syncing.

   Almost nothing, on purpose. Data arrives through the ordinary RTK Query
   hooks whether it came from the disk or the wire; the only things a
   screen legitimately needs are "make it check now" (pull-to-refresh) and
   "are we currently unable to reach the server", because the second one is
   the difference between an empty list that means *you have no recordings*
   and an empty list that means *we could not ask*.

   Outside a `SyncProvider` — which is every screen in the signed-out flow
   — this returns a disabled, permanently idle value rather than throwing.
   A sign-in screen has nothing to sync and should not have to know that.
   ================================================================== */

import { useContext } from 'react';
import { SyncContext, type SyncContextValue } from './SyncProvider';

const DISABLED: SyncContextValue = {
  phase: 'idle',
  lastSyncAt: null,
  lastError: null,
  enabled: false,
  refresh: async () => {},
};

export function useSync(): SyncContextValue {
  return useContext(SyncContext) ?? DISABLED;
}

// v1.0.0 — Screen-facing sync state: refresh, phase, last error.
