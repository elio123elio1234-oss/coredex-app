/* ==================================================================
   recordingApi — RTK Query endpoints for stored ECG recordings.

   A 1:1 mirror of the web app's `services/api/endpoints/recordingApi.ts`
   (root CLAUDE.md §2.2: "endpoint definitions mirror each other 1:1; the
   transport is the only platform-specific part"). Same paths, same cache
   tags, same optimistic patch on an annotation move, same page size —
   because the two apps talk to the same server tomorrow, and a divergence
   here would only show up as one platform's cache going stale.

   Note `getRecording` (the full waveform) is a SEPARATE endpoint from
   `listRecordings` (metadata only). Keeping them apart is what lets the
   history list stay cheap no matter how many sessions exist.
   ================================================================== */

import { ENV } from '@/config/env';
import { baseApi } from '@/services/api/baseApi';
import {
  encodeChannel,
  type NewRecordingInput,
  type RecordingAnnotation,
  type RecordingListItem,
  type StoredRecording,
} from '@cyphix/shared';

/** Waveforms cross the boundary as typed arrays; Float32Array is not JSON. */
export interface CreateRecordingArgs extends Omit<NewRecordingInput, 'rawLeadI' | 'rawLeadII'> {
  rawLeadI: Float32Array;
  rawLeadII: Float32Array;
}

/**
 * List args. `limit` is the efficiency lever: a "latest only" indicator asks
 * for `limit: 1`, while the History browser asks for a bounded page. Omit it
 * only when a caller genuinely needs the whole set.
 */
export interface ListRecordingsArg {
  patientId?: string;
  limit?: number;
  offset?: number;
}

/** The bounded page the History browser loads — the same number as web, so
    a device and a browser showing the same account agree on what "recent"
    means. Generous enough that the pilot never needs a "load older". */
export const HISTORY_PAGE_SIZE = 50;

/** Over real HTTP a Float32Array would JSON-serialize into a useless object,
    so the channels are base64-encoded here (the server decodes and stores
    them as int16 µV). The local path keeps the raw arrays. */
const toWireBody = (args: CreateRecordingArgs): unknown =>
  ENV.hasBackend
    ? { ...args, rawLeadI: encodeChannel(args.rawLeadI), rawLeadII: encodeChannel(args.rawLeadII) }
    : args;

export const recordingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** History list — metadata + cached summary, newest first. No samples. */
    listRecordings: builder.query<RecordingListItem[], ListRecordingsArg | void>({
      query: (arg) => {
        const { patientId, limit, offset } = arg ?? {};
        const base = patientId ? `patients/${patientId}/recordings` : 'recordings';
        const params = new URLSearchParams();
        if (limit != null) params.set('limit', String(limit));
        if (offset != null) params.set('offset', String(offset));
        const qs = params.toString();
        return { url: qs ? `${base}?${qs}` : base };
      },
      // Keep the metadata list cached for 5 min so leaving History and coming
      // back is instant instead of re-reading storage on every visit.
      keepUnusedDataFor: 300,
      providesTags: (result) => [
        { type: 'Recording' as const, id: 'LIST' },
        ...(result ?? []).map((r) => ({ type: 'Recording' as const, id: r.id })),
      ],
    }),

    /** One full recording, waveform included. Fetched when a study is opened. */
    getRecording: builder.query<StoredRecording | undefined, string>({
      query: (id) => ({ url: `recordings/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Recording' as const, id }],
    }),

    createRecording: builder.mutation<StoredRecording, CreateRecordingArgs>({
      query: (args) => ({ url: 'recordings', method: 'POST', body: toWireBody(args) }),
      invalidatesTags: [{ type: 'Recording', id: 'LIST' }],
    }),

    deleteRecording: builder.mutation<void, string>({
      query: (id) => ({ url: `recordings/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Recording', id: 'LIST' }],
    }),

    addAnnotation: builder.mutation<
      StoredRecording,
      { id: string; annotation: Omit<RecordingAnnotation, 'id' | 'createdAt'> }
    >({
      query: ({ id, annotation }) => ({
        url: `recordings/${id}/annotations`,
        method: 'POST',
        body: annotation,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Recording', id },
        { type: 'Recording', id: 'LIST' },
      ],
    }),

    updateAnnotation: builder.mutation<
      StoredRecording,
      {
        id: string;
        annotationId: string;
        patch: { sampleIndex?: number; text?: string; lead?: string | null };
      }
    >({
      query: ({ id, annotationId, patch }) => ({
        url: `recordings/${id}/annotations/${annotationId}`,
        method: 'PATCH',
        body: patch,
      }),
      /* Optimistic: patch the cached recording the instant the drag ends, so
         the marker stays exactly where it was released instead of snapping
         back while the write round-trips. If it fails, the patch is undone. */
      async onQueryStarted({ id, annotationId, patch }, { dispatch, queryFulfilled }) {
        const undo = dispatch(
          recordingApi.util.updateQueryData('getRecording', id, (draft) => {
            const a = draft?.annotations.find((x) => x.id === annotationId);
            if (a) Object.assign(a, patch);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          undo.undo();
        }
      },
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Recording', id },
        { type: 'Recording', id: 'LIST' },
      ],
    }),

    removeAnnotation: builder.mutation<StoredRecording, { id: string; annotationId: string }>({
      query: ({ id, annotationId }) => ({
        url: `recordings/${id}/annotations/${annotationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Recording', id },
        { type: 'Recording', id: 'LIST' },
      ],
    }),

    setRecordingNote: builder.mutation<StoredRecording, { id: string; note: string }>({
      query: ({ id, note }) => ({ url: `recordings/${id}/note`, method: 'PUT', body: { note } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Recording', id }],
    }),
  }),
});

export const {
  useListRecordingsQuery,
  useGetRecordingQuery,
  useCreateRecordingMutation,
  useDeleteRecordingMutation,
  useAddAnnotationMutation,
  useUpdateAnnotationMutation,
  useRemoveAnnotationMutation,
  useSetRecordingNoteMutation,
} = recordingApi;

// v1.0.0 — Recording endpoints, mirroring the web app's 1:1 (paths, tags,
//          page size and the optimistic annotation move included).
