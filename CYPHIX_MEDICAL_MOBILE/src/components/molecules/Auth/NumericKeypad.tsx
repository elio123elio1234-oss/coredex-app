/* ==================================================================
   NumericKeypad (molecule) — the flow's own 3 × 4 pad for the phone
   number and the SMS code.

   ── Why not the OS keyboard ──
   Both fields are digits-only and both sit on a screen whose primary
   button is at the bottom. A system numeric keyboard would cover that
   button, and on Android its layout differs by OEM keyboard. A pad drawn
   in the page is always in the same place, always 56 pt tall, and cannot
   paste a letter into a phone number.

   Keys are `del` and the digits; the empty cell keeps `0` centred, as
   every phone dialler does.
   ================================================================== */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AUTH_METRICS, NUMERIC_TYPE, type AuthPalette } from '@/theme/authTheme';

interface Props {
  onPress: (key: string) => void;
  palette: AuthPalette;
  /** Announced on the delete key ("Delete"). */
  deleteLabel: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

export default function NumericKeypad({ onPress, palette, deleteLabel }: Props) {
  return (
    <View style={styles.grid}>
      {KEYS.map((key, i) => {
        if (key === '') return <View key={`gap-${i}`} style={styles.key} />;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={key === 'del' ? deleteLabel : key}
            onPress={() => onPress(key)}
            style={({ pressed }) => [
              styles.key,
              { backgroundColor: pressed ? palette.keyPressed : palette.key },
            ]}
          >
            <Text
              style={[styles.glyph, { color: palette.heading }]}
              allowFontScaling={false}
            >
              {key === 'del' ? '⌫' : key}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  /* Three per row. The width is UNDER a third on purpose: `gap` is not
     part of the percentage, so 3 × 33 % + 2 × 10 pt overflows the row and
     wrapping would silently give a two-column dialler. `flexGrow` then
     spreads the slack back out, so the keys still fill the width. */
  key: {
    width: '30%',
    flexGrow: 1,
    height: AUTH_METRICS.keyHeight,
    borderRadius: AUTH_METRICS.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 21, fontWeight: '500', ...NUMERIC_TYPE },
});

// v1.0.0 — In-page numeric pad for the phone and code steps.
