/* ==================================================================
   Shell palette — the patient shell's background, ported from the web's
   `[data-bg="…"]` rules in layout.css.

   ⚠️ The DEFAULT IS 'gray' — a flat #E7EAEF field with NO waves. That is
   what BackgroundProvider.tsx sets (`DEFAULT_BG: BgStyle = 'gray'`), and
   the wavy teal field is an opt-in style, not the default look. Getting
   this backwards makes the whole app read as a different product.
   ================================================================== */

export type BgStyle = 'gray' | 'white' | 'waves' | 'calm';

export const DEFAULT_BG: BgStyle = 'gray';

export interface ShellPalette {
  /** Flat field colour, or the gradient stops when the style has one. */
  field: string | [string, string, string];
  /** Wave ribbons — only the 'waves' style paints them. */
  waves?: { color: string; opacity: number }[];
  bloom?: string;
  /** Wordmark tint that stays legible on this field. */
  logoTint: 'brand' | 'light';
}

/* [data-bg="gray"] .main--full { background: #e7eaef; } */
const GRAY_LIGHT: ShellPalette = { field: '#E7EAEF', logoTint: 'brand' };
const GRAY_DARK: ShellPalette = { field: '#12171F', logoTint: 'light' };

/* [data-bg="white"] .main--full { background: #fbfbfd; } */
const WHITE_LIGHT: ShellPalette = { field: '#FBFBFD', logoTint: 'brand' };
const WHITE_DARK: ShellPalette = { field: '#0D1424', logoTint: 'light' };

/* The wavy teal field (.main--full base + .hb-wave-* fills). */
const WAVES_LIGHT: ShellPalette = {
  field: ['#E7F6FB', '#CDECF5', '#A9DDEE'],
  bloom: '#F3FBFD',
  waves: [
    { color: '#FFFFFF', opacity: 0.28 },
    { color: '#BEE7F2', opacity: 0.6 },
    { color: '#93D4EA', opacity: 0.58 },
    { color: '#63BEDF', opacity: 0.5 },
    { color: '#3AA2CF', opacity: 0.4 },
  ],
  logoTint: 'brand',
};
const WAVES_DARK: ShellPalette = {
  field: ['#0A1824', '#0B2231', '#0E3549'],
  bloom: '#10202E',
  waves: [
    { color: '#1C4C66', opacity: 0.3 },
    { color: '#123B53', opacity: 0.55 },
    { color: '#10475F', opacity: 0.55 },
    { color: '#0F5570', opacity: 0.5 },
    { color: '#0E6382', opacity: 0.42 },
  ],
  logoTint: 'light',
};

/* "Calm" — soft aqua blooms on an almost-white field (made for older eyes). */
const CALM_LIGHT: ShellPalette = { field: ['#F4FBFD', '#EFF8FB', '#EAF5F9'], logoTint: 'brand' };
const CALM_DARK: ShellPalette = { field: ['#0A1622', '#0A1824', '#0B1A26'], logoTint: 'light' };

const TABLE: Record<BgStyle, { light: ShellPalette; dark: ShellPalette }> = {
  gray: { light: GRAY_LIGHT, dark: GRAY_DARK },
  white: { light: WHITE_LIGHT, dark: WHITE_DARK },
  waves: { light: WAVES_LIGHT, dark: WAVES_DARK },
  calm: { light: CALM_LIGHT, dark: CALM_DARK },
};

export function shellPalette(style: BgStyle, dark: boolean): ShellPalette {
  return dark ? TABLE[style].dark : TABLE[style].light;
}

// v2.0.0 — Default corrected to flat gray (#E7EAEF); waves are now opt-in.
