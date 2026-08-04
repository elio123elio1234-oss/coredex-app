/* ==================================================================
   The CSS blob, exactly — and on the UI thread.

   The web's hero blob is shaped by an ELLIPTICAL border-radius:

     border-radius: 43% 57% 41% 59% / 54% 43% 57% 46%;
                    └── horizontal ──┘   └── vertical ──┘

   React Native's `borderRadius` cannot express that — it has one radius
   per corner, not a horizontal/vertical PAIR per corner. Approximating it
   with per-corner radii gives a rounded rectangle, not the asymmetric
   organic shape the design is.

   So we build the real thing as a path. A CSS corner is a quarter of an
   ellipse with radii (rx, ry); four of them joined by straight edges IS
   the border-radius shape. Quarter ellipses are drawn as cubic Béziers
   using the standard circle-to-cubic constant.

   ── EVERY FUNCTION HERE IS A WORKLET ──
   These run on Reanimated's UI thread inside `useDerivedValue`, so the
   shape is rebuilt in step with the display refresh and never waits on
   JavaScript. The first version drove the morph from `setInterval` +
   `setState` at 25 Hz, which meant a React re-render per frame and a
   visible stutter whenever the JS thread was busy — which, with 65
   animated particles alongside it, was constantly. Keep the `'worklet'`
   directives: without them these become cross-thread calls and the
   stutter comes straight back.

   The keyframes are copied verbatim from `@keyframes morphingBlob` in
   ecg.css. Interpolating the eight numbers reproduces the animation
   itself, not something that resembles it.
   ================================================================== */

import { Skia, type SkPath } from '@shopify/react-native-skia';

/** Cubic Bézier approximation constant for a quarter ellipse. */
const K = 0.5522847498307936;

/** One keyframe: 4 horizontal radii then 4 vertical, in % (TL, TR, BR, BL). */
export type BlobRadii = readonly [
  number, number, number, number,
  number, number, number, number,
];

/** @keyframes morphingBlob — ecg.css, verbatim. 8s ease-in-out infinite. */
export const BLOB_KEYFRAMES: readonly BlobRadii[] = [
  [43, 57, 41, 59, 54, 43, 57, 46], // 0%
  [55, 45, 55, 45, 48, 55, 45, 52], // 25%
  [45, 55, 35, 65, 58, 38, 62, 42], // 50%
  [35, 65, 50, 50, 42, 60, 40, 58], // 75%
  [43, 57, 41, 59, 54, 43, 57, 46], // 100% (== 0%)
];

/** The static shape used before the blob starts morphing (the 0% frame). */
export const BLOB_REST: BlobRadii = BLOB_KEYFRAMES[0];

/**
 * The keyframes flattened to a plain number[] — 5 frames × 8 radii.
 *
 * Worklets capture module scope by serializing it, and a flat array of
 * numbers crosses that boundary far more cheaply than an array of arrays.
 */
const KF: number[] = BLOB_KEYFRAMES.flatMap((f) => [...f]);
const KF_COUNT = BLOB_KEYFRAMES.length;

/** CSS `ease-in-out` — the timing function on both blob and core. */
export function easeInOut(t: number): number {
  'worklet';
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/**
 * Build the border-radius outline for a `w × h` box at `progress` (0–1 of
 * the 8 s cycle), as a Skia path.
 *
 * Radii are percentages: the first four of the WIDTH, the last four of the
 * HEIGHT — exactly how the CSS shorthand reads them.
 *
 * `excursion` is how much of the CSS's departure from a plain ellipse
 * survives: `1` is the keyframes verbatim, `0` is a perfect ellipse. Every
 * radius is pulled toward 50 % by it —
 *
 *     r' = 50 + (r − 50) × excursion
 *
 * — which is safe to do per radius because **each opposite pair in every
 * keyframe sums to exactly 100** (43+57, 41+59, 54+46, 43+57, …). That is
 * what keeps a border-radius shape free of straight edges, and pulling a
 * complementary pair toward 50 by the same factor keeps the sum at 100.
 *
 * ── WHY THIS EXISTS ──
 * The 75 % keyframe is the only one with a corner that is small in BOTH
 * axes (top-left, 35 % × 42 %) while its neighbour bulges (top-right,
 * 65 % × 60 %). At the diagonal that puts the outline ~7 px outside a
 * circle on one corner and ~8 px inside it on the next, and the top of the
 * blob visibly stops being round — reported as a vertex going out of
 * proportion at the upper left. Halving the excursion keeps the morph
 * clearly alive while never letting any corner leave "almost a circle".
 */
export function blobPathAt(
  w: number,
  h: number,
  progress: number,
  morphing: boolean,
  excursion = 1,
): SkPath {
  'worklet';
  const segments = KF_COUNT - 1;
  let i = 0;
  let f = 0;
  if (morphing) {
    const scaled = Math.min(0.999999, Math.max(0, progress)) * segments;
    i = Math.floor(scaled);
    // Ease WITHIN each segment, the way a CSS keyframe animation does.
    f = easeInOut(scaled - i);
  }
  const a = i * 8;
  const b = (i + 1) * 8;

  // Horizontal radii scale with width, vertical radii with height.
  const r = (k: number, size: number) => {
    const pct = KF[a + k] + (KF[b + k] - KF[a + k]) * f;
    return (50 + (pct - 50) * excursion) * size * 0.01;
  };
  const TLh = r(0, w), TRh = r(1, w), BRh = r(2, w), BLh = r(3, w);
  const TLv = r(4, h), TRv = r(5, h), BRv = r(6, h), BLv = r(7, h);

  const p = Skia.Path.Make();
  p.moveTo(TLh, 0);
  // top edge → top-right corner
  p.cubicTo(w - TRh + K * TRh, 0, w, TRv - K * TRv, w, TRv);
  // right edge → bottom-right corner
  p.cubicTo(w, h - BRv + K * BRv, w - BRh + K * BRh, h, w - BRh, h);
  // bottom edge → bottom-left corner
  p.cubicTo(BLh - K * BLh, h, 0, h - BLv + K * BLv, 0, h - BLv);
  // left edge → top-left corner
  p.cubicTo(0, TLv - K * TLv, TLh - K * TLh, 0, TLh, 0);
  p.close();
  return p;
}

/* ══════════════════════════════════════════════════════════════════
   THE CORE — `@keyframes morphingCore`, also verbatim.

   The web morphs the core between two clip-paths. Both are four cubic
   segments in a 12×12 box with the same structure, so the control points
   interpolate directly. `.core-scaler` scales the result by 4.5.
   ══════════════════════════════════════════════════════════════════ */

export const CORE_BOX = 12;
export const CORE_SCALE = 4.5;

/** 0% / 100% — a circle. Flat: start, then 4 × (c1, c2, end). */
const CORE_CIRCLE: number[] = [
  6, 0,
  9.31, 0, 12, 2.69, 12, 6,
  12, 9.31, 9.31, 12, 6, 12,
  2.69, 12, 0, 9.31, 0, 6,
  0, 2.69, 2.69, 0, 6, 0,
];

/** 40–60% — an off-centre teardrop. */
const CORE_BLOB: number[] = [
  6, 2.5,
  9, 1, 11.5, 2.5, 11.5, 5.5,
  11.5, 8.5, 7.5, 11, 6, 11.5,
  4.5, 11, 0.5, 8.5, 0.5, 5.5,
  0.5, 2.5, 3, 1, 6, 2.5,
];

/**
 * How far through the core's shape morph we are at `progress`, and how
 * much it has grown. Keyframes: 0% circle → 40% blob → 50% blob@1.22 →
 * 60% blob → 100% circle.
 */
export function coreShapeAt(progress: number): { shape: number; scale: number } {
  'worklet';
  const p = Math.min(1, Math.max(0, progress));
  let shape: number;
  if (p <= 0.4) shape = easeInOut(p / 0.4);
  else if (p <= 0.6) shape = 1;
  else shape = easeInOut(1 - (p - 0.6) / 0.4);

  let scale: number;
  if (p <= 0.4) scale = 1 + 0.1 * easeInOut(p / 0.4);
  else if (p <= 0.5) scale = 1.1 + 0.12 * ((p - 0.4) / 0.1);
  else if (p <= 0.6) scale = 1.22 - 0.12 * ((p - 0.5) / 0.1);
  else scale = 1 + 0.1 * easeInOut(1 - (p - 0.6) / 0.4);

  return { shape, scale };
}

/** The core outline at `shape` (0 = circle, 1 = teardrop), as a Skia path. */
export function corePathAt(shape: number): SkPath {
  'worklet';
  const v = (i: number) => CORE_CIRCLE[i] + (CORE_BLOB[i] - CORE_CIRCLE[i]) * shape;
  const p = Skia.Path.Make();
  p.moveTo(v(0), v(1));
  for (let i = 2; i < CORE_CIRCLE.length; i += 6) {
    p.cubicTo(v(i), v(i + 1), v(i + 2), v(i + 3), v(i + 4), v(i + 5));
  }
  p.close();
  return p;
}

/** `translate(2px, 3px)` at the morph peak, in the 12×12 box's units. */
export function coreOffsetAt(shape: number): { tx: number; ty: number } {
  'worklet';
  return { tx: 2 * shape, ty: 3 * shape };
}

// v2.1.0 — `excursion` pulls every radius toward 50 %, so the 75 % keyframe's
//          tight top-left corner can be tamed without editing the CSS table.
// v2.0.0 — All builders are worklets returning SkPath, so the morph runs on the
//          UI thread instead of a 25 Hz setInterval + setState (the stutter).
