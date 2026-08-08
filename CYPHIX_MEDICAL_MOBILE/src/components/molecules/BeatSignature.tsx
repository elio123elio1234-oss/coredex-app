/* ==================================================================
   BeatSignature (molecule) — the ECG ID itself, drawn.

   One lead's baseline beat with the patient's own TOLERANCE CORRIDOR
   shaded behind it, and optionally a single study's beat laid on top so
   the eye can see where the two stop agreeing.

        ░░░░░░░░╱▔╲░░░░░░░░░░░░░░░   ← corridor: ±2σ of this person's
        ────────╱   ╲──╮   ╭──────      own measured repeatability
                       ╰───╯
                    ▲
              the baseline beat

   ══ WHY IT IS DRAWN ON REAL PAPER ══
   The temptation with a feature called "ECG ID" is to invent a signature
   look — a glowing line on a dark field. That would be a picture of a
   heartbeat rather than a heartbeat, and this is the one screen where a
   cardiologist might actually want to measure something: the whole claim
   is that the median beat shows detail no single beat does. So it is the
   same millimetre paper, the same 25 mm/s and 10 mm/mV, the same
   `buildEcgGrid`/`buildEcgPath` as the report (`EcgStripSvg`), and the
   same calibration pulse.

   The identity feel comes from the CARD and the corridor, not from
   redrawing the trace in a way that would make it unmeasurable.

   ══ 50 mm/s, AND WHY THAT IS NOT A LIBERTY ══
   One beat is 700 ms. At the 25 mm/s of a rhythm strip that is 17.5 mm of
   paper — and since the same beat is ~27 mm TALL at standard gain, a
   square-gridded sheet of it is a narrow vertical sliver, wrong for a card
   and unreadable on a phone.

   50 mm/s is the other standard sweep speed on every clinical cart, used
   for exactly this: short segments read for detail. One large square is
   100 ms instead of 200 ms, the gain is untouched, and the caption says
   which speed is in force. That is a scale a trained eye rescales for.
   What it is NOT is a fitted scale — the earlier web report derived
   17.1 mm/s by fitting a recording to the page, and a QRS measured by eye
   off that reads ~30 % narrow (`EcgStripSvg` header). One of two standard
   speeds, printed on the sheet, is a different thing from an arbitrary
   one that isn't.

   The gain drops to 5 mm/mV — also standard, also printed — only when a
   complex is too tall for the sheet at 10. Clipping the R wave to protect
   the layout would be the one change that makes this trace lie.

   No calibration pulse: it is 18 mm wide at this speed, which is half the
   sheet, and what it proves — the gain — is already provable against the
   printed grid at a stated scale. The grid IS the ruler.

   Purely presentational: handed a baseline, a corridor and an optional
   overlay, it draws them.
   ================================================================== */

import { useMemo } from 'react';
import Svg, { Line, Path, Rect } from 'react-native-svg';
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
  /** Extra note appended to the scale caption, e.g. what the overlay is. */
  caption?: string;
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
 * The corridor as ONE closed polygon: the upper bound left-to-right, the
 * lower bound right-to-left, closed. Two stroked lines were tried and
 * rejected — they read as two more traces, and the eye then compares three
 * curves instead of seeing one region.
 */
function buildCorridor(
  baseline: Float32Array,
  tolerance: Float32Array,
  opts: { sampleRate: number; mmPerMv: number; mmPerSec: number; baselineMm: number; xOffsetMm: number; clipMm: number },
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
}: Props) {
  const t = useTheme();
  const dark = useIsDark();
  const c = dark ? ECG_PAPER_DARK : ECG_PAPER_LIGHT;

  const mmPerSec = SIGNATURE_MM_PER_SEC;

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

    const heightMm = Math.min(
      MAX_HEIGHT_MM,
      Math.max(MIN_HEIGHT_MM, needed(mmPerMv)),
    );
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
      mmPerMv,
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

  return (
    <View
      style={[styles.sheet, { width, height, backgroundColor: c.paper, borderColor: t.border }]}
    >
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${geometry.widthMm} ${geometry.heightMm}`}
        preserveAspectRatio="xMidYMid meet"
        accessibilityLabel={`ECG ID · lead ${label}`}
      >
        <Rect width={geometry.widthMm} height={geometry.heightMm} fill={c.paper} />
        <Path d={geometry.grid.minor} fill="none" stroke={c.gridMinor} strokeWidth={0.1} />
        <Path d={geometry.grid.major} fill="none" stroke={c.gridMajor} strokeWidth={0.2} />

        {/* The corridor sits UNDER everything: it is the field the traces
            live in, not a mark on top of them. */}
        {geometry.corridor !== '' && (
          <Path d={geometry.corridor} fill={c.marker} fillOpacity={0.16} stroke="none" />
        )}

        {/* Where R sits — the point every beat in the stack was aligned on,
            and therefore the origin of every interval quoted beside this. */}
        <Line
          x1={geometry.rX}
          y1={0.6}
          x2={geometry.rX}
          y2={geometry.heightMm - 0.6}
          stroke={c.marker}
          strokeWidth={0.12}
          strokeDasharray="0.6 0.9"
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
          strokeWidth={0.28}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
}

const styles = StyleSheet.create({
  sheet: { borderWidth: 1, borderRadius: RADIUS.sm, overflow: 'hidden' },
  label: {
    position: 'absolute',
    top: 6,
    left: 8,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scale: {
    position: 'absolute',
    bottom: 5,
    right: 8,
    fontSize: 9,
    fontVariant: ['tabular-nums'],
  },
});

// v1.0.0 — The ECG ID on real millimetre paper at 50 mm/s (the clinical DETAIL
//          speed, not a fitted one), gain dropping to half-standard only when a
//          complex will not fit and saying so, the patient's own ±2σ corridor as
//          one filled region behind the beat, and an optional study over it.
