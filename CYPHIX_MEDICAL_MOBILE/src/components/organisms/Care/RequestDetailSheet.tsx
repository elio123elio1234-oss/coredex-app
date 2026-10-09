/* ==================================================================
   RequestDetailSheet — one request and what came back (LAUNCH_PLAN 3.8,
   M1). The request the patient sent, then every reply from the care
   team, in order, with where the request stands. Read-only on purpose:
   a patient's next move is a NEW request, not a reply in a thread
   (ChatScreen's header says why). Wires one RTK query to a BottomSheet
   (CLAUDE.md §3.2).
   ================================================================== */

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { RequestStatus } from '@cyphix/shared';
import BottomSheet from '@/components/molecules/BottomSheet';
import { useGetRequestQuery } from '@/services/api/endpoints/messageApi';
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
}

export default function RequestDetailSheet({ visible, requestId, onClose }: Props) {
  const t = useTheme();
  const { t: tr, lang, rtl } = useTranslation();
  const q = useGetRequestQuery(requestId ?? '', { skip: !requestId || !visible });
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

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={d?.reason?.display ?? tr('reqDetailTitle')}
      closeLabel={tr('close')}
      scrollable
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
          {d.messages.map((m) => {
            const mine = m.from === 'patient';
            return (
              <View
                key={m.id}
                style={[
                  styles.msg,
                  { backgroundColor: t.surface, borderColor: mine ? t.border : t.accent },
                ]}
              >
                <Text style={[styles.who, { color: t.textTertiary, textAlign: align }]}>
                  {mine ? tr('reqYou') : (d.assignedToName ?? tr('reqCareTeam'))} · {fmt(m.sentAt)}
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
              {tr('reqAwaiting')}
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
});

// v1.0.0 — One request, its status and the replies (server v0.17.0, LAUNCH_PLAN 3.8).
