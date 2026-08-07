/* ==================================================================
   offlineBaseQuery — read from the device first, ask the network second.

   ══ THE ONE IDEA ══
   Everything above this file is unchanged. Endpoints, hooks, cache tags
   and screens still describe HTTP resources and still cannot tell what
   answered them — the same firewall `localBaseQuery` established. What
   changes is where the answer comes from:

       useListRecordingsQuery()
         → offlineBaseQuery  ── has it on disk? ──► return it. Done. 0 ms.
                             └─ does not?      ──► httpBaseQuery, store,
                                                    return.

   Nothing here polls, retries or revalidates on a timer. Keeping the
   device in step with the server is a SEPARATE job with its own trigger
   (`services/sync/syncEngine.ts`), and when it finds a change it
   invalidates the RTK tag, which lands back here and is answered from the
   now-updated mirror. Reading and refreshing being two things is what
   stops "render instantly" and "never show stale data" from fighting.

   ══ WHAT IS CACHED, AND WHY EACH ONE ══
   | route                     | why it is safe to serve from the device |
   |---------------------------|------------------------------------------|
   | recordings (list)         | metadata mirror, kept current by delta   |
   | patients/:id/recordings   | same, scoped to one patient              |
   | recordings/:id            | the WAVEFORM is immutable — a trace does |
   |                           | not change after it was measured         |
   | patients/:id/card         | ETag-validated document                  |
   | patients/:id/photo        | ETag-validated document, and the biggest |
   |                           | single thing the app ever downloads      |

   Every other route falls straight through to the network. Caching is
   opt-in per route, listed here, and readable in one screen — the
   alternative (cache everything, exempt the dangerous ones) fails open,
   and "fails open" about a medical record is not a trade worth making.

   ══ FORCED REFETCH IS THE ESCAPE HATCH ══
   RTK sets `api.forced` for `refetch()` and `forceRefetch`. That is taken
   here to mean "the user or the sync engine explicitly asked the server",
   so it goes to the network — conditionally, carrying `If-None-Match`, so
   the honest answer "nothing changed" still costs almost nothing.

   ══ WRITES ══
   Always go to the network; there is no offline write queue (see
   PARITY.md — a save that cannot reach the server still fails, exactly as
   before). What IS new is write-through: a mutation's response is the
   updated record, so it is put straight into the mirror instead of
   waiting for the next sync to discover a change this device just made.
   ================================================================== */

import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import {
  HTTP_NOT_MODIFIED,
  type ApiError,
  type ApiRequest,
  type RecordingListItem,
  type StoredRecording,
} from '@cyphix/shared';
import {
  getCached,
  getCachedEtag,
  putCached,
  removeCached,
  touchCachedEtag,
} from '@/services/db/deviceCache';
import {
  getFromMirror,
  listFromMirror,
  putListPage,
  putRecording,
  removeFromMirror,
} from '@/services/db/recordingMirror';
import { httpBaseQuery, type HttpMeta } from './httpBaseQuery';

/* ── Route plans ─────────────────────────────────────────────────── */

type Plan =
  /** Served by the recordings mirror, filtered like the server would. */
  | { kind: 'list'; subject?: string; limit?: number; offset: number }
  /** One full study: metadata from the mirror, waveform from its file. */
  | { kind: 'study'; id: string }
  /** A single document validated by ETag. `heavy` ⇒ payload goes to a file. */
  | { kind: 'doc'; key: string; heavy: boolean };

/** A cache answer. Wrapped, because `undefined` is a legal cached VALUE
    (`getRecording` resolves to undefined for a study that is not there)
    and must not be confused with a miss. */
interface Hit {
  value: unknown;
}

/**
 * Split a route into segments WITHOUT dropping empty ones.
 *
 * `recordings/` must not read as `recordings`. Empty segments are kept so
 * a missing id produces a study plan with an empty id — which misses the
 * cache and goes to the network, where the server says 404 — rather than
 * a LIST plan that would answer a request for one study with all of them.
 * Failing towards "ask the server" is the only safe direction here.
 */
const segmentsOf = (path: string): string[] => path.replace(/^\/+/, '').split('/');

function planFor(url: string): Plan | null {
  const [path = '', search = ''] = url.split('?');
  const seg = segmentsOf(path);
  const q = new URLSearchParams(search);
  const limitRaw = q.get('limit');
  const paging = {
    limit: limitRaw != null ? Number(limitRaw) : undefined,
    offset: Number(q.get('offset') ?? 0) || 0,
  };

  /* ★ `recordings/sync` is a VERB, not a recording whose id is "sync".
     Left to the rule below it would parse as a study, get written to the
     mirror as one, and take the app down on the first delta — a delta has
     no `channels`. It is also the one route that must never be answered
     from the cache: its entire purpose is to ask the server something.
     Passthrough, explicitly. */
  if (seg.length === 2 && seg[0] === 'recordings' && seg[1] === 'sync') return null;

  if (seg.length === 1 && seg[0] === 'recordings') return { kind: 'list', ...paging };
  if (seg.length === 3 && seg[0] === 'patients' && seg[2] === 'recordings') {
    return { kind: 'list', subject: `Patient/${seg[1]}`, ...paging };
  }
  if (seg.length === 2 && seg[0] === 'recordings') return { kind: 'study', id: seg[1]! };
  if (seg.length === 3 && seg[0] === 'patients' && seg[2] === 'card') {
    return { kind: 'doc', key: path, heavy: false };
  }
  if (seg.length === 3 && seg[0] === 'patients' && seg[2] === 'photo') {
    // Up to 1.5 MB of base64 — a file, never an AsyncStorage value.
    return { kind: 'doc', key: path, heavy: true };
  }
  return null;
}

/** Cache keys for a patient's two cached documents. */
const cardKey = (patientId: string) => `patients/${patientId}/card`;
const photoKey = (patientId: string) => `patients/${patientId}/photo`;

async function readPlan(plan: Plan): Promise<Hit | null> {
  switch (plan.kind) {
    case 'list': {
      const rows = await listFromMirror(plan.subject, plan.limit, plan.offset);
      // null ⇒ never synced. NOT the same as an account with no recordings,
      // which is [] and is a perfectly good answer to serve.
      return rows === null ? null : { value: rows };
    }
    case 'study': {
      const study = await getFromMirror(plan.id);
      return study === null ? null : { value: study };
    }
    case 'doc': {
      const cached = await getCached<unknown>(plan.key);
      return cached === null ? null : { value: cached.data };
    }
  }
}

async function writePlan(plan: Plan, data: unknown, etag?: string): Promise<void> {
  switch (plan.kind) {
    case 'list':
      await putListPage((data ?? []) as RecordingListItem[]);
      return;
    case 'study':
      if (data) await putRecording(data as StoredRecording);
      return;
    case 'doc':
      await putCached(plan.key, data, { etag, heavy: plan.heavy });
      return;
  }
}

/* ── Write-through ───────────────────────────────────────────────── */

/**
 * Fold a successful mutation's response into the mirror.
 *
 * Every recording mutation on the server answers with the whole updated
 * `StoredRecording`, which is exactly what the mirror wants — so a note
 * typed on this phone is on this phone's disk before the request that
 * saved it has finished settling, rather than at the next sync.
 */
async function writeThrough(method: string, url: string, data: unknown): Promise<void> {
  const seg = segmentsOf(url.split('?')[0] ?? '');

  if (seg[0] === 'recordings') {
    if (method === 'DELETE' && seg.length === 2 && seg[1]) {
      await removeFromMirror(seg[1]);
      return;
    }
    // POST /recordings, POST|PATCH|DELETE .../annotations, PUT .../note — all
    // answer with the full record.
    if (data && typeof data === 'object' && 'channels' in data) {
      await putRecording(data as StoredRecording);
    }
    return;
  }

  if (seg[0] === 'patients' && seg[1]) {
    const patientId = seg[1];
    /* A portrait PUT answers with the portrait it stored, so the device's
       copy is replaced rather than dropped — otherwise the next cold start
       (or the next moment offline) would show the OLD face, which is worse
       than showing none. No ETag comes back from a PUT; the next
       revalidation therefore fetches once in full and re-establishes one. */
    if (seg[2] === 'photo' && method === 'PUT') {
      await putCached(photoKey(patientId), data, { heavy: true });
    }
    /* Anything else written about a patient (a profile PATCH, say) can
       change the assembled card in ways the response does not spell out.
       Drop it rather than guess: the next read pays one round trip, and
       a stale medical card is not a thing to be relaxed about. */
    if (seg[2] !== 'photo' || method !== 'PUT') {
      await removeCached(cardKey(patientId));
    }
  }
}

/* ── Failure classification ──────────────────────────────────────── */

/**
 * Is this the kind of failure where a copy on the device is the better
 * answer than an error?
 *
 * Deliberately narrow. `0` is our normalisation of a fetch that never got
 * a reply — no signal, aeroplane mode, DNS. 503/504 mean the server is
 * there but cannot answer right now. A 500, a 403 or a 404 are NOT in this
 * list: those are the server telling us something true, and papering over
 * them with old data would hide a real fault behind a screen that looks
 * like it is working.
 */
const isUnreachable = (status: number) => status === 0 || status === 503 || status === 504;

/* ── The baseQuery ───────────────────────────────────────────────── */

export const offlineBaseQuery: BaseQueryFn<ApiRequest, unknown, ApiError, object, HttpMeta> =
  async (args, api, extraOptions) => {
    const method = args.method ?? 'GET';

    if (method !== 'GET') {
      const result = await httpBaseQuery(args, api, extraOptions);
      if (!result.error) await writeThrough(method, args.url, result.data);
      return result;
    }

    const plan = planFor(args.url);
    if (!plan) return httpBaseQuery(args, api, extraOptions);

    /* ── The fast path ──
       Not "if it is fresh" — if it is THERE. Freshness is the sync
       engine's job, and a screen that waits for the network to confirm
       what it already knows is the exact behaviour this replaces. */
    if (!api.forced) {
      const hit = await readPlan(plan);
      if (hit) return { data: hit.value, meta: { status: 200, fromCache: true } };
    }

    /* ── The network path, made conditional where it can be ──
       Only documents carry an ETag: the mirror is kept current by deltas,
       and a study's waveform cannot change at all. */
    const etag = plan.kind === 'doc' ? await getCachedEtag(plan.key) : undefined;
    const request: ApiRequest = etag
      ? { ...args, headers: { ...args.headers, 'if-none-match': etag } }
      : args;

    const result = await httpBaseQuery(request, api, extraOptions);

    if (result.error) {
      const fallbackReason =
        result.error.status === HTTP_NOT_MODIFIED
          ? 'unchanged'
          : isUnreachable(result.error.status)
            ? 'unreachable'
            : null;

      if (fallbackReason) {
        if (fallbackReason === 'unchanged' && plan.kind === 'doc') {
          // Nothing moved — but we just confirmed that, so record when.
          await touchCachedEtag(plan.key, result.meta?.etag);
        }
        const hit = await readPlan(plan);
        if (hit) {
          return {
            data: hit.value,
            meta: { status: result.error.status, fromCache: true, etag: result.meta?.etag },
          };
        }
        /* A 304 with nothing cached should be impossible — we only send
           If-None-Match when we hold a copy. If it happens (the copy was
           evicted between the two reads), fall through and report the
           error rather than inventing an answer. */
      }
      return result;
    }

    await writePlan(plan, result.data, result.meta?.etag);
    return result;
  };

// v1.0.0 — Cache-first reads over httpBaseQuery: the recordings mirror, the
//          immutable waveform files, ETag-validated documents, write-through on
//          every mutation, and last-known-good when the network is gone.
