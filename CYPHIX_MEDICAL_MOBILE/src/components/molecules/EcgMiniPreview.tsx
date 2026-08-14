/* ==================================================================
   EcgMiniPreview (molecule) — four seconds of lead II in a History row,
   drawn the way a chart recorder draws it.

   ══ THIS ANSWERS StudyCard's OLD NO-THUMBNAIL ARGUMENT, DIRECTLY ══
   The argument was: "a 40 pt sparkline of a 10 s ECG is an unreadable
   squiggle that nonetheless looks like clinical information." That is
   true of 10 s in 40 pt — at 320 samples/s squeezed into ~350 px, a QRS
   is under 4 px wide and everything reads as noise. It is NOT true of a
   FOUR-second window at the same size: ~11 px per QRS at a fixed time
   scale is exactly the preview Kardia ships on every row, and readers of
   that app demonstrably use it — to recognise "the noisy one", "the fast
   one", "the one with the pause" — before any number is read. The
   clinical statement on the row is the VERDICT beside this preview; the
   preview's job is recognition, not measurement.

   Which is why it deliberately does not look like ECG paper: no red/blue
   grid, no calibration pulse, no mm scale — only hairline second-ticks so
   rate differences read across rows. `EcgStripSvg` (25 mm/s, mm-true,
   measurable) remains the only component allowed to look like paper.

   Time scale is FIXED per row width: the window always fills the card, so
   every row in the list shares one sweep speed and rates compare by eye.

   ══ ★ THE SWEEP — WHY IT IS DRAWN AND NOT JUST SHOWN ══
   Asked for: "add an animation as if the wave is being created live."
   The trace writes itself left to right at CONSTANT speed (`Easing.linear`
   — a monitor's stylus does not accelerate; easing it would read as a UI
   wipe rather than an instrument), with a small pen dot travelling at the
   writing edge and fading out as it lands. Mechanically it is
   `strokeDasharray` + an animated `strokeDashoffset` on the UI thread, so
   a list of these costs the JS thread nothing.

   ★ It runs when the row BECOMES VISIBLE, not on mount — the caller
   passes `animate` off its FlatList viewability. Rows below the fold draw
   as they are scrolled to, which is the point: the animation is a reward
   for arriving somewhere, not a thing that already happened off-screen.

   A mounted row draws ONCE and then holds still — scrolling back over it
   does not re-trigger anything, because re-drawing under every passing
   thumb would turn an instrument into a fidget toy. (A row that FlatList
   recycles far off-screen and later remounts does draw again, which is
   the same "it just arrived" reading and is left alone.)
   ================================================================== */

import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { buildEcgPath } from '@cyphix/shared';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** Downsampled preview samples, mV (from the study digest). */
  samples: Float32Array;
  /** Effective rate of `samples`. */
  sampleRate: number;
  height?: number;
  /** Trace colour. */
  stroke: string;
  /** Second-tick hairlines. */
  gridColor: string;
  /** True once the row has been scrolled into view — see the header. */
  animate?: boolean;
  accessibilityLabel: string;
}

/** The trace keeps this many px of breathing room at top and bottom. */
const EDGE_PX = 2;
/**
 * How long the stylus takes to cross the card.
 *
 * NOT the recording's own 4 s: a list of rows each taking four seconds to
 * become readable would be a list you have to wait for. ~1.1 s reads as a
 * fast sweep and is over before a thumb has finished the flick that
 * revealed it.
 */
const DRAW_MS = 1100;
/** Samples the pen dot's vertical position is looked up from. */
const PEN_STEPS = 96;
/**
 * If viewability never reports (an edge case in a short list that fits
 * without scrolling), reveal the trace anyway. A preview that never
 * appears is a far worse failure than one that did not animate.
 */
const REVEAL_FALLBACK_MS = 1200;

/**
 * Length of a polyline `d` string, in user units.
 *
 * `buildEcgPath` emits only absolute `M`/`L` with two decimals, so pairing
 * the numbers off is exact rather than a heuristic. The dash animation
 * needs a real length: a guessed upper bound would finish drawing early
 * and then sit still for the rest of the duration.
 */
function polylineLength(d: string): number {
  const nums = d.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 4) return 0;
  let total = 0;
  let px = Number(nums[0]);
  let py = Number(nums[1]);
  for (let i = 2; i + 1 < nums.length; i += 2) {
    const x = Number(nums[i]);
    const y = Number(nums[i + 1]);
    total += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return total;
}

export default function EcgMiniPreview({
  samples,
  sampleRate,
  height = 44,
  stroke,
  gridColor,
  animate = false,
  accessibilityLabel,
}: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const durationSec = sampleRate > 0 ? samples.length / sampleRate : 0;
  const ready = width > 0 && durationSec > 0 && samples.length >= 2;

  /* `buildEcgPath` thinks in mm; here 1 "mm" = 1 px. The window fills the
     width (pxPerSec = width / duration), ±1.1 mV fills the height, and the
     baseline sits slightly above centre because R waves are taller than S
     waves are deep. `clipMm` keeps an extreme beat inside the strip. */
  const pxPerMv = height / 2 - EDGE_PX;
  const baselinePx = height * 0.56;
  const clipPx = height / 2 - EDGE_PX;

  const path = useMemo(
    () =>
      ready
        ? buildEcgPath(samples, {
            sampleRate,
            mmPerSec: width / durationSec,
            mmPerMv: pxPerMv,
            baselineMm: baselinePx,
            bucketsPerMm: 1, // one min/max pair per px — the data is pre-decimated
            clipMm: clipPx,
          })
        : '',
    [ready, samples, sampleRate, width, durationSec, pxPerMv, baselinePx, clipPx],
  );

  const length = useMemo(() => polylineLength(path), [path]);

  /* Where the pen sits at each step of the sweep. Precomputed on the JS
     thread and read by the worklet — deriving it per frame would put the
     signal back on the thread this whole design keeps it off. */
  const penYs = useMemo(() => {
    if (!ready) return [0];
    const ys: number[] = [];
    for (let i = 0; i < PEN_STEPS; i++) {
      const idx = Math.round((i / (PEN_STEPS - 1)) * (samples.length - 1));
      const offset = Math.max(-clipPx, Math.min(clipPx, samples[idx] * pxPerMv));
      ys.push(baselinePx - offset);
    }
    return ys;
  }, [ready, samples, pxPerMv, baselinePx, clipPx]);

  /** 0 = nothing drawn, 1 = the whole trace is on the page. */
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!ready || length <= 0) return;
    if (animate) {
      progress.value = 0;
      progress.value = withTiming(1, { duration: DRAW_MS, easing: Easing.linear });
      return;
    }
    /* Not (yet) reported visible — see REVEAL_FALLBACK_MS. */
    const timer = setTimeout(() => {
      progress.value = 1;
    }, REVEAL_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [animate, ready, length, progress]);

  const traceProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
  }));

  const penProps = useAnimatedProps(() => {
    const p = progress.value;
    const i = Math.max(0, Math.min(penYs.length - 1, Math.round(p * (penYs.length - 1))));
    return {
      cx: p * width,
      cy: penYs[i],
      /* Absent before the sweep starts, and fading through the last tenth
         so the stylus lifts off the page rather than vanishing mid-stroke. */
      opacity: p <= 0 ? 0 : p >= 1 ? 0 : p > 0.9 ? (1 - p) / 0.1 : 1,
    };
  });

  return (
    <View
      /* The height is owned here, not by the Svg — before `onLayout`
         reports a width there is no Svg yet, and a box that collapses for
         one frame makes every row jump as it fills in. */
      style={[styles.box, { height }]}
      onLayout={onLayout}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {ready && length > 0 && (
        <Svg width={width} height={height}>
          {Array.from({ length: Math.max(0, Math.ceil(durationSec) - 1) }, (_, i) => {
            const x = ((i + 1) / durationSec) * width;
            return (
              <Line key={x} x1={x} y1={0} x2={x} y2={height} stroke={gridColor} strokeWidth={1} />
            );
          })}
          <AnimatedPath
            d={path}
            stroke={stroke}
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[length, length]}
            animatedProps={traceProps}
          />
          {/* The stylus. Small enough to be a pen and not a marker. */}
          <AnimatedCircle r={2.2} fill={stroke} animatedProps={penProps} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', overflow: 'hidden' },
});

// v2.0.0 — The trace SWEEPS on: constant-speed dash reveal with a pen dot at
//          the writing edge, on the UI thread, fired when the row scrolls into
//          view rather than on mount. Once per visit — re-drawing on every
//          scroll pass would make an instrument into a fidget toy.
// v1.0.0 — A 4 s lead II preview for the History row: fixed time scale, second
//          ticks only (deliberately not ECG paper), recognition not measurement.
