/* ==================================================================
   AuthProgressBar (molecule) — the 4 pt rail across the top of the six
   health steps. Width eases over 400 ms on the reference's
   `cubic-bezier(.22,.7,.3,1)`, so moving on is something the patient
   SEES happen rather than finds already done.

   Announced as a real progress bar: a patient using VoiceOver gets "step
   3 of 6" from here, not from a decoration.
   ================================================================== */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { AuthPalette } from '@/theme/authTheme';

interface Props {
  /** 0–1. */
  progress: number;
  palette: AuthPalette;
  accessibilityLabel: string;
}

const DURATION = 400;
const EASING = Easing.bezier(0.22, 0.7, 0.3, 1);

export default function AuthProgressBar({ progress, palette, accessibilityLabel }: Props) {
  const p = useSharedValue(progress);

  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(1, progress)), {
      duration: DURATION,
      easing: EASING,
    });
  }, [p, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ now: Math.round(progress * 100), min: 0, max: 100 }}
      style={[styles.track, { backgroundColor: palette.track }]}
    >
      <Animated.View style={[styles.fill, { backgroundColor: palette.navy }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flex: 1, height: 4, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

// v1.0.0 — Eased step progress rail (announced as a progressbar).
