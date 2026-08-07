/* ==================================================================
   syncState — the cursors. Small, boring, and the one piece that must
   never be wrong.

   A cursor is the device's answer to "how much of the server's history do
   I already hold". Lose it and the next sync is a full re-download (slow,
   correct). Advance it too far and the device silently skips whatever fell
   in the gap, forever — a study that was never downloaded and that nothing
   will ever ask for again. So every rule here leans the same way: when in
   doubt, rewind.

     • The value stored is the SERVER's clock, never the device's
       (`SyncDelta.serverTime`). Phones are wrong about the time far more
       often than anyone expects.
     • It is rewound by `SYNC_OVERLAP_MS` before being stored, to cover
       writes that were stamped before the sync ran but committed after it.
       Re-reading a few rows costs nothing; missing one is permanent.
     • It lives in AsyncStorage, next to the cache it describes, and is
       cleared with it. A cursor that outlived its data would claim the
       device is up to date about records it no longer has.
   ================================================================== */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SYNC_OVERLAP_MS } from '@cyphix/shared';

/** Collections that sync by delta. One key each. */
export type SyncCollection = 'recordings';

const KEY = 'cyphix:sync:cursors';

type Cursors = Partial<Record<SyncCollection, string>>;

async function readAll(): Promise<Cursors> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Cursors) : {};
  } catch {
    /* An unreadable cursor file means "we know nothing", which triggers a
       full sync. Wasteful, never wrong. */
    return {};
  }
}

/** Null ⇒ this device has never synced this collection: ask for a snapshot. */
export async function getCursor(collection: SyncCollection): Promise<string | null> {
  return (await readAll())[collection] ?? null;
}

/**
 * Store the cursor a delta came back with, rewound by the overlap window.
 *
 * `exact` is for a CAPPED page, where `serverTime` is the last row's own
 * timestamp rather than the server's clock. Rewinding there would re-read
 * the tail of the page just delivered and, with a slow enough catch-up,
 * could stop the cursor advancing at all.
 */
export async function setCursor(
  collection: SyncCollection,
  serverTime: string,
  { exact = false }: { exact?: boolean } = {},
): Promise<void> {
  const ms = Date.parse(serverTime);
  if (!Number.isFinite(ms)) return; // a cursor we cannot parse is not a cursor
  const value = exact ? serverTime : new Date(ms - SYNC_OVERLAP_MS).toISOString();
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...(await readAll()), [collection]: value }));
  } catch {
    /* Unwritable ⇒ the next launch re-syncs from the last stored cursor, or
       in full. The data on the device is still correct either way. */
  }
}

export async function clearCursors(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* See above — worst case is a redundant sync. */
  }
}

// v1.0.0 — Delta cursors: server clock, rewound by the overlap window, cleared
//          with the cache they describe.
