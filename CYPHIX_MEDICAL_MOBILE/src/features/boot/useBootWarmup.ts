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

     2. **The first delta landed — ONLY on a device that has nothing.**
        ⚠️ v1.0.0 waited for this on EVERY launch, and that was wrong.
        Reported immediately: *"the server is already up and on the fifth
        launch it still takes 5-6 seconds."* It did, and this was most of
        it — a sync is a round trip for the delta and two more for the
        card and the portrait, all of them AFTER the revalidation, none
        of them changing a single pixel of what was about to be drawn.

        It was put there to stop History spinning on arrival. That reason
        died in the same release it was written in: the RefreshControl fix
        made a background sync SILENT on both screens, so the delta can
        land behind a rendered app with nothing to see. Waiting for it was
        buying something already paid for.

        So it is waited for in exactly one case: `getCursor('recordings')`
        is null, i.e. this device has never synced, and the app would
        otherwise open on an empty History with a skeleton in it. Once
        there is a mirror, the list is on disk and the delta is somebody
        else's job — `SyncProvider`'s ①, which runs a few milliseconds
        after this releases.

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
import { markBoot } from '@/services/boot/bootTimeline';
import { runSync } from '@/services/sync/syncEngine';
import { getCursor } from '@/services/sync/syncState';
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

  /**
   * Has this device ever synced? `null` until the answer is back.
   *
   * One AsyncStorage read, started on mount rather than when it is
   * needed, so it is already resolved by the time the server answers and
   * adds nothing to the launch. It is the same cursor `syncRecordings`
   * reads to decide snapshot-vs-merge, so the two cannot disagree about
   * what "this device has nothing" means.
   */
  const [hasMirror, setHasMirror] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getCursor('recordings')
      .then((cursor) => {
        if (!cancelled) setHasMirror(cursor !== null);
      })
      .catch(() => {
        /* A storage read that fails is not a reason to hold a splash.
           Treat it as "has a mirror": the worst case is History showing
           its skeleton for a moment, which is a state it is built for. */
        if (!cancelled) setHasMirror(true);
      });
    return () => {
      cancelled = true;
    };
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
      if (revalidatedOnce) {
        markBoot('server');
        finish();
      }
      return;
    }
    markBoot('server');

    /* ★ The device already has a list. Go — the delta lands behind the
       rendered app, silently, and nothing on screen is waiting for it.
       This branch is the whole difference between v1.0.0's launch and
       this one; see the header. */
    if (hasMirror === null) return; // one storage read, milliseconds
    if (hasMirror) {
      finish();
      return;
    }

    /* Never synced. The app would open on an empty History with a
       skeleton in it, which is the one case where holding buys something
       real. `finally`, not `then`: a sync that fails must not hold the
       splash — the whole design of the engine is that a failed run
       changes nothing. */
    let cancelled = false;
    void runSync({ dispatch, userId, patientId }).finally(() => {
      if (!cancelled) {
        markBoot('data');
        finish();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [active, sessionMode, revalidatedOnce, hasMirror, userId, patientId, dispatch, finish]);

  /* `|| !active` so the signed-out world is never gated by this — and
     `ready` latching is what stops it re-gating a running app. */
  return ready || !active;
}

// v1.1.0 — Waits for the first sync ONLY on a device that has never synced.
//           v1.0.0 waited on every launch and that was most of the "still 5-6
//           seconds with the server already up": three round trips after the
//           revalidation, none of which changed a pixel of what was about to be
//           drawn. The reason for waiting — History spinning on arrival — was
//           removed by the RefreshControl fix in the same release.
// v1.0.0 — Holds the boot splash until the server has answered and the first
//          delta has landed, with a 15 s ceiling that drops the app into
//          offline mode. Replaces three loading states that used to appear
//          one after another over an app that had already opened.
