/* ==================================================================
   FadeUpView (atom) — the reference's `@keyframes fadeUp`
   (`opacity 0→1`, `translateY 10px→0`, 600 ms) with the `both` fill mode
   its callers rely on: the element is INVISIBLE during its delay, not
   flashed and then animated.

   Used to stagger the splash (mark → wordmark at 350 ms → tagline at
   700 ms) and to land the content of a step after the step itself has
   slid in.
   ================================================================== */

import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  children: React.ReactNode;
  /** Milliseconds before it starts. Invisible until then. */
  delay?: number;
  duration?: number;
  /** How far below its resting place it starts. */
  distance?: number;
  style?: StyleProp<ViewStyle>;
}

export default function FadeUpView({
  children,
  delay = 0,
  duration = 600,
  distance = 10,
  style,
}: Props) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, [p, delay, duration]);

  const animated = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: distance * (1 - p.value) }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

// v1.0.0 — The reference's fadeUp, with its `both` fill mode preserved.
