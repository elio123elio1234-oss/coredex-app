/* ==================================================================
   recordingStore — Scan History's storage, on the device.

   ══ WHY THERE IS A LOCAL STORE AT ALL ══
   `CYPHIX_SERVER` is the destination (root CLAUDE.md §2.2) and the swap is
   one line in `baseApi.ts`. But the web app has run its whole life against
   `mockBaseQuery` → localStorage, and its History is fully usable today
   because of it. Mobile shipping a History that renders "no recordings"
   until a server exists would be a screen, not a feature — and web
   CLAUDE.md §8A.2b is explicit that verifying the inside of a room says
   nothing about whether the door opens.

   So this is the mobile twin of the web's `MockRecordingRepository`: same
   interface, same eviction behaviour, same errors. Nothing above it knows
   which one is answering.

   ══ ONE KEY PER RECORDING, PLUS AN INDEX ══
   ★ A deliberate departure from the web, which keeps every recording in
   ONE localStorage array. `RecordingRepository.list()` exists precisely so
   browsing does not drag every waveform out of storage — and on the web
   that promise is only kept at the API boundary, since `load()` still
   parses the whole array. AsyncStorage is a real (SQLite-backed) store
   with a ~6 MB default budget on Android, and 40 recordings in one blob
   would mean rewriting ~1.4 MB to save one note. So:

       cyphix:rec:index  →  RecordingListItem[]   (metadata, no samples)
       cyphix:rec:<id>   →  { leadI, leadII }     (the base64 waveform)

   `list()` touches the index only; `getById` reads exactly one waveform.
   The two are written index-LAST on create and index-FIRST on delete, so a
   process killed mid-write leaves an orphan payload (invisible, reclaimed
   by the next `create`) rather than an index row pointing at nothing.
   ================================================================== */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  encodeChannel,
  type NewRecordingInput,
  type RecordingAnnotation,
  type RecordingListItem,
  type StoredRecording,
} from '@cyphix/shared';

const INDEX_KEY = 'cyphix:rec:index';
const payloadKey = (id: string) => `cyphix:rec:${id}`;

/**
 * Keep this many recordings on the device. Oldest beyond it are evicted.
 *
 * The web's cap is 40 against a 5 MB localStorage budget. AsyncStorage's
 * Android default is ~6 MB and a 10 s two-channel capture is ~34 kB of
 * base64, so 40 costs ~1.4 MB — comfortable, and the same number keeps the
 * two platforms behaving alike. A real server has no such cap, which is
 * exactly why it lives HERE and not in the interface or the UI.
 */
const MAX_STORED_RECORDINGS = 40;

/** Errors carry an HTTP status so the baseQuery can speak the shared envelope. */
export class StoreError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'StoreError';
  }
}

function newestFirst(a: RecordingListItem, b: RecordingListItem): number {
  return b.recordedAt.localeCompare(a.recordedAt);
}

function randomId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readIndex(): Promise<RecordingListItem[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecordingListItem[]) : [];
  } catch {
    /* A corrupted index is recoverable — the payloads are still there and a
       new capture rebuilds a usable list. Throwing here would brick the tab
       permanently for one bad write. */
    return [];
  }
}

async function writeIndex(index: RecordingListItem[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

/** Metadata + cached summary only, newest first. No waveform samples. */
export async function listRecordings(subject?: string): Promise<RecordingListItem[]> {
  const index = await readIndex();
  return index.filter((r) => !subject || r.subject === subject).sort(newestFirst);
}

/** The full record, waveform included. */
export async function getRecording(id: string): Promise<StoredRecording | undefined> {
  const meta = (await readIndex()).find((r) => r.id === id);
  if (!meta) return undefined;
  const raw = await AsyncStorage.getItem(payloadKey(id));
  if (!raw) {
    /* Index row with no payload: the write was interrupted. Report it as a
       recording with an empty waveform rather than as "not found" — the
       viewer already has an honest "no readable waveform" state, and
       pretending the study never existed would be worse. */
    return { ...meta, channels: { leadI: '', leadII: '' } };
  }
  const channels = JSON.parse(raw) as StoredRecording['channels'];
  return { ...meta, channels };
}

export async function createRecording(input: NewRecordingInput): Promise<StoredRecording> {
  const n = Math.min(input.rawLeadI.length, input.rawLeadII.length);
  const record: StoredRecording = {
    id: randomId('rec'),
    kind: 'EcgRecording',
    subject: input.subject,
    recordedAt: input.recordedAt,
    type: input.type,
    sampleRate: input.sampleRate,
    durationSec: input.sampleRate > 0 ? n / input.sampleRate : 0,
    channels: {
      leadI: encodeChannel(input.rawLeadI.subarray(0, n)),
      leadII: encodeChannel(input.rawLeadII.subarray(0, n)),
    },
    isSimulated: input.isSimulated,
    deviceLabel: input.deviceLabel,
    summary: input.summary,
    annotations: [],
  };

  const { channels, ...meta } = record;

  try {
    // Payload first: an orphan payload is invisible, an orphan index row is
    // a study that opens to nothing.
    await AsyncStorage.setItem(payloadKey(record.id), JSON.stringify(channels));
  } catch (err) {
    throw new StoreError('Device storage is full. Delete older recordings.', 507);
  }

  const next = [...(await readIndex()), meta].sort(newestFirst);
  const evicted = next.slice(MAX_STORED_RECORDINGS);
  await writeIndex(next.slice(0, MAX_STORED_RECORDINGS));
  // Reclaim the evicted waveforms; the index no longer references them.
  if (evicted.length > 0) {
    await AsyncStorage.multiRemove(evicted.map((r) => payloadKey(r.id)));
  }

  return record;
}

export async function removeRecording(id: string): Promise<void> {
  const index = await readIndex();
  // Index first: after this the study is gone as far as every reader is
  // concerned, even if the payload delete never runs.
  await writeIndex(index.filter((r) => r.id !== id));
  await AsyncStorage.removeItem(payloadKey(id));
}

/** Apply a change to one recording's METADATA (annotations, note). */
async function patchMeta(
  id: string,
  fn: (meta: RecordingListItem) => RecordingListItem,
): Promise<StoredRecording> {
  const index = await readIndex();
  const at = index.findIndex((r) => r.id === id);
  if (at === -1) throw new StoreError(`Recording ${id} not found.`, 404);
  index[at] = fn(index[at]);
  await writeIndex(index);
  const full = await getRecording(id);
  if (!full) throw new StoreError(`Recording ${id} not found.`, 404);
  return full;
}

export function addAnnotation(
  id: string,
  annotation: Omit<RecordingAnnotation, 'id' | 'createdAt'>,
): Promise<StoredRecording> {
  return patchMeta(id, (meta) => ({
    ...meta,
    annotations: [
      ...meta.annotations,
      { ...annotation, id: randomId('ann'), createdAt: new Date().toISOString() },
    ],
  }));
}

export function updateAnnotation(
  id: string,
  annotationId: string,
  patch: Partial<Pick<RecordingAnnotation, 'sampleIndex' | 'text' | 'lead'>>,
): Promise<StoredRecording> {
  return patchMeta(id, (meta) => ({
    ...meta,
    // In place: same id, same author, same createdAt — a moved marker is
    // still the SAME note, so dragging must never mint a new one.
    annotations: meta.annotations.map((a) => (a.id === annotationId ? { ...a, ...patch } : a)),
  }));
}

export function removeAnnotation(id: string, annotationId: string): Promise<StoredRecording> {
  return patchMeta(id, (meta) => ({
    ...meta,
    annotations: meta.annotations.filter((a) => a.id !== annotationId),
  }));
}

export function setRecordingNote(id: string, note: string): Promise<StoredRecording> {
  return patchMeta(id, (meta) => ({ ...meta, note }));
}

// v1.0.0 — On-device Scan History store (AsyncStorage), the mobile twin of the
//          web's MockRecordingRepository: index + one payload per recording.
