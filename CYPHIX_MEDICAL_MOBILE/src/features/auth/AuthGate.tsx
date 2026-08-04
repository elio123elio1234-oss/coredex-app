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
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { restoreSession } from './authSlice';

/** The reference's splash duration — long enough for the trace to draw
    itself and the wordmark to land. */
const SPLASH_MS = 1700;
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

  const stillChecking = status === 'restoring' && !gaveUp;
  if (!splashDone || stillChecking) return <BootSplash />;

  return user && !justRegistered ? <>{children}</> : <OnboardingScreen />;
}

// v1.2.0 — Hands the image warm-up to App.tsx: this effect runs behind
//          PreferencesGate, i.e. later than the images can be asked for.
// v1.1.0 — Warms the welcome photograph inside the splash it already holds,
//          so the first screen is not navy for a beat before its background.
// v1.0.0 — Splash → onboarding → app, with a floor and a ceiling on the wait.
