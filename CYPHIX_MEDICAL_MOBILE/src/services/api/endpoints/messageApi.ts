/* ==================================================================
   Message / request / notification endpoints — the patient's side of
   the clinic portal (server v0.17.0, LAUNCH_PLAN 3.8, M1).

   A 1:1 mirror of the web's `clinicApi` + its messages endpoints (root
   CLAUDE.md §2.2); the routes and shapes come from @cyphix/shared so the
   two cannot drift. What this app sends is what the server already
   models: a message with a coded `reason` IS a request, and the server
   opens a `requests` row for it and tells the staff. What comes back —
   the staff's reply, the status moves — is the list and the detail.

   ⚠️ Until v0.107.0 this file did not exist and the request form said
   so in words. It exists now; the words went.
   ================================================================== */

import {
  MESSAGE_ROUTES,
  NOTIFICATION_ROUTES,
  REQUEST_ROUTES,
  type CareConnectionKind,
  type ChatMessage,
  type ChatThread,
  type NotificationsResult,
  type NotificationView,
  type PagedResult,
  type RequestDetail,
  type RequestsQuery,
  type RequestView,
  type SendMessageInput,
} from '@cyphix/shared';
import { baseApi } from '@/services/api/baseApi';

export interface ThreadArgs {
  patientId: string;
  mode: CareConnectionKind;
}
export interface SendMessageArgs extends ThreadArgs {
  body: SendMessageInput;
}
export interface NotificationsArgs {
  unread?: boolean;
  limit?: number;
}

/** A query string that skips what is undefined (recordingApi reaches for
    URLSearchParams; either works under Expo's polyfill). */
function withQuery(base: string, params: Record<string, string | number | undefined>): string {
  const parts = Object.entries(params)
    .filter((e): e is [string, string | number] => e[1] !== undefined && e[1] !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `${base}?${parts.join('&')}` : base;
}

export const messageApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** The thread of one kind of link. 404 when there is no active link of
        that kind — the form's "not connected" case. */
    getThread: build.query<ChatThread, ThreadArgs>({
      query: ({ patientId, mode }) => ({ url: MESSAGE_ROUTES.thread(patientId, mode), method: 'GET' }),
      providesTags: (_r, _e, a) => [{ type: 'Message', id: `${a.patientId}:${a.mode}` }],
    }),

    /** With a `reason` this is a REQUEST: the server opens its row and
        notifies the staff, so the list of requests is stale from here. */
    sendMessage: build.mutation<ChatMessage, SendMessageArgs>({
      query: ({ patientId, mode, body }) => ({
        url: MESSAGE_ROUTES.thread(patientId, mode),
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, a) => [
        { type: 'Message', id: `${a.patientId}:${a.mode}` },
        { type: 'Request', id: 'LIST' },
      ],
    }),

    /** A patient's own requests, newest first, with where each stands. */
    getRequests: build.query<PagedResult<RequestView>, RequestsQuery>({
      query: (q) =>
        ({
          url: withQuery(REQUEST_ROUTES.list, {
            status: q.status,
            patientId: q.patientId,
            limit: q.limit,
            offset: q.offset,
          }),
          method: 'GET',
        }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((r) => ({ type: 'Request' as const, id: r.id })),
              { type: 'Request' as const, id: 'LIST' },
            ]
          : [{ type: 'Request' as const, id: 'LIST' }],
    }),

    /** One request with its thread — the request and every reply to it. */
    getRequest: build.query<RequestDetail, string>({
      query: (id) => ({ url: REQUEST_ROUTES.request(id), method: 'GET' }),
      providesTags: (_r, _e, id) => [{ type: 'Request', id }],
    }),

    /* ── The inbox: references only (kind, request, who), never text. ── */
    getNotifications: build.query<NotificationsResult, NotificationsArgs | void>({
      query: (a) => ({
        url: withQuery(NOTIFICATION_ROUTES.list, {
          unread: a?.unread ? 1 : undefined,
          limit: a?.limit,
        }),
        method: 'GET',
      }),
      providesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    markNotificationRead: build.mutation<NotificationView, string>({
      query: (id) => ({ url: NOTIFICATION_ROUTES.read(id), method: 'POST' }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    markAllNotificationsRead: build.mutation<{ read: number }, void>({
      query: () => ({ url: NOTIFICATION_ROUTES.readAll, method: 'POST' }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetThreadQuery,
  useSendMessageMutation,
  useGetRequestsQuery,
  useGetRequestQuery,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = messageApi;

// v1.0.0 — Thread / send (a request when it carries a reason) / requests list + detail /
//          notifications, mirror of the web (server v0.17.0, LAUNCH_PLAN 3.8).
