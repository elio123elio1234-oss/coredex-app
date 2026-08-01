/* ==================================================================
   SettingsRow (molecule) — one label(+description) on the start, one
   control (or read-only value) on the end. Ported from the web molecule.

   When `onPress` is supplied the whole row becomes the tap target ("Sign
   out", "Connect a device"): a 44 pt-tall row is a far better target for
   an unsteady hand than a word at the end of it.

   Rows are separated by a top divider, and the FIRST row in a section
   never draws one — the section header already ends there
   (`.settings-section-body > .settings-row:first-child`).
   ================================================================== */

import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface Props {
  label: string;
  description?: string;
  /** Right-side interactive control (switch, segmented buttons, …). */
  control?: ReactNode;
  /** Right-side read-only value (status text or chip). */
  value?: ReactNode;
  /** When set, the whole row is a button. */
  onPress?: () => void;
  disabled?: boolean;
  /** The section's first row draws no divider. */
  first?: boolean;
}

export default function SettingsRow({
  label,
  description,
  control,
  value,
  onPress,
  disabled = false,
  first = false,
}: Props) {
  const t = useTheme();

  const body = (
    <>
      <View style={styles.main}>
        <Text style={[styles.label, { color: t.textPrimary }]}>{label}</Text>
        {description != null && (
          <Text style={[styles.desc, { color: t.textSecondary }]}>{description}</Text>
        )}
      </View>
      {control != null ? (
        <View style={styles.control}>{control}</View>
      ) : value != null ? (
        typeof value === 'string' ? (
          <Text style={[styles.value, { color: t.textSecondary }]}>{value}</Text>
        ) : (
          <View style={styles.control}>{value}</View>
        )
      ) : null}
    </>
  );

  const frame = [
    styles.row,
    !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          void Haptics.selectionAsync();
          onPress();
        }}
        style={({ pressed }) => [...frame, { opacity: disabled ? 0.55 : pressed ? 0.6 : 1 }]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={frame}>{body}</View>;
}

const styles = StyleSheet.create({
  /* .settings-row { row; space-between; gap 16; padding 13px 0 } */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 13,
    minHeight: 44,
  },
  main: { flex: 1, minWidth: 0, gap: 3 },
  label: { fontSize: 14, fontWeight: '700' },
  desc: { fontSize: 12.5, lineHeight: 18 },
  control: { flexShrink: 0 },
  value: { flexShrink: 0, fontSize: 13, fontWeight: '600', textAlign: 'right', maxWidth: '55%' },
});

// v1.0.0 — Settings row (label/desc + control or value; optional button).
