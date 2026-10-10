/* ==================================================================
   BrandLogo (atom) — kept as the name the letterhead, the patient shell
   and the profile screen already import. It is no longer a different
   drawing from `CyphixWordmark`.

   ── Why it collapsed ──
   `BrandLogo` meant THE LOCKUP: a navy blob with a white dot, the word
   CYPHIX, and "MEDICAL" in grey beside it. The logo supplied on
   2026-10-10 has none of those extras — it is the lettering, and that is
   the whole mark. Two atoms drawing the same six glyphs would be two
   places to get it wrong next time, so this one delegates.

   ── What callers had to change ──
   The old lockup was 5.83 units wide per unit tall (6.63 cropped); the
   lettering alone is 4.81. A caller that kept its `width` would have
   drawn a logo ~20 % TALLER than the block it used to occupy, pushing
   letterheads and headers around. Each caller's width was therefore
   divided down so the RENDERED HEIGHT is unchanged — the layout does not
   move, only the artwork inside it.

   New code should import `CyphixWordmark` directly.
   ================================================================== */

import CyphixWordmark from '@/components/atoms/CyphixWordmark';

interface Props {
  width: number;
  /** 'light' paints the mark white for dark backgrounds. */
  tint?: 'brand' | 'light';
}

export default function BrandLogo({ width, tint = 'brand' }: Props) {
  return <CyphixWordmark width={width} tint={tint} />;
}

// v2.0.0 — The 2026-10-10 logo is lettering only, so the lockup no longer
//          exists: this delegates to `CyphixWordmark`. `crop` is gone with it —
//          the new viewBox is already tight, so there was nothing to crop.
// v1.1.0 — Optional `crop`: the source viewBox carries 7.3 units of air on the
//          left and 27.6 on the right, which puts the lockup 10 units left of
//          centre and wastes a fifth of its width. `crop` draws the measured
//          ink box instead. Default unchanged — every existing caller anchors
//          the logo to a corner, where the padding never showed.
