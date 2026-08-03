/* ==================================================================
   PasswordMeter (molecule) — the 4 pt bar and one-word verdict under the
   password field, animating width AND colour over 300 ms exactly as the
   reference does.

   It reports strength; it never blocks. The only hard rule is the length
   minimum, which the Continue button enforces — a meter that refuses to
   go on is a meter arguing with a patient about their own password.

   The score comes from `@cyphix/shared`, so a password called "fair" on
   the phone is called "fair" on the web too.
   ================================================================== */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import AuthLabel from '@/components/atoms/Auth/AuthLabel';
import type { AuthPalette } from '@/theme/authTheme';

interface Props {
  /** 0–4, from `passwordStrength()`. */
  score: number;
  /** Already translated: "—" / "WEAK" / "FAIR" / "STRONG". */
  verdict: string;
  palette: AuthPalette;
}

const DURATION = 300;

export default function PasswordMeter({ score, verdict, palette }: Props) {
  /* 0–1 rather than a percentage string: it is what both the width and
     the colour interpolate over. */
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(Math.min(1, score / 4), {
      duration: DURATION,
      easing: Easing.out(Easing.ease),
    });
  }, [p, score]);

  const fill = useAnimatedStyle(() => ({
    width: `${p.value * 100}%`,
    backgroundColor: interpolateColor(
      p.value,
      [0, 0.5, 1],
      [palette.weak, palette.fair, palette.strong],
    ),
  }));

  return (
    <View style={styles.row}>
      <View style={[styles.track, { backgroundColor: palette.track }]}>
        <Animated.View style={[styles.fill, fill]} />
      </View>
      <AuthLabel palette={palette} style={styles.verdict}>
        {verdict}
      </AuthLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  track: { flex: 1, height: 4, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  verdict: { letterSpacing: 0.84 },
});

// v1.0.0 — Animated password strength bar + verdict (shared scoring).
