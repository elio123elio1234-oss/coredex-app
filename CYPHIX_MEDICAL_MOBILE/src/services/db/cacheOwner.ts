/* ==================================================================
   cacheOwner — whose data is on this device, and what happens when
   that answer changes.

   ══ WHY THIS IS ITS OWN FILE ══
   The device now holds three things that must be wiped TOGETHER or not at
   all: the cached documents (`deviceCache`), the recordings mirror's
   in-memory copy of its index (`recordingMirror`), and the sync cursors
   (`syncState`). Clear two of the three and the result is worse than
   clearing none — a cursor that outlives its data tells the next sync
   "you are up to date" about records that are no longer there, and the
   device stays permanently, silently short of history.

   No single one of those modules can own the wipe without importing the
   others in a circle. So the wipe lives here, above all three, and there
   is exactly one function that performs it.

   ══ THE RULE ══
   A different account signing in on this phone gets NOTHING of the
   previous one's. Not a stale list behind a spinner, not a portrait for
   one frame, not an ECG in a file. Data minimisation is not only about
   what crosses the wire (web CLAUDE.md §7.3) — a shared or resold phone
   is exactly where it stops being theoretical.

   Signing out, by contrast, keeps everything: it is the same person and
   the same device, their next sign-in should open instantly, and what
   actually grants access — the tokens — is cleared regardless and lives
   in the secure enclave, not here.
   ================================================================== */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearCache } from './deviceCache';
import { resetMemo } from './recordingMirror';
import { clearCursors } from '@/services/sync/syncState';

/* Deliberately OUTSIDE the `cyphix:cache:` namespace that `clearCache`
   sweeps: the record of who the cache belongs to must not be one of the
   things the wipe can remove out from under this function. */
const OWNER_KEY = 'cyphix:cache-owner';

/** Resolves when the claim in progress is done. Reads may await it. */
let pending: Promise<boolean> | null = null;

async function claim(userId: string): Promise<boolean> {
  let previous: string | null = null;
  try {
    previous = await AsyncStorage.getItem(OWNER_KEY);
  } catch {
    /* Unreadable ⇒ treat as "belongs to nobody we can prove", and wipe.
       The cost is one full re-sync; the alternative is showing one
       account's record to another on the strength of a failed read. */
    previous = null;
  }
  if (previous === userId) return true;

  await clearCache();
  resetMemo();
  await clearCursors();
  try {
    await AsyncStorage.setItem(OWNER_KEY, userId);
  } catch {
    /* An unwritable owner key means the next launch wipes again. Wasteful,
       never wrong — the correct way round for this one. */
  }
  return false;
}

/**
 * Declare who the cached data belongs to, erasing it if that has changed.
 *
 * Returns true when the cache was KEPT. False means everything was wiped
 * and the device is starting from nothing — which the sync engine reads as
 * "the next delta must be a full snapshot".
 *
 * Single-flight: the auth gate and the sync engine both call this, often
 * within the same second, and two concurrent wipes racing each other over
 * the owner key is not a state worth reasoning about.
 */
export function claimCacheFor(userId: string): Promise<boolean> {
  if (!pending) {
    pending = claim(userId).finally(() => {
      pending = null;
    });
  }
  return pending;
}

// v1.0.0 — One owner, one wipe: cached documents, mirror memo and sync cursors
//          are cleared together when the signed-in account changes.
