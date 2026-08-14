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

   ══ ★ THE SWEEP, AND THE VERSION OF IT THAT KILLED THE SCREEN ══
   Asked for: "an animation as if the wave is being created live." The
   trace writes itself left to right at CONSTANT speed (`Easing.linear` —
   a monitor's stylus does not accelerate; easing it reads as a UI wipe
   rather than an instrument), with a pen dot at the writing edge that
   fades as it lands.

   ⚠️ v2.0.0 IMPLEMENTED THAT WITH `strokeDasharray` + AN ANIMATED
   `strokeDashoffset`, AND IT MADE HISTORY UNSCROLLABLE. Reported as
   "drastically slow, you can't scroll at all". The mistake is not a
   missing optimisation, it is the wrong mechanism: **a dashed stroke is
   not a cheap visual effect, it is a geometry rebuild.** To draw a dashed
   line the renderer must walk the path, measure it, and construct the
   dash segments — and it must redo that EVERY TIME THE OFFSET CHANGES,
   i.e. every frame, for a ~700-point polyline, times every visible row.
   Being on the UI thread does not save you; it just moves where the
   frames are dropped.

   ★ WHAT IT DOES NOW: the SVG is drawn ONCE and never touched again.
   Above it sits a plain `Animated.View` in the card's own colour — a
   curtain — which slides off to the right on a `translateX`. A native
   view transform is the single cheapest thing this runtime can animate:
   no geometry, no rasterisation, no SVG involvement at all. The pen dot
   is a second small view riding the curtain's edge.

   The reveal covers the second-ticks as well as the trace, so the whole
   strip writes on together like paper leaving a printer. That is a
   deliberate consequence of using one opaque curtain rather than clipping
   the trace alone — clipping puts per-frame work back inside the SVG,
   which is the thing being fixed.

   ★ It runs when the row BECOMES VISIBLE, not on mount — the caller
   passes `animate` off its FlatList viewability. Rows below the fold draw
   as they are scrolled to, which is the point: the animation is a reward
   for arriving somewhere, not a thing that already happened off-screen.

   A mounted row draws ONCE and then holds still — scrolling back over it
   does not re-trigger anything, because re-drawing under every passing
   thumb would turn an instrument into a fidget toy. (A row that FlatList
   recycles far off-screen and later remounts does draw again, which is
   the same "it just arrived" reading and is left alone.)

   ⚠️ Nothing except visibility ever reveals the trace — there is
   deliberately no timer. See the `swept` latch for the flash that one
   caused.
   ================================================================== */

import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';
import { buildEcgPath } from '@cyphix/shared';

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
  /** What is BEHIND the strip — the curtain is painted in it. */
  surface: string;
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
/** Steps the pen dot's vertical position is looked up from. */
const PEN_STEPS = 64;
const PEN_R = 2.2;
/**
 * Output resolution of the trace, in points per pixel of width.
 *
 * 1.0 gave ~700 points for a 350 pt card — detail no 44 pt strip can
 * show, paid for on every row that scrolls into existence. 0.6 keeps a
 * QRS its shape and costs a third less to rasterise.
 */
const BUCKETS_PER_PX = 0.6;

export default function EcgMiniPreview({
  samples,
  sampleRate,
  height = 44,
  stroke,
  gridColor,
  surface,
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
            bucketsPerMm: BUCKETS_PER_PX,
            clipMm: clipPx,
          })
        : '',
    [ready, samples, sampleRate, width, durationSec, pxPerMv, baselinePx, clipPx],
  );

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
  /**
   * ★ ONE SWEEP PER MOUNT, ENFORCED HERE RATHER THAN HOPED FOR.
   *
   * An earlier version revealed the trace on a timer when the row had not
   * been reported visible yet — which was wrong in a way that only shows
   * on a device: FlatList mounts rows a screen or more BEFORE they are
   * seen, so the timer drew them off-screen, and reaching them then blanked
   * the strip and re-drew it. A flash, caused by the safety net.
   *
   * Now nothing but visibility ever starts the sweep, and once it has
   * started this latch means a later prop change cannot restart it.
   */
  const swept = useRef(false);

  useEffect(() => {
    if (!ready || !animate || swept.current) return;
    swept.current = true;
    progress.value = 0;
    progress.value = withTiming(1, { duration: DRAW_MS, easing: Easing.linear });
  }, [animate, ready, progress]);

  /* One native transform. This is the whole animation. */
  const curtainStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * width }],
  }));

  const penStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const i = Math.max(0, Math.min(penYs.length - 1, Math.round(p * (penYs.length - 1))));
    return {
      transform: [{ translateX: p * width - PEN_R }, { translateY: penYs[i] - PEN_R }],
      /* Absent before the sweep starts, and fading through the last tenth
         so the stylus lifts off the page rather than vanishing mid-stroke. */
      opacity: p <= 0 || p >= 1 ? 0 : p > 0.9 ? (1 - p) / 0.1 : 1,
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
      {ready && (
        <>
          {/* Rasterised once. Nothing below animates it. */}
          <Svg width={width} height={height}>
            {Array.from({ length: Math.max(0, Math.ceil(durationSec) - 1) }, (_, i) => {
              const x = ((i + 1) / durationSec) * width;
              return (
                <Line key={x} x1={x} y1={0} x2={x} y2={height} stroke={gridColor} strokeWidth={1} />
              );
            })}
            <Path
              d={path}
              stroke={stroke}
              strokeWidth={1.6}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>

          <Animated.View
            pointerEvents="none"
            style={[styles.curtain, { backgroundColor: surface }, curtainStyle]}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.pen, { backgroundColor: stroke }, penStyle]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', overflow: 'hidden' },
  curtain: { ...StyleSheet.absoluteFillObject },
  pen: { position: 'absolute', top: 0, left: 0, width: PEN_R * 2, height: PEN_R * 2, borderRadius: PEN_R },
});

// v3.0.0 — ⚠️ PERFORMANCE FIX: the dash-based reveal made History
//          unscrollable. A dashed stroke is a per-frame GEOMETRY REBUILD of
//          the whole polyline, not a cheap effect, and being on the UI thread
//          only moved where the frames dropped. The SVG is now static and the
//          reveal is one `translateX` on a plain view. Trace resolution also
//          dropped to 0.6 points/px — detail a 44 pt strip cannot show.
// v2.0.0 — The trace SWEEPS on: constant-speed reveal with a pen dot at the
//          writing edge, fired when the row scrolls into view rather than on
//          mount. Once per mounted row.
// v1.0.0 — A 4 s lead II preview for the History row: fixed time scale, second
//          ticks only (deliberately not ECG paper), recognition not measurement.
