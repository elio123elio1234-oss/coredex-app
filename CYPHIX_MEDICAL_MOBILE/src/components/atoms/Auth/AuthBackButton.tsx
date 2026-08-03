/* ==================================================================
   AuthBackButton (atom) — the 38 pt outlined ← that starts every step
   after the welcome screen.

   The arrow follows the reading direction: in Hebrew the flow runs right
   to left, and a ← there would point AT the next step rather than away
   from it.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AUTH_METRICS, type AuthPalette } from '@/theme/authTheme';

interface Props {
  onPress: () => void;
  palette: AuthPalette;
  /** True in a right-to-left locale — flips the glyph, not the layout. */
  rtl?: boolean;
  accessibilityLabel: string;
}

export default function AuthBackButton({ onPress, palette, rtl = false, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? palette.selected : palette.page,
          borderColor: pressed ? palette.navy : palette.border,
        },
      ]}
    >
      <Text style={[styles.glyph, { color: palette.heading }]} allowFontScaling={false}>
        {rtl ? '→' : '←'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: AUTH_METRICS.backSize,
    height: AUTH_METRICS.backSize,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 16, fontWeight: '600', lineHeight: 20 },
});

// v1.0.0 — The 38 pt outlined back control (arrow follows text direction).
