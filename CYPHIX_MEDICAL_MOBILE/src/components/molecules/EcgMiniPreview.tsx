/* ==================================================================
   EcgMiniPreview (molecule) — four seconds of lead II in a History row.

   ══ THIS ANSWERS StudyCard's OLD NO-THUMBNAIL ARGUMENT, DIRECTLY ══
   The argument was: "a 40 pt sparkline of a 10 s ECG is an unreadable
   squiggle that nonetheless looks like clinical information." That is
   true of 10 s in 40 pt — at 320 samples/s squeezed into ~350 px, a QRS
   is under 4 px wide and everything reads as noise. It is NOT true of a
   FOUR-second window at the same size: ~11 px per QRS at a fixed time
   scale is exactly the preview Kardia ships on every row, and readers of
   that app demonstrably use it — to recognise "the noisy one", "the fast
   one", "the one with the pause" — before any number is read. The
   clinical statement on the row is the verdict pill BESIDE this preview;
   the preview's job is recognition, not measurement.

   Which is why it deliberately does not look like ECG paper: no red/blue
   grid, no calibration pulse, no mm scale — only hairline second-ticks so
   rate differences read across rows. `EcgStripSvg` (25 mm/s, mm-true,
   measurable) remains the only component allowed to look like paper.

   Time scale is FIXED per row width: the window always fills the card, so
   every row in the list shares one sweep speed and rates compare by eye.
   ================================================================== */

import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
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
  accessibilityLabel: string;
}

/** The trace keeps this many px of breathing room at top and bottom. */
const EDGE_PX = 2;

export default function EcgMiniPreview({
  samples,
  sampleRate,
  height = 44,
  stroke,
  gridColor,
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
  const pxPerMv = (height / 2) - EDGE_PX; // ~1 mV up fits, ~1 mV down fits
  const baselinePx = height * 0.56;
  const path = ready
    ? buildEcgPath(samples, {
        sampleRate,
        mmPerSec: width / durationSec,
        mmPerMv: pxPerMv,
        baselineMm: baselinePx,
        bucketsPerMm: 1, // one min/max pair per px — the data is pre-decimated
        clipMm: height / 2 - EDGE_PX,
      })
    : '';

  const ticks: number[] = [];
  if (ready) {
    for (let s = 1; s < durationSec; s++) ticks.push((s / durationSec) * width);
  }

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
        <Svg width={width} height={height}>
          {ticks.map((x) => (
            <Line key={x} x1={x} y1={0} x2={x} y2={height} stroke={gridColor} strokeWidth={1} />
          ))}
          <Path
            d={path}
            stroke={stroke}
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', overflow: 'hidden' },
});

// v1.0.0 — A 4 s lead II preview for the History row: fixed time scale, second
//          ticks only (deliberately not ECG paper), recognition not measurement.
