/* ==================================================================
   ToolToggle (atom) — one on/off tool in the ECG viewer's toolbar.

   The web's `.tool-toggle` is a text chip that inverts when active. On a
   phone the same chip has to survive two extra pressures: it must clear the
   44 pt tap-target floor, and six of them must fit a 390 pt row. So the
   label keeps its text (an icon-only toolbar makes the reader guess which
   pictogram means "baseline filter") and the row scrolls horizontally
   instead of wrapping — a wrapped toolbar changes height when a tool is
   gated off, which moves the trace.

   Purely presentational: label + state in, press out.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  label: string;
  active: boolean;
  onToggle: () => void;
  /** Ionicon name drawn before the label. Omit for a text-only chip. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Longer sentence for screen readers — the web's `title` tooltip. */
  hint?: string;
  disabled?: boolean;
}

export default function ToolToggle({ label, active, onToggle, icon, hint, disabled }: Props) {
  const t = useTheme();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: active, disabled: !!disabled }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      disabled={disabled}
      onPress={() => {
        void Haptics.selectionAsync();
        onToggle();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? t.brandNavy : t.surface,
          borderColor: active ? t.brandNavy : t.border,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {icon && (
        <Ionicons name={icon} size={15} color={active ? t.surface : t.textSecondary} />
      )}
      <Text
        style={[styles.label, { color: active ? t.surface : t.textPrimary }]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    // 11 + 11 + ~19 of line box clears 44 pt without the chip looking like a
    // button; the row is the only thing between the headline and the trace.
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  label: { fontSize: 13.5, fontWeight: '600' },
});

// v1.0.0 — Toolbar tool chip: labelled, 44 pt tall, inverts when active.
