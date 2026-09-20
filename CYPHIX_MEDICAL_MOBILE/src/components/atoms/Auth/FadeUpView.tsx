/* ==================================================================
   FadeUpView (atom) — the reference's `@keyframes fadeUp`
   (`opacity 0→1`, `translateY 10px→0`, 600 ms) with the `both` fill mode
   its callers rely on: the element is INVISIBLE during its delay, not
   flashed and then animated.

   Used to stagger the splash (mark → wordmark at 350 ms → tagline at
   700 ms) and to land the content of a step after the step itself has
   slid in.

   ★ v1.1.0 — AND IT REPLAYS ON EVERY VISIT, not once per session. The
   animation used to start from `useEffect` on MOUNT, and a bottom-tab
   screen mounts once and then stays mounted for the life of the session:
   leaving a tab does not unmount it, which is exactly what makes coming
   back instant. So the second visit had nothing left to animate. It is
   keyed on FOCUS now — see `useReplayOnFocus`, including why the
   idiomatic `useIsFocused()` could not be used here (this atom is also
   rendered where there is NO navigator, and that hook throws there) and
   why the replay is driven from the listener rather than from a
   `focused` boolean in state (a flash, one commit wide).
   ================================================================== */

import { useCallback } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useReplayOnFocus } from '@/hooks/useReplayOnFocus';

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

  /* ⚠️ Memoised because `useReplayOnFocus` takes it as an effect dependency —
     a fresh closure per render would re-subscribe and replay on every render.
     `delay` and `duration` belong in here for the same reason they were in the
     old effect's deps: changing either restarts the entrance, which is what
     History relies on when its stagger arrives a frame after the focus. */
  const play = useCallback(() => {
    /* ★ Back to the start before replaying. `withTiming` animates from the
       CURRENT value, and on a return visit that value is already 1 — without
       the reset this is a 600 ms animation from 1 to 1, an expensive nothing.
       It is written straight to the shared value rather than going through a
       re-render precisely so it lands in the frame the screen appears; see
       the hook's header for what one commit of delay looks like. */
    p.value = 0;
    p.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, [p, delay, duration]);

  useReplayOnFocus(play);

  const animated = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: distance * (1 - p.value) }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

// v1.1.0 — Replays on every VISIT instead of once per session. The effect ran
//          on mount, and a bottom-tab screen mounts once and stays mounted for
//          the session — so the second time a tab was opened there was nothing
//          left to animate. Keyed on focus (`useReplayOnFocus`, which degrades
//          to mount-only where there is no navigator, because this atom also
//          runs in the auth flow and inside portalled sheets). The value is
//          reset to 0 before each replay: `withTiming` animates from the
//          current value, and on a return visit that value is already 1.
// v1.0.0 — The reference's fadeUp, with its `both` fill mode preserved.
