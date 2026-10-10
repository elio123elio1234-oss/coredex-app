/* ==================================================================
   The CYPHIX wordmark — the artwork itself, as data.

   ══ WHY THE LOGO LIVES IN THE SHARED PACKAGE ══
   Before this file the same logo existed as SEVEN hand-copied path
   strings: web's `BrandLogo` + `CyphixWordmark`, mobile's `BrandLogo` +
   `CyphixWordmark`, mobile's print `logo.ts`, the landing page's `Logo`,
   and a loose `public/assets/cyphix-full-logo.svg`. Every one of them
   carried a comment promising it was "copied VERBATIM" and must never be
   hand-edited — which is the honest admission that seven copies is a
   drift bug waiting for the day the brand changes. That day arrived, so
   the artwork moved here, where root CLAUDE.md §2.1 says it belongs:
   pure data, no React, no DOM, no React Native.

   ══ WHAT CHANGED (2026-10-10) ══
   The brand is now the LETTERING ALONE. The previous lockup was a round
   navy mark with a white dot, the word CYPHIX, and "MEDICAL" set beside
   it in grey. None of those three survive: the supplied artwork is six
   geometric glyphs and nothing else. Anywhere that used to draw the
   lockup now draws this, which is why several callers were resized in
   the same change — see the per-app version footers.

   ══ GEOMETRY ══
   The viewBox is already tight around the ink (the glyphs run x
   0.31→345.77, y 0.68→71.92 inside a declared 0 0 346 72), so unlike the
   old artwork there is no padding to crop and no off-centre lockup to
   compensate for. Callers that centre the logo can simply centre it.
   ================================================================== */

/** The artwork's own coordinate system. Already tight around the ink. */
export const WORDMARK_VIEWBOX = '0 0 346 72';

/** width ÷ height. Multiply a height by this to get the matching width. */
export const WORDMARK_ASPECT = 346 / 72;

/**
 * The brand ink as the artwork ships it. Note this is NOT the app's
 * `--brand-deep` navy (#0D2041) the old wordmark was painted in: the new
 * file is a slate (#1E293B). Surfaces that theme the logo (a dark sidebar,
 * a navy splash) override it; surfaces that just draw it use this.
 */
export const WORDMARK_INK = '#1E293B';

/** The ink inverted, for a dark or photographic background. */
export const WORDMARK_INK_LIGHT = '#FFFFFF';

/**
 * All six glyphs as one `d`. They are disjoint closed subpaths — no glyph
 * overlaps another and none contains a counter — so a single path with the
 * default nonzero fill rule renders identically to six separate ones, on
 * SVG in the DOM, in `react-native-svg`, and in a print engine alike.
 *
 * ★ DO NOT HAND-EDIT. A stray digit here is a deformed logo on a clinical
 * document a doctor keeps. If the brand changes again, the supplied file
 * is re-exported into this constant whole.
 */
export const WORDMARK_PATH =
  'M65.36 19.19 C60.25 7.51 49.44 0.68 34.81 0.68 C14.92 0.68 0.31 15.76 0.31 36.3 C0.31 56.84 14.92 71.92 34.81 71.92 C49.47 71.92 60.29 65.07 65.39 53.35 L58.74 50.81 C54.64 60.21 46.19 65.69 34.81 65.69 C19.51 65.69 7.47 52.74 7.47 36.3 C7.47 19.86 19.51 6.91 34.81 6.91 C46.09 6.91 54.5 12.31 58.63 21.57Z ' +
  'M67.26 1.88 L75.36 1.88 L97.81 37.25 L120.03 1.88 L128.09 1.88 L101.42 44.33 L101.42 70.72 L94.22 70.72 L94.22 44.34Z ' +
  'M132.75 27.44 L132.75 24.68 C132.75 10 141.97 1.28 157.5 1.28 C173.03 1.28 182.26 10 182.26 24.68 C182.26 36.78 172.74 45.54 159.57 45.54 L154.27 45.54 C145.7 45.54 139.96 51.05 139.96 59.27 L139.96 70.72 L132.6 70.72 L132.6 59.27 C132.6 47.14 141.15 39.24 154.27 39.24 L159.57 39.24 C168.22 39.24 174.9 32.89 174.9 24.68 C174.9 13.86 168.51 7.58 157.5 7.58 C146.49 7.58 140.11 13.86 140.11 24.68 L140.11 27.44Z ' +
  'M201.59 32.17 L201.59 1.88 L194.43 1.88 L194.43 70.72 L201.59 70.72 L201.59 38.44 L243.38 38.44 L243.38 70.72 L250.54 70.72 L250.54 1.88 L243.38 1.88 L243.38 32.17Z ' +
  'M267.67 1.88 L274.82 1.88 L274.82 70.72 L267.67 70.72Z ' +
  'M344.19 1.88 L335.66 1.88 L315.17 29.47 L294.7 1.88 L286.03 1.88 L310.83 35.31 L284.54 70.72 L293.08 70.72 L315.1 41.06 L337.09 70.72 L345.77 70.72 L319.44 35.22Z';

/**
 * The wordmark as a standalone SVG document — for a print engine, an
 * e-mail, or anywhere that needs markup rather than a component.
 *
 * @param width  CSS/print width, units included (e.g. `'34mm'`, `'190px'`).
 * @param fill   Ink. Defaults to the brand slate.
 */
export function wordmarkSvg(width: string, fill: string = WORDMARK_INK): string {
  const value = parseFloat(width);
  const unit = width.slice(String(value).length);
  const height = (value / WORDMARK_ASPECT).toFixed(3) + unit;
  return `<svg width="${width}" height="${height}" viewBox="${WORDMARK_VIEWBOX}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMid meet" role="img" aria-label="CYPHIX"><path fill="${fill}" d="${WORDMARK_PATH}"/></svg>`;
}

// v1.34.0 — The CYPHIX wordmark as shared data: the 2026-10-10 lettering-only
//           artwork, its tight viewBox, its aspect and its inks. Replaces seven
//           hand-copied path strings across web, mobile, print and the landing
//           page — and the round mark + "MEDICAL" sub-line, which the new logo
//           does not have.
