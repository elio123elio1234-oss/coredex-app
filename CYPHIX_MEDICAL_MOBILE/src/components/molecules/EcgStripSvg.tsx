/* ==================================================================
   EcgStripSvg (molecule) — one finished lead, drawn as VECTOR geometry
   on ECG grid paper. A port of the web molecule of the same name.

   ══ WHY SVG AND NOT THE SKIA CANVAS THE LIVE MONITOR USES ══
   The live monitor is patient feedback — "you are holding it correctly" —
   and a canvas is exactly right for it. A REPORT is a document: it is
   read, zoomed into, and measured. Everything below is laid out in
   MILLIMETRES against a 1 mm / 5 mm grid at the clinical 25 mm/s and
   10 mm/mV, so a caliper laid on the screen means what it has always
   meant on paper.

   The geometry comes from `@cyphix/shared` — the SAME `buildEcgPath` and
   `buildEcgGrid` the web report uses — so a trace measured on the phone
   and one measured on the web are drawn against one ruler.

   ══ THE COLOURS ARE THE WEB'S TOKENS, NOT "REAL ECG PAPER" ══
   An earlier version of this file painted pink-orange paper with red grid
   lines, reasoning from what clinical paper looks like. That was invented:
   CYPHIX's report sheet is WHITE with a BLUE grid (`--ecg-paper` /
   `--ecg-grid-*` in report.css), and the values below are copied from
   there. Do not "improve" them from first principles again — the report is
   a brand surface, and the web is the reference.

   Purely presentational: it is handed filtered samples and draws them.
   ================================================================== */

import Svg, { Line, Path, Rect } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';
import {
  buildCalibrationPulse,
  buildEcgGrid,
  buildEcgPath,
  STANDARD_MM_PER_MV,
  STANDARD_MM_PER_SEC,
} from '@cyphix/shared';
import { RADIUS } from '@/theme/tokens';
import { useIsDark, useTheme } from '@/theme/useTheme';

interface Props {
  label: string;
  /** Already report-filtered samples (mV). */
  data: Float32Array;
  sampleRate: number;
  /** Rendered width in points; the mm geometry scales into it. */
  width: number;
  /** Strip height in millimetres. 28 mm ≙ ±1.4 mV at standard gain. */
  heightMm?: number;
  /** Total strip width in millimetres. */
  widthMm?: number;
  /** Sample indices of detected R peaks, marked with a small tick. */
  rPeaks?: number[];
}

/** Space reserved at the left for the calibration pulse. */
const CAL_WIDTH_MM = 9;

/* report.css `:root` / `[data-theme="dark"]` — verbatim. */
const LIGHT = {
  paper: '#FFFFFF',
  gridMinor: 'rgba(0, 82, 255, 0.15)',
  gridMajor: 'rgba(0, 82, 255, 0.30)',
  trace: '#0A2540',
  marker: 'rgba(0, 82, 255, 0.55)',
};
const DARK = {
  paper: '#0D1424',
  gridMinor: 'rgba(76, 141, 255, 0.18)',
  gridMajor: 'rgba(76, 141, 255, 0.34)',
  trace: '#4ADE80',
  marker: 'rgba(143, 184, 255, 0.7)',
};

export default function EcgStripSvg({
  label,
  data,
  sampleRate,
  width,
  heightMm = 28,
  widthMm = 182,
  rPeaks,
}: Props) {
  const t = useTheme();
  const c = useIsDark() ? DARK : LIGHT;

  const mmPerSec = STANDARD_MM_PER_SEC;
  const mmPerMv = STANDARD_MM_PER_MV;
  const traceWidthMm = Math.max(10, widthMm - CAL_WIDTH_MM);

  /* ── The sweep speed is FIXED at the clinical standard ──
     An earlier web version derived mm/s by fitting the whole recording to
     the page, which produced 17.1 mm/s. That is not a scale any clinician
     reads: every trained eye measures intervals against 25 mm/s paper,
     where one small square is 40 ms. Rescaling the time axis silently
     invalidates that muscle memory — a QRS measured by eye off a 17 mm/s
     strip reads ~30 % narrow.

     So the SCALE is fixed and the DURATION gives way: we draw as much of
     the recording as fits, and say how much that was. */
  const secondsThatFit = traceWidthMm / mmPerSec;
  const totalSec = data.length > 0 ? data.length / sampleRate : 0;
  const shownSec = Math.min(totalSec, secondsThatFit);
  const shown = shownSec < totalSec ? data.subarray(0, Math.round(shownSec * sampleRate)) : data;
  const truncated = shownSec < totalSec - 0.05;

  const baselineMm = heightMm / 2;

  const path = buildEcgPath(shown, {
    sampleRate,
    mmPerSec,
    mmPerMv,
    baselineMm,
    xOffsetMm: CAL_WIDTH_MM,
    clipMm: baselineMm - 0.6,
  });
  const calPath = buildCalibrationPulse(baselineMm, mmPerMv, mmPerSec, 1);
  const grid = buildEcgGrid(widthMm, heightMm);

  /* Uniform scale: the grid squares must stay SQUARE. A stretched grid
     would make every interval measured off this sheet wrong. */
  const height = (width * heightMm) / widthMm;

  return (
    /* `.ecg-svg-strip` — the paper IS the card, with the label and the scale
       sitting on it. Stacking them in a row above each strip (an earlier
       attempt) turned six clean sheets into eighteen competing elements. */
    <View
      style={[styles.strip, { width, height, backgroundColor: c.paper, borderColor: t.border }]}
    >
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${widthMm} ${heightMm}`}
        preserveAspectRatio="xMidYMid meet"
        accessibilityLabel={`Lead ${label}`}
      >
        <Rect width={widthMm} height={heightMm} fill={c.paper} />

        {/* 1 mm minor grid, 5 mm major grid — real ECG paper. Explicit lines
            rather than a pattern fill, so nothing rasterises. */}
        <Path d={grid.minor} fill="none" stroke={c.gridMinor} strokeWidth={0.1} />
        <Path d={grid.major} fill="none" stroke={c.gridMajor} strokeWidth={0.2} />

        {/* Calibration pulse: 1 mV × 200 ms, so the gain is verifiable by eye
            against the grid rather than trusted from a label. */}
        <Path
          d={calPath}
          fill="none"
          stroke={c.trace}
          strokeWidth={0.18}
          strokeLinejoin="round"
          opacity={0.85}
        />

        {/* R-peak ticks — shows what the rate was actually computed from. */}
        {rPeaks?.map((r) => {
          const x = CAL_WIDTH_MM + (r / sampleRate) * mmPerSec;
          if (x > widthMm - 1) return null;
          return (
            <Line key={r} x1={x} y1={0.6} x2={x} y2={2.2} stroke={c.marker} strokeWidth={0.25} />
          );
        })}

        {/* 0.22 mm — the width of a real ECG stylus trace. In mm on purpose,
            so it thickens with the sheet rather than pinning to pixels. */}
        <Path
          d={path}
          fill="none"
          stroke={c.trace}
          strokeWidth={0.22}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>

      {/* `.ecg-svg-label` — on the paper, in the trace's own colour. */}
      <Text style={[styles.label, { color: c.trace }]} allowFontScaling={false}>
        {label}
      </Text>
      {/* `.ecg-svg-scale` — bottom-end, quiet. */}
      <Text style={[styles.scale, { color: t.textTertiary }]} allowFontScaling={false}>
        {mmPerSec} mm/s · {mmPerMv} mm/mV
        {truncated ? ` · ${shownSec.toFixed(1)}s of ${totalSec.toFixed(1)}s` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { borderWidth: 1, borderRadius: RADIUS.sm, overflow: 'hidden' },
  label: { position: 'absolute', top: 5, left: 7, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  scale: { position: 'absolute', bottom: 4, right: 7, fontSize: 8.5, fontVariant: ['tabular-nums'] },
});

// v2.0.0 — Web colour tokens (white paper, blue grid), and the label + scale
//          sit ON the strip as `.ecg-svg-label` / `.ecg-svg-scale` do.
