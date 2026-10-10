/* ==================================================================
   CyphixWordmark (atom) — the CYPHIX logo.

   ── 2026-10-10: one logo, one copy of it ──
   The artwork is no longer declared here. It lives in `@cyphix/shared`
   (`brand/wordmark`), because the same six glyphs also have to be drawn
   by the web app, by the print engine in `services/export/pdf/logo.ts`
   and by the landing page, and the previous arrangement — a path string
   hand-copied into each of them under a comment begging nobody to edit
   it — only held for as long as the brand never changed.

   ── What the new logo is ──
   Lettering alone. The mark (a navy blob with a white dot) and the
   "MEDICAL" sub-line beside it are not part of the supplied artwork and
   are gone everywhere. `BrandLogo`, which used to draw that lockup, now
   delegates here; it is kept only so its callers keep compiling.

   The shared viewBox is tight around the ink, so this centres honestly —
   the `crop` escape hatch the old atom needed has nothing left to do.
   ================================================================== */

import Svg, { Path } from 'react-native-svg';
import {
  WORDMARK_ASPECT,
  WORDMARK_INK,
  WORDMARK_INK_LIGHT,
  WORDMARK_PATH,
  WORDMARK_VIEWBOX,
} from '@cyphix/shared';

interface Props {
  width: number;
  /** 'light' paints it white for a dark or photographic background. */
  tint?: 'brand' | 'light';
}

export default function CyphixWordmark({ width, tint = 'brand' }: Props) {
  return (
    <Svg
      width={width}
      height={width / WORDMARK_ASPECT}
      viewBox={WORDMARK_VIEWBOX}
      accessibilityLabel="CYPHIX"
    >
      <Path
        fill={tint === 'light' ? WORDMARK_INK_LIGHT : WORDMARK_INK}
        d={WORDMARK_PATH}
      />
    </Svg>
  );
}

// v2.0.0 — The 2026-10-10 wordmark, drawn from `@cyphix/shared` brand/wordmark
//          instead of a local copy. New artwork, new aspect (4.806 vs 4.886 —
//          close enough that every existing caller's width still reads right).
// v1.0.0 — Text-only CYPHIX wordmark, cropped to the glyphs' bounding box.
