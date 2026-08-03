/* ==================================================================
   ChoiceCard (molecule) — a 72 pt tappable row with a radio dot, used
   for the sex question and for anything else that is one-of-a-few and
   consequential enough to deserve the height.

   Selection is carried by THREE signals at once — the dot fills, the
   border thickens to 2 pt navy, and the fill goes to the selected tint —
   because colour alone is not an accessible state, and this particular
   answer changes which ECG thresholds a reading is judged against.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AuthPalette } from '@/theme/authTheme';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  palette: AuthPalette;
  rtl?: boolean;
}

export default function ChoiceCard({ label, selected, onPress, palette, rtl = false }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        rtl && styles.rtl,
        {
          backgroundColor: selected ? palette.selected : pressed ? palette.key : palette.page,
          borderColor: selected ? palette.navy : palette.border,
          borderWidth: selected ? 2 : 1,
          /* Keep the contents still when the border grows. */
          paddingHorizontal: selected ? 17 : 18,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          selected
            ? { borderColor: palette.navy, borderWidth: 7 }
            : { borderColor: palette.dashed, borderWidth: 2 },
        ]}
      />
      <Text style={[styles.label, { color: palette.heading }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 72,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rtl: { flexDirection: 'row-reverse' },
  dot: { width: 22, height: 22, borderRadius: 11 },
  label: { fontSize: 16.5, fontWeight: '600', flexShrink: 1 },
});

// v1.0.0 — 72 pt radio row (three simultaneous selection signals).
