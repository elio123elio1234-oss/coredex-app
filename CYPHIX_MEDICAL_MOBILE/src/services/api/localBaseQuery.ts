/* ==================================================================
   localBaseQuery — the offline half of the swap (root CLAUDE.md §2.2).

   It speaks the SAME `{ url, method, body }` request and `{ status,
   message }` error envelope as `httpBaseQuery`, and routes to the on-device
   store instead of the network. That is the whole firewall: endpoints,
   hooks, screens and cache tags cannot tell which one answered, so the day
   `EXPO_PUBLIC_API_BASE_URL` is set, nothing above this file changes.

   The web's `mockBaseQuery` is the same idea with the same route table —
   deliberately, so an endpoint written against one platform's paths works
   unchanged on the other.

   ══ THE SIMULATED LATENCY IS NOT DECORATION ══
   Web CLAUDE.md §4.3 requires every async state to be modelled even
   against instant data. A store that resolves in the same tick as the
   render never exercises the skeleton, and the loading state then ships
   untested and appears for the first time against a real server on a bad
   connection. A small delay keeps that path honest.
   ================================================================== */

import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { ApiError, ApiRequest } from '@cyphix/shared';
import {
  addAnnotation,
  createRecording,
  getRecording,
  listRecordings,
  removeAnnotation,
  removeRecording,
  setRecordingNote,
  StoreError,
  updateAnnotation,
} from '@/services/db/recordingStore';

/** Enough to make a spinner appear and a skeleton earn its keep. */
const LATENCY_MS = 180;

type Handler = (segments: string[], body: unknown, query: URLSearchParams) => Promise<unknown>;

/** Route table: [method, pattern, handler]. Patterns use :param segments. */
const ROUTES: Array<{ method: string; pattern: string[]; handler: Handler }> = [
  { method: 'GET', pattern: ['recordings'], handler: () => listRecordings() },
  {
    method: 'GET',
    pattern: ['patients', ':id', 'recordings'],
    handler: (s) => listRecordings(`Patient/${s[1]}`),
  },
  { method: 'GET', pattern: ['recordings', ':id'], handler: (s) => getRecording(s[1]) },
  { method: 'POST', pattern: ['recordings'], handler: (_s, b) => createRecording(b as never) },
  { method: 'DELETE', pattern: ['recordings', ':id'], handler: (s) => removeRecording(s[1]) },
  {
    method: 'POST',
    pattern: ['recordings', ':id', 'annotations'],
    handler: (s, b) => addAnnotation(s[1], b as never),
  },
  {
    method: 'PATCH',
    pattern: ['recordings', ':id', 'annotations', ':annId'],
    handler: (s, b) => updateAnnotation(s[1], s[3], b as never),
  },
  {
    method: 'DELETE',
    pattern: ['recordings', ':id', 'annotations', ':annId'],
    handler: (s) => removeAnnotation(s[1], s[3]),
  },
  {
    method: 'PUT',
    pattern: ['recordings', ':id', 'note'],
    handler: (s, b) => setRecordingNote(s[1], (b as { note: string }).note),
  },
];

function matches(pattern: string[], segments: string[]): boolean {
  if (pattern.length !== segments.length) return false;
  return pattern.every((p, i) => p.startsWith(':') || p === segments[i]);
}

export const localBaseQuery: BaseQueryFn<ApiRequest, unknown, ApiError> = async (args) => {
  const { url, method = 'GET', body } = args;
  const [path, search = ''] = url.split('?');
  const segments = path.split('/').filter(Boolean);
  const query = new URLSearchParams(search);

  const route = ROUTES.find((r) => r.method === method && matches(r.pattern, segments));
  if (!route) {
    return { error: { status: 404, message: `No local route for ${method} ${path}` } };
  }

  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  try {
    let data = await route.handler(segments, body, query);

    /* `limit` / `offset` are honoured HERE rather than in the store, because
       they are transport concerns: a real server slices the page, and the
       repository below simply returns what it has. Keeping the split in the
       same place on both sides is what lets the store be swapped out. */
    if (Array.isArray(data)) {
      const offset = Number(query.get('offset') ?? 0) || 0;
      const limitRaw = query.get('limit');
      const limit = limitRaw != null ? Number(limitRaw) : undefined;
      data = data.slice(offset, limit != null ? offset + limit : undefined);
    }

    return { data };
  } catch (err) {
    if (err instanceof StoreError) return { error: { status: err.status, message: err.message } };
    return {
      error: { status: 500, message: err instanceof Error ? err.message : 'Local store failed' },
    };
  }
};

// v1.0.0 — Offline baseQuery over the on-device recording store; same envelope
//          and route table as web mockBaseQuery, so endpoints are portable.
