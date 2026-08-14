/* ==================================================================
   studyDigestCache — the device's store of per-recording HISTORY digests:
   the screening verdict and a small waveform preview, one per study.

   ══ WHY THIS HAS TO EXIST ══
   The History list draws from `RecordingListItem` — metadata only, by
   design ("100 recordings would mean 100 × 6 leads of DSP just to draw a
   list"). But the list's new job is to answer the patient's actual
   question — is anything wrong? — and to show what the recording looks
   like, and both of those live inside the waveform. Re-deriving them per
   row on every visit is exactly the cost the metadata split exists to
   prevent. A recording is IMMUTABLE, so its verdict and its preview are
   immutable too: compute once, keep forever. (`templateCache.ts` makes
   this argument for beat templates; this is the same argument for the
   list.)

   ══ WHY NOT THE SERVER ══
   PARITY.md's verdict-dot row names the "proper" fix as a cached level
   on write — a `CYPHIX_SHARED` type change and a `CYPHIX_SERVER` column.
   That is still the right end state for web parity. This cache is the
   device-sized version of the same idea: the FULL 43-rule screen (never
   the rejected 6-rule shortcut, which could disagree with the detail
   screen), cached like the templates are, shippable over the air with no
   migration. When the server column lands, this file becomes a read-through
   of it.

   ══ THE VERSION GATE AND THE PINNED FILTERS ══
   Same rules as `templateCache`, for the same reasons: a digest computed
   by an older generation of the screening maths is discarded on read, not
   migrated (`DIGEST_VERSION`), and the DSP chain is PINNED
   (`DIGEST_FILTERS`) — a list verdict that changed when someone toggled
   the notch in the viewer would silently redefine what the row claims.

   ══ THE CONTEXT KEY ══
   Sex moves the long-QT threshold; age moves voltage criteria. A digest
   therefore records WHICH context it was screened with (`ctxKey`), and a
   row whose expected context no longer matches is treated as missing and
   recomputed — so a card that loads after the list, or a corrected birth
   date, updates the verdicts exactly once instead of never or always.
   ================================================================== */

import { decodeChannel, encodeChannel, type ScreeningLevel } from '@cyphix/shared';
import { getCached, putCached, removeCached } from './deviceCache';

const KEY = 'history/digests';

/** Bump when the preview window, the filters, or the screening generation
    changes. Old digests are dropped on read — recomputing is cheap once. */
export const DIGEST_VERSION = 1;

/**
 * The DSP the list verdict is always built through. Not user-settable, on
 * purpose — see the header. Matches the standard chain the PDF prints
 * through, so the paper, the Findings tab on default settings and the row
 * pill are one computation.
 */
export const DIGEST_FILTERS = { baseline: true, notch: true, smoothing: true } as const;

export interface StudyDigest {
  recordingId: string;
  /** null ⇔ simulated — never screened (mobile CLAUDE.md §4). The row
      shows the SIMULATION chip where the verdict would go. */
  screeningLevel: ScreeningLevel | null;
  /** ~4 s of filtered lead II, min/max-pair downsampled. mV. */
  previewSamples: Float32Array;
  /** Effective rate of `previewSamples` after downsampling. */
  previewSampleRate: number;
  /** From the same analysis pass — fills rows whose stored summary has
      none (imported CSVs). */
  bpm: number | null;
  /** `${sex ?? ''}|${ageYears ?? ''}` used when screened; '' = no context. */
  ctxKey: string;
  isSimulated: boolean;
}

/* ── The stored shape ────────────────────────────────────────────
   `Float32Array` is not JSON; the platform already has one codec every
   consumer agrees on (`recordingCodec.ts`), so the preview uses it. */
interface StoredDigest {
  id: string;
  v: number;
  lvl: ScreeningLevel | null;
  /** base64 Float32 — the preview samples, mV. */
  p: string;
  fs: number;
  bpm: number | null;
  ctx: string;
  sim: boolean;
}

type Table = Record<string, StoredDigest>;

/** Parsed table, or undefined when it must be read from disk again. */
let memo: Table | undefined;

function encode(d: StudyDigest): StoredDigest {
  return {
    id: d.recordingId,
    v: DIGEST_VERSION,
    lvl: d.screeningLevel,
    p: encodeChannel(d.previewSamples),
    fs: d.previewSampleRate,
    bpm: d.bpm,
    ctx: d.ctxKey,
    sim: d.isSimulated,
  };
}

function decode(s: StoredDigest): StudyDigest {
  return {
    recordingId: s.id,
    screeningLevel: s.lvl,
    previewSamples: decodeChannel(s.p),
    previewSampleRate: s.fs,
    bpm: s.bpm,
    ctxKey: s.ctx,
    isSimulated: s.sim,
  };
}

async function table(): Promise<Table> {
  if (memo) return memo;
  const cached = await getCached<Table>(KEY);
  const raw = cached?.data ?? {};
  /* Drop anything computed by an older generation. Silently keeping it is
     the failure mode that matters: the pill would still render, still look
     right, and disagree with the Findings tab. */
  const clean: Table = {};
  for (const [id, entry] of Object.entries(raw)) {
    if (entry && entry.v === DIGEST_VERSION) clean[id] = entry;
  }
  memo = clean;
  return clean;
}

/* ── Reads ───────────────────────────────────────────────────────── */

/** Every cached digest, decoded. Cheap after the first call. */
export async function readDigests(): Promise<StudyDigest[]> {
  return Object.values(await table()).map(decode);
}

/**
 * Which rows a backfill must (re)compute: missing entirely, or screened
 * under a context that no longer matches the row's expected one.
 */
export async function staleDigestIds(
  rows: readonly { id: string; ctxKey: string }[],
): Promise<string[]> {
  const t = await table();
  return rows.filter((r) => !t[r.id] || t[r.id].ctx !== r.ctxKey).map((r) => r.id);
}

/* ── Writes ──────────────────────────────────────────────────────── */

/**
 * Stage digests into the in-memory table. Deliberately NOT a write — a
 * backfill computes dozens in a row and `flushDigests()` is what touches
 * the disk (same batching argument as `templateCache`).
 */
export async function stageDigests(digests: readonly StudyDigest[]): Promise<void> {
  const t = await table();
  for (const d of digests) t[d.recordingId] = encode(d);
}

/** Persist the staged table. Safe to call often; it writes what it has. */
export async function flushDigests(): Promise<void> {
  if (!memo) return;
  await putCached(KEY, memo, { heavy: true });
}

/**
 * Forget digests whose recordings are gone. A deleted study must not keep
 * a verdict on file — called with the ids History still holds.
 */
export async function pruneDigests(keepIds: readonly string[]): Promise<boolean> {
  const t = await table();
  const keep = new Set(keepIds);
  let removed = false;
  for (const id of Object.keys(t)) {
    if (!keep.has(id)) {
      delete t[id];
      removed = true;
    }
  }
  if (removed) await flushDigests();
  return removed;
}

/** Drop everything — account switch or a manual rebuild. (The deviceCache
    owner wipe covers the disk copy; this also clears the memo.) */
export async function clearDigests(): Promise<void> {
  memo = {};
  await removeCached(KEY);
}

// v1.0.0 — Per-recording History digests (screening level + 4 s preview + bpm)
//          cached on the device: one heavy entry read through a memo, staged in
//          memory and flushed in batches, gated on DIGEST_VERSION and on the
//          screening context, pruned when a study is deleted.
