/* ==================================================================
   make-icons.js — render the CYPHIX app icons from the BRAND MARK's own
   path data, not from a redrawn approximation.

   The blob + dot below are copied VERBATIM out of
   `src/components/atoms/BrandLogo.tsx`, in the mark's local coordinate
   space (before the wordmark's 0.6414 transform). Rendering from the
   real path is the whole point: an icon that is a hand-traced lookalike
   drifts from the logo the first time either one is touched.

   Run:  node scripts/make-icons.js
   Deps: pngjs (already present in the tree)

   Outputs (see ICONS table below): the iOS/general icon, the three
   Android adaptive layers, the splash mark and the web favicon.
   ================================================================== */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

/* ── The mark, verbatim from BrandLogo.tsx ────────────────────────── */

/** Blob outline: 4 cubic segments, closed. `M 38.4,16 C … Z` */
const BLOB = {
  start: [38.4, 16],
  curves: [
    [[51.2, 16], [56, 20.8], [56, 33.28]],
    [[56, 43.2], [42.88, 48], [37.12, 48]],
    [[28.8, 48], [24, 43.2], [24, 29.76]],
    [[24, 20.8], [28.8, 16], [38.4, 16]],
  ],
};
/** The counter-dot punched out of the blob. */
const DOT = { cx: 36.5, cy: 28.5, r: 4.5 };

/* ── Brand colours (web tokens.css / BrandLogo) ───────────────────── */
const NAVY = [0x0a, 0x25, 0x40]; // #0a2540 — the mark's own fill
const WHITE = [0xff, 0xff, 0xff];

/* ── Geometry ─────────────────────────────────────────────────────── */

/** Flatten one cubic bezier into points (t-stepped; the shape is small). */
function cubic(p0, p1, p2, p3, steps = 240) {
  const pts = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}

/** The blob as one closed polygon in mark-local units. */
function blobPolygon() {
  const poly = [BLOB.start];
  let cur = BLOB.start;
  for (const [c1, c2, end] of BLOB.curves) {
    poly.push(...cubic(cur, c1, c2, end));
    cur = end;
  }
  return poly;
}

function bbox(poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/**
 * Sorted x-intersections of the polygon with one horizontal line.
 *
 * Testing every edge per SAMPLE is what the first version did, and at
 * 1024² × 16 samples × ~960 edges it does not finish. Crossings are a
 * property of the scanline, not of the pixel, so they are computed once
 * per sub-scanline and the spans between pairs are filled.
 */
function crossings(poly, y) {
  const xs = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
  }
  return xs.sort((a, b) => a - b);
}

/* ── Rasteriser ───────────────────────────────────────────────────── */

/**
 * Draw the mark into a `size × size` RGBA buffer.
 *
 * @param size      canvas edge in px
 * @param scale     fraction of the canvas the mark's LONGEST side fills
 * @param bg        [r,g,b] background, or null for transparent
 * @param fg        [r,g,b] the mark's fill
 * @param dotColor  [r,g,b] the counter-dot, or null to leave it as the bg
 *                  (transparent-background layers punch a real hole)
 * @param ss        supersampling factor per axis (4 ⇒ 16 samples/px)
 */
function render(size, scale, bg, fg, dotColor, ss = 4) {
  const poly = blobPolygon();
  const bb = bbox(poly);

  // Fit the mark's longest side to `scale` of the canvas, centred on its
  // own measured box — never on the path's declared extents (the lesson
  // from BrandLogo's asymmetric viewBox, PARITY v0.19.5).
  const span = Math.max(bb.w, bb.h);
  const k = (size * scale) / span;
  const offX = size / 2 - (bb.minX + bb.w / 2) * k;
  const offY = size / 2 - (bb.minY + bb.h / 2) * k;

  const png = new PNG({ width: size, height: size });
  const inv = 1 / k;
  const n = ss * ss;

  // Coverage accumulators, one pass over the whole image.
  const covBlob = new Float32Array(size * size);
  const covDot = new Float32Array(size * size);

  for (let py = 0; py < size; py++) {
    for (let sy = 0; sy < ss; sy++) {
      // This sub-scanline in mark-local units, and its blob crossings.
      const cy = (py + (sy + 0.5) / ss - offY) * inv;
      const xs = crossings(poly, cy);
      if (xs.length < 2) continue;

      // The dot's horizontal extent on this same line (a circle ⇒ closed form).
      const dy = cy - DOT.cy;
      const halfChord = DOT.r * DOT.r - dy * dy;
      const dotSpan = halfChord > 0 ? Math.sqrt(halfChord) : -1;

      for (let p = 0; p + 1 < xs.length; p += 2) {
        // Span [xs[p], xs[p+1]] in local units → device sub-sample columns.
        const sxa = Math.max(0, Math.ceil((xs[p] * k + offX) * ss - 0.5));
        const sxb = Math.min(size * ss - 1, Math.floor((xs[p + 1] * k + offX) * ss - 0.5));
        for (let sx = sxa; sx <= sxb; sx++) {
          const px = (sx / ss) | 0;
          const o = size * py + px;
          covBlob[o] += 1;
          if (dotSpan > 0) {
            const cx = (sx + 0.5) / ss * inv - offX * inv;
            if (Math.abs(cx - DOT.cx) <= dotSpan) covDot[o] += 1;
          }
        }
      }
    }
  }

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const o = size * py + px;
      const aBlob = Math.min(1, covBlob[o] / n);
      const aDot = Math.min(1, covDot[o] / n);

      const idx = o << 2;
      // Composite: background → blob → dot, all with coverage alpha.
      let r = bg ? bg[0] : 0;
      let g = bg ? bg[1] : 0;
      let b = bg ? bg[2] : 0;
      let a = bg ? 1 : 0;

      // blob over bg
      const ab = aBlob;
      r = fg[0] * ab + r * (1 - ab);
      g = fg[1] * ab + g * (1 - ab);
      b = fg[2] * ab + b * (1 - ab);
      a = ab + a * (1 - ab);

      // dot over blob. With no dotColor the dot is punched OUT, which on a
      // transparent layer is a real hole — the themed Android icon and the
      // splash mark both need the counter to read against whatever is behind.
      if (aDot > 0) {
        if (dotColor) {
          r = dotColor[0] * aDot + r * (1 - aDot);
          g = dotColor[1] * aDot + g * (1 - aDot);
          b = dotColor[2] * aDot + b * (1 - aDot);
          a = aDot + a * (1 - aDot);
        } else {
          a = a * (1 - aDot);
        }
      }

      png.data[idx] = Math.round(r);
      png.data[idx + 1] = Math.round(g);
      png.data[idx + 2] = Math.round(b);
      png.data[idx + 3] = Math.round(a * 255);
    }
  }
  return png;
}

/** Flat single-colour layer (Android adaptive background). */
function solid(size, rgb) {
  const png = new PNG({ width: size, height: size });
  for (let i = 0; i < size * size; i++) {
    const idx = i << 2;
    png.data[idx] = rgb[0];
    png.data[idx + 1] = rgb[1];
    png.data[idx + 2] = rgb[2];
    png.data[idx + 3] = 255;
  }
  return png;
}

/* ── What we emit ─────────────────────────────────────────────────── */

const ASSETS = path.join(__dirname, '..', 'assets');

/* `scale` notes:
   - 0.60 on the square icon: iOS masks to a squircle and the mark is a
     rounded organic shape, so it needs real air or it reads as cramped.
   - 0.42 on the Android FOREGROUND: an adaptive icon is a 108 dp canvas
     whose inner 72 dp (66 %) is the only guaranteed-visible region, and
     launchers crop and animate beyond it. 0.42 keeps the whole mark
     inside the safe circle on every launcher shape. */
const ICONS = [
  // iOS + the general app icon: navy mark on the white the user chose.
  ['icon.png', () => render(1024, 0.6, WHITE, NAVY, WHITE)],
  // Android adaptive: white plate, navy mark, inside the safe zone.
  ['android-icon-background.png', () => solid(1024, WHITE)],
  ['android-icon-foreground.png', () => render(1024, 0.42, null, NAVY, null)],
  // Themed (monochrome) icon: the system tints a silhouette, so ship the
  // mark in flat black with the counter punched through.
  ['android-icon-monochrome.png', () => render(1024, 0.42, null, [0, 0, 0], null)],
  // Splash mark sits on the navy splash screen → transparent + white mark.
  ['splash-icon.png', () => render(1024, 0.5, null, WHITE, null)],
  // Favicon: small, so the mark gets more of the box.
  ['favicon.png', () => render(96, 0.72, WHITE, NAVY, WHITE)],
];

for (const [name, make] of ICONS) {
  const out = path.join(ASSETS, name);
  const buf = PNG.sync.write(make());
  fs.writeFileSync(out, buf);
  console.log(`wrote ${name.padEnd(32)} ${(buf.length / 1024).toFixed(1)} kB`);
}

// v1.0.0 — Renders every app icon from BrandLogo's own path data.
