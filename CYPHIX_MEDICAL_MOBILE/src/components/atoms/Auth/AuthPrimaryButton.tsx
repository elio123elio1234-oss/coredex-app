/* ==================================================================
   AuthPrimaryButton (atom) — the flow's one navy call to action: 54 pt
   tall, 14 pt corners, the full width of the gutter.

   ── The grey state is deliberate, and it is not `disabled` ──
   The reference greys the button (`#B3BCC9`) while the step is
   incomplete and still lets it be TAPPED, which is what this does: the
   press is felt (a light tap rather than the medium one a real action
   gets) and the flow declines to advance — `useOnboarding.next()` is
   where the refusal actually lives, so a grey button can never let a
   half-answered step through. An OS-disabled control would swallow the
   touch entirely and tell the patient nothing at all.

   Only `busy` truly blocks, and only so a double tap cannot create two
   accounts.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { AUTH_METRICS, type AuthPalette } from '@/theme/authTheme';

interface Props {
  label: string;
  onPress: () => void;
  palette: AuthPalette;
  /** False paints it grey — the step is not complete yet. */
  enabled?: boolean;
  busy?: boolean;
  /** White on navy is the default; the success screen inverts it. */
  tone?: 'navy' | 'white';
}

export default function AuthPrimaryButton({
  label,
  onPress,
  palette,
  enabled = true,
  busy = false,
  tone = 'navy',
}: Props) {
  const background = tone === 'white' ? '#FFFFFF' : enabled ? palette.navy : palette.muted;
  const color = tone === 'white' ? palette.navy : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={() => {
        void Haptics.impactAsync(
          enabled ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
        );
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.label, { color }]} allowFontScaling={false} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: AUTH_METRICS.primaryHeight,
    borderRadius: AUTH_METRICS.radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: { fontSize: 16, fontWeight: '600' },
});

// v1.0.0 — The flow's navy primary action (grey when the step is incomplete).
