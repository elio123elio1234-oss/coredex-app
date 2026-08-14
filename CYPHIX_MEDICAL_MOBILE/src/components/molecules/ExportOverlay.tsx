/* ==================================================================
   ExportOverlay (molecule) — "the report is being prepared", visibly.

   Exporting a PDF re-runs the whole DSP chain, 43 screening rules and the
   print engine on the JS thread — seconds, on a long recording. It used
   to be fire-and-forget: the action sheet closed and NOTHING happened on
   screen until the share sheet appeared, which reads as a dead tap. This
   is the honest state between the two: a scrim that blocks touches (the
   work IS blocking — pretending otherwise invites a second tap and a
   second export) and a sentence saying what is happening.
   ================================================================== */

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  label: string;
}

export default function ExportOverlay({ label }: Props) {
  const t = useTheme();
  return (
    <View style={styles.scrim} pointerEvents="auto" accessibilityViewIsModal>
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <ActivityIndicator color={t.textPrimary} />
        <Text style={[styles.label, { color: t.textPrimary }]} accessibilityLiveRegion="polite">
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 15, 26, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  label: { fontSize: 14.5, fontWeight: '700' },
});

// v1.0.0 — The blocking "preparing report…" state for exports: a scrim that
//          admits the JS thread is busy instead of a dead-feeling tap.
