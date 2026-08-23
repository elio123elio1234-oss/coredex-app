/* ==================================================================
   useOtaUpdate — "did my update land, and can I have it now?"

   ══ WHY THIS EXISTS ══
   `expo-updates` was installed, configured (`app.json` → `updates.url`)
   and delivering correctly — and **nothing in this app ever called it.**
   That leaves the library's defaults in charge, and the defaults are:

     checkAutomatically   ON_LOAD   — check on every cold launch
     fallbackToCacheTimeout    0    — never make the user wait for it

   Which together mean: the app launches instantly from the bundle it
   already has, downloads the new one in the BACKGROUND, and applies it on
   the **next** launch. So every published update needs **two cold
   launches**, and the second one only helps if the first stayed open long
   enough for the download to finish.

   That is a perfectly sensible default and a terrible experience for the
   person who just asked for a change: they close and reopen twice, the
   badge still reads the old version, and nothing on the screen can tell
   them whether the update is downloading, waiting, or was never published.
   The three look identical. Reported exactly that way:

     *"I opened and closed twice and it is still stuck on 61. Why?"*

   The answer was "it is downloaded and waiting for one more launch", which
   is not something a user should ever have to be told by a person.

   ══ WHAT THIS DOES ══
   Wraps `useUpdates()` so a screen can say which of the states it is in,
   and gives it two verbs:

     check()  — ask the server now (rather than at the next cold launch),
                and download whatever it finds
     apply()  — reload into the update that is already on the device

   `isUpdatePending` is the important one and it is the state the reported
   bug was in: an update fully downloaded, sitting on the device, waiting
   for a relaunch that the user had no way to know was needed.

   ══ ★ IT NEVER RELOADS ON ITS OWN ══
   `reloadAsync()` tears down the JS context. On a device that may be
   holding an unsaved recording — or streaming one right now — an
   automatic reload is data loss with a friendly name, and it would fire at
   whatever moment Expo's CDN happened to answer. So the reload is always a
   TAP, on a screen where nothing is being recorded (Settings), and the
   library's own apply-on-next-launch remains the passive path.

   ⚠️ In Expo Go and in a dev client with updates disabled, `Updates` is
   present but inert: `isEnabled` is false and calling `checkForUpdateAsync`
   throws. That is not an error state to report — it is the correct state
   for a build that is served by Metro — so it gets its own value.
   ================================================================== */

import * as Updates from 'expo-updates';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export type OtaStatus =
  /** Metro-served build: there is nothing to update from. */
  | 'unsupported'
  /** Downloaded and waiting for a relaunch. The reported bug's state. */
  | 'ready'
  | 'checking'
  | 'downloading'
  /** Asked the server, nothing newer. */
  | 'current'
  | 'idle'
  | 'error';

export interface OtaUpdate {
  status: OtaStatus;
  /** True once an update is on the device — `apply()` is meaningful. */
  canApply: boolean;
  /** When the RUNNING bundle was published. The honest answer to "which
      one am I on", independent of anything the bundle says about itself. */
  runningSince: Date | null;
  check: () => void;
  apply: () => void;
}

export function useOtaUpdate(): OtaUpdate {
  const {
    currentlyRunning,
    isUpdateAvailable,
    isUpdatePending,
    isChecking,
    isDownloading,
    checkError,
    downloadError,
  } = Updates.useUpdates();

  const [asked, setAsked] = useState(false);

  const enabled = Updates.isEnabled;

  /* An update found on the server is downloaded immediately: a "check"
     that reports news and then makes the reader press again is two taps
     for one intention, and the download is the slow half anyway. */
  const check = useCallback(() => {
    if (!enabled) return;
    setAsked(true);
    void (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        /* Swallowed on purpose: `checkError` / `downloadError` from
           `useUpdates()` already carry it into the returned status, and a
           failed update check is not an event worth interrupting anyone
           over — the app it is running is still the app they wanted. */
      }
    })();
  }, [enabled]);

  /* Check when the app comes back to the foreground as well as on mount.
     `expo-updates` itself only checks on a COLD launch, which is the whole
     reason a resumed app can sit for days on a stale bundle. */
  useEffect(() => {
    if (!enabled) return;
    check();
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, [enabled, check]);

  const status: OtaStatus = !enabled
    ? 'unsupported'
    : isUpdatePending
      ? 'ready'
      : isDownloading
        ? 'downloading'
        : isChecking
          ? 'checking'
          : checkError || downloadError
            ? 'error'
            : isUpdateAvailable || !asked
              ? 'idle'
              : 'current';

  return {
    status,
    canApply: isUpdatePending,
    runningSince: currentlyRunning?.createdAt ?? null,
    check,
    apply: useCallback(() => {
      if (Updates.isEnabled) void Updates.reloadAsync();
    }, []),
  };
}

// v1.0.0 — The app had expo-updates installed, configured and delivering, and
//          never called it once. That left the defaults in charge
//          (check on cold launch, apply on the NEXT one), so every update
//          needed two cold launches and nothing on screen could distinguish
//          "downloading", "downloaded and waiting" and "never published".
//          This exposes the difference and offers the reload as a tap. It
//          never reloads by itself: reloadAsync() tears down the JS context,
//          and on a device that may be holding a recording that is data loss
//          with a friendly name.
