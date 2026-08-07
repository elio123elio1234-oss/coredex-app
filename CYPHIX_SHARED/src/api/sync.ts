/* ==================================================================
   Sync contract — how a device that ALREADY HAS the data asks the
   server what changed, instead of asking for the data again.

   ══ WHY THIS EXISTS ══
   Every client so far has been "online-first": open History → spinner →
   download the whole page → render. That is wrong for this domain twice
   over. An ECG recording is IMMUTABLE — a trace captured last Tuesday is
   byte-for-byte the same trace forever — so re-downloading it is pure
   waste. And a phone is not a browser: it goes through tunnels, it loses
   signal in the hospital basement, and a patient looking at their own
   heart should not be told "no connection" about a study that is
   physically on the device.

   So the contract inverts. The device keeps a durable mirror of what it
   has seen, renders from it instantly, and then asks ONE cheap question:

       "my cursor is <since> — what changed?"

   The answer is a delta, and usually an empty one. Two mechanisms carry
   it, chosen per resource:

     • COLLECTIONS (recordings) → `SyncDelta`: rows changed since the
       cursor plus tombstones for rows deleted since it. Cheap because
       the common answer is `{ changed: [], deletedIds: [] }`.
     • SINGLE DOCUMENTS (the medical card, the portrait) → HTTP ETag +
       `If-None-Match` → `304 Not Modified` with no body. Cheap because
       the common answer is a response with no payload at all. The
       portrait is by far the largest thing the app fetches, and this is
       what stops it being fetched on every cold start.

   Both are defined HERE and not in a client, because "what does unchanged
   look like" is a protocol question: a server that answers 304 and a
   client that treats 304 as an error would produce an app that shows a
   blank profile only when everything is working correctly.
   ================================================================== */

import type { RecordingListItem } from '../types/recording';

/**
 * What changed in one collection since a cursor.
 *
 * `changed` is upserts (created OR modified — the client cannot tell them
 * apart and does not need to), `deletedIds` is tombstones. A row that was
 * created AND deleted between two syncs appears only in `deletedIds`,
 * because the device never had it and never should.
 */
export interface SyncDelta<T> {
  /**
   * The server's clock when it answered — the cursor to send NEXT time.
   *
   * ★ Server time, never the device's. Phones are wrong about the time
   * more often than anyone expects (manual clocks, timezone travel, a dead
   * battery booting at the epoch), and a cursor set from a fast device
   * clock silently skips every row written in the gap.
   */
  serverTime: string;
  /** True when the server ignored the cursor and sent a snapshot (first
      sync on a new device, or a cursor it could not honour). */
  full: boolean;
  /** Rows created or modified since the cursor. */
  changed: T[];
  /** Ids deleted since the cursor. Always empty when `full` is true —
      a snapshot IS the truth, so anything absent from it is gone. */
  deletedIds: string[];
  /**
   * The page was capped and more changes wait past `serverTime`.
   *
   * ★ This is why `serverTime` is documented as "the cursor to send next"
   * rather than "now": on a capped page the server returns the timestamp
   * of the LAST row it sent, not its clock. A client that stored the clock
   * would jump over everything it was not given. Keep calling until this
   * is false — a new device with years of history catches up in pages
   * instead of one response that times out.
   */
  more: boolean;
}

/** The recordings collection delta: metadata only, never waveforms. */
export type RecordingSyncDelta = SyncDelta<RecordingListItem>;

export const SYNC_ROUTES = {
  /** `since` omitted ⇒ full snapshot (new device / cleared storage). */
  recordings: (since?: string | null): string =>
    since ? `recordings/sync?since=${encodeURIComponent(since)}` : 'recordings/sync',
} as const;

/**
 * How far BACK from `serverTime` a client rewinds the cursor it stores.
 *
 * ★ Not paranoia — closing a real race. A row's `updated_at` is stamped
 * when its statement runs, but the row only becomes visible to other
 * connections when its transaction COMMITS. A write that stamped
 * 12:00:00.100 and committed at 12:00:00.400 is invisible to a sync that
 * ran at 12:00:00.300, and a cursor of exactly 12:00:00.300 would skip it
 * forever. Rewinding a few seconds re-reads a handful of rows the device
 * already has; upserts are idempotent, so the only cost is those rows.
 */
export const SYNC_OVERLAP_MS = 5_000;

/**
 * Rows per delta page. Metadata is ~1 kB a row, so this is a response of a
 * few hundred kB at worst — bounded, but big enough that the steady state
 * (nothing changed, or one new recording) is always a single round trip.
 */
export const SYNC_PAGE_SIZE = 200;

/**
 * How many pages a client will chase in ONE catch-up run before stopping.
 *
 * A guard against a server that keeps setting `more` — a bug there must
 * cost a device a slow sync, not an infinite request loop on a phone with
 * a metered connection. Whatever is left is picked up on the next trigger.
 */
export const SYNC_MAX_PAGES = 25;

/**
 * Header names for the single-document half. Spelled out so the server
 * and three clients cannot drift on capitalization or on which header
 * carries the validator.
 */
export const SYNC_HEADERS = {
  etag: 'etag',
  ifNoneMatch: 'if-none-match',
} as const;

/** The status a conditional GET gets back when nothing changed. */
export const HTTP_NOT_MODIFIED = 304;

// v1.0.0 — The offline-first sync contract: collection deltas (recordings) and
//          ETag/304 for single documents (card, portrait).
