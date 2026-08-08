/* ==================================================================
   templateCache — the device's store of per-recording beat templates.

   ══ WHY THIS HAS TO EXIST ══
   Deriving one recording's representative beat costs a base64 decode, six
   lead derivations, three filter stages per lead, a Pan-Tompkins pass and
   a ~12-beat median stack. Measured on this project's own data that is
   tens of milliseconds per study — on the SAME JavaScript thread that runs
   the scroll. Forty studies is therefore a visibly frozen screen, every
   single time the Insights tab is opened.

   It only has to happen once. ★ A recording is IMMUTABLE — the trace
   measured last Tuesday is the same trace forever — so its template is
   immutable too, and the second computation was never anything but waste.
   (`recordingMirror.ts` makes exactly this argument about the waveforms
   themselves; this is the same argument one derivation further down.)

   ══ ONE FILE, NOT ONE FILE PER STUDY ══
   A template is ~14 kB encoded, and forty of them are ~570 kB. Split
   across forty AsyncStorage rows that is a tenth of Android's default
   budget in small rows; split across forty FILES it is forty opens to
   answer one screen. They are therefore ONE heavy cache entry, read once
   into a memo and written in batches during a backfill — so an interrupted
   backfill loses at most the last few studies rather than all of them.

   ══ THE VERSION GATE IS NOT OPTIONAL ══
   Templates from two generations of the maths averaged into one baseline
   would produce a plausible-looking signature that is not the patient's.
   Every entry carries `TEMPLATE_VERSION`; anything else is discarded on
   read, not migrated. There is nothing to migrate — the source recordings
   are still there, and recomputing is cheap exactly once.

   ══ ⚠️ THE FILTERS ARE PINNED HERE, NOT TAKEN FROM THE VIEWER ⚠️ ══
   `useRecordingView` deliberately re-measures whenever the reader toggles
   a filter. A BASELINE may not work that way: if the identity were built
   through whatever the viewer happened to be set to, switching the notch
   off would silently redefine the patient. `IDENTITY_FILTERS` is fixed,
   and it is part of what `TEMPLATE_VERSION` covers.
   ================================================================== */

import {
  decodeChannel,
  encodeChannel,
  TEMPLATE_VERSION,
  type BeatRejectReason,
  type BeatTemplate,
  type EcgLeadName,
  type RecordingTemplate,
} from '@cyphix/shared';
import { getCached, putCached, removeCached } from './deviceCache';

const KEY = 'ecgid/templates';

/**
 * The DSP the identity is always built through. Not user-settable, on
 * purpose — see the header. Matches `DEFAULT_VIEWER_SETTINGS.filters`, so
 * the signature and a study opened with default settings are the same
 * chain, but it does not READ that constant: the viewer's default is a UI
 * preference and may change, while this is part of the record.
 */
export const IDENTITY_FILTERS = { baseline: true, notch: true, smoothing: true } as const;

/* ── The stored shape ────────────────────────────────────────────
   `Float32Array` is not JSON. The channels already have a codec that the
   web, the phone and the server agree on (`recordingCodec.ts`), so the
   templates use it rather than inventing a second encoding — a template
   written here can be read anywhere in the platform. */
interface StoredLead {
  /** base64 Float32 — the median beat, mV. */
  s: string;
  /** base64 Float32 — the per-sample spread, mV. */
  d: string;
  used: number;
  rejected: number;
  /** The kept rejected beats — only the reference lead carries any. */
  rej?: { s: string; r: string; c: number; t: number }[];
}

interface StoredTemplate {
  id: string;
  at: string;
  v: number;
  fs: number;
  r: number;
  leads: Record<string, StoredLead>;
  sqi: number;
  beats: number;
  intervals: RecordingTemplate['intervals'];
  sim: boolean;
}

type Table = Record<string, StoredTemplate>;

/** Parsed table, or undefined when it must be read from disk again. */
let memo: Table | undefined;

function encode(t: RecordingTemplate): StoredTemplate {
  const leads: Record<string, StoredLead> = {};
  for (const [name, lead] of Object.entries(t.leads) as [EcgLeadName, BeatTemplate][]) {
    if (!lead) continue;
    leads[name] = {
      s: encodeChannel(lead.samples),
      d: encodeChannel(lead.dispersion),
      used: lead.beatsUsed,
      rejected: lead.beatsRejected,
      rej: lead.rejected.length
        ? lead.rejected.map((b) => ({
            s: encodeChannel(b.samples),
            r: b.reason,
            c: b.correlation,
            t: b.atSec,
          }))
        : undefined,
    };
  }
  return {
    id: t.recordingId,
    at: t.recordedAt,
    v: t.templateVersion,
    fs: t.sampleRate,
    r: t.rIndex,
    leads,
    sqi: t.sqi,
    beats: t.beatsUsed,
    intervals: t.intervals,
    sim: t.isSimulated,
  };
}

function decode(s: StoredTemplate): RecordingTemplate {
  const leads: Partial<Record<EcgLeadName, BeatTemplate>> = {};
  for (const [name, lead] of Object.entries(s.leads)) {
    leads[name as EcgLeadName] = {
      samples: decodeChannel(lead.s),
      dispersion: decodeChannel(lead.d),
      beatsUsed: lead.used,
      beatsRejected: lead.rejected,
      rejected: (lead.rej ?? []).map((b) => ({
        samples: decodeChannel(b.s),
        reason: b.r as BeatRejectReason,
        correlation: b.c,
        atSec: b.t,
      })),
    };
  }
  return {
    recordingId: s.id,
    recordedAt: s.at,
    templateVersion: s.v,
    sampleRate: s.fs,
    rIndex: s.r,
    leads,
    sqi: s.sqi,
    beatsUsed: s.beats,
    intervals: s.intervals,
    isSimulated: s.sim,
  };
}

async function table(): Promise<Table> {
  if (memo) return memo;
  const cached = await getCached<Table>(KEY);
  const raw = cached?.data ?? {};
  /* Drop anything computed by an older generation of the maths. Silently
     KEEPING it is the failure mode that matters: the identity would still
     build, still look right, and be wrong. */
  const clean: Table = {};
  for (const [id, entry] of Object.entries(raw)) {
    if (entry && entry.v === TEMPLATE_VERSION) clean[id] = entry;
  }
  memo = clean;
  return clean;
}

/* ── Reads ───────────────────────────────────────────────────────── */

/** Every cached template, decoded. Cheap after the first call. */
export async function readTemplates(): Promise<RecordingTemplate[]> {
  return Object.values(await table()).map(decode);
}

/** Which of `ids` have no cached template — i.e. what a backfill must do. */
export async function missingTemplates(ids: readonly string[]): Promise<string[]> {
  const t = await table();
  return ids.filter((id) => !t[id]);
}

/* ── Writes ──────────────────────────────────────────────────────── */

/**
 * Stage templates into the in-memory table.
 *
 * Deliberately NOT a write: a backfill computes forty of these in a row,
 * and rewriting a 570 kB file forty times would spend more on IO than on
 * the DSP it is caching. `flush()` is what touches the disk.
 */
export async function stageTemplates(templates: readonly RecordingTemplate[]): Promise<void> {
  const t = await table();
  for (const template of templates) t[template.recordingId] = encode(template);
}

/** Persist the staged table. Safe to call often; it writes what it has. */
export async function flushTemplates(): Promise<void> {
  if (!memo) return;
  await putCached(KEY, memo, { heavy: true });
}

/**
 * Forget templates whose recordings are gone.
 *
 * A deleted study must not keep shaping the baseline — that would be a
 * record of a person built partly from data they asked to have removed.
 * Called with the ids History still holds; anything else goes.
 */
export async function pruneTemplates(keepIds: readonly string[]): Promise<boolean> {
  const t = await table();
  const keep = new Set(keepIds);
  let removed = false;
  for (const id of Object.keys(t)) {
    if (!keep.has(id)) {
      delete t[id];
      removed = true;
    }
  }
  if (removed) await flushTemplates();
  return removed;
}

/** Drop everything — sign-out, account switch, or a manual rebuild. */
export async function clearTemplates(): Promise<void> {
  memo = {};
  await removeCached(KEY);
}

// v1.1.0 — Carries the kept REJECTED beats through the cache, so the evidence
//          for "3 beats were not used" survives a restart with the template it
//          belongs to. TEMPLATE_VERSION 2 discards the v1 entries that have none.
// v1.0.0 — Per-recording beat templates cached on the device: one heavy entry
//          read through a memo, staged in memory and flushed in batches, gated
//          on TEMPLATE_VERSION so two generations of the maths can never be
//          averaged into one signature, and pruned when a study is deleted.
