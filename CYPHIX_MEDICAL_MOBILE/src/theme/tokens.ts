/* ==================================================================
   Design tokens — ported from CYPHIX_MEDICAL_WEB/src/styles/tokens.css.
   Same brand values (taken from the wordmark, not invented): #0D2041
   CYPHIX lettering, #0A2540 the mark, #7A829E "MEDICAL".
   Typography intentionally differs from web: mobile uses the SYSTEM
   font (San Francisco / Roboto) per root CLAUDE.md §3.1.
   ================================================================== */

export interface ThemeTokens {
  bg: string;
  bgSoft: string;
  surface: string;
  surfaceHover: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  brandNavy: string;
  brandDeep: string;
  brandSlate: string;
  accent: string;
  accentSoft: string;
  accentLive: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  /**
   * ★ ATTENTION — "worth a look", which is NOT what `danger` means.
   *
   * `danger` is red, and red on a medical device means alarm: something is
   * wrong, act now. It is the right colour for a failed save or a delete
   * confirmation, and the wrong one for "this study differs from your
   * usual". Reported from the phone as exactly that — the red made people
   * tense before they had read what it referred to, and what it referred
   * to was a measurement, not a verdict.
   *
   * It is also a rule violation dressed as styling: the analysis layer is
   * forbidden from interpreting (`ecgAnalysis.ts`), and painting a
   * difference red interprets it — in the one direction we may not go.
   *
   * Amber carries "look at this" without carrying "this is bad". Use it
   * for every deviation, flag and outlier in Insights. `danger` stays for
   * destructive actions and genuine failures.
   */
  attention: string;
  attentionSoft: string;
}

export const LIGHT: ThemeTokens = {
  bg: '#F3F4F6',
  bgSoft: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceHover: '#F1F5F9',
  border: '#E5E7EB',
  textPrimary: '#0A2540',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  brandNavy: '#0D2041',
  brandDeep: '#0A2540',
  brandSlate: '#7A829E',
  accent: '#0D2041',
  accentSoft: 'rgba(13, 32, 65, 0.07)',
  accentLive: '#2F6BD8',
  success: '#22A45D',
  successSoft: 'rgba(34, 164, 93, 0.12)',
  danger: '#E5342A',
  dangerSoft: 'rgba(229, 52, 42, 0.10)',
  // amber-700: dark enough to pass contrast on white as body text.
  attention: '#B45309',
  attentionSoft: 'rgba(180, 83, 9, 0.10)',
};

export const DARK: ThemeTokens = {
  bg: '#0A0F1A',
  bgSoft: '#0D1424',
  surface: '#131B2C',
  surfaceHover: '#1B2540',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#5B6B85',
  brandNavy: '#9FB4D8',
  brandDeep: '#C3D2EA',
  brandSlate: '#8E97AE',
  accent: '#9FB4D8',
  accentSoft: 'rgba(159, 180, 216, 0.14)',
  accentLive: '#6C9BEE',
  success: '#34D399',
  successSoft: 'rgba(52, 211, 153, 0.14)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.14)',
  // amber-400: the dark theme needs a LIGHTER amber, not the same one —
  // #B45309 on #131B2C is barely legible.
  attention: '#F5B544',
  attentionSoft: 'rgba(245, 181, 68, 0.14)',
};

export const RADIUS = { lg: 20, md: 12, sm: 8 } as const;

// v0.2.0 — Adds `attention` (amber): "worth a look", which is a different
//          statement from `danger` (red = alarm, act now). Insights paints every
//          deviation with it — a difference from your own baseline is a
//          measurement, and colouring it red interprets it.
// v0.1.0 — Brand tokens ported 1:1 from web tokens.css (light + dark).
