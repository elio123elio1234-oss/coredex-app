/* ==================================================================
   RequestDetailSheet — one request and what came back (LAUNCH_PLAN 3.8,
   M1). The request the patient sent, then every reply from the care
   team, in order, with where the request stands. Read-only on purpose:
   a patient's next move is a NEW request, not a reply in a thread
   (ChatScreen's header says why). Wires one RTK query to a BottomSheet
   (CLAUDE.md §3.2).
   ================================================================== */

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { RequestStatus } from '@cyphix/shared';
import BottomSheet from '@/components/molecules/BottomSheet';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import {
  useGetRequestQuery,
  useReplyToRequestMutation,
  useUpdateRequestMutation,
} from '@/services/api/endpoints/messageApi';
import { logAudit } from '@/services/audit/auditLogger';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/config';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** The status in the patient's words — "Sent", not "new". */
export const REQUEST_STATUS_KEY: Record<RequestStatus, TranslationKey> = {
  new: 'reqStatusNew',
  'in-progress': 'reqStatusInProgress',
  answered: 'reqStatusAnswered',
  closed: 'reqStatusClosed',
};

interface Props {
  visible: boolean;
  requestId: string | null;
  onClose: () => void;
  /** v1.1.0 (LAUNCH_PLAN 7.4, clinician lite): the STAFF reads this — the
      patient is "they", the care team is "you" — and, when `canReply`, a
      short reply and a close live under the thread. The patient's sheet
      is unchanged: both flags default to off. */
  staff?: boolean;
  canReply?: boolean;
}

/** How long a reply may be on the phone: short on purpose — a paragraph
    to the patient, not a consultation; the portal is for the long form. */
const REPLY_MAX = 600;

export default function RequestDetailSheet({ visible, requestId, onClose, staff = false, canReply = false }: Props) {
  const t = useTheme();
  const { t: tr, lang, rtl } = useTranslation();
  const user = useCurrentUser();
  const q = useGetRequestQuery(requestId ?? '', { skip: !requestId || !visible });
  const [reply, { isLoading: sending }] = useReplyToRequestMutation();
  const [patch, { isLoading: moving }] = useUpdateRequestMutation();
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const align = rtl ? ('right' as const) : ('left' as const);
  const row = rtl ? ('row-reverse' as const) : ('row' as const);
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(lang, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  const d = q.data;
  const open = d != null && d.status !== 'answered' && d.status !== 'closed';
  const actor = { id: user?.id ?? 'anonymous', role: user?.role ?? 'guest' };

  const send = async () => {
    if (!d) return;
    const text = draft.trim();
    if (!text) return;
    setNotice(null);
    try {
      await reply({ id: d.id, body: { text } }).unwrap();
      setDraft('');
      setNotice(tr('staffReplySent'));
      logAudit({ actor, action: 'request:reply', resourceType: 'Request', resourceId: d.id, outcome: 'success' });
    } catch {
      setNotice(tr('staffReplyFailed'));
      logAudit({ actor, action: 'request:reply', resourceType: 'Request', resourceId: d.id, outcome: 'failure' });
    }
  };
  const closeRequest = () => {
    if (!d) return;
    Alert.alert(tr('staffClose'), tr('staffCloseConfirm'), [
      { text: tr('close'), style: 'cancel' },
      {
        text: tr('staffClose'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setNotice(null);
            try {
              await patch({ id: d.id, patch: { status: 'closed' } }).unwrap();
              setNotice(tr('staffClosed'));
              logAudit({ actor, action: 'request:update', resourceType: 'Request', resourceId: d.id, outcome: 'success', detail: 'closed' });
            } catch {
              setNotice(tr('staffReplyFailed'));
            }
          })();
        },
      },
    ]);
  };

  /* The composer is pinned under the thread (the sheet's footer) so the
     reply field never scrolls away while the staff reads what was asked. */
  const composer =
    staff && canReply && d && d.status !== 'closed' ? (
      <View style={styles.composer} testID="staff-composer">
        <TextInput
          value={draft}
          onChangeText={(v) => setDraft(v.slice(0, REPLY_MAX))}
          placeholder={tr('staffReplyPlaceholder')}
          placeholderTextColor={t.textTertiary}
          multiline
          style={[styles.input, { color: t.textPrimary, borderColor: t.border, backgroundColor: t.surface, textAlign: align }]}
          accessibilityLabel={tr('staffReplyPlaceholder')}
        />
        <View style={[styles.actions, { flexDirection: row }]}>
          <Pressable
            onPress={closeRequest}
            disabled={moving}
            style={[styles.btn, { borderColor: t.border }]}
            accessibilityRole="button"
          >
            <Text style={[styles.btnText, { color: t.textSecondary }]}>{tr('staffClose')}</Text>
          </Pressable>
          <Pressable
            onPress={() => void send()}
            disabled={!draft.trim() || sending}
            style={[styles.btn, styles.btnPrimary, { backgroundColor: t.accent, opacity: !draft.trim() || sending ? 0.5 : 1 }]}
            accessibilityRole="button"
          >
            <Text style={[styles.btnText, { color: '#fff' }]}>{sending ? tr('staffReplySending') : tr('staffReplySend')}</Text>
          </Pressable>
        </View>
        {notice && <Text style={[styles.hint, { color: t.textSecondary, textAlign: align }]}>{notice}</Text>}
      </View>
    ) : staff && d && d.status !== 'closed' && !canReply ? (
      <Text style={[styles.hint, { color: t.textTertiary, textAlign: align, paddingVertical: 8 }]}>{tr('staffReadOnly')}</Text>
    ) : undefined;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={d?.reason?.display ?? tr('reqDetailTitle')}
      closeLabel={tr('close')}
      scrollable
      footer={composer}
    >
      {q.isLoading && <ActivityIndicator color={t.accent} style={styles.spinner} />}
      {q.isError && (
        <Text style={[styles.body, { color: t.attention, textAlign: align }]}>
          {tr('reqLoadError')}
        </Text>
      )}
      {d && (
        <View style={styles.stack}>
          <View style={[styles.meta, { flexDirection: row }]}>
            <Text style={[styles.pill, { color: t.accent, borderColor: t.accent }]}>
              {tr(REQUEST_STATUS_KEY[d.status])}
            </Text>
            <Text style={[styles.when, { color: t.textTertiary }]}>{fmt(d.openedAt)}</Text>
          </View>
          {d.attachment && (
            <Text style={[styles.attach, { color: t.textSecondary, textAlign: align }]}>
              {tr('reqStudyLabel')}: {d.attachment.label}
            </Text>
          )}
          {staff && (
            <Text style={[styles.attach, { color: t.textSecondary, textAlign: align }]}>
              {tr('staffFrom', { name: d.patientName })}
              {d.assignedToName ? ` · ${tr('staffAssignedTo', { name: d.assignedToName })}` : ''}
            </Text>
          )}
          {d.messages.map((m) => {
            /* Whose bubble: for the patient their own are "mine"; for the
               staff the care team's are. */
            const mine = staff ? m.from !== 'patient' : m.from === 'patient';
            const who = staff
              ? m.from === 'patient'
                ? d.patientName
                : tr('reqYou')
              : mine
                ? tr('reqYou')
                : (d.assignedToName ?? tr('reqCareTeam'));
            return (
              <View
                key={m.id}
                style={[
                  styles.msg,
                  { backgroundColor: t.surface, borderColor: mine ? t.border : t.accent },
                ]}
              >
                <Text style={[styles.who, { color: t.textTertiary, textAlign: align }]}>
                  {who} · {fmt(m.sentAt)}
                </Text>
                {m.text ? (
                  <Text style={[styles.body, { color: t.textPrimary, textAlign: align }]}>
                    {m.text}
                  </Text>
                ) : null}
              </View>
            );
          })}
          {open && (
            <Text style={[styles.hint, { color: t.textTertiary, textAlign: align }]}>
              {staff ? tr('staffAwaiting') : tr('reqAwaiting')}
            </Text>
          )}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  spinner: { marginVertical: 24 },
  stack: { gap: 10, paddingBottom: 8 },
  meta: { alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  pill: {
    fontSize: 12.5,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  when: { fontSize: 12.5 },
  attach: { fontSize: 13.5, lineHeight: 19 },
  msg: { borderWidth: 1, borderRadius: RADIUS.lg, padding: 12, gap: 4 },
  who: { fontSize: 12.5, fontWeight: '700' },
  body: { fontSize: 15.5, lineHeight: 22 },
  hint: { fontSize: 13.5, lineHeight: 19 },
  composer: { gap: 10, paddingTop: 10 },
  input: { minHeight: 64, maxHeight: 140, borderWidth: 1, borderRadius: RADIUS.lg, padding: 12, fontSize: 15.5, lineHeight: 21 },
  actions: { gap: 10, justifyContent: 'flex-end' },
  btn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  btnPrimary: { borderWidth: 0 },
  btnText: { fontSize: 14.5, fontWeight: '700' },
});

// v1.1.0 — A staff mode (clinician lite, 7.4): the patient named, the team's bubbles are "you", a
//          short reply + a close pinned under the thread when `canReply`; the patient's sheet unchanged.
// v1.0.0 — One request, its status and the replies (server v0.17.0, LAUNCH_PLAN 3.8).
