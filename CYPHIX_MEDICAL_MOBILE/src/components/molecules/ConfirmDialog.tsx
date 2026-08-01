/* ==================================================================
   ConfirmDialog (molecule) — the last thing between a reader and an
   irreversible action. Ported from the web molecule.

   ★ NOT `Alert.alert`. The platform alert is one line of body text with no
   emphasis and no room for the sentence that actually matters here — "a
   recording cannot be re-taken; the patient, the moment and the heartbeat
   were all specific to it". A destructive confirmation whose body has been
   trimmed to fit a system dialog is a confirmation that stops being read.

   The subject (which study) is shown in its own line above the body, so the
   reader confirms a specific recording rather than the idea of one.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  visible: boolean;
  title: string;
  /** What is being acted on — a date, a name. Rendered prominently. */
  subject?: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  subject,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  const t = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.title, { color: t.textPrimary }]}>{title}</Text>
          {subject && (
            <Text style={[styles.subject, { color: destructive ? t.danger : t.textPrimary }]}>
              {subject}
            </Text>
          )}
          <Text style={[styles.body, { color: t.textSecondary }]}>{body}</Text>

          <View style={styles.actions}>
            {/* Cancel FIRST in the reading order and visually the calmer of
                the two: the safe way out should not be the one you have to
                look for. */}
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              disabled={busy}
              style={({ pressed }) => [
                styles.btn,
                styles.ghost,
                { borderColor: t.border, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.btnText, { color: t.textPrimary }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                onConfirm();
              }}
              style={({ pressed }) => [
                styles.btn,
                {
                  backgroundColor: destructive ? t.danger : t.brandNavy,
                  opacity: busy ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 22, gap: 9 },
  title: { fontSize: 19, fontWeight: '800' },
  subject: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20.5 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  ghost: { borderWidth: 1 },
  btnText: { fontSize: 15.5, fontWeight: '700' },
});

// v1.0.0 — Destructive confirmation with room for the sentence that matters.
