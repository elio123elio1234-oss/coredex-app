/* ==================================================================
   ValueSparkline (atom) — the thin trace across the Values hero card.

   ══ IT IS THE REAL RECORDING, NOT AN ORNAMENT ══
   The handoff draws a repeating hand-written ECG path — correct for a
   mock-up, and the one thing that must not be copied literally. A
   decorative waveform on the same card as the measured heart rate would
   be a picture of somebody else's heart sitting directly under this
   patient's number. This draws lead II from the study being read.

   ══ HOW IT IS REDUCED, AND WHY NOT BY AVERAGING ══
   ~3 200 samples have to become ~340 columns. Averaging each bucket
   FLATTENS THE R PEAK — the one feature that makes the trace legible at
   56 pt — because an R wave is a handful of samples inside a bucket of
   ten. So each column keeps its bucket's most extreme sample instead: the
   peaks survive at their real height and the baseline stays where it is.
   The vertical scale is the signal's own range, so this is a shape, never
   a voltage; nothing is measured from it and nothing is claimed of it.
   ================================================================== */

import { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props {
  /** Filtered lead II, full rate. */
  samples: Float32Array | null;
  width: number;
  height: number;
  stroke: string;
}

/** Columns the trace is reduced to — about one per rendered pixel. */
const COLUMNS = 340;
/** Breathing room kept at the top and bottom, in fractions of the height. */
const EDGE = 0.08;

function buildPath(samples: Float32Array, w: number, h: number): string {
  const n = samples.length;
  if (n < 2) return '';
  const step = n / COLUMNS;

  /* One pass for the extremes, one to emit — the alternative is a second
     full scan per column. */
  let lo = Infinity;
  let hi = -Infinity;
  const picked = new Float32Array(COLUMNS);
  for (let c = 0; c < COLUMNS; c++) {
    const from = Math.floor(c * step);
    const to = Math.min(n, Math.floor((c + 1) * step) || from + 1);
    let best = samples[from] ?? 0;
    for (let i = from; i < to; i++) {
      const v = samples[i];
      if (v !== undefined && Math.abs(v) > Math.abs(best)) best = v;
    }
    picked[c] = best;
    if (best < lo) lo = best;
    if (best > hi) hi = best;
  }

  /* A flat lead would divide by zero and draw a line through the middle,
     which is the honest picture of a flat lead. */
  const span = hi - lo || 1;
  const top = h * EDGE;
  const usable = h * (1 - EDGE * 2);

  let d = '';
  for (let c = 0; c < COLUMNS; c++) {
    const x = (c / (COLUMNS - 1)) * w;
    const y = top + (1 - ((picked[c] as number) - lo) / span) * usable;
    d += (c === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }
  return d;
}

export default function ValueSparkline({ samples, width, height, stroke }: Props) {
  const d = useMemo(
    () => (samples && width > 0 ? buildPath(samples, width, height) : ''),
    [samples, width, height],
  );

  if (!d) return null;

  return (
    <Svg width={width} height={height}>
      <Path d={d} fill="none" stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

// v0.59.0 — The hero card's trace: the study's own lead II, reduced by
//           peak-preserving decimation so the R waves survive at 56 pt.
