/* ==================================================================
   deviceCache — the app's private, durable copy of what the server said.

   ══ WHY THIS EXISTS ══
   Until now every screen was online-first: open History → spinner → wait
   for the network → render. On a desk with fibre that reads as fast. On a
   phone it reads as an app that is broken in a lift, and it re-downloads
   the same immutable ECG traces every cold start for the rest of the
   device's life.

   So the model inverts. The device keeps its own copy, renders from it at
   once, and the network's only job is to say what CHANGED
   (`@cyphix/shared` `api/sync.ts`). This file is the copy.

   ══ TWO STORES, BECAUSE THERE ARE TWO KINDS OF THING ══
   AsyncStorage is a small keyed store (SQLite-backed on Android, with a
   ~6 MB default budget). The filesystem has no such ceiling. Heavy
   payloads — an ECG waveform, a portrait of up to 1.5 MB of base64 —
   therefore live as FILES, and AsyncStorage holds only a small envelope
   pointing at them:

       AsyncStorage  cyphix:cache:<key>  →  { at, etag, file? }  (+ data,
                                             for small records)
       Filesystem    <documents>/cyphix-cache/<hash>             (payload)

   Putting a megabyte portrait into AsyncStorage instead would spend a
   sixth of the whole budget on one picture, and every unrelated write
   would have to step around it.

   ══ WHY NOT SQLite ══
   Considered and rejected FOR NOW, on one concrete ground: `expo-sqlite`
   is a native module, and adding one means this change cannot reach a
   phone over the air — it needs a new EAS build first (root CLAUDE.md
   §5, and the v0.27.x commits about exactly this trap). AsyncStorage and
   `expo-file-system` are already compiled into the installed build, so
   this ships as an OTA update tonight. The access pattern here is
   get-by-key and one small index, which is what a key-value store is FOR;
   the day History needs real queries (date ranges, full-text over notes)
   that argument flips and this file becomes the thing SQLite replaces.
   Its API is written to make that swap local.

   ══ THE CACHE BELONGS TO ONE ACCOUNT ══
   `claimFor(userId)` is called before anything is read. If the stored
   owner differs, the whole cache is destroyed first. Signing in as
   somebody else on a shared phone must never show a frame of the previous
   patient's record — data minimisation is not only about what crosses the
   wire.
   ================================================================== */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

const PREFIX = 'cyphix:cache:';
const DIR_NAME = 'cyphix-cache';

/** What is stored ALONGSIDE the payload, for every cached resource. */
export interface CacheEnvelope<T> {
  data: T;
  /** The server's validator, when it gave one. Sent back as If-None-Match. */
  etag?: string;
  /** Device clock at write time. For "synced 4 min ago" — never for
      deciding freshness: only the server's validator may do that. */
  at: string;
}

/** The AsyncStorage row. `file` set ⇒ the payload is on disk, not here. */
interface StoredRow {
  at: string;
  etag?: string;
  file?: string;
  data?: unknown;
}

const rowKey = (key: string) => `${PREFIX}${key}`;

/**
 * A filesystem-safe name for a cache key.
 *
 * Keys are route-shaped (`patients/p-1/photo`), which contains separators
 * a path would interpret. This is not a hash — it is a reversible-enough
 * flattening, deliberately, so that a developer looking at the cache
 * directory on a device can tell what each file is. Nothing about it is
 * security-relevant; the payload's protection is the app sandbox.
 */
const fileNameFor = (key: string) => `${key.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`;

function cacheDir(): Directory {
  const dir = new Directory(Paths.document, DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/* ── Reads ───────────────────────────────────────────────────────── */

/**
 * The cached copy of one resource, or null.
 *
 * Never throws. A cache that can throw is a cache that can take the app
 * down over a truncated write — every failure here means "we do not have
 * it", which is a state every caller already handles by going to the
 * network.
 */
export async function getCached<T>(key: string): Promise<CacheEnvelope<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(rowKey(key));
    if (!raw) return null;
    const row = JSON.parse(raw) as StoredRow;

    if (row.file) {
      const file = new File(cacheDir(), row.file);
      if (!file.exists) return null; // envelope survived, payload did not
      return { data: JSON.parse(await file.text()) as T, etag: row.etag, at: row.at };
    }
    if (row.data === undefined) return null;
    return { data: row.data as T, etag: row.etag, at: row.at };
  } catch {
    return null;
  }
}

/** Just the validator, without paying to read the payload back. */
export async function getCachedEtag(key: string): Promise<string | undefined> {
  try {
    const raw = await AsyncStorage.getItem(rowKey(key));
    if (!raw) return undefined;
    return (JSON.parse(raw) as StoredRow).etag;
  } catch {
    return undefined;
  }
}

/* ── Writes ──────────────────────────────────────────────────────── */

export interface PutOptions {
  etag?: string;
  /** Store the payload as a FILE. Use for anything that can reach
      hundreds of kB — waveforms, portraits. */
  heavy?: boolean;
}

/**
 * Write a resource to the device.
 *
 * Payload FIRST, envelope second, for heavy values: a process killed
 * between the two leaves an orphan file (invisible, overwritten on the
 * next write of the same key) rather than an envelope pointing at nothing
 * — the same ordering rule `recordingStore` already follows, for the same
 * reason.
 */
export async function putCached<T>(key: string, data: T, opts: PutOptions = {}): Promise<void> {
  const row: StoredRow = { at: new Date().toISOString(), etag: opts.etag };
  try {
    if (opts.heavy) {
      const name = fileNameFor(key);
      const file = new File(cacheDir(), name);
      /* `write` is synchronous in expo-file-system's current API. For a
         34 kB waveform that is nothing; for a 1.5 MB portrait it is a
         few ms of blocked JS, once, on a change the user just made. Not
         worth a worker; worth knowing about if this ever grows. */
      file.write(JSON.stringify(data));
      row.file = name;
    } else {
      row.data = data;
    }
    await AsyncStorage.setItem(rowKey(key), JSON.stringify(row));
  } catch {
    /* Out of space, or a filesystem that said no. The app is still
       correct without a cache — it just becomes online-first again for
       this resource — so a failed write must not surface as a failed
       request. */
  }
}

/** Refresh only the validator, when the server said 304 (nothing else moved). */
export async function touchCachedEtag(key: string, etag?: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(rowKey(key));
    if (!raw) return;
    const row = JSON.parse(raw) as StoredRow;
    await AsyncStorage.setItem(
      rowKey(key),
      JSON.stringify({ ...row, at: new Date().toISOString(), etag: etag ?? row.etag }),
    );
  } catch {
    /* Losing a timestamp costs one redundant revalidation. Ignore. */
  }
}

export async function removeCached(key: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(rowKey(key));
    // Envelope first: after this the resource is gone as far as every
    // reader is concerned, even if the file delete never runs.
    await AsyncStorage.removeItem(rowKey(key));
    const file = raw ? (JSON.parse(raw) as StoredRow).file : undefined;
    if (file) {
      const handle = new File(cacheDir(), file);
      if (handle.exists) handle.delete();
    }
  } catch {
    /* Same reasoning as putCached. */
  }
}

/* ── Wholesale clearing ──────────────────────────────────────────── */

/**
 * Erase every cached resource and every payload file.
 *
 * WHO calls this is deliberately not decided here — see `cacheOwner.ts`.
 * Wiping the cache without also dropping the sync cursors would leave the
 * device claiming to be up to date about data it no longer holds, and this
 * module cannot reach the cursors without an import cycle.
 */
export async function clearCache(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
    const dir = new Directory(Paths.document, DIR_NAME);
    if (dir.exists) dir.delete();
  } catch {
    /* Nothing useful to do — and the owner key is rewritten by the caller
       either way, so a partial clear cannot be mistaken for a valid cache
       belonging to the new account. */
  }
}

// v1.0.0 — The device's durable copy of server state: small records in
//          AsyncStorage, heavy payloads as files, one owning account.
