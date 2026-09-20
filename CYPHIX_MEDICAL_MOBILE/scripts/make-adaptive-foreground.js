/* ==================================================================
   The ANDROID ADAPTIVE FOREGROUND, which cannot be the artwork
   full-bleed.

   ---- WHY THIS FILE EXISTS ----
   An adaptive layer is 108dp and a launcher may crop everything outside
   the middle 72dp, so only 66.7 % of the frame is guaranteed. The v0.72.0
   artwork is a six-lead ECG whose LEAD LABELS (I, II, III, aVR, aVL, aVF)
   sit hard against the left edge of its content block — so a full-bleed
   foreground is scaled 1.5x by the launcher and every label is cut
   through the middle of its glyphs. Rendered under a circular and a
   rounded-square mask before shipping, exactly as `make-icons.ps1`'s
   header instructs, and both showed "R" and "L" sliced in half. That is
   not a style opinion; it is the artwork being broken by the platform.

   Insetting the WHOLE PNG to 66.7 % would fix the crop and introduce a
   worse problem: the artwork is opaque and carries its own gradient to
   its own edges, so it would sit as a visible square tile on the adaptive
   BACKGROUND layer, seam and all.

   So the layer is rebuilt instead, from the artwork's own two halves:

     background — the artwork's gradient, its traces averaged away on a
                  6x6 grid (the same trick, and the same number, that
                  `make-icons.ps1` uses for android-icon-background.png:
                  at 20x20 a cell is narrower than the gap between lead
                  rows, so the "background" comes out carrying ghost blobs
                  of the waves it was meant to erase).
     subject    — the six leads and their labels, scaled to fit the safe
                  CIRCLE (see `SAFE` — ~50 % of the frame, not 67 %) and
                  centred.

   ★ THE SUBJECT IS ADDED AS GLOW, NOT COMPOSITED AS A TILE. The first
   version took `max(background, artwork)`, which is a fair description of
   how neon-on-dark works and still left a visible bright RECTANGLE in the
   top-left: the artwork's own cyan corner glow is brighter than the
   averaged field, so `max` picked the artwork there and the edge of the
   content box became an edge you could see. What is wanted is only what
   the artwork adds ON TOP of its own local background — the traces. So
   the subject is `artwork - artwork's own coarse gradient`, clamped at
   zero, ADDED to the field. Where there is no trace that difference is
   zero and the result is exactly the background, so the box has no edge
   by construction rather than by tuning.

   The result is full-bleed (no seam, no alpha) with every pixel that
   carries meaning inside the safe circle, on every launcher mask.

   iOS is untouched and stays full-bleed: it does not crop an icon, it
   only rounds its corners.
   ================================================================== */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SRC = process.argv[2];
const OUT = process.argv[3];
if (!SRC || !OUT) {
  console.error('usage: node make-adaptive-foreground.js <source.png> <out.png>');
  process.exit(1);
}

const N = 1024;
/**
 * The guaranteed-visible fraction of an adaptive layer (72dp of 108dp).
 *
 * ⚠️ IT IS A CIRCLE, NOT A SQUARE, AND THE DIFFERENCE IS THE WHOLE POINT.
 * Every description of this — including `make-icons.ps1`'s own header —
 * says "the middle 72dp", which reads as a 72dp SQUARE. Fitting the
 * content to that square and then rendering it under Pixel's circular
 * mask still cut the lead labels, because the square's corners lie
 * outside the inscribed circle. A 683 px box with a 914 px diagonal does
 * not fit in a 683 px circle, and no amount of centring fixes that.
 *
 * So the content is fitted by its DIAGONAL: w² + h² ≤ (N · SAFE)². For
 * this artwork's 940×835 block that lands at 510×453 — about 50 % of the
 * frame rather than 67 %.
 */
const SAFE = 0.667;
/**
 * The artwork's CONTENT block, in source pixels: the leftmost label to the
 * end of the longest trace, and the top of lead I to the bottom of aVF.
 * Measured off the 1254 px source, not guessed — if the artwork is ever
 * replaced these four numbers are what has to be re-measured.
 */
const CONTENT = { x: 155, y: 210, w: 940, h: 835 };

const src = PNG.sync.read(fs.readFileSync(SRC));
const px = (img, x, y, c) => img.data[((img.width * y + x) << 2) + c];

/* ---- the gradient, traces averaged away ----
   TWO grids, because the two jobs want opposite things.

   G = 6 is the FIELD this layer is painted on. Coarse on purpose: a cell
   is ~209 px, wider than the ~145 px between lead rows, so the traces
   genuinely average away. At 20 the cells are narrower than that pitch
   and the "background" comes out carrying ghost blobs of the waves.

   GS = 24 is the REFERENCE the trace is separated from, and it has to be
   FINE. Subtracting the coarse field instead left a bright rectangle in
   the top-left: the artwork's cyan corner glow is far brighter than its
   own 209 px cell average, so the difference there was large and positive
   and the edge of the content box became visible. At ~52 px the reference
   follows that glow closely, so the difference at the corner is ~0, while
   an ~8 px trace still stands far above its own cell. */
const coarse = averageGrid(6);
const fine = averageGrid(24);
const G = 6;
const grid = coarse;

function averageGrid(n) {
  const g = new Float64Array(n * n * 3);
  const k = new Float64Array(n * n);
  for (let y = 0; y < src.height; y++) {
    const gy = Math.min(n - 1, ((y * n) / src.height) | 0);
    for (let x = 0; x < src.width; x++) {
      const gx = Math.min(n - 1, ((x * n) / src.width) | 0);
      const i = gy * n + gx;
      for (let c = 0; c < 3; c++) g[i * 3 + c] += px(src, x, y, c);
      k[i]++;
    }
  }
  for (let i = 0; i < n * n; i++) for (let c = 0; c < 3; c++) g[i * 3 + c] /= k[i];
  return g;
}

const lerp2 = (get, fx, fy, w, h, c) => {
  fx = Math.max(0, Math.min(w - 1.001, fx));
  fy = Math.max(0, Math.min(h - 1.001, fy));
  const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0;
  const a = get(x0, y0, c),     b = get(x0 + 1, y0, c);
  const d = get(x0, y0 + 1, c), e = get(x0 + 1, y0 + 1, c);
  return (a * (1 - ax) + b * ax) * (1 - ay) + (d * (1 - ax) + e * ax) * ay;
};
const bgAt = (x, y, c) => lerp2((gx, gy, cc) => grid[(gy * G + gx) * 3 + cc], (x * G) / N, (y * G) / N, G, G, c);
const artAt = (x, y, c) => lerp2((sx, sy, cc) => px(src, sx, sy, cc), x, y, src.width, src.height, c);
/* The same coarse field, sampled in SOURCE coordinates — what the artwork's
   own background is at a given pixel, so the trace can be separated from it. */
const GS = 24;
const srcBgAt = (x, y, c) =>
  lerp2((gx, gy, cc) => fine[(gy * GS + gx) * 3 + cc], (x * GS) / src.width, (y * GS) / src.height, GS, GS, c);

/* ---- the subject, inside the safe CIRCLE ---- */
const diag = Math.hypot(CONTENT.w, CONTENT.h);
const scale = (N * SAFE) / diag;
const boxW = CONTENT.w * scale;
const boxH = CONTENT.h * scale;
const left = (N - boxW) / 2;
const top = (N - boxH) / 2;
/* The check, run rather than assumed: the furthest corner of the content
   from the centre of the frame must sit inside the safe circle. */
const corner = Math.hypot(boxW, boxH) / 2;
if (corner > (N * SAFE) / 2 + 0.5) {
  console.error(`content corner is ${corner.toFixed(0)} px from centre, past the ${((N * SAFE) / 2).toFixed(0)} px safe radius`);
  process.exit(1);
}

/**
 * How far in from the content box's edge the glow is ramped to zero, as a
 * fraction of the box.
 *
 * Subtracting a fine reference got the step down to a faint bright square
 * at the top-left, where the artwork's corner glow still outruns even a
 * ~52 px cell average. Any residual is a STEP at the box edge, and a step
 * is what the eye finds; a ramp is not. 5 % is ~25 px of the 511 px box,
 * which lands in the ~15 px of margin the artwork already leaves around
 * its own content plus a sliver of the outermost trace ends — far less
 * visible than the edge it removes.
 */
const FEATHER = 0.05;
const ramp = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * t));

const out = new PNG({ width: N, height: N });
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const o = (N * y + x) << 2;
    const inBox = x >= left && x < left + boxW && y >= top && y < top + boxH;
    const sx = CONTENT.x + (x - left) / scale;
    const sy = CONTENT.y + (y - top) / scale;
    /* Distance from the nearest edge, in box fractions, ramped. */
    const fade = inBox
      ? ramp(Math.min((x - left) / boxW, (left + boxW - x) / boxW) / FEATHER) *
        ramp(Math.min((y - top) / boxH, (top + boxH - y) / boxH) / FEATHER)
      : 0;
    for (let c = 0; c < 3; c++) {
      const bg = bgAt(x, y, c);
      /* Only what the artwork adds over its OWN background at that point
         — the trace. Zero everywhere else, so the content box has no
         visible edge. */
      const glow = fade > 0 ? Math.max(0, artAt(sx, sy, c) - srcBgAt(sx, sy, c)) * fade : 0;
      out.data[o + c] = Math.round(Math.min(255, bg + glow));
    }
    out.data[o + 3] = 255;
  }
}
fs.writeFileSync(OUT, PNG.sync.write(out));
console.log(
  `  ${path.basename(OUT).padEnd(30)} ${N} px  subject ${boxW.toFixed(0)}x${boxH.toFixed(0)}, ` +
  `corner ${corner.toFixed(0)} px from centre vs a ${((N * SAFE) / 2).toFixed(0)} px safe radius ` +
  `(${((boxW / N) * 100).toFixed(1)}% of the frame)`,
);

// v1.4.0 — The glow is feathered to zero over the box's outer 5 %. A fine
//          reference grid reduced the step at the content box's edge; it did
//          not remove it, and a step is what the eye finds. A ramp is not.
// v1.3.0 — The trace is separated from a FINE reference grid (24, ~52 px)
//          rather than from the coarse field the layer is painted on (6).
//          Subtracting the coarse one left a bright rectangle at the top-left:
//          the artwork's cyan corner glow far exceeds its own 209 px cell
//          average, so the difference there was large and the content box's
//          edge became visible. The two grids want opposite things and now
//          each gets what it wants.
// v1.2.0 — The subject is ADDED as glow (artwork minus its own coarse
//          gradient, clamped at zero) instead of composited with max(). max()
//          left a visible bright rectangle where the artwork's cyan corner was
//          brighter than the averaged field. A difference is zero where there
//          is no trace, so the box has no edge by construction.
// v1.1.0 — Fits the content to the safe CIRCLE, by its diagonal, not to the
//          72dp square. v1.0.0 read "the middle 72dp" as a square, and Pixel's
//          circular mask still sliced the lead labels: a 683 px box has a
//          914 px diagonal and does not fit a 683 px circle. Costs size (50 %
//          of the frame, not 67 %) and buys an icon nothing crops.
// v1.0.0 — The adaptive foreground is rebuilt rather than cropped: the
//          artwork's gradient with its own six leads composited back inside
//          the safe zone, because full-bleed let every launcher mask cut the
//          lead labels in half and an inset PNG would sit as a visible square
//          tile on the background layer.
