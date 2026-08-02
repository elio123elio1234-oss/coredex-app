/* ==================================================================
   EcgReviewStrip (molecule) — one lead of the reviewable sheet.

   ══ WHY THIS IS NOT `EcgStripSvg` ══
   `EcgStripSvg` draws a FINISHED strip: one `<Svg>`, the whole recording,
   at whatever scale fits. That is right for a report, which is never zoomed
   past the page. A review sheet is zoomed — that is what it is for — and at
   the deepest zoom a 10 s recording is ~2 200 pt of paper, which on a 3×
   phone is 6 600 device pixels. react-native-svg hands each `<Svg>` to ONE
   native texture, and past the GPU limit (4 096 px on a lot of Android
   hardware) it draws NOTHING AT ALL — a blank lead, not a clipped one.
   `EcgStripSvg` guards that with `MAX_STRIP_PX`, which costs zoom.

   ══ SO THE PAPER IS TILED ══
   The lead is drawn as a row of fixed-width tiles, each its own `<Svg>`, so
   no single texture ever grows with the zoom. Two things make the seams
   invisible:

     1. `TILE_MM` is a MULTIPLE OF 5. The major grid step is 5 mm, so tile
        N's last major line and tile N+1's first coincide exactly and the
        millimetre paper reads as one continuous sheet. At, say, 64 mm every
        seam would show as a stripe of mismatched squares.
     2. Each tile's path starts ONE SAMPLE before its own left edge (with a
        matching x offset), so the trace crosses the seam as a line rather
        than stopping and restarting.

   ══ THE CALIBRATION PULSE STAYS ON THE PAPER ══
   It sits in the first 9 mm, before t = 0, and scrolls away with everything
   else — exactly as it does on a printout and in the report. Pinning it to
   a fixed gutter was tried on paper first and rejected: the pulse's whole
   job is that its HEIGHT can be compared against the grid, so a pulse drawn
   at a different scale from the trace beside it would not be a convenience,
   it would be a lie about the gain.

   ══ THE GHOST ══
   A comparison recording is drawn UNDER the foreground in a muted colour
   and a thinner stroke, never over it. Which trace is the one being read
   must be unambiguous at a glance — this is the module where confusing them
   would mean reading last month's heart as today's.

   ══════════════════════════════════════════════════════════════════
   ★ THE READER'S NUDGE IS A TRANSFORM, NOT A REBUILD
   ══════════════════════════════════════════════════════════════════
   Dragging the ghost was reported as "very slow, stuttery, feels dated",
   and the reason was that every touch event re-derived the drawing:
   `useOverlayRecording` allocated six shifted `Float32Array`s (and in warp
   mode re-ran `alignByFiducials` on all six leads), then this file rebuilt
   24 tile paths from them. Per move event.

   None of that is necessary. A manual nudge is a pure TRANSLATION of an
   already-computed curve, so:

     • every path here is built ONCE, memoised on the geometry that
       actually changes it (data, zoom, band height, R peaks);
     • the nudge is a `<G transform="translate(…)">` on the ghost, in
       millimetres, because the viewBox is already in millimetres.

   A transform is one native attribute update. The path strings never
   change, so react-native-svg has nothing to re-parse.

   ⚠️ The catch, and why `GHOST_NUDGE_LIMIT_MM` exists: each tile only
   draws the samples that land ON that tile, so translating would expose a
   gap at every seam the width of the shift. Each tile's GHOST path is
   therefore drawn with that much extra paper on both sides (the `<Svg>`
   viewBox clips the overhang), and the nudge is clamped to it.

   Purely presentational: samples in, vectors out.
   ================================================================== */

import { memo, useMemo } from 'react';
import Svg, { G, Line, Path, Rect } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';
import {
  buildCalibrationPulse,
  buildEcgGrid,
  buildEcgPath,
  STANDARD_MM_PER_MV,
  STANDARD_MM_PER_SEC,
} from '@cyphix/shared';

/**
 * Tile width in millimetres of paper. Multiple of 5 (see the header).
 *
 * 65 mm keeps every tile under ~1 900 device px even at the deepest zoom on
 * a 3× screen, and keeps a 10 s recording to four tiles per lead — 24
 * `<Svg>` views for the whole sheet, which mounts without a stutter.
 */
export const TILE_MM = 65;

/** Paper reserved at the left for the calibration pulse — 9 mm, as on web. */
export const CAL_WIDTH_MM = 9;

/**
 * Output buckets per millimetre of paper. 6 buckets/mm is 240 µs of time
 * resolution at 25 mm/s — finer than a 320 Hz sample — and the decimation is
 * peak-preserving, so no R wave is lost. Same value the report uses.
 */
const BUCKETS_PER_MM = 6;

/**
 * How far the reader may nudge the ghost, in millimetres of paper. 40 mm is
 * 1.6 s at 25 mm/s — more than one RR interval at any rate a resting ECG
 * shows, so it never limits an alignment.
 *
 * It is a LIMIT and not a preference: it is exactly the margin each tile's
 * ghost path is over-drawn by, and translating further would slide the drawn
 * paper off the tile and open a gap at the seam.
 */
export const GHOST_NUDGE_LIMIT_MM = 40;

export interface StripPalette {
  paper: string;
  gridMinor: string;
  gridMajor: string;
  trace: string;
  marker: string;
  ghost: string;
}

interface Props {
  /** Report-filtered samples for this lead (mV). */
  data: Float32Array;
  /** The comparison study's samples, already resampled onto this timeline. */
  ghost?: Float32Array;
  /** Vertical nudge of the ghost only, in mm. A transform — see the header. */
  ghostOffsetMm?: number;
  /** Horizontal nudge of the ghost only, in mm. Clamped to ±GHOST_NUDGE_LIMIT_MM. */
  ghostShiftMm?: number;
  sampleRate: number;
  /** Total paper length in mm: CAL_WIDTH_MM + duration at 25 mm/s. */
  paperMm: number;
  /** Band height in millimetres. Keep a multiple of 5. */
  heightMm: number;
  /** On-screen points per millimetre of paper. Zoom lives here. */
  ptPerMm: number;
  /** Sample indices of detected R peaks, ticked at the top of the band. */
  rPeaks?: number[];
  palette: StripPalette;
}

function EcgReviewStrip({
  data,
  ghost,
  ghostOffsetMm = 0,
  ghostShiftMm = 0,
  sampleRate,
  paperMm,
  heightMm,
  ptPerMm,
  rPeaks,
  palette,
}: Props) {
  const baselineMm = heightMm / 2;
  const bandH = heightMm * ptPerMm;

  /* ★ Every path in this band, built ONCE. The nudge offsets are deliberately
     NOT in this dependency list — they are a transform below, which is the
     whole reason dragging the ghost stopped being a slideshow. `ptPerMm` is
     absent too: the geometry is authored in millimetres and the zoom is only
     how many points a millimetre is worth, so zooming rescales the viewBox
     rather than redrawing anything. */
  const { grid, tiles } = useMemo(() => {
    const mmPerSample = STANDARD_MM_PER_SEC / sampleRate;
    const count = Math.max(1, Math.ceil(paperMm / TILE_MM));
    /* Extra paper on both sides of the ghost, so translating it by up to the
       nudge limit never opens a gap at a seam. The `<Svg>` clips the rest. */
    const ghostMarginSamples = Math.ceil(GHOST_NUDGE_LIMIT_MM / mmPerSample);

    const built = Array.from({ length: count }, (_, k) => {
      const tileStartMm = k * TILE_MM;
      const tileMm = Math.min(TILE_MM, paperMm - tileStartMm);

      /* Which samples land on this tile. `sAtLeft` is fractional and may be
         negative on tile 0 (the calibration pulse occupies paper before
         t = 0); clamping `from` at 0 and deriving the x offset from the
         CLAMPED index is what keeps the trace's start aligned to 9 mm rather
         than to the tile edge. */
      const sAtLeft = (tileStartMm - CAL_WIDTH_MM) / mmPerSample;
      const from = Math.max(0, Math.floor(sAtLeft) - 1);
      const to = Math.min(data.length, Math.ceil(sAtLeft + tileMm / mmPerSample) + 2);
      const xOffsetMm = CAL_WIDTH_MM + from * mmPerSample - tileStartMm;

      const pathOpts = {
        sampleRate,
        mmPerSec: STANDARD_MM_PER_SEC,
        mmPerMv: STANDARD_MM_PER_MV,
        baselineMm,
        xOffsetMm,
        bucketsPerMm: BUCKETS_PER_MM,
        clipMm: baselineMm - 0.4,
      };

      let ghostPath = '';
      if (ghost) {
        const gFrom = Math.max(0, from - ghostMarginSamples);
        const gTo = Math.min(ghost.length, to + ghostMarginSamples);
        if (gTo > gFrom) {
          ghostPath = buildEcgPath(ghost.subarray(gFrom, gTo), {
            ...pathOpts,
            xOffsetMm: CAL_WIDTH_MM + gFrom * mmPerSample - tileStartMm,
          });
        }
      }

      return {
        tileMm,
        path: to > from ? buildEcgPath(data.subarray(from, to), pathOpts) : '',
        ghostPath,
        ticks: (rPeaks ?? [])
          .map((r) => CAL_WIDTH_MM + r * mmPerSample - tileStartMm)
          .filter((x) => x >= 0 && x <= tileMm),
      };
    });

    return { grid: buildEcgGrid(TILE_MM, heightMm), tiles: built };
  }, [data, ghost, sampleRate, paperMm, heightMm, baselineMm, rPeaks]);

  return (
    <View style={[styles.band, { height: bandH, backgroundColor: palette.paper }]}>
      {tiles.map(({ tileMm, path, ghostPath, ticks }, k) => {
        return (
          <Svg
            key={k}
            width={tileMm * ptPerMm}
            height={bandH}
            /* viewBox in MILLIMETRES: the geometry is authored on paper and
               the zoom is expressed only as how many points a millimetre is
               worth. Nothing below ever sees a pixel, which is what keeps a
               measurement identical across screen densities. `none` because
               both axes are scaled by the SAME ptPerMm — the box already has
               the viewBox's exact aspect, and `meet` would only add
               sub-pixel letterboxing at the seams. */
            viewBox={`0 0 ${tileMm} ${heightMm}`}
            preserveAspectRatio="none"
          >
            <Rect width={tileMm} height={heightMm} fill={palette.paper} />
            <Path d={grid.minor} fill="none" stroke={palette.gridMinor} strokeWidth={0.1} />
            <Path d={grid.major} fill="none" stroke={palette.gridMajor} strokeWidth={0.2} />

            {k === 0 && (
              <Path
                d={buildCalibrationPulse(baselineMm, STANDARD_MM_PER_MV, STANDARD_MM_PER_SEC, 0)}
                fill="none"
                stroke={palette.trace}
                strokeWidth={0.18}
                strokeLinejoin="round"
                opacity={0.85}
              />
            )}

            {/* ★ The reader's nudge, as a transform in millimetres. One native
                attribute; the path string above never changes. */}
            {ghostPath !== '' && (
              <G translateX={ghostShiftMm} translateY={ghostOffsetMm}>
                <Path
                  d={ghostPath}
                  fill="none"
                  stroke={palette.ghost}
                  strokeWidth={0.34}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </G>
            )}

            {ticks.map((x, i) => (
              <Line
                key={i}
                x1={x}
                y1={0.6}
                x2={x}
                y2={2.2}
                stroke={palette.marker}
                strokeWidth={0.25}
              />
            ))}

            {/* 0.22 mm — the width of a real ECG stylus trace. In mm on
                purpose, so it thickens with the sheet rather than pinning to
                pixels. */}
            <Path
              d={path}
              fill="none"
              stroke={palette.trace}
              strokeWidth={0.22}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { flexDirection: 'row' },
});

/* ★ Memoised on purpose, and the memo only holds if the CALLER keeps its props
   stable. `palette` was rebuilt inline on every render of StudyViewerScreen,
   which defeated this entirely: opening a sheet or nudging a caliper re-ran
   `buildEcgPath` over four tiles × six leads, twice over with a ghost. That is
   what "it flickers, it isn't smooth" was. */
export default memo(EcgReviewStrip);

// v2.0.0 — Paths are built ONCE (memoised on the geometry that changes them)
//          and the ghost's nudge is a `<G>` translate rather than a redraw, so
//          dragging it costs one native attribute instead of 24 path builds per
//          touch event. Each tile over-draws the ghost by GHOST_NUDGE_LIMIT_MM
//          on both sides so the translate cannot open a seam.

// v1.0.0 — Tiled vector lead band: unlimited zoom without exceeding a native
//          texture, seams invisible because TILE_MM is a multiple of the 5 mm
//          major grid and each tile's path starts one sample early.
