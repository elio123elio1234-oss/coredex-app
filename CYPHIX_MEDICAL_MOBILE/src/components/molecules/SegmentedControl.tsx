/* ==================================================================
   SegmentedControl (molecule) — the web `.settings-seg`: a small pill
   track with one option highlighted. Used for the theme choice and the
   care-connection mode.

   Generic over the option's value so a caller cannot wire a control to
   the wrong setter and still typecheck.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: t.bgSoft, borderColor: t.border }]}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(o.value);
            }}
            style={[styles.opt, active && { backgroundColor: t.brandNavy }]}
          >
            <Text
              style={[styles.label, { color: active ? '#FFFFFF' : t.textSecondary }]}
              numberOfLines={1}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  /* .settings-seg { gap 4; padding 3; radius 12 } */
  track: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: 12, borderWidth: 1 },
  /* .settings-seg-opt { padding 7px 12px; radius 9 } */
  opt: { borderRadius: 9, paddingVertical: 7, paddingHorizontal: 12 },
  label: { fontSize: 13, fontWeight: '800' },
});

// v1.0.0 — Segmented pill control (web `.settings-seg`).
