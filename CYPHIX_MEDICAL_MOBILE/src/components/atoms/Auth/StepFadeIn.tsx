/* ==================================================================
   StepFadeIn (atom) — the reference's `@keyframes scrIn`, which is how
   EVERY screen in the flow arrives: `opacity 0→1` with a 16 px slide
   from the trailing edge, 320 ms on `cubic-bezier(.22,.7,.3,1)`.

   ── Why this is not a navigator transition ──
   The wizard is one screen that swaps its contents (as the web's
   RegisterWizard does), so there is no push to animate. That is also
   what the design shows: 16 px is a CONTENT change, not a page change,
   and a full-width native push would read as leaving the flow rather
   than progressing through it.

   Mount it with `key={step}` — React then unmounts the old step and
   mounts a new one, which is what re-runs the animation.
   ================================================================== */

import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  children: React.ReactNode;
  /** +1 slides in from the trailing edge (forward), −1 from the leading
      edge. Going back should not look like going on. */
  direction?: 1 | -1;
  style?: StyleProp<ViewStyle>;
}

const DISTANCE = 16;
const DURATION = 320;
/* The reference's easing, verbatim. */
const EASING = Easing.bezier(0.22, 0.7, 0.3, 1);

export default function StepFadeIn({ children, direction = 1, style }: Props) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(1, { duration: DURATION, easing: EASING });
  }, [p]);

  const animated = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateX: DISTANCE * direction * (1 - p.value) }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

// v1.0.0 — The reference's scrIn screen-enter animation.
