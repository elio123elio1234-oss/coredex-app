/* ==================================================================
   PulseRing (atom) — the reference's `@keyframes pulseRing`: a hairline
   circle that grows out of the mark and fades, forever.

     0%   scale .9   opacity .55
     70%  scale 1.35 opacity 0
     100%            opacity 0

   Two of these with a 600 ms offset make the splash's heartbeat. The
   30 % of the cycle where it is invisible is the REST between beats —
   without it the rings read as a spinner, which would say "waiting"
   rather than "alive".

   Runs on the UI thread (Reanimated), so it keeps its rhythm while JS is
   busy restoring the session behind it.
   ================================================================== */

import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  /** Ring colour — teal on the splash, teal on success. */
  color: string;
  /** Milliseconds for one full beat. */
  duration?: number;
  /** Offset, so a second ring trails the first. */
  delay?: number;
}

const START_SCALE = 0.9;
const END_SCALE = 1.35;
const PEAK_OPACITY = 0.55;
/** The fraction of the cycle the ring is visible for. */
const VISIBLE = 0.7;

export default function PulseRing({ color, duration = 2000, delay = 0 }: Props) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.ease) }), -1, false),
    );
  }, [t, duration, delay]);

  const style = useAnimatedStyle(() => {
    const p = Math.min(t.value / VISIBLE, 1);
    return {
      transform: [{ scale: START_SCALE + (END_SCALE - START_SCALE) * p }],
      opacity: t.value < VISIBLE ? PEAK_OPACITY * (1 - p) : 0,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.ring, { borderColor: color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  /* border-radius:50% on a square box. */
  ring: { borderRadius: 999, borderWidth: 1.5 },
});

// v1.0.0 — The reference's pulseRing keyframes, on the UI thread.
