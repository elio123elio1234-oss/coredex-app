/* Primary action button — navy pill, haptic tap, no default borders
   (CYPHIX UX bar). Pure presentation: label + onPress via props only. */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text } from 'react-native';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger';
  disabled?: boolean;
}

export default function PrimaryButton({ label, onPress, variant = 'primary', disabled }: Props) {
  const t = useTheme();
  const bg = variant === 'danger' ? t.danger : t.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.82 : 1 },
      ]}
    >
      <Text style={styles.label} allowFontScaling={false}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});

// v0.1.0 — Haptic navy pill button (primary/danger variants).
