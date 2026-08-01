/* ==================================================================
   ExitScanButton (atom) — leaves the live measurement.
   The web's `.ctrl-btn.exit`: a red pill with the exit-door glyph.

   Its own file because the measurement screen must be able to change
   how you leave a recording without anyone opening the screen's logic
   (CLAUDE.md §3.1).
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/useTheme';

interface Props {
  label: string;
  onPress: () => void;
}

/** The web ExitIcon, at `.ctrl-btn svg { width: 17px }`. */
function ExitIcon({ size = 17, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 17l5-5-5-5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M21 12H9" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export default function ExitScanButton({ label, onPress }: Props) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      // Generous, because it is pressed by someone whose hands are occupied.
      hitSlop={10}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: t.danger, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <ExitIcon />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /* .ctrl-btn { gap: 8; padding: 12px 22px; border-radius: 999px } */
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  label: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' },
});

// v1.0.0 — The web's red exit pill for the live measurement screen.
