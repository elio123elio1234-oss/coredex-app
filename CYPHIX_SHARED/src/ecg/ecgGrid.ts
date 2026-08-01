/* ==================================================================
   ecgGrid — the millimetre grid of real ECG paper, as vector geometry.

   ══ WHY NOT AN SVG <pattern> ══
   A <pattern> fill is the obvious way to tile a grid, and it was the
   first implementation. Browsers rasterise pattern fills at SCREEN
   resolution when printing, so the printed PDF showed blurred squares
   next to a perfectly sharp vector trace — the exact opposite of what a
   clinician needs, because the grid IS the ruler. Explicit <path> lines
   have no raster fallback: the printer draws them at its own resolution.

   Shared by the report strips and the history viewer so both are measured
   against identical geometry. If these ever diverge, an interval read off
   one would not match the other.
   ================================================================== */

/** Minor grid: 1 mm — one small square = 40 ms at 25 mm/s, 0.1 mV at 10 mm/mV. */
export const MINOR_MM = 1;
/** Major grid: 5 mm — one large square = 200 ms at 25 mm/s, 0.5 mV at 10 mm/mV. */
export const MAJOR_MM = 5;

/**
 * Build an SVG path of grid lines covering `widthMm` × `heightMm`.
 *
 * `skipEveryMm` omits lines that a coarser layer will draw on top, so the
 * minor and major grids never paint the same pixel twice — double-painted
 * translucent lines read as a darker, uneven grid.
 */
export function buildGridPath(
  widthMm: number,
  heightMm: number,
  stepMm: number,
  skipEveryMm?: number,
): string {
  const parts: string[] = [];
  const epsilon = 1e-6; // float steps land on 4.999999 without this

  for (let x = 0; x <= widthMm + epsilon; x += stepMm) {
    if (skipEveryMm && Math.abs(x % skipEveryMm) < epsilon) continue;
    parts.push(`M${round(x)} 0V${round(heightMm)}`);
  }
  for (let y = 0; y <= heightMm + epsilon; y += stepMm) {
    if (skipEveryMm && Math.abs(y % skipEveryMm) < epsilon) continue;
    parts.push(`M0 ${round(y)}H${round(widthMm)}`);
  }
  return parts.join('');
}

function round(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(3);
}

/** The two layers of a standard ECG grid, ready to stroke. */
export function buildEcgGrid(widthMm: number, heightMm: number): {
  minor: string;
  major: string;
} {
  return {
    minor: buildGridPath(widthMm, heightMm, MINOR_MM, MAJOR_MM),
    major: buildGridPath(widthMm, heightMm, MAJOR_MM),
  };
}

// v1.0.0 — Vector ECG grid geometry shared by the report and the history viewer.
