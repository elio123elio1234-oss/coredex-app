/* ==================================================================
   recordingMirror — the device's copy of the server's Scan History.

   ══ NOT THE SAME THING AS `recordingStore` ══
   `recordingStore.ts` is a STANDALONE BACKEND: when no server is
   configured, it IS the source of truth and a recording saved there exists
   nowhere else. This file is a MIRROR: the server owns the truth, and this
   is what the phone keeps so it can render before — and without — the
   network. They are deliberately separate, because they answer to
   different rules. The store may evict to protect the device; a mirror
   that silently evicted would be lying about what the account holds.

   ══ WHAT IS MIRRORED, AND WHAT IS NOT ══
     index    → every recording's METADATA (`RecordingListItem`), one file.
     waveform → the channels of a recording that has actually been OPENED,
                one file each, fetched lazily and then kept forever.

   The split is the whole performance argument. Browsing History reads one
   small file and draws every card from the cached summary. Opening a study
   reads that study's waveform — and an ECG waveform is IMMUTABLE: the
   trace measured last Tuesday will be the same trace in ten years, so once
   it is on the device there is no honest reason to ever ask for it again.
   Only the record AROUND it (notes, annotations, deletion) can change, and
   that is exactly what the delta carries.

   ══ THE INDEX IS READ THROUGH A MEMO ══
   Both `list` and `get` need it, RTK Query re-runs them on every
   invalidation, and parsing a few hundred kB of JSON on the UI thread to
   answer "which studies exist" would undo the point of caching at all.
   Every write path clears the memo; nothing else may hold a reference.
   ================================================================== */

import type {
  RecordingListItem,
  RecordingSyncDelta,
  StoredRecording,
} from '@cyphix/shared';
import { getCursor } from '@/services/sync/syncState';
import { getCached, putCached, removeCached } from './deviceCache';

const INDEX_KEY = 'recordings/index';
const waveformKey = (id: string) => `recordings/${id}/waveform`;

/** Parsed index, or undefined when it must be read from disk again. */
let memo: RecordingListItem[] | undefined;

function newestFirst(a: RecordingListItem, b: RecordingListItem): number {
  return b.recordedAt.localeCompare(a.recordedAt);
}

/**
 * The mirrored metadata, or null if this device has never synced.
 *
 * ★ `null` and `[]` are different answers and the distinction matters:
 * an empty array means "this account has no recordings", which History
 * should draw as its empty state; null means "we do not know yet", which
 * must go to the network instead of rendering a confident lie.
 */
export async function readIndex(): Promise<RecordingListItem[] | null> {
  if (memo) return memo;
  const cached = await getCached<RecordingListItem[]>(INDEX_KEY);
  if (!cached) return null;
  memo = Array.isArray(cached.data) ? cached.data : [];
  return memo;
}

async function writeIndex(items: RecordingListItem[]): Promise<void> {
  const next = [...items].sort(newestFirst);
  memo = next;
  // Heavy: a few hundred metadata rows is well past what belongs in one
  // AsyncStorage value, and it is rewritten on every delta.
  await putCached(INDEX_KEY, next, { heavy: true });
}

/** Forget the in-memory copy. For the account switch, which wipes the disk. */
export function resetMemo(): void {
  memo = undefined;
}

/* ── Reads ───────────────────────────────────────────────────────── */

/**
 * History's list, filtered and paged exactly as the server would.
 *
 * ★ Returns null until a DELTA SYNC has run, even when the index already
 * holds rows. The index is written by three different paths — a delta, a
 * network list page, and opening a single study — and only the first of
 * them is a statement about what the account CONTAINS. Without this check,
 * a cold start that opened one study before the first sync finished would
 * leave a one-row index behind, and History would then render "you have 1
 * recording" from the disk, confidently, forever.
 *
 * The cursor is the honest signal: it exists only if the server has told
 * this device the whole truth at least once.
 */
export async function listFromMirror(
  subject?: string,
  limit?: number,
  offset = 0,
): Promise<RecordingListItem[] | null> {
  if ((await getCursor('recordings')) === null) return null;
  const index = await readIndex();
  if (index === null) return null;
  const rows = index.filter((r) => !subject || r.subject === subject).sort(newestFirst);
  return rows.slice(offset, limit != null ? offset + limit : undefined);
}

/**
 * One full study from the device, or null if its waveform is not here.
 *
 * Null is a cache miss, not "no such recording" — the caller goes to the
 * network and stores what comes back.
 */
export async function getFromMirror(id: string): Promise<StoredRecording | null> {
  const index = await readIndex();
  const meta = index?.find((r) => r.id === id);
  if (!meta) return null;
  const wave = await getCached<StoredRecording['channels']>(waveformKey(id));
  if (!wave) return null;
  /* Metadata from the INDEX, waveform from the file — never the metadata
     that was cached alongside the waveform. The delta keeps the index
     current; the waveform file is written once and never revisited, so its
     copy of the note is frozen at the moment the study was first opened. */
  return { ...meta, channels: wave.data };
}

/* ── Writes ──────────────────────────────────────────────────────── */

/** Upsert metadata for one recording (write-through after a mutation). */
export async function putMeta(item: RecordingListItem): Promise<void> {
  const index = (await readIndex()) ?? [];
  await writeIndex([...index.filter((r) => r.id !== item.id), item]);
}

/** Upsert a full study: metadata into the index, waveform into its file. */
export async function putRecording(record: StoredRecording): Promise<void> {
  const { channels, ...meta } = record;
  /* Waveform first. An orphan waveform file is invisible and harmless; an
     index row whose waveform never landed would make the study open to a
     cache hit with no trace in it.

     The guard is not decoration: an empty-channels record is exactly what
     the server returns for a study whose payload was interrupted, and
     caching THAT would make a recoverable gap permanent on this device. */
  if (channels?.leadI || channels?.leadII) {
    await putCached(waveformKey(record.id), channels, { heavy: true });
  }
  await putMeta(meta);
}

/** Write through a whole list page the network answered with. */
export async function putListPage(items: RecordingListItem[]): Promise<void> {
  const index = (await readIndex()) ?? [];
  const incoming = new Map(items.map((r) => [r.id, r]));
  const merged = index.filter((r) => !incoming.has(r.id));
  await writeIndex([...merged, ...items]);
}

export async function removeFromMirror(id: string): Promise<void> {
  const index = await readIndex();
  if (index) await writeIndex(index.filter((r) => r.id !== id));
  await removeCached(waveformKey(id));
}

/**
 * Apply one page of a server delta.
 *
 * `replace` is set on the FIRST page of a first-ever sync: the server sent
 * a snapshot, so anything on the device that is not in it does not exist.
 * Later pages of the same catch-up must NOT replace, or each page would
 * throw away the one before it.
 */
export async function applyDelta(
  delta: RecordingSyncDelta,
  { replace = false }: { replace?: boolean } = {},
): Promise<void> {
  const base = replace ? [] : ((await readIndex()) ?? []);
  const changed = new Map(delta.changed.map((r) => [r.id, r]));
  const deleted = new Set(delta.deletedIds);

  const next = base.filter((r) => !changed.has(r.id) && !deleted.has(r.id));
  await writeIndex([...next, ...delta.changed]);

  /* A deleted study's waveform must go too. It is the largest thing we
     hold per recording, and keeping it would mean a record the server has
     erased still sitting in a file on the patient's phone. */
  await Promise.all([...deleted].map((id) => removeCached(waveformKey(id))));
}

// v1.0.0 — The device's mirror of server-side Scan History: one metadata
//          index + one immutable waveform file per opened study.
