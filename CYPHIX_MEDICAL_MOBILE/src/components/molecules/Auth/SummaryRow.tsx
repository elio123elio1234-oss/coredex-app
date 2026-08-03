/* ==================================================================
   SummaryRow (molecule) — one line of the review screen: what was
   recorded, and a way back to the step that recorded it.

   A value that was skipped is shown in the muted tone with an "Add"
   action rather than being hidden. The whole point of the review screen
   is that the patient sees the gaps they chose, so nothing is discovered
   later inside a medical record.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AuthLabel from '@/components/atoms/Auth/AuthLabel';
import type { AuthPalette } from '@/theme/authTheme';

interface Props {
  label: string;
  value: string;
  /** Already translated: "Edit" or "Add". */
  action: string;
  onPress: () => void;
  palette: AuthPalette;
  /** True when the value is a placeholder ("Skipped") rather than data. */
  missing?: boolean;
  last?: boolean;
  rtl?: boolean;
}

export default function SummaryRow({
  label,
  value,
  action,
  onPress,
  palette,
  missing = false,
  last = false,
  rtl = false,
}: Props) {
  return (
    <View
      style={[
        styles.row,
        rtl && styles.rtl,
        { borderBottomColor: palette.border, borderBottomWidth: last ? 0 : 1 },
      ]}
    >
      <View style={styles.text}>
        <AuthLabel palette={palette} style={rtl ? styles.rtlText : undefined}>
          {label}
        </AuthLabel>
        <Text
          numberOfLines={1}
          style={[
            styles.value,
            { color: missing ? palette.muted : palette.heading },
            rtl && styles.rtlText,
          ]}
        >
          {value}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${action}: ${label}`}
        hitSlop={8}
        onPress={() => {
          void Haptics.selectionAsync();
          onPress();
        }}
        style={({ pressed }) => [
          styles.action,
          {
            borderColor: pressed ? palette.navy : palette.border,
            backgroundColor: pressed ? palette.selected : palette.page,
          },
        ]}
      >
        <Text allowFontScaling={false} style={[styles.actionLabel, { color: palette.heading }]}>
          {action}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rtl: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right' },
  text: { flex: 1, gap: 3 },
  value: { fontSize: 15, fontWeight: '600' },
  action: {
    height: 32,
    paddingHorizontal: 13,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 12.5, fontWeight: '600' },
});

// v1.0.0 — One reviewed detail + the way back to the step that set it.
