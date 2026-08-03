/* ==================================================================
   EcgSweepMark (atom) — the splash's heartbeat, DRAWN rather than shown:
   the reference's `@keyframes sweep` runs `stroke-dashoffset` from 520 to
   0 over 1.6 s, so the trace writes itself left to right exactly as a
   real strip does under the stylus.

   The point geometry is the reference's `<polyline points="…">`,
   unchanged — it is a stylised PQRST, not a recording, and it must never
   be presentable as one (there is no lead, no gain, no paper speed here).

   The offset is animated through `useAnimatedProps`, which mutates the
   native SVG node directly; putting it in React state would re-render the
   whole splash 96 times in 1.6 s.
   ================================================================== */

import { useEffect } from 'react';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Polyline } from 'react-native-svg';

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

/** Verbatim from the reference. viewBox is 120 × 60. */
const POINTS = '0,30 22,30 30,30 36,12 44,48 52,24 58,30 84,30 92,22 98,38 104,30 120,30';
/** The reference's dash length: comfortably longer than the path. */
const DASH = 520;
const DRAW_MS = 1600;

interface Props {
  width: number;
  color: string;
  strokeWidth?: number;
}

export default function EcgSweepMark({ width, color, strokeWidth = 3 }: Props) {
  const offset = useSharedValue(DASH);

  useEffect(() => {
    offset.value = DASH;
    offset.value = withTiming(0, { duration: DRAW_MS, easing: Easing.out(Easing.ease) });
  }, [offset]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  return (
    <Svg width={width} height={width / 2} viewBox="0 0 120 60" accessibilityLabel="">
      <AnimatedPolyline
        points={POINTS}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${DASH}`}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

// v1.0.0 — The splash's ECG trace, drawn by animating strokeDashoffset.
