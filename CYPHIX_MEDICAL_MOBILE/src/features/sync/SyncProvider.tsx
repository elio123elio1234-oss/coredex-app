/* ==================================================================
   SyncProvider — when the device asks the server what changed.

   The engine knows HOW to sync. This decides WHEN, and there are exactly
   four moments:

     ① the account resolves (boot, or a sign-in)
     ② the app returns to the foreground
     ③ someone pulls to refresh
     ④ the session goes LIVE after having been offline

   No timer, no polling. A phone that is in a pocket has nothing to learn
   and every wake-up costs battery and a radio cycle; the moment the screen
   comes back is the moment the answer starts mattering again, and that is
   ② for free. ① and ② are throttled inside the engine so a patient
   flicking between apps does not turn into a request per flick.

   ── Why it sits INSIDE AuthGate ──
   Every question it asks is scoped to an account. Mounted above the gate
   it would fire once with no user, once more when the user arrived, and
   the first of those would be a request the server correctly refuses.

   ── Signing out does NOT clear the cache ──
   Deliberate. The same person signing back into their own phone should
   find their history already there, and `claimFor` in the engine wipes
   the moment a DIFFERENT account appears. Erasing on sign-out would trade
   that for nothing: it is the same device, the same sandbox, and the
   tokens — the part that actually grants access — are cleared either way.
   ================================================================== */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { ENV } from '@/config/env';
import { useActivePatientId } from '@/features/auth/useActivePatientId';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import {
  getSyncStatus,
  runSync,
  subscribeToSync,
  type SyncStatus,
} from '@/services/sync/syncEngine';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export interface SyncContextValue extends SyncStatus {
  /** Ask now, ignoring the throttle. For pull-to-refresh. */
  refresh: () => Promise<void>;
  /** False with no backend configured — nothing to sync against. */
  enabled: boolean;
}

export const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const user = useCurrentUser();
  const patientId = useActivePatientId();
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus);
  /* The transport moves this in both directions on every request, which is
     what makes it usable as a reconnection edge (`ConnectionStrip` v1.2.0
     has the post-mortem on why the sync engine's own phase is not). */
  const sessionMode = useAppSelector((s) => s.auth.sessionMode);

  const enabled = ENV.hasBackend && !!user;
  const userId = user?.id ?? null;

  /* The engine's status lives outside React (it must — a sync started by a
     foreground event outlives whatever screen was mounted when it began).
     This is the one subscription that brings it back in. */
  useEffect(() => subscribeToSync(setStatus), []);

  // ① the account resolved, or changed
  useEffect(() => {
    if (!enabled || !userId) return;
    void runSync({ dispatch, userId, patientId });
  }, [dispatch, enabled, userId, patientId]);

  // ② back from the background
  useEffect(() => {
    if (!enabled || !userId) return;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void runSync({ dispatch, userId, patientId });
    });
    return () => sub.remove();
  }, [dispatch, enabled, userId, patientId]);

  /* ④ the server came back.
     ★ Added with the boot warm-up, and it is the other half of it. The
     warm-up holds the splash for at most 15 s; a free-tier container that
     takes ~50 s to wake therefore loses that race, and the app opens
     offline by design. `AuthGate`'s backoff keeps knocking and eventually
     lands — and before this, NOTHING followed that up. The session went
     live, the connection strip went quiet, and the device kept showing a
     mirror it had not been able to refresh, until the throttle expired or
     somebody backgrounded the app. An app that has just been told it can
     reach the server and does not ask it anything is the offline bug
     wearing a different hat.

     EDGE-triggered, on the transition only, so a live session that stays
     live schedules nothing. `manual` to skip the throttle: the failed
     attempt a moment ago is what set `lastAttemptAt`, and honouring a
     throttle armed by a failure would mean waiting out a minute for
     nothing. One reconnection, one sync. */
  const wasLive = useRef(sessionMode === 'live');
  useEffect(() => {
    const live = sessionMode === 'live';
    const reconnected = live && !wasLive.current;
    wasLive.current = live;
    if (!reconnected || !enabled || !userId) return;
    void runSync({ dispatch, userId, patientId, manual: true });
  }, [sessionMode, dispatch, enabled, userId, patientId]);

  // ③ pull-to-refresh
  const refresh = useCallback(async () => {
    if (!enabled || !userId) return;
    await runSync({ dispatch, userId, patientId, manual: true });
  }, [dispatch, enabled, userId, patientId]);

  const value = useMemo<SyncContextValue>(
    () => ({ ...status, refresh, enabled }),
    [status, refresh, enabled],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

// v1.1.0 — Adds a fourth trigger: the session going LIVE after being offline.
//          The boot warm-up gives the server 15 s and then opens the app
//          offline on purpose, so the reconnection that follows is now the
//          normal case — and nothing used to act on it.
// v1.0.0 — Runs the sync engine on sign-in, on foreground, and on demand.
