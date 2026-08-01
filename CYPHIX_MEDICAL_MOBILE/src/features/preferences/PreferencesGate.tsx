/* ==================================================================
   PreferencesGate — loads the saved preferences before the UI paints,
   and writes them back whenever they change.

   ── WHY IT GATES ──
   Rendering the app light and then repainting it dark a frame later is
   the same class of bug as the exam's rotation flicker: the user sees
   the app change its mind. `null` for one frame is honest and invisible;
   a flash of the wrong theme is not.

   The gate is a hard cap, not a promise: if storage hangs, the app opens
   on defaults rather than staying blank.
   ================================================================== */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { hydrate, readPreferences, writePreferences } from './preferencesSlice';

/** Longest we will hold the first paint waiting on a disk read. */
const HYDRATE_TIMEOUT_MS = 600;

export function PreferencesGate({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const prefs = useAppSelector((s) => s.preferences);
  const [ready, setReady] = useState(false);
  /* Do not write the defaults back over the file we are still reading. */
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const finish = (saved: Awaited<ReturnType<typeof readPreferences>>) => {
      if (cancelled || hydrated.current) return;
      hydrated.current = true;
      if (saved) dispatch(hydrate(saved));
      setReady(true);
    };

    const timer = setTimeout(() => finish(null), HYDRATE_TIMEOUT_MS);
    void readPreferences().then((saved) => {
      clearTimeout(timer);
      finish(saved);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!hydrated.current) return;
    void writePreferences(prefs);
  }, [prefs]);

  return ready ? <>{children}</> : null;
}

// v1.0.0 — Hydrates preferences before first paint; persists every change.
