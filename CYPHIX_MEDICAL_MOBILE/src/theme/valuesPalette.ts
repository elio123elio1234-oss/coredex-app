/* ==================================================================
   valuesPalette — the colour field of the redesigned VALUES tab.

   ══ WHY THIS IS NOT IN `tokens.ts` ══
   `tokens.ts` is the BRAND: navy, one accent, one danger, and a hard rule
   that a measurement is never painted as a verdict. Those tokens describe
   chrome — a surface, a border, a line of body text — and they are shared
   by the report, the viewer and every list in the app.

   This file describes ONE SCREEN's material: translucent cards over a
   coloured glow, with a hue per section so that rate, intervals, axis,
   amplitudes and quality are told apart before a word is read. Values are
   taken from the design handoff ("מסך Values מעוצב מחדש") rather than
   invented, and both its palettes are carried across so the screen reads
   correctly in light and dark.

   ★ THE ONE RULE THAT SURVIVES THE REPAINT.
   Colour here is SECTIONING, never grading. Amber marks the rhythm tile
   because the rhythm section is amber — not because "slightly variable"
   is worse than "regular". Nothing on this screen may take its colour
   from whether a measurement is inside or outside a reference band; that
   would be an interpretation, and `ecgAnalysis.ts` is forbidden from
   making one (root CLAUDE.md §2.3). The reference bands are drawn as
   CONTEXT and captioned as such, exactly as on a hospital ECG form.

   Gradients are arrays because RN's `LinearGradient` takes stops, not a
   CSS string; the CSS `150deg` of the handoff is expressed once, in
   `ValueSurface`, so no caller has to convert an angle.
   ================================================================== */

import { useIsDark } from '@/theme/useTheme';

/** One radial glow of the background field. Units are fractions of the box. */
export interface Glow {
  cx: string;
  cy: string;
  rx: string;
  ry: string;
  color: string;
  opacity: number;
}

export interface ValuesPalette {
  /* Type */
  txt: string;
  muted: string;
  dim: string;
  faint: string;

  /* Rules and tracks */
  hair: string;
  track: string;
  bar: string;

  /* Surfaces */
  cardBg: [string, string];
  cardBd: string;
  tile: [string, string];
  chip: string;

  /* Accents, one per section */
  red: string;
  redTile: [string, string];
  amber: string;
  amberChip: string;
  amberBd: string;
  amberTile: [string, string];
  blue: string;
  blueGrad: [string, string];
  band: string;
  violet: string;
  violetCard: [string, string];
  violetFill: string;
  grid1: string;
  grid2: string;
  mint: string;
  mintCard: [string, string];
  mintGlow: string;

  /* The one call to action */
  ctaBg: [string, string, string];
  ctaBd: string;

  /** The background field the cards float on. */
  glows: Glow[];
}

const DARK_VALUES: ValuesPalette = {
  txt: '#F3F5FA',
  muted: 'rgba(243,245,250,0.62)',
  dim: 'rgba(243,245,250,0.46)',
  faint: 'rgba(243,245,250,0.32)',

  hair: 'rgba(255,255,255,0.10)',
  track: 'rgba(255,255,255,0.10)',
  bar: 'rgba(255,255,255,0.28)',

  cardBg: ['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.05)'],
  cardBd: 'rgba(255,255,255,0.13)',
  tile: ['rgba(255,255,255,0.11)', 'rgba(255,255,255,0.04)'],
  chip: 'rgba(255,255,255,0.08)',

  red: '#FF6F89',
  redTile: ['rgba(255,77,106,0.22)', 'rgba(255,255,255,0.05)'],
  amber: '#FFC978',
  amberChip: 'rgba(255,182,72,0.16)',
  amberBd: 'rgba(255,182,72,0.22)',
  amberTile: ['rgba(255,182,72,0.18)', 'rgba(255,255,255,0.04)'],
  blue: '#4DA3FF',
  blueGrad: ['#4DA3FF', '#7FD8FF'],
  band: 'rgba(77,163,255,0.24)',
  violet: '#B18CFF',
  violetCard: ['rgba(177,140,255,0.16)', 'rgba(255,255,255,0.04)'],
  violetFill: 'rgba(177,140,255,0.16)',
  grid1: 'rgba(255,255,255,0.14)',
  grid2: 'rgba(255,255,255,0.09)',
  mint: '#34E0A1',
  mintCard: ['rgba(52,224,161,0.14)', 'rgba(255,255,255,0.04)'],
  mintGlow: 'rgba(52,224,161,0.34)',

  ctaBg: ['#FF4D6A', '#B18CFF', '#4DA3FF'],
  ctaBd: 'rgba(255,255,255,0.20)',

  glows: [
    { cx: '12%', cy: '-4%', rx: '107%', ry: '35%', color: '#FF4D6A', opacity: 0.3 },
    { cx: '108%', cy: '22%', rx: '117%', ry: '40%', color: '#4DA3FF', opacity: 0.26 },
    { cx: '40%', cy: '108%', rx: '132%', ry: '49%', color: '#B18CFF', opacity: 0.2 },
  ],
};

const LIGHT_VALUES: ValuesPalette = {
  txt: '#13161F',
  muted: 'rgba(19,22,31,0.60)',
  dim: 'rgba(19,22,31,0.46)',
  faint: 'rgba(19,22,31,0.34)',

  hair: 'rgba(19,22,31,0.09)',
  track: 'rgba(19,22,31,0.08)',
  bar: 'rgba(19,22,31,0.22)',

  cardBg: ['rgba(255,255,255,0.82)', 'rgba(255,255,255,0.58)'],
  cardBd: 'rgba(255,255,255,0.75)',
  tile: ['rgba(255,255,255,0.78)', 'rgba(255,255,255,0.50)'],
  chip: 'rgba(19,22,31,0.05)',

  red: '#E0325B',
  redTile: ['rgba(224,50,91,0.14)', 'rgba(255,255,255,0.62)'],
  amber: '#B26A00',
  amberChip: 'rgba(214,138,20,0.14)',
  amberBd: 'rgba(214,138,20,0.24)',
  amberTile: ['rgba(214,138,20,0.14)', 'rgba(255,255,255,0.60)'],
  blue: '#0A6FF0',
  blueGrad: ['#0A6FF0', '#59B4FF'],
  band: 'rgba(10,111,240,0.18)',
  violet: '#6F45E0',
  violetCard: ['rgba(111,69,224,0.12)', 'rgba(255,255,255,0.60)'],
  violetFill: 'rgba(111,69,224,0.13)',
  grid1: 'rgba(19,22,31,0.16)',
  grid2: 'rgba(19,22,31,0.10)',
  mint: '#00A173',
  mintCard: ['rgba(0,161,115,0.12)', 'rgba(255,255,255,0.60)'],
  mintGlow: 'rgba(0,161,115,0.22)',

  ctaBg: ['#E0325B', '#6F45E0', '#0A6FF0'],
  ctaBd: 'rgba(255,255,255,0.40)',

  glows: [
    { cx: '12%', cy: '-4%', rx: '107%', ry: '35%', color: '#FF7891', opacity: 0.3 },
    { cx: '108%', cy: '22%', rx: '117%', ry: '40%', color: '#78AAFF', opacity: 0.32 },
    { cx: '40%', cy: '108%', rx: '132%', ry: '49%', color: '#BEA5FF', opacity: 0.3 },
  ],
};

/** Follows the SAME resolved light/dark decision as every other token. */
export function useValuesPalette(): ValuesPalette {
  return useIsDark() ? DARK_VALUES : LIGHT_VALUES;
}

/** Corner radii the handoff uses, named so the screen never hard-codes one. */
export const VALUE_RADIUS = { card: 26, hero: 30, tile: 22, chip: 999, small: 18 } as const;

// v0.59.0 — The Values tab's own material, from the design handoff. Colour
//           here sections the screen; it never grades a measurement.
