/* ==================================================================
   BeatSignature (molecule) — the ECG ID itself, drawn and measurable.

   One lead's baseline beat with the patient's own TOLERANCE CORRIDOR
   shaded behind it, an optional study laid over it, and a CALIPER the
   reader drags along the trace.

        ░░░░░░░░╱▔╲░░░░░░░░░░░░░░░   ← corridor: ±2σ of this person's
        ────────╱   ╲──╮   ╭──────      own measured repeatability
                  ┊    ╰───╯
                  ┊ ← the caliper, under the finger

   ══ WHY IT IS DRAWN ON REAL PAPER ══
   The temptation with a feature called "ECG ID" is to invent a signature
   look — a glowing line on a dark field. That would be a picture of a
   heartbeat rather than a heartbeat, and this is the one screen where a
   cardiologist might actually want to measure something: the whole claim
   is that the median beat shows detail no single beat does. So it is the
   same millimetre paper and the same `buildEcgGrid`/`buildEcgPath` as the
   report (`EcgStripSvg`).

   ══ THE PAPER IS QUIETER THAN THE REPORT'S, ON PURPOSE ══
   The report is a document: its grid is the ruler and is meant to be
   read. Here the grid is CONTEXT for one curve, and at report weight it
   dominated the card — reported from the phone as looking "like a drawing
   on the screen" rather than like data. The grid is therefore dimmed, the
   sheet has no border of its own (it sits inside the card's), and the
   trace is heavier. Nothing about the geometry changed: a small square is
   still a small square, and the scale is still printed on the sheet.

   ══ 50 mm/s, AND WHY THAT IS NOT A LIBERTY ══
   One beat is 700 ms. At the 25 mm/s of a rhythm strip that is 17.5 mm of
   paper — and since the same beat is ~27 mm TALL at standard gain, a
   square-gridded sheet of it is a narrow vertical sliver.

   50 mm/s is the other standard sweep speed on every clinical cart, used
   for exactly this: short segments read for detail. One large square is
   100 ms instead of 200 ms, the gain is untouched, and the caption says
   which speed is in force. What it is NOT is a FITTED scale — the earlier
   web report derived 17.1 mm/s by fitting a recording to the page, and a
   QRS measured by eye off that reads ~30 % narrow (`EcgStripSvg` header).

   The gain drops to 5 mm/mV — also standard, also printed — only when a
   complex is too tall for the sheet at 10. Clipping the R wave to protect
   the layout would be the one change that makes this trace lie.

   ══ THE CALIPER'S READOUT IS NOT ON THE PAPER ══
   It is handed up to the caller and drawn in the chrome. History's
   calipers learned this the hard way in v0.16.0: a readout floating on
   the trace covers the deflections whose position it reports.
   ================================================================== */

import { useCallback, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { runOnJS } from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';
import {
  buildEcgGrid,
  buildEcgPath,
  CORRIDOR_BAND_SIGMA,
  STANDARD_MM_PER_MV,
} from '@cyphix/shared';
import { ECG_PAPER_DARK, ECG_PAPER_LIGHT } from '@/components/molecules/EcgStripSvg';
import { RADIUS } from '@/theme/tokens';
import { useIsDark, useTheme } from '@/theme/useTheme';

/** What the caliper is sitting on right now. Null when it is parked. */
export interface CaliperReading {
  /** Milliseconds from the R peak — negative before it. */
  msFromR: number;
  /** The baseline's value there, mV. */
  baselineMv: number;
  /** ±half-width of the corridor there, mV. */
  toleranceMv: number;
  /** The overlaid study's value there, when one is shown. */
  overlayMv: number | null;
}

interface Props {
  /** The baseline beat, in mV, on the canonical template grid. */
  baseline: Float32Array;
  /** Per-sample σ of this person's own variation. Same length. */
  tolerance: Float32Array;
  sampleRate: number;
  /** Sample index of R — where the vertical R marker is drawn. */
  rIndex: number;
  /** A single study's beat to lay over the baseline, when comparing. */
  overlay?: Float32Array | null;
  /** Rendered width in points; the mm sheet scales into it. */
  width: number;
  /** Lead name printed on the paper. */
  label: string;
  /** Extra note appended to the scale caption. */
  caption?: string;
  /** Reports the caliper as it moves. Absent = no caliper at all. */
  onCaliper?: (reading: CaliperReading | null) => void;
}

/** Detail sweep speed — the second clinical standard. See the header. */
export const SIGNATURE_MM_PER_SEC = 50;
/** Half-standard gain, used only when a complex will not fit at 10 mm/mV. */
const HALF_MM_PER_MV = 5;

/** Leading margin so the P wave does not start on the sheet edge. */
const LEAD_IN_MM = 3;
/** Trailing margin so the T wave does not run into it either. */
const TAIL_MM = 2;
/** Never draw a sheet shorter than this, however small the beat. */
const MIN_HEIGHT_MM = 20;
/** …nor taller than this, or the card owns the screen. */
const MAX_HEIGHT_MM = 30;

/**
 * The caliper ticks once per small square — 20 ms at 50 mm/s.
 *
 * Per FRAME would buzz continuously and mean nothing; per 100 ms would
 * feel laggy. One tick per square makes the grid something the finger can
 * feel, which is the whole point of putting a caliper on paper.
 */
const TICK_MM = 1;

/**
 * The corridor as ONE closed polygon: the upper bound left-to-right, the
 * lower bound right-to-left, closed. Two stroked lines were tried and
 * rejected — they read as two more traces, and the eye then compares three
 * curves instead of seeing one region.
 */
function buildCorridor(
  baseline: Float32Array,
  tolerance: Float32Array,
  opts: {
    sampleRate: number;
    mmPerMv: number;
    mmPerSec: number;
    baselineMm: number;
    xOffsetMm: number;
    clipMm: number;
  },
): string {
  const n = Math.min(baseline.length, tolerance.length);
  if (n < 2) return '';
  const { sampleRate, mmPerMv, mmPerSec, baselineMm, xOffsetMm, clipMm } = opts;

  const x = (i: number) => xOffsetMm + (i / sampleRate) * mmPerSec;
  const y = (mv: number) => baselineMm - Math.max(-clipMm, Math.min(clipMm, mv * mmPerMv));

  const up: string[] = [];
  const down: string[] = [];
  /* One point every few samples: the corridor is a smooth envelope, and a
     225-point polygon per lead is DOM weight for detail no eye resolves. */
  const step = Math.max(1, Math.round(n / 90));
  for (let i = 0; i < n; i += step) {
    const band = tolerance[i] * CORRIDOR_BAND_SIGMA;
    up.push(`${x(i).toFixed(2)} ${y(baseline[i] + band).toFixed(2)}`);
    down.push(`${x(i).toFixed(2)} ${y(baseline[i] - band).toFixed(2)}`);
  }
  down.reverse();

  return `M${up[0]} ${up.slice(1).map((p) => `L${p}`).join(' ')} ${down.map((p) => `L${p}`).join(' ')} Z`;
}

export default function BeatSignature({
  baseline,
  tolerance,
  sampleRate,
  rIndex,
  overlay,
  width,
  label,
  caption,
  onCaliper,
}: Props) {
  const t = useTheme();
  const dark = useIsDark();
  const c = dark ? ECG_PAPER_DARK : ECG_PAPER_LIGHT;

  const mmPerSec = SIGNATURE_MM_PER_SEC;

  /** Caliper position as a sample index, or null when parked. */
  const [cursor, setCursor] = useState<number | null>(null);
  /** Last square the finger crossed — the tick fires on change, not per frame. */
  const lastTick = useRef<number | null>(null);

  const geometry = useMemo(() => {
    const durationSec = baseline.length / sampleRate;
    const widthMm = LEAD_IN_MM + durationSec * mmPerSec + TAIL_MM;

    /* ★ Sized from the CORRIDOR'S outer edge, not from the trace — the
       corridor is the part a reader is judging, and one clipped into
       looking narrow would understate exactly the thing it exists to
       show. The overlay counts too, or comparing would crop the study. */
    let peak = 0;
    for (let i = 0; i < baseline.length; i++) {
      const band = (tolerance[i] ?? 0) * CORRIDOR_BAND_SIGMA;
      peak = Math.max(peak, Math.abs(baseline[i]) + band);
    }
    if (overlay) for (let i = 0; i < overlay.length; i++) peak = Math.max(peak, Math.abs(overlay[i]));

    /* Standard gain first; half-standard ONLY if the complex would not fit.
       The sheet grows before the gain shrinks, and both are printed. */
    const needed = (gain: number) => Math.ceil(2 * peak * gain + 6);
    const mmPerMv =
      needed(STANDARD_MM_PER_MV) <= MAX_HEIGHT_MM ? STANDARD_MM_PER_MV : HALF_MM_PER_MV;

    const heightMm = Math.min(MAX_HEIGHT_MM, Math.max(MIN_HEIGHT_MM, needed(mmPerMv)));
    const baselineMm = heightMm / 2;
    const clipMm = baselineMm - 0.6;

    const pathOpts = {
      sampleRate,
      mmPerSec,
      mmPerMv,
      baselineMm,
      xOffsetMm: LEAD_IN_MM,
      bucketsPerMm: 8,
      clipMm,
    };

    return {
      widthMm,
      heightMm,
      baselineMm,
      mmPerMv,
      clipMm,
      grid: buildEcgGrid(widthMm, heightMm),
      corridor: buildCorridor(baseline, tolerance, {
        sampleRate,
        mmPerMv,
        mmPerSec,
        baselineMm,
        xOffsetMm: LEAD_IN_MM,
        clipMm,
      }),
      trace: buildEcgPath(baseline, pathOpts),
      ghost: overlay ? buildEcgPath(overlay, pathOpts) : '',
      rX: LEAD_IN_MM + (rIndex / sampleRate) * mmPerSec,
    };
  }, [baseline, tolerance, overlay, sampleRate, rIndex, mmPerSec]);

  // Uniform scale — the grid squares must stay SQUARE or every interval
  // measured off this sheet is wrong.
  const height = (width * geometry.heightMm) / geometry.widthMm;
  const pxPerMm = width / geometry.widthMm;

  /** Screen x (points) → sample index, clamped to the drawn beat. */
  const sampleAt = useCallback(
    (px: number): number => {
      const mm = px / pxPerMm - LEAD_IN_MM;
      const index = Math.round((mm / mmPerSec) * sampleRate);
      return Math.max(0, Math.min(baseline.length - 1, index));
    },
    [pxPerMm, mmPerSec, sampleRate, baseline.length],
  );

  const moveCaliper = useCallback(
    (px: number) => {
      const index = sampleAt(px);
      setCursor(index);

      // One tick per small square crossed — see TICK_MM.
      const square = Math.round((index / sampleRate) * mmPerSec / TICK_MM);
      if (lastTick.current !== square) {
        lastTick.current = square;
        void Haptics.selectionAsync();
      }

      onCaliper?.({
        msFromR: ((index - rIndex) / sampleRate) * 1000,
        baselineMv: baseline[index],
        toleranceMv: (tolerance[index] ?? 0) * CORRIDOR_BAND_SIGMA,
        overlayMv: overlay ? (overlay[index] ?? null) : null,
      });
    },
    [sampleAt, sampleRate, mmPerSec, onCaliper, rIndex, baseline, tolerance, overlay],
  );

  const releaseCaliper = useCallback(() => {
    lastTick.current = null;
    /* The caliper STAYS where it was left. A line that vanishes on release
       makes the reader hold their finger over the very point they are
       trying to read — which is the same mistake as printing the readout
       on the paper. */
  }, []);

  /* ★ A TAP places the caliper; a HORIZONTAL drag carries it; a VERTICAL
     drag is not ours and must reach the page behind us.

     This card lives inside a vertical ScrollView, so the axis thresholds
     are not polish — without `failOffsetY` the pan wins the moment a
     finger moves and the sheet becomes a hole the page cannot be scrolled
     through. And an `onBegin` handler (the first version) fires on
     touch-DOWN, so merely resting a thumb on the card while flicking past
     dropped a caliper and buzzed. `onStart` runs only after the gesture
     has actually been claimed, which is the difference between a control
     that responds and one that interrupts.

     `runOnJS` because everything this touches — React state, the haptic
     engine — lives on the JS thread; gesture-handler workletizes these
     callbacks when Reanimated is present, so calling into JS directly
     would be a crash rather than a slowdown. The work per event is one
     array index, not a re-render of the sheet. */
  const gesture = useMemo(() => {
    if (!onCaliper) return null;
    const pan = Gesture.Pan()
      .activeOffsetX([-6, 6])
      .failOffsetY([-12, 12])
      .onStart((e) => runOnJS(moveCaliper)(e.x))
      .onUpdate((e) => runOnJS(moveCaliper)(e.x))
      .onFinalize(() => runOnJS(releaseCaliper)());
    const tap = Gesture.Tap().onEnd((e) => runOnJS(moveCaliper)(e.x));
    return Gesture.Race(pan, tap);
  }, [onCaliper, moveCaliper, releaseCaliper]);

  const cursorX = cursor === null ? null : LEAD_IN_MM + (cursor / sampleRate) * mmPerSec;
  const cursorY =
    cursor === null
      ? null
      : geometry.baselineMm -
        Math.max(
          -geometry.clipMm,
          Math.min(geometry.clipMm, baseline[cursor] * geometry.mmPerMv),
        );

  const sheet = (
    <View style={[styles.sheet, { width, height, backgroundColor: c.paper }]}>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${geometry.widthMm} ${geometry.heightMm}`}
        preserveAspectRatio="xMidYMid meet"
        accessibilityLabel={`ECG ID · lead ${label}`}
      >
        <Rect width={geometry.widthMm} height={geometry.heightMm} fill={c.paper} />

        {/* Dimmed against the report's grid — context, not the subject. */}
        <Path d={geometry.grid.minor} fill="none" stroke={c.gridMinor} strokeWidth={0.07} opacity={0.55} />
        <Path d={geometry.grid.major} fill="none" stroke={c.gridMajor} strokeWidth={0.14} opacity={0.7} />

        {/* The corridor sits UNDER everything: it is the field the traces
            live in, not a mark on top of them. */}
        {geometry.corridor !== '' && (
          <Path d={geometry.corridor} fill={c.marker} fillOpacity={0.14} stroke="none" />
        )}

        {/* Where R sits — the point every beat in the stack was aligned on,
            and therefore the origin of every interval quoted beside this. */}
        <Line
          x1={geometry.rX}
          y1={0.8}
          x2={geometry.rX}
          y2={geometry.heightMm - 0.8}
          stroke={c.marker}
          strokeWidth={0.1}
          strokeDasharray="0.5 1"
          opacity={0.6}
        />

        {/* The compared study, under the baseline: the baseline is the
            reference and must stay the readable one. */}
        {geometry.ghost !== '' && (
          <Path
            d={geometry.ghost}
            fill="none"
            stroke={t.accentLive}
            strokeWidth={0.22}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
        )}

        <Path
          d={geometry.trace}
          fill="none"
          stroke={c.trace}
          strokeWidth={0.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* The caliper, above everything — it is what the finger is doing. */}
        {cursorX !== null && cursorY !== null && (
          <>
            <Line
              x1={cursorX}
              y1={0}
              x2={cursorX}
              y2={geometry.heightMm}
              stroke={t.accentLive}
              strokeWidth={0.18}
            />
            <Circle cx={cursorX} cy={cursorY} r={0.55} fill={t.accentLive} />
          </>
        )}
      </Svg>

      <Text style={[styles.label, { color: c.trace }]} allowFontScaling={false}>
        {label}
      </Text>
      {/* ★ The scale is ALWAYS printed, and the caption is appended to it
          rather than replacing it. A sheet whose speed and gain are not
          stated cannot be measured, and this one is not on the defaults. */}
      <Text style={[styles.scale, { color: t.textTertiary }]} allowFontScaling={false}>
        {mmPerSec} mm/s · {geometry.mmPerMv} mm/mV{caption ? ` · ${caption}` : ''}
      </Text>
    </View>
  );

  if (!gesture) return sheet;
  return <GestureDetector gesture={gesture}>{sheet}</GestureDetector>;
}

const styles = StyleSheet.create({
  /* No border: the sheet sits inside the card's own edge, and two nested
     hairlines a few points apart is what made this read as a pasted-in
     picture rather than as part of the card. */
  sheet: { borderRadius: RADIUS.sm, overflow: 'hidden' },
  label: {
    position: 'absolute',
    top: 6,
    left: 8,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    opacity: 0.75,
  },
  scale: {
    position: 'absolute',
    bottom: 5,
    right: 8,
    fontSize: 8.5,
    fontVariant: ['tabular-nums'],
  },
});

// v2.0.0 — A draggable caliper: tap or drag anywhere on the sheet and a line
//          follows the finger, ticking once per small square, reporting time
//          from R / baseline mV / corridor width UP to the caller so the readout
//          is drawn in the chrome and never over the trace. The paper is dimmed
//          and loses its own border — at report weight the grid dominated the
//          card and the whole thing read as a drawing rather than as data.
// v1.0.0 — The ECG ID on real millimetre paper at 50 mm/s (the clinical DETAIL
//          speed, not a fitted one), gain dropping to half-standard only when a
//          complex will not fit and saying so, the patient's own ±2σ corridor as
//          one filled region behind the beat, and an optional study over it.
