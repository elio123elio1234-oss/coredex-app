/* ==================================================================
   syncEngine — the background half of offline-first.

   `offlineBaseQuery` answers from the device and never asks whether the
   answer is current. This file is what makes that safe. It runs on a
   trigger (sign-in, foreground, pull-to-refresh), asks the server the one
   cheap question, folds whatever came back into the device's copy, and
   then tells RTK Query which cache tags are now wrong.

   The order matters and is the whole design:

       ① pull the delta        → network, usually a few hundred bytes
       ② apply it to the disk  → the mirror is now correct
       ③ invalidate the tags   → RTK refetches, hits ①-free cache-first
                                 reads, and the screen re-renders with
                                 the new data

   Step ③ cannot loop: invalidation only happens when the delta was NOT
   empty, and a refetch does not trigger a sync. And because ② lands
   before ③, the refetch it causes reads the NEW state — never a race
   between "the tag says stale" and "the disk still says old".

   ══ WHAT RUNS, AND WHAT DOES NOT ══
   • Recordings: a real delta, paged, cursor-based (`SYNC_ROUTES`).
   • The active patient's card and portrait: a FORCED refetch, which
     `offlineBaseQuery` turns into a conditional GET. A 304 costs nothing
     and leaves the cached copy exactly where it is.
   • Waveforms: never. They are immutable and are fetched once, when a
     study is actually opened. Pre-fetching every trace in the account
     would be the biggest download in the app performed on behalf of a
     screen nobody has opened.
   • Another patient's card (the clinician case): not covered — the engine
     syncs the SIGNED-IN patient's own record. Tracked in PARITY.md.

   ══ FAILURE IS NORMAL HERE ══
   This runs in the background on a phone. No connection is the expected
   case, not the exceptional one, so a failed sync records itself in the
   status and changes nothing else: the cursor does not move, the mirror
   is untouched, and the app keeps rendering what it already had.
   ================================================================== */

import {
  SYNC_MAX_PAGES,
  type ApiError,
  type RecordingSyncDelta,
} from '@cyphix/shared';
import { baseApi } from '@/services/api/baseApi';
import { syncApi } from '@/services/api/endpoints/syncApi';
import { photoApi } from '@/services/api/endpoints/photoApi';
import { profileApi } from '@/services/api/endpoints/profileApi';
import { claimCacheFor } from '@/services/db/cacheOwner';
import { applyDelta } from '@/services/db/recordingMirror';
import { getCursor, setCursor } from './syncState';
import type { AppDispatch } from '@/store/store';

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncStatus {
  phase: SyncPhase;
  /** Device clock of the last run that completed without error. */
  lastSyncAt: string | null;
  /** Human-readable reason the last attempt failed, or null. */
  lastError: string | null;
}

export interface SyncRunArgs {
  dispatch: AppDispatch;
  /** The signed-in account. Its change is what invalidates the whole cache. */
  userId: string;
  /** The patient whose card and portrait to revalidate, if there is one. */
  patientId: string | null;
  /** Set by an explicit user action; bypasses the throttle. */
  manual?: boolean;
}

/** Automatic runs (boot, foreground) are throttled to this. A patient who
    backgrounds and foregrounds the app four times in a minute should cost
    the server one question, not four. Manual refresh ignores it. */
const MIN_AUTO_INTERVAL_MS = 60_000;

let status: SyncStatus = { phase: 'idle', lastSyncAt: null, lastError: null };
let inFlight: Promise<SyncStatus> | null = null;
let lastAttemptAt = 0;

const listeners = new Set<(s: SyncStatus) => void>();

export function getSyncStatus(): SyncStatus {
  return status;
}

export function subscribeToSync(fn: (s: SyncStatus) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function publish(next: Partial<SyncStatus>): void {
  status = { ...status, ...next };
  for (const fn of listeners) fn(status);
}

/** RTK's rejected-thunk error, narrowed back to our envelope. */
const asApiError = (err: unknown): ApiError =>
  err && typeof err === 'object' && 'status' in err
    ? (err as ApiError)
    : { status: 0, message: 'Sync failed' };

const isOffline = (e: ApiError) => e.status === 0 || e.status === 503 || e.status === 504;

/* ── Collections ─────────────────────────────────────────────────── */

/**
 * Pull every outstanding page of the recordings delta.
 *
 * Returns the ids that changed, so the caller can invalidate precisely
 * those tags instead of blowing away the whole Recording cache — the
 * difference between one card re-rendering and the entire History list
 * flashing because somebody edited a note.
 */
async function syncRecordings(dispatch: AppDispatch): Promise<string[]> {
  const touched: string[] = [];
  /* No cursor ⇒ this device has never synced. The first page is then a
     SNAPSHOT and replaces whatever is on disk; every page after it merges,
     or each would discard the one before. */
  let cursor = await getCursor('recordings');
  let replace = cursor === null;

  for (let page = 0; page < SYNC_MAX_PAGES; page += 1) {
    const result = await dispatch(
      syncApi.endpoints.pullRecordingDelta.initiate(cursor, {
        forceRefetch: true,
        subscribe: false,
      }),
    );
    if (result.error) throw asApiError(result.error);
    const delta = result.data as RecordingSyncDelta;

    await applyDelta(delta, { replace: replace && page === 0 });
    touched.push(...delta.changed.map((r) => r.id), ...delta.deletedIds);

    /* A capped page's `serverTime` is the last row's timestamp, not the
       clock, so it is stored EXACTLY — rewinding it by the overlap window
       could re-read the tail of the page we just applied on every
       iteration and never advance. */
    await setCursor('recordings', delta.serverTime, { exact: delta.more });
    if (!delta.more) break;

    cursor = await getCursor('recordings');
    replace = false;
  }
  return touched;
}

/**
 * Revalidate the documents the signed-in patient's own screens read.
 *
 * A forced refetch here is not a re-download: `offlineBaseQuery` attaches
 * `If-None-Match`, so the usual answer is 304 with no body and the cached
 * copy stays exactly where it is. Failures are swallowed on purpose — a
 * portrait that could not be revalidated is not a reason to report the
 * whole sync as broken when the recordings delta succeeded.
 */
async function revalidatePatientDocuments(
  dispatch: AppDispatch,
  patientId: string,
): Promise<void> {
  const opts = { forceRefetch: true, subscribe: false } as const;
  await Promise.allSettled([
    dispatch(profileApi.endpoints.getPatientCard.initiate(patientId, opts)),
    dispatch(photoApi.endpoints.getPatientPhoto.initiate(patientId, opts)),
  ]);
}

/* ── The run ─────────────────────────────────────────────────────── */

async function run({ dispatch, userId, patientId }: SyncRunArgs): Promise<SyncStatus> {
  publish({ phase: 'syncing' });
  try {
    /* Whose cache is this? `claimCacheFor` wipes everything — documents,
       mirror, cursors — if the answer changed, so the delta below starts
       from a snapshot rather than merging one account's history into
       another's. It is idempotent and single-flight, so calling it here as
       well as in the auth gate costs one AsyncStorage read. */
    await claimCacheFor(userId);

    const touched = await syncRecordings(dispatch);

    if (touched.length > 0) {
      /* Disk first, tags second (see the header). The refetch this causes
         is answered from the mirror we just wrote — no second round trip. */
      dispatch(
        baseApi.util.invalidateTags([
          { type: 'Recording' as const, id: 'LIST' },
          ...touched.map((id) => ({ type: 'Recording' as const, id })),
        ]),
      );
    }

    if (patientId) await revalidatePatientDocuments(dispatch, patientId);

    publish({ phase: 'idle', lastSyncAt: new Date().toISOString(), lastError: null });
  } catch (err) {
    const e = asApiError(err);
    publish({ phase: isOffline(e) ? 'offline' : 'error', lastError: e.message });
  }
  return status;
}

/**
 * Bring the device up to date. Safe to call from anywhere, at any time.
 *
 * Single-flight: overlapping callers (the foreground listener firing while
 * a boot sync is still running) join the run already in progress rather
 * than starting a second one against the same cursor — two syncs racing
 * would both apply the same delta and one would advance the cursor past
 * the other's page.
 */
export function runSync(args: SyncRunArgs): Promise<SyncStatus> {
  if (inFlight) return inFlight;
  if (!args.manual && Date.now() - lastAttemptAt < MIN_AUTO_INTERVAL_MS) {
    return Promise.resolve(status);
  }
  lastAttemptAt = Date.now();
  inFlight = run(args).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

// v1.0.0 — Delta pull → disk → tag invalidation, plus conditional revalidation
//          of the signed-in patient's card and portrait. Single-flight and
//          throttled; a failed run changes nothing.
