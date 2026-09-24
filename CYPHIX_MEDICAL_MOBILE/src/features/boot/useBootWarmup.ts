/* ==================================================================
   useBootWarmup — the last thing the splash waits for, and the reason
   there is now exactly ONE loading surface at launch.

   ══ WHAT WAS WRONG ══
   Reported from the phone, and it was four loading states in a row for
   one cold start:

     ① the splash, with the orb
     ② a "connecting…" line under the status bar, once the app had
        already rendered, while the server woke up
     ③ a spinner at the top of History — with no pull, on arrival
     ④ a gap at the top of Profile, from the same cause (see both
        screens' RefreshControl blocks)

   Each one was individually defensible and together they read as an app
   that could not decide whether it had finished opening. The instruction
   was plain: *hold the first loading screen, let all of that happen
   behind it, and bring the app up when the server is up — and if the
   server has not answered within 15 seconds, come up offline instead.*

   ══ WHAT THIS WAITS FOR ══
   Two things, in order, and nothing else:

     1. **The server answered.** `auth.sessionMode === 'live'` is set by
        `httpBaseQuery` on the first successful request, so it is evidence
        rather than a guess. The revalidation that produces it is
        dispatched by `AuthGate`; this hook only watches for the result.

     2. **The first delta landed.** `runSync` once, awaited. Without it
        the app opens on the device's mirror and History fills in a moment
        later — which is ③ again, just moved. The engine is single-flight
        and throttled, so `SyncProvider`'s own boot run (mounted a moment
        after this releases) joins nothing and asks nothing.

   ══ AND WHAT MAKES IT GIVE UP ══
   • **15 s**, the number asked for. A free-tier container takes ~50 s to
     wake from cold, so this ceiling WILL be hit on the first launch of
     the day, and it is meant to be: the app comes up on the device's own
     copy, the connection strip says `offline`, and the backoff in
     `AuthGate` keeps knocking. Offline is not an error here, it is the
     documented second-best outcome.
   • **An answer that is not `live`.** If the revalidation settles and we
     are still not live, the server is not coming — from a tunnel, from
     airplane mode, from a 500. Waiting out the remaining 13 seconds for a
     question already answered is the opposite of responsive.
   • **No backend configured.** Nothing to wait for; ready on the first
     render.

   ⚠️ IT HOLDS ONLY THE FIRST PASS. `ready` latches, so nothing here can
   ever put a splash back over an app that has already rendered — the
   failure mode that made v0.40.2's gate swap the screen out from under
   somebody forty seconds in.
   ================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ENV } from '@/config/env';
import { useActivePatientId } from '@/features/auth/useActivePatientId';
import { runSync } from '@/services/sync/syncEngine';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/**
 * The whole launch budget, start to finish.
 *
 * ★ Asked for as 15 s, and it is deliberately NOT the 60 s that
 * `AuthGate`'s `RECOVERY_TIMEOUT_MS` spends. That one is buying something
 * expensive — not showing a sign-in door to somebody who is already
 * signed in — and a minute is worth it once per install. This one is
 * buying a nicer first paint, and the fallback is the app itself,
 * working, on data it already has. Fifteen seconds is the most that is
 * worth paying for polish.
 */
const BOOT_WARMUP_MS = 15_000;

/**
 * @param active Whether the app is at the point where this wait applies:
 *   somebody is signed in, the device's cache has been confirmed to be
 *   theirs, and there is no lock screen in front. While false the hook
 *   holds nothing — a sign-in screen has no server to wait for.
 * @returns whether the app may render.
 */
export function useBootWarmup(active: boolean): boolean {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.auth.user?.id ?? null);
  const patientId = useActivePatientId();
  const sessionMode = useAppSelector((s) => s.auth.sessionMode);
  const revalidatedOnce = useAppSelector((s) => s.auth.revalidatedOnce);

  /* A ref beside the state, because both effects below have to be able to
     ask "are we already done" synchronously — a second `setReady` is
     harmless, but re-running the sync from a re-render is not. */
  const done = useRef(!ENV.hasBackend);
  const [ready, setReady] = useState(done.current);
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setReady(true);
  }, []);

  /* The ceiling. Armed once, when the wait actually begins. */
  useEffect(() => {
    if (!active || done.current) return;
    const timer = setTimeout(finish, BOOT_WARMUP_MS);
    return () => clearTimeout(timer);
  }, [active, finish]);

  useEffect(() => {
    if (!active || done.current || !userId) return;

    if (sessionMode !== 'live') {
      /* Asked and answered, and the answer was not a server. Come up now
         rather than at the ceiling. */
      if (revalidatedOnce) finish();
      return;
    }

    /* Live. One delta before the app draws, so History opens on the same
       list it would have shown a second later anyway. `finally`, not
       `then`: a sync that fails must not hold the splash — the whole
       design of the engine is that a failed run changes nothing. */
    let cancelled = false;
    void runSync({ dispatch, userId, patientId }).finally(() => {
      if (!cancelled) finish();
    });
    return () => {
      cancelled = true;
    };
  }, [active, sessionMode, revalidatedOnce, userId, patientId, dispatch, finish]);

  /* `|| !active` so the signed-out world is never gated by this — and
     `ready` latching is what stops it re-gating a running app. */
  return ready || !active;
}

// v1.0.0 — Holds the boot splash until the server has answered and the first
//          delta has landed, with a 15 s ceiling that drops the app into
//          offline mode. Replaces three loading states that used to appear
//          one after another over an app that had already opened.
