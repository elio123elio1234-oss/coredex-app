/* ==================================================================
   ecgPath — turn a recorded lead into an SVG path, in millimetres.

   ══ WHY SVG AND NOT CANVAS (this is the whole point) ══
   The old report drew every strip on a <canvas>. A canvas is a bitmap: it
   is rasterised once at screen resolution (~96 dpi), and the print engine
   can only ever scale that bitmap up to the sheet. That is why the printed
   waveforms looked like a screenshot — because they literally were one.

   An SVG path is geometry. The printer renders it at ITS resolution
   (600–1200 dpi), so a 0.18 mm trace line stays a crisp 0.18 mm line on
   paper. For a document a clinician measures intervals off, that is not a
   cosmetic difference: you cannot read a 40 ms notch off a blurred raster.

   ══ UNITS ══
   Everything below is in MILLIMETRES, matching real ECG paper:
     25 mm/s horizontally, 10 mm/mV vertically, 1 mm minor grid,
     5 mm major grid. Working in mm means the printed output can be
     measured with a ruler and a caliper the way paper ECGs always have.
   ================================================================== */

/** Clinical standard sweep speed. */
export const STANDARD_MM_PER_SEC = 25;
/** Clinical standard gain. */
export const STANDARD_MM_PER_MV = 10;

export interface EcgPathOptions {
  /** Samples per second of the recording. */
  sampleRate: number;
  /** Horizontal scale (mm per second). */
  mmPerSec: number;
  /** Vertical scale (mm per millivolt). */
  mmPerMv: number;
  /** Y coordinate (mm) of the isoelectric line. */
  baselineMm: number;
  /** Horizontal offset (mm) where the trace starts. */
  xOffsetMm?: number;
  /**
   * Output resolution: buckets per millimetre. Higher keeps more detail and
   * a bigger path string. 8 is well past what any printer resolves, while
   * keeping the DOM light enough for six live strips.
   */
  bucketsPerMm?: number;
  /** Clip the trace to ±this many mm from baseline (keeps it inside its box). */
  clipMm?: number;
}

/**
 * Build an SVG `d` string for one lead.
 *
 * Decimation is PEAK-PRESERVING: each output bucket emits its minimum and
 * its maximum in temporal order. Plain "every Nth sample" decimation drops
 * R-peaks — the sharpest, shortest, and most clinically important feature
 * in the whole trace — which would understate voltages on the report.
 */
export function buildEcgPath(data: Float32Array, options: EcgPathOptions): string {
  const {
    sampleRate,
    mmPerSec,
    mmPerMv,
    baselineMm,
    xOffsetMm = 0,
    bucketsPerMm = 8,
    clipMm,
  } = options;

  const n = data.length;
  if (n < 2 || sampleRate <= 0) return '';

  const durationSec = n / sampleRate;
  const widthMm = durationSec * mmPerSec;
  const buckets = Math.max(2, Math.min(n, Math.round(widthMm * bucketsPerMm)));
  const samplesPerBucket = n / buckets;

  const toY = (mv: number): number => {
    let offset = mv * mmPerMv;
    if (clipMm !== undefined) offset = Math.max(-clipMm, Math.min(clipMm, offset));
    return baselineMm - offset;
  };

  const parts: string[] = [];
  let started = false;

  for (let b = 0; b < buckets; b++) {
    const from = Math.floor(b * samplesPerBucket);
    const to = Math.min(n, Math.floor((b + 1) * samplesPerBucket));
    if (to <= from) continue;

    let min = data[from];
    let max = data[from];
    let minIdx = from;
    let maxIdx = from;
    for (let i = from; i < to; i++) {
      if (data[i] < min) {
        min = data[i];
        minIdx = i;
      }
      if (data[i] > max) {
        max = data[i];
        maxIdx = i;
      }
    }

    // Emit in the order they actually occurred, so the line never travels
    // backwards in time.
    const first = minIdx <= maxIdx ? min : max;
    const second = minIdx <= maxIdx ? max : min;
    const x = xOffsetMm + ((b + 0.5) / buckets) * widthMm;

    if (!started) {
      parts.push(`M${x.toFixed(2)} ${toY(first).toFixed(2)}`);
      started = true;
    } else {
      parts.push(`L${x.toFixed(2)} ${toY(first).toFixed(2)}`);
    }
    if (second !== first) parts.push(`L${x.toFixed(2)} ${toY(second).toFixed(2)}`);
  }

  return parts.join(' ');
}

/**
 * The calibration pulse every clinical ECG carries: a 1 mV, 200 ms square
 * step drawn before the trace. It lets anyone reading the printout verify
 * the gain against the grid with their own eyes rather than trusting a
 * label — which is precisely why paper ECGs have always included it.
 */
export function buildCalibrationPulse(
  baselineMm: number,
  mmPerMv: number,
  mmPerSec: number,
  xOffsetMm = 0,
): string {
  const height = mmPerMv; // exactly 1 mV
  const flat = 0.2 * mmPerSec; // 200 ms plateau
  const lead = 0.08 * mmPerSec;
  const x0 = xOffsetMm;
  const x1 = x0 + lead;
  const x2 = x1 + flat;
  const x3 = x2 + lead;
  const top = baselineMm - height;
  return [
    `M${x0.toFixed(2)} ${baselineMm.toFixed(2)}`,
    `L${x1.toFixed(2)} ${baselineMm.toFixed(2)}`,
    `L${x1.toFixed(2)} ${top.toFixed(2)}`,
    `L${x2.toFixed(2)} ${top.toFixed(2)}`,
    `L${x2.toFixed(2)} ${baselineMm.toFixed(2)}`,
    `L${x3.toFixed(2)} ${baselineMm.toFixed(2)}`,
  ].join(' ');
}

// v1.0.0 — Vector (mm-space) ECG path builder: peak-preserving decimation + calibration pulse.
