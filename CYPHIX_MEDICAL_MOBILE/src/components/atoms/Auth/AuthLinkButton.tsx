/* ==================================================================
   AuthLinkButton (atom) — teal text that acts: "Forgot password?",
   "Skip", "Show/Hide", "← Choose from contacts".

   It is a button and announces itself as one, but it is drawn as a link
   because everything in this flow wearing a box is a commitment and none
   of these are. Its hit box is padded past the glyphs: the "Show" toggle
   inside a password field is 26 pt of text and must not be a 26 pt
   target.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { AuthPalette } from '@/theme/authTheme';

interface Props {
  label: string;
  onPress: () => void;
  palette: AuthPalette;
  size?: number;
  style?: StyleProp<ViewStyle>;
  align?: 'flex-start' | 'center' | 'flex-end';
  /** Overrides teal — the navy screens need a light link instead. */
  color?: string;
}

export default function AuthLinkButton({
  label,
  onPress,
  palette,
  size = 13.5,
  style,
  align = 'flex-start',
  color,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.hit, { alignSelf: align, opacity: pressed ? 0.6 : 1 }, style]}
    >
      <Text
        style={[styles.label, { color: color ?? palette.teal, fontSize: size }]}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { paddingVertical: 6, paddingHorizontal: 2 },
  label: { fontWeight: '600' },
});

// v1.0.0 — Teal text action with a padded hit box.
