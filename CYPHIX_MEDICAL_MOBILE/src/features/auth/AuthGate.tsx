/* ==================================================================
   AuthGate — three states, in the order the patient meets them:

     restoring  → the navy splash
     signed out → the onboarding flow
     signed in  → the app

   ── Why the splash has a MINIMUM, not just a maximum ──
   Reading the session off the device takes a few milliseconds, so
   without a floor the splash would appear for two frames and vanish —
   which reads as a glitch, not as a brand. The reference holds it for
   1.7 s; so do we, and the session check runs inside that window rather
   than after it.

   ── And why it also has a CEILING ──
   Same principle as `PreferencesGate`: if storage hangs, the app opens
   signed out rather than staying on a splash forever. A patient who has
   to sign in again is inconvenienced; a patient staring at a logo has a
   broken app.
   ================================================================== */

import { useEffect, useState, type ReactNode } from 'react';
import BootSplash from '@/components/organisms/Auth/BootSplash';
import OnboardingScreen from '@/screens/OnboardingScreen';
import { claimCacheFor } from '@/services/db/cacheOwner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { restoreSession } from './authSlice';

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
/** Longest we will wait for the device to answer before giving up on it. */
const RESTORE_TIMEOUT_MS = 4000;

export function AuthGate({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const user = useAppSelector((s) => s.auth.user);
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

  useEffect(() => {
    void dispatch(restoreSession());
    /* The photographs are NOT warmed from here any more. This effect runs
       behind `PreferencesGate`'s storage read, and by then part of the
       1.7 s splash — the dead time the fetches are meant to hide inside —
       is already spent. `App.tsx` starts them at module scope instead;
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

  const stillChecking = status === 'restoring' && !gaveUp;
  if (!splashDone || stillChecking) return <BootSplash />;

  const signedIn = user && !justRegistered;
  /* Holding the splash rather than rendering the app: see `cacheOwner`.
     Not gated by the ceiling above, because "give up and show the app
     anyway" would mean showing it over data whose owner is unverified —
     and `claimCacheFor` cannot hang on anything but a storage read it
     already handles the failure of. */
  if (signedIn && cacheOwner !== user.id) return <BootSplash />;

  return signedIn ? <>{children}</> : <OnboardingScreen />;
}

// v1.3.0 — Confirms who the device's cached data belongs to before letting the
//          app render over it: a different account is wiped inside the splash,
//          not after History has already drawn the previous patient's list.
// v1.2.0 — Hands the image warm-up to App.tsx: this effect runs behind
//          PreferencesGate, i.e. later than the images can be asked for.
// v1.1.0 — Warms the welcome photograph inside the splash it already holds,
//          so the first screen is not navy for a beat before its background.
// v1.0.0 — Splash → onboarding → app, with a floor and a ceiling on the wait.
