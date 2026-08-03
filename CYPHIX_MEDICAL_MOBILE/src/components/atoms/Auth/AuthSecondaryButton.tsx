/* ==================================================================
   AuthSecondaryButton (atom) — the hairline-outlined 52 pt button:
   "Sign in" next to "Create account", "Use Face ID", "Upload".

   `square` is the same button at 52 × 52 for the two social marks on the
   welcome screen, so they cannot drift apart from the row they sit in.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { AUTH_METRICS, type AuthPalette } from '@/theme/authTheme';

interface Props {
  label: string;
  onPress: () => void;
  palette: AuthPalette;
  /** 52 × 52 instead of full width — for a glyph, not a sentence. */
  square?: boolean;
  /** Drawn before the label (the Face ID mark). */
  leading?: React.ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export default function AuthSecondaryButton({
  label,
  onPress,
  palette,
  square = false,
  leading,
  accessibilityLabel,
  style,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        square ? styles.square : styles.wide,
        {
          backgroundColor: pressed ? palette.selected : palette.page,
          borderColor: pressed ? palette.navy : palette.border,
        },
        style,
      ]}
    >
      {leading}
      <Text
        style={[styles.label, { color: palette.heading }]}
        allowFontScaling={false}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: AUTH_METRICS.secondaryHeight,
    borderRadius: AUTH_METRICS.radius,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  wide: { paddingHorizontal: 16 },
  square: { width: AUTH_METRICS.secondaryHeight },
  label: { fontSize: 15, fontWeight: '600' },
});

// v1.0.0 — Outlined secondary action (full width or 52 pt square).
