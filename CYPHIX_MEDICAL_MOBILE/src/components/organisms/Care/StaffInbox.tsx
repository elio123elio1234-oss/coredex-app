/* ==================================================================
   StaffInbox — the Chat tab for a STAFF account (LAUNCH_PLAN 7.4,
   "Clinician lite"; the M13 softening). A doctor between two rooms, a
   front desk at the counter: what is waiting, who asked, one tap to read
   it, a short reply, done. Three things only:

     1. the open requests across their patients (the portal's inbox,
        reduced to its list — `GET /requests`, the staff's scope);
     2. the request itself with the thread, a short reply and a close
        (RequestDetailSheet in staff mode);
     3. the unread updates ("Dana filed a recording", "Moshe opened a
        request") — references the server keeps, words the phone adds.

   What is deliberately NOT here (PARITY.md says why): assigning a request
   to a colleague, the patient pages, invitations, the team — those are
   the desk's work and stay on the web portal. A technician reads; a
   clinician answers (`request:manage`).

   Reached only with a backend: the demo build's clinician preview keeps
   the patient form, so nothing a visitor has seen moves.
   ================================================================== */

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NotificationView, RequestStatus } from '@cyphix/shared';
import RequestDetailSheet, { REQUEST_STATUS_KEY } from '@/components/organisms/Care/RequestDetailSheet';
import {
  useGetNotificationsQuery,
  useGetRequestsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@/services/api/endpoints/messageApi';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/config';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** How often the inbox is re-asked while the tab is in front. */
const POLL_MS = 60_000;
type Filter = 'open' | 'all';

/** The staff's words for each kind of update; `{name}` is the actor. */
const NOTIF_KEY: Record<NotificationView['kind'], TranslationKey> = {
  'request:new': 'notifRequestNew',
  'request:answered': 'notifRequestAnswered',
  'request:status': 'notifRequestStatus',
  'recording:new': 'notifRecordingNew',
  'care:linked': 'notifCareLinked',
  'care:revoked': 'notifCareRevoked',
  'org:pending': 'notifOrgPending',
  'org:approved': 'notifOrgApproved',
  'team:joined': 'notifTeamJoined',
  'clinician:pending': 'notifClinicianPending',
  'account:approved': 'notifAccountApproved',
  'invoice:issued': 'notifInvoiceIssued',
  'subscription:past_due': 'notifPastDue',
};

/** The staff reads a status in the portal's words, not the patient's
    ("New", not "Sent"). */
const STAFF_STATUS_KEY: Record<RequestStatus, TranslationKey> = {
  new: 'staffStatusNew',
  'in-progress': 'staffStatusInProgress',
  answered: 'reqStatusAnswered',
  closed: 'reqStatusClosed',
};

interface Props {
  /** `request:manage` — a clinician; the front desk reads only. */
  canReply: boolean;
}

export default function StaffInbox({ canReply }: Props) {
  const t = useTheme();
  const { t: tr, lang, rtl } = useTranslation();
  const [filter, setFilter] = useState<Filter>('open');
  const [open, setOpen] = useState<string | null>(null);
  const reqs = useGetRequestsQuery(
    { status: filter === 'open' ? 'open' : undefined, limit: 50 },
    { pollingInterval: POLL_MS, skipPollingIfUnfocused: true },
  );
  const inbox = useGetNotificationsQuery(
    { unread: true, limit: 10 },
    { pollingInterval: POLL_MS, skipPollingIfUnfocused: true },
  );
  const [readAll] = useMarkAllNotificationsReadMutation();
  const [markRead] = useMarkNotificationReadMutation();
  const align = rtl ? ('right' as const) : ('left' as const);
  const row = rtl ? ('row-reverse' as const) : ('row' as const);
  const fmtWhen = (iso: string) =>
    new Date(iso).toLocaleString(lang, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const unread = inbox.data?.unread ?? 0;
  const updates = inbox.data?.items ?? [];

  const openUpdate = (n: NotificationView) => {
    if (!n.readAt) void markRead(n.id);
    if (n.resourceType === 'Request' && n.resourceId) setOpen(n.resourceId);
  };
  const notifText = (n: NotificationView) =>
    tr(NOTIF_KEY[n.kind] ?? 'notifOther', { name: n.actorName ?? tr('staffSomeone') });

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>{tr('staffInboxTitle')}</Text>
        <Text style={[styles.intro, { color: t.textSecondary, textAlign: align }]}>
          {canReply ? tr('staffInboxIntro') : tr('staffInboxIntroReadOnly')}
        </Text>

        {unread > 0 && (
          <View style={[styles.updates, { backgroundColor: t.surface, borderColor: t.accent }]} testID="staff-updates">
            <Text style={[styles.updatesTitle, { color: t.accent, textAlign: align }]}>
              {tr('staffUpdates', { n: unread })}
            </Text>
            {updates.slice(0, 5).map((n) => (
              <Pressable key={n.id} onPress={() => openUpdate(n)} accessibilityRole="button" style={styles.updateRow}>
                <Text style={[styles.updateText, { color: t.textPrimary, textAlign: align }]} numberOfLines={2}>
                  {notifText(n)}
                </Text>
                <Text style={[styles.when, { color: t.textTertiary, textAlign: align }]}>{fmtWhen(n.createdAt)}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => readAll()} accessibilityRole="button" style={styles.readAll}>
              <Text style={[styles.readAllText, { color: t.accent, textAlign: align }]}>{tr('staffMarkAllRead')}</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.filters, { flexDirection: row }]} accessibilityRole="tablist">
          {(['open', 'all'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === f }}
              style={[
                styles.filter,
                { borderColor: filter === f ? t.accent : t.border, backgroundColor: filter === f ? t.accent : 'transparent' },
              ]}
            >
              <Text style={[styles.filterText, { color: filter === f ? '#fff' : t.textSecondary }]}>
                {tr(f === 'open' ? 'staffFilterOpen' : 'staffFilterAll')}
                {f === 'open' && reqs.data && filter === 'open' ? ` (${reqs.data.total})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        {reqs.data && reqs.data.items.length > 0 ? (
          reqs.data.items.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => setOpen(r.id)}
              style={[styles.reqRow, { backgroundColor: t.surface, borderColor: t.border, flexDirection: row }]}
              accessibilityRole="button"
              accessibilityLabel={`${r.patientName} · ${r.reason?.display ?? tr('reqDetailTitle')} · ${tr(STAFF_STATUS_KEY[r.status])}`}
              testID={`staff-request-${r.id}`}
            >
              <View style={styles.reqMain}>
                <Text style={[styles.reqName, { color: t.textPrimary, textAlign: align }]} numberOfLines={1}>
                  {r.patientName}
                </Text>
                <Text style={[styles.reqReason, { color: t.textSecondary, textAlign: align }]} numberOfLines={1}>
                  {r.reason?.display ?? tr('reqDetailTitle')}
                  {r.attachment ? ` · ${r.attachment.label}` : ''}
                </Text>
                <Text style={[styles.when, { color: t.textTertiary, textAlign: align }]} numberOfLines={1}>
                  {fmtWhen(r.openedAt)} · {r.assignedToName ?? tr('staffUnassigned')}
                  {r.replyCount > 0 ? ` · ${tr('staffReplies', { n: r.replyCount })}` : ''}
                </Text>
              </View>
              <Text
                style={[
                  styles.pill,
                  {
                    color: r.status === 'new' ? t.accent : t.textSecondary,
                    borderColor: r.status === 'new' ? t.accent : t.border,
                  },
                ]}
              >
                {tr(STAFF_STATUS_KEY[r.status])}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={[styles.empty, { color: t.textTertiary, textAlign: align }]}>
            {reqs.isLoading ? tr('staffLoading') : reqs.isError ? tr('reqLoadError') : filter === 'open' ? tr('staffEmptyOpen') : tr('staffEmptyAll')}
          </Text>
        )}
      </ScrollView>
      <RequestDetailSheet visible={open !== null} requestId={open} onClose={() => setOpen(null)} staff canReply={canReply} />
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 8 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.4 },
  intro: { fontSize: 14.5, lineHeight: 21, marginBottom: 2 },
  updates: { borderWidth: 1, borderRadius: RADIUS.lg, padding: 12, gap: 8 },
  updatesTitle: { fontSize: 13.5, fontWeight: '800' },
  updateRow: { gap: 2, paddingVertical: 4 },
  updateText: { fontSize: 14.5, lineHeight: 20 },
  readAll: { paddingTop: 4 },
  readAllText: { fontSize: 13.5, fontWeight: '700' },
  filters: { gap: 8 },
  filter: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  filterText: { fontSize: 13.5, fontWeight: '700' },
  reqRow: { alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.lg, padding: 12 },
  reqMain: { flex: 1, gap: 2 },
  reqName: { fontSize: 16, fontWeight: '800' },
  reqReason: { fontSize: 14, lineHeight: 19 },
  when: { fontSize: 12.5 },
  pill: { fontSize: 12.5, fontWeight: '700', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  empty: { fontSize: 14.5, lineHeight: 21, paddingVertical: 8 },
});

// v1.0.0 — The staff's Chat tab: open / all requests across their patients, the unread updates in
//          words, the request sheet in staff mode (clinician lite, LAUNCH_PLAN 7.4).
