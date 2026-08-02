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

   Presented through `OverlayLayer`, not `Modal` — the page has to be really
   behind it for the blur to sample, and a Modal is portrait-only by default,
   which crashes the app when this is raised from full screen. See that file.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import GlassSurface from '@/components/atoms/GlassSurface';
import OverlayLayer from '@/components/atoms/OverlayLayer';
import { RADIUS } from '@/theme/tokens';
import { useIsDark, useTheme } from '@/theme/useTheme';

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
  const dark = useIsDark();

  return (
    /* The page blurs behind the dialog rather than going flat black: the study
       you are about to delete stays recognisable underneath, which is the whole
       point of confirming against a specific record. */
    <OverlayLayer visible={visible} onRequestClose={onCancel} closeLabel={cancelLabel} enter="fade">
      <GlassSurface
        dark={dark}
        fallbackTint={dark ? 'rgba(19, 27, 44, 0.86)' : 'rgba(255, 255, 255, 0.88)'}
        style={[
          styles.card,
          { borderColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)' },
        ]}
      >
        <Text style={[styles.title, { color: t.textPrimary }]}>{title}</Text>
        {subject && (
          <Text style={[styles.subject, { color: destructive ? t.danger : t.textPrimary }]}>
            {subject}
          </Text>
        )}
        <Text style={[styles.body, { color: t.textSecondary }]}>{body}</Text>

        <View style={styles.actions}>
          {/* Cancel FIRST in the reading order and visually the calmer of the
              two: the safe way out should not be the one you have to look for. */}
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
      </GlassSurface>
    </OverlayLayer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: 22,
    gap: 9,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 24,
  },
  title: { fontSize: 19, fontWeight: '800' },
  subject: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20.5 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  ghost: { borderWidth: 1 },
  btnText: { fontSize: 15.5, fontWeight: '700' },
});

// v2.0.0 — Presented through OverlayLayer instead of Modal: only in tree does
//          the blur have the page to sample, and only without a Modal can this
//          be raised from landscape full screen without killing the app.
