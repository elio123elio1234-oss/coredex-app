/* ==================================================================
   unmask-icon.js — turn artwork that ALREADY has rounded corners on a
   flat backdrop into the full-bleed square an app icon has to be.

       node scripts/unmask-icon.js <art.png> <out.png>

   ---- WHY THIS EXISTS ----
   Icon artwork keeps arriving pre-masked: a rounded card floating on a
   white page, which is how a designer PRESENTS an icon and the opposite
   of what the platforms want. `icon.png` must be full bleed, because iOS
   applies its OWN squircle on top. Ship the presentation image and the
   corners get masked twice — and the artwork's radius is usually the
   LARGER one (25.2 % on the current source, against iOS's ~22.4 %), so
   the result is a rounded icon with white crescents bitten out of each
   corner. It looks like a rendering fault, which is exactly what it is.

   ---- WHY IT EXTENDS RATHER THAN CROPS ----
   The obvious fix is to crop inside the card. At a 25 % radius that
   means insetting ~260 px on a 1044 px card to clear the corners, which
   on the current artwork eats "HR 72", the ruler and the swoosh — i.e.
   most of what makes it that icon.

   So instead the card's own edge is EXTENDED into the corner. Every
   pixel outside the rounded shape is filled by clamping to the nearest
   point on the shape: straight-edge regions clamp along one axis, corner
   regions clamp to the arc (from the corner circle's centre, outward to
   radius r). Where the artwork's border is a smooth field — which is
   what a card's edge almost always is — the join is invisible, and
   nothing is lost.

   ---- THE DETECTOR, AND ITS ONE ASSUMPTION ----
   The card is found as "tinted, or genuinely dark" against a NEUTRAL
   backdrop (`b - r >= TINT` or `r < INK`). That is not a universal rule:
   it holds for a cool-toned card on white, which is what this project
   keeps receiving, and it would be wrong for a neutral card on a
   coloured page.

   ⚠️ A plain "differs from the backdrop colour" test does NOT work here
   and was tried: the card's interior is 254,254,254 — the same value as
   the page — so the only thing separating them at all is the tint, and a
   distance test locks onto the drop SHADOW, which lies outside the card
   and puts every edge several pixels too far out.

   The script therefore PRINTS what it measured. If the numbers look
   nothing like the artwork, the detector is wrong for that image and the
   answer is to fix the detector, not to nudge the output.

   ---- TWO CONSTRAINTS, AND v1.2.0 ONLY CHECKED ONE ----
   ⚠️ The frame is chosen so the card NEARLY FILLS IT — which pushes the
   artwork's own content outwards, towards the very corners the OS is about
   to mask away. v1.2.0 optimised for "no white corner" and never asked the
   opposite question, so it shipped an icon whose "HR 72" was sliced by
   iOS's squircle: 7,178 ink pixels outside the mask, the worst by 31 px.
   Reported from the phone, not caught here.

   So there are TWO constraints and they pull against each other:
     1. the card must nearly fill the frame, or the corners are page white;
     2. the CONTENT must stay inside the OS mask, or it is cut.
   Constraint 1 picks the frame. Constraint 2 then shrinks the content
   inside that frame, and the gap it opens is filled by the same edge
   extension — which is safe, because that band is under the mask anyway.
   Both are measured, and the second is RE-CHECKED after the fix.
   ================================================================== */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SRC = process.argv[2];
const OUT = process.argv[3];
if (!SRC || !OUT) {
  console.error('usage: node scripts/unmask-icon.js <art.png> <out.png>');
  process.exit(1);
}

/** Blue-minus-red at which a pixel counts as the card's tint. */
const TINT = 5;
/** Below this red value a pixel is ink (a trace, a glyph) whatever its hue. */
const INK = 215;
/** Side of the square this writes. */
const N = 1024;

const src = PNG.sync.read(fs.readFileSync(SRC));
const { width: W, height: H } = src;
const at = (x, y, c) => src.data[((W * y + x) << 2) + c];
const isCard = (x, y) => at(x, y, 2) - at(x, y, 0) >= TINT || at(x, y, 0) < INK;

/* ---- the straight edges, measured on the centre lines ----
   Centre lines on purpose: they cross the card where it is a straight
   edge, so neither the corner arcs nor the shadow pooling around them
   can move the answer. */
const cy = Math.round(H / 2);
const cx = Math.round(W / 2);
let left = 0;
let right = W - 1;
let top = 0;
let bottom = H - 1;
for (let x = 0; x < W; x++) if (isCard(x, cy)) { left = x; break; }
for (let x = W - 1; x >= 0; x--) if (isCard(x, cy)) { right = x; break; }
for (let y = 0; y < H; y++) if (isCard(cx, y)) { top = y; break; }
for (let y = H - 1; y >= 0; y--) if (isCard(cx, y)) { bottom = y; break; }

const cardW = right - left + 1;
const cardH = bottom - top + 1;

/* ---- the SHAPE, measured row by row rather than modelled ----
   ⚠️ The first two attempts assumed the corner was a circular ARC and
   clamped to it. Both left a visible rounded outline with white outside
   it, because a modern card corner is usually a SQUIRCLE (a continuous
   curve), not a circle. A circle is wrong in both directions at once: it
   cuts inside the real shape along part of the corner — so genuine card
   pixels were never filled, and the page showed through — and outside it
   along the rest, smearing the rim.

   So nothing is assumed. For every row, the first and last card pixel
   are MEASURED. That is exact for any convex-per-row shape, which a
   rounded rectangle is whatever curve its corners use. */
const spanStart = new Int32Array(H).fill(-1);
const spanEnd = new Int32Array(H).fill(-1);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) if (isCard(x, y)) { spanStart[y] = x; break; }
  if (spanStart[y] < 0) continue;
  for (let x = W - 1; x >= 0; x--) if (isCard(x, y)) { spanEnd[y] = x; break; }
}
/* The corner depth, for the log only — how far down the arc runs before
   the edge goes straight. Printed so a wrong detection is obvious. */
let radius = 0;
for (let dy = 0; dy < cardH / 2; dy++) {
  const y = top + dy;
  if (spanStart[y] >= 0 && spanStart[y] - left <= 2) { radius = dy; break; }
}

console.log(`  card        ${cardW} x ${cardH} at (${left}, ${top})`);
console.log(`  corner      ${radius} px deep  (${((radius / cardW) * 100).toFixed(1)} % of the card side)`);
if (radius === 0) {
  console.error('  no rounded corner found — is this artwork already full bleed?');
  process.exit(1);
}

/* ---- the square the output maps onto ----
   ★ CHOSEN BY MEASUREMENT, not by a fixed rule, and this is where the
   first three attempts went wrong. They mapped the card's whole bounding
   square and then tried to INVENT the rounded corners back. At a 25 %
   radius that is ~420 px of made-up pixels per corner, and every method
   of inventing them (clamp to a circle, clamp to the measured span)
   leaves a visible streak, because you cannot extend a gradient 420 px
   and have it still look like the gradient.

   ── The thing that makes this easy, and that I missed ──
   THE OS MASKS THE CORNERS ANYWAY. iOS draws a ~22.4 % squircle over
   whatever is in `icon.png`; Android crops to a circle. So the corners do
   not need to be beautiful — they need to not be PAGE WHITE, and only
   just far enough out to sit under the mask.

   So: zoom in until the card's own curve almost fills the frame. The
   square is the largest centred one whose worst uncovered corner is
   under `MAX_GAP` of its side. On the current artwork that lands at 88 %
   — a 21 px gap instead of 257 px at 90 % — because the corner curve
   falls away steeply and one step of zoom crosses it. The 12 % given up
   is all card margin: "HR 72", the nearest content to an edge, keeps
   47 px of clearance. */
const MAX_GAP = 0.025;

function uncoveredGap(L) {
  const x0 = Math.round((left + right) / 2 - L / 2);
  const x1 = x0 + L - 1;
  const y0 = Math.round((top + bottom) / 2 - L / 2);
  const y1 = y0 + L - 1;
  let gap = 0;
  if (y0 < top) gap = Math.max(gap, top - y0);
  if (y1 > bottom) gap = Math.max(gap, y1 - bottom);
  for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) {
    if (spanStart[y] < 0) { gap = Math.max(gap, L); continue; }
    gap = Math.max(gap, spanStart[y] - x0, x1 - spanEnd[y]);
  }
  return gap;
}

const maxSide = Math.min(cardW, cardH);
let side = maxSide;
for (let f = 1; f >= 0.7; f -= 0.005) {
  const L = Math.round(maxSide * f);
  if (uncoveredGap(L) <= L * MAX_GAP) { side = L; break; }
}
const gapPx = uncoveredGap(side);
console.log(
  `  frame       ${side} px  (${((side / maxSide) * 100).toFixed(0)} % of the card) ` +
  `— worst uncovered corner ${gapPx} px (${((gapPx / side) * 100).toFixed(1)} %)`,
);
if (gapPx > side * MAX_GAP) {
  console.error('  could not find a frame that the card nearly fills — is the corner radius enormous?');
  process.exit(1);
}
const originX = (left + right) / 2 - side / 2;
const originY = (top + bottom) / 2 - side / 2;

const bilinear = (fx, fy, c) => {
  fx = Math.max(0, Math.min(W - 1.001, fx));
  fy = Math.max(0, Math.min(H - 1.001, fy));
  const x0 = fx | 0;
  const y0 = fy | 0;
  const ax = fx - x0;
  const ay = fy - y0;
  const a = at(x0, y0, c);
  const b = at(x0 + 1, y0, c);
  const d = at(x0, y0 + 1, c);
  const e = at(x0 + 1, y0 + 1, c);
  return (a * (1 - ax) + b * ax) * (1 - ay) + (d * (1 - ax) + e * ax) * ay;
};

/**
 * How far inside the card to sample.
 *
 * A card does not end at a colour, it ends at a TREATMENT: a lighter rim,
 * then a soft shadow. Sampling exactly at the boundary drags that rim into
 * the fill. 10 px clears it.
 *
 * It was 28 while this script was inventing whole corners and needed to
 * reach well into the field; with the frame now chosen so only ~20 px is
 * ever missing, a deep inset would flatten more of the real edge than it
 * saves.
 */
const INSET = 10;

/** The nearest point genuinely INSIDE the card, both axes clamped. */
function clampToCard(x, y) {
  /* Vertically first, so the row we then use is one with a real span and
     is itself clear of the top and bottom rims. */
  const yy = Math.max(top + INSET, Math.min(bottom - INSET, y));
  const row = Math.max(0, Math.min(H - 1, Math.round(yy)));
  const s = spanStart[row];
  const e = spanEnd[row];
  if (s < 0) return [x, yy]; // cannot happen inside [top, bottom]; harmless
  return [Math.max(s + INSET, Math.min(e - INSET, x)), yy];
}

/* ---- constraint 2: the content must clear the OS mask ----
   iOS's continuous corner is modelled as a superellipse, |x|^n + |y|^n = 1
   with n = 5 — the usual fit, and tighter than Android's rounded-rect
   family, so clearing it clears both. */
const MASK_N = 5;
/** Pixels of clearance to leave between the content and the mask. */
const MASK_MARGIN = 12;
const maskR = (dx, dy) =>
  Math.pow(Math.pow(Math.abs(dx), MASK_N) + Math.pow(Math.abs(dy), MASK_N), 1 / MASK_N);

/**
 * Is this pixel CONTENT (a glyph, a trace, a badge) rather than the card's
 * own BODY?
 *
 * ⚠️ LOCAL CONTRAST, not a luminance threshold. Two earlier rules both
 * failed, in opposite ways:
 *   • "darker than 140" — correct for a navy trace on white, finds
 *     NOTHING on a pale-blue-on-pale-blue artwork, so it would report "no
 *     clipping" on exactly the icon most likely to have some;
 *   • "darker than the median minus 25" — adapts to the palette, and then
 *     flags the card's own RIM, which reaches the frame edge by definition
 *     and can never clear a mask. It demanded an 85 % shrink and still
 *     failed its own re-check, because the rim it was chasing shrank with
 *     everything else.
 *
 * What separates a feature from the body is not darkness, it is CONTRAST
 * AGAINST ITS SURROUNDINGS: a card's field and rim are smooth gradients,
 * glyphs and traces are not. So a pixel is content when it departs from
 * its own neighbourhood average. Palette-agnostic, and the body drops out
 * by construction.
 *
 * A large solid shape registers only at its EDGES, which is all this needs
 * — the question is where content REACHES, and an interior never reaches
 * further than its own edge.
 */
function contentMask(img) {
  const n = img.width;
  const lum = new Float64Array(n * n);
  for (let i = 0, k = 0; i < img.data.length; i += 4, k++) {
    lum[k] = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
  }
  /* Box average via an integral image — O(1) per pixel rather than O(r²). */
  const S = new Float64Array((n + 1) * (n + 1));
  for (let y = 0; y < n; y++) {
    let row = 0;
    for (let x = 0; x < n; x++) {
      row += lum[n * y + x];
      S[(n + 1) * (y + 1) + (x + 1)] = S[(n + 1) * y + (x + 1)] + row;
    }
  }
  const R = 16;
  const box = (x, y) => {
    const x0 = Math.max(0, x - R), y0 = Math.max(0, y - R);
    const x1 = Math.min(n, x + R + 1), y1 = Math.min(n, y + R + 1);
    const sum = S[(n + 1) * y1 + x1] - S[(n + 1) * y0 + x1] - S[(n + 1) * y1 + x0] + S[(n + 1) * y0 + x0];
    return sum / ((x1 - x0) * (y1 - y0));
  };
  const CONTRAST = 10;
  const m = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    m[n * y + x] = Math.abs(lum[n * y + x] - box(x, y)) > CONTRAST ? 1 : 0;
  }
  return { m, contrast: CONTRAST };
}

/**
 * The uniform scale about the centre that brings all content inside.
 *
 * `within` is the fraction of the frame the ARTWORK occupies. Anything
 * outside it is the edge-extension band, which must be ignored:
 *
 * ⚠️ OTHERWISE THIS NEVER CONVERGES, and it did not. The band is made by
 * repeating the card's edge outward, so an element that runs to that edge
 * — the ECG trace does exactly this — is smeared into a bar reaching the
 * frame corner. The check then sees that bar as content outside the mask,
 * demands another shrink, and the shrink makes a fresh bar. Two rounds of
 * "STILL CLIPPED after the fix" chasing an artefact of the fix itself.
 * The band is PADDING, by construction under the mask, and is not content.
 */
function requiredScale(img, within = 1) {
  const { m, contrast } = contentMask(img);
  const a = N / 2;
  const half = (a * within) - 1;
  let need = 1;
  let n = 0;
  let worst = null;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!m[N * y + x]) continue;
    if (Math.abs(x - a) > half || Math.abs(y - a) > half) continue; // the band
    n++;
    const r = maskR((x - a) / a, (y - a) / a);
    if (r <= 0) continue;
    const s = ((a - MASK_MARGIN) / a) / r;
    if (s < need) { need = s; worst = [x, y]; }
  }
  return { need, n, contrast, worst };
}

const out = new PNG({ width: N, height: N });
function render(img, contentScale) {
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      /* Expand about the centre by 1/contentScale: the artwork occupies
         the middle `contentScale` of the frame and `clampToCard` fills the
         band around it from the card's own edge. */
      const ux = (px + 0.5 - N / 2) / contentScale + N / 2;
      const uy = (py + 0.5 - N / 2) / contentScale + N / 2;
      const [qx, qy] = clampToCard(originX + (ux / N) * side, originY + (uy / N) * side);
      const o = (N * py + px) << 2;
      for (let c = 0; c < 3; c++) img.data[o + c] = Math.round(bilinear(qx, qy, c));
      img.data[o + 3] = 255;
    }
  }
  return img;
}

render(out, 1);
const first = requiredScale(out);
console.log(`  content     ${first.n} px of features (local contrast over ${first.contrast})`);
if (first.need < 1) {
  const shrink = first.need;
  render(out, shrink);
  const after = requiredScale(out, shrink);
  console.log(
    `  mask fit    content scaled to ${(shrink * 100).toFixed(1)} % so it clears the OS mask ` +
    `with ${MASK_MARGIN} px to spare`,
  );
  if (after.need < 0.995) {
    console.error(
      `  STILL CLIPPED after the fix (needs another ${(after.need * 100).toFixed(1)} %) ` +
      `at ${after.worst} — look at the output`,
    );
    process.exit(1);
  }
} else {
  console.log('  mask fit    content already clears the OS mask; no shrink needed');
}
fs.writeFileSync(OUT, PNG.sync.write(out));
console.log(`  ${path.basename(OUT).padEnd(28)} ${N} px  full bleed, corners extended from the card's own edge`);

// v1.1.0 — Samples 28 px inside the card, not 1.5, and squares on the SHORTER
//          side. At 1.5 px the extension smeared the card's own rim and shadow
//          around every corner (a visible rounded outline); squaring on the
//          longer side invented pixels above and below the card and wedged both
//          upper corners. Both were only visible by rendering it and looking.
// v1.0.0 — Un-masks pre-rounded icon artwork. Extends the card's edge into the
//          corners rather than cropping inside it: at a 25 % radius a crop that
//          clears the corners eats most of what makes the artwork that icon.
