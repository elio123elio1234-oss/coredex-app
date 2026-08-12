/* ==================================================================
   AuthGate — four states, in the order the patient meets them:

     restoring  → the splash
     locked     → the app lock (a restored session, not yet proved)
     signed out → the onboarding flow
     signed in  → the app

   ══ WHAT CHANGED IN v2.0.0, AND WHY IT WAS A REAL DEFECT ══
   Reported from the phone: "close the app for a while, open it again and
   it throws me straight to the sign-in screen — and it only signs me in
   once the server wakes up."

   Both halves were this file plus the two below it. `restoreSession`
   used to AWAIT a token refresh, so a cold start with no signal — or,
   far more often here, one against a Render container that was still
   waking up — resolved to null and this gate showed the door. And
   because the ceiling below fired at 4 s while that request was still in
   flight, the app went to onboarding first and then, forty seconds
   later, quietly swapped itself for the app when the server finally
   answered. Exactly what was described.

   Restore is now a DISK READ (`HttpAuthService.restore`): it resolves in
   milliseconds regardless of the network, and this gate opens on it.
   Whether the server still agrees is settled afterwards, in the
   background, by `revalidateSession` — and only a REJECTION ends a
   session. Offline is not signed-out; the reasoning is written out in
   @cyphix/shared `auth/session.ts`.

   ── Why the splash has a MINIMUM ──
   Reading the session off the device takes a few milliseconds, so
   without a floor the splash would appear for two frames and vanish —
   which reads as a glitch, not as a brand.

   ── And why it also has a CEILING ──
   Same principle as `PreferencesGate`: if STORAGE hangs, the app opens
   signed out rather than staying on a splash forever. Note what this
   ceiling no longer guards against: it used to be racing a network
   request, which is why it kept firing. Now the only thing behind it is
   the enclave, so it is a genuine last resort rather than a routine
   event.
   ================================================================== */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AppLockScreen from '@/components/organisms/Auth/AppLockScreen';
import BootSplash from '@/components/organisms/Auth/BootSplash';
import OnboardingScreen from '@/screens/OnboardingScreen';
import { claimCacheFor } from '@/services/db/cacheOwner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { appRelocked, appUnlocked, logoutUser, restoreSession, revalidateSession } from './authSlice';

/**
 * Floor on how long the splash stays up.
 *
 * It was 1700 ms because the splash used to ANIMATE — long enough for the
 * trace to draw itself and the wordmark to land. That entrance is gone
 * (BootSplash is now the web's static wordmark), so the only job left is
 * not flickering: a screen that appears and vanishes reads as a fault.
 * ~900 ms does that and gives back three quarters of a second of every
 * cold start. Leaving 1700 would be a magic number whose reason had been
 * deleted out from under it.
 */
const SPLASH_MS = 900;
/** Longest we will wait for the DEVICE to answer before giving up on it.
    No longer a bound on any network call — see the header. */
const RESTORE_TIMEOUT_MS = 4000;

/**
 * How long the app may sit in the background before the lock goes back up.
 *
 * ★ Not zero, and that is a considered trade rather than laxity. Half of
 * what people do in this app involves leaving it for a few seconds — a
 * one-time code in Messages, a photo in the camera roll, a phone call
 * from the clinic — and a lock that fires on every one of those gets
 * switched off within a day, which protects nothing. A minute is long
 * enough to cover the errand and short enough that a phone left on a
 * table is locked by the time anyone picks it up.
 */
const RELOCK_AFTER_BACKGROUND_MS = 60_000;

export function AuthGate({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const user = useAppSelector((s) => s.auth.user);
  const locked = useAppSelector((s) => s.auth.locked);
  /* Registration writes the account — and therefore the user — one screen
     BEFORE the flow is over. Without this the app would appear over the
     top of "Profile created" and nobody would ever see it. */
  const justRegistered = useAppSelector((s) => s.auth.justRegistered);
  const [splashDone, setSplashDone] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  /**
   * The account the DEVICE'S CACHED DATA has been confirmed to belong to.
   *
   * ★ This gate is the last point before the app can read anything off the
   * disk, so it is where the ownership check has to happen. The sync engine
   * checks too, but it runs from an effect INSIDE the app — by then History
   * has already mounted and asked the mirror for a list, and if the
   * previous user's record were still there it would have rendered it.
   * One frame is one frame too many for that.
   */
  const [cacheOwner, setCacheOwner] = useState<string | null>(null);
  /** Wall-clock instant the app was last backgrounded, for the relock. */
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    void dispatch(restoreSession());
    /* The photographs are NOT warmed from here any more. This effect runs
       behind `PreferencesGate`'s storage read, and by then part of the
       splash — the dead time the fetches are meant to hide inside — is
       already spent. `App.tsx` starts them at module scope instead;
       see services/media/imagePreload.ts. */
    const splash = setTimeout(() => setSplashDone(true), SPLASH_MS);
    const ceiling = setTimeout(() => setGaveUp(true), RESTORE_TIMEOUT_MS);
    return () => {
      clearTimeout(splash);
      clearTimeout(ceiling);
    };
  }, [dispatch]);

  /* Runs the instant an account resolves — on boot inside the splash it is
     already holding, and on a mid-session sign-in before the app appears.
     A wipe only happens when the account actually changed, so for the
     common case this is one AsyncStorage read. */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void claimCacheFor(user.id).then(() => {
      if (!cancelled) setCacheOwner(user.id);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  /**
   * Ask the server whether the restored session is still real.
   *
   * ★ Fired ONCE per account, and deliberately not awaited by anything on
   * screen. The app is already rendering by the time this runs; if it
   * comes back `refreshed` the connection strip goes quiet, if it comes
   * back `offline` the strip says so and nothing else changes, and if it
   * comes back `rejected` the slice drops the principal and the patient
   * lands on the sign-in screen — which is the one case where being
   * interrupted is correct, because the session genuinely ended.
   */
  useEffect(() => {
    if (!user || locked) return;
    void dispatch(revalidateSession());
  }, [dispatch, user?.id, locked]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Back from the background: put the lock up if we were away long
     enough, and re-ask the server either way. A phone that has been in a
     pocket for an hour is the most likely moment for a session to have
     been revoked elsewhere, and the cheapest moment to find out. */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        const away = backgroundedAt.current;
        backgroundedAt.current = null;
        if (away !== null && Date.now() - away >= RELOCK_AFTER_BACKGROUND_MS) {
          dispatch(appRelocked());
          /* Locked: asking the server now would put a network call behind
             a screen the patient has not passed. The unlock re-runs the
             effect above, which asks then. */
          return;
        }
        /* ★ Ask again on every return, not only the first.
           The boot revalidation runs once per account, so an app that
           opened while the server was asleep would otherwise sit on
           "offline" until something else happened to make a request. This
           is the cheapest possible retry — one call, only when someone is
           actually looking at the app — and it is also the moment a
           session is most likely to have been revoked somewhere else. */
        dispatch(revalidateSession());
        return;
      }
      /* `inactive` is the iOS app switcher and the incoming-call banner —
         a state the app passes THROUGH, not one it rests in. Stamping the
         clock there as well is harmless (the first stamp wins, because a
         return to `active` is what clears it) and catches the transitions
         that skip `background` entirely. */
      backgroundedAt.current ??= Date.now();
    });
    return () => sub.remove();
  }, [dispatch]);

  const unlock = useCallback(() => dispatch(appUnlocked()), [dispatch]);
  const signOutFromLock = useCallback(() => {
    void dispatch(logoutUser());
  }, [dispatch]);

  const stillChecking = status === 'restoring' && !gaveUp;
  if (!splashDone || stillChecking) return <BootSplash />;

  const signedIn = user && !justRegistered;
  /* Holding the splash rather than rendering the app: see `cacheOwner`.
     Not gated by the ceiling above, because "give up and show the app
     anyway" would mean showing it over data whose owner is unverified —
     and `claimCacheFor` cannot hang on anything but a storage read it
     already handles the failure of. */
  if (signedIn && cacheOwner !== user.id) return <BootSplash />;

  /* ★ BEFORE `children`, and before the navigator mounts. A lock rendered
     over an app that has already mounted is a lock with the record drawn
     underneath it — one screenshot, one dismissed overlay, one race on a
     slow device and it is not a lock at all. */
  if (signedIn && locked) {
    return (
      <AppLockScreen
        displayName={user.displayName}
        onUnlocked={unlock}
        onSignOut={signOutFromLock}
      />
    );
  }

  return signedIn ? <>{children}</> : <OnboardingScreen />;
}

// v2.0.0 — Opens on the session the ENCLAVE holds instead of waiting for a
//          refresh to come back. A cold start with no signal, or against a
//          server still waking up, no longer lands on the sign-in screen and no
//          longer "suddenly signs in" forty seconds later. Revalidation runs
//          behind the rendered app; only a rejection ends a session. Adds the
//          app lock, in front of `children` rather than over them, and puts it
//          back up after a spell in the background.
// v1.3.0 — Confirms who the device's cached data belongs to before letting the
//          app render over it: a different account is wiped inside the splash,
//          not after History has already drawn the previous patient's list.
// v1.2.0 — Hands the image warm-up to App.tsx: this effect runs behind
//          PreferencesGate, i.e. later than the images can be asked for.
// v1.1.0 — Warms the welcome photograph inside the splash it already holds,
//          so the first screen is not navy for a beat before its background.
// v1.0.0 — Splash → onboarding → app, with a floor and a ceiling on the wait.
