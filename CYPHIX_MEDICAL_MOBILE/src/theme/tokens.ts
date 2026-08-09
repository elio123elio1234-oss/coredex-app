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
  /**
   * ★ The ECG ID's own colour: a deep continuous-monitor GREEN.
   *
   * Two attempts got here. It was `accentLive` (#2F6BD8) — a token that
   * means "live", i.e. a generic UI blue doing a job it was never chosen
   * for. Then teal, which was worse in a more interesting way: teal reads
   * as an APP, and green reads as an INSTRUMENT. Every continuous glucose
   * monitor on the market is green for the same reason.
   *
   * ── Why there are two weights ──
   * A green vivid enough to be worth having is around 2.6:1 on white,
   * which is fine for a 0.22 mm trace and unreadable as 12 px type. Rather
   * than darken the whole thing until it is olive — the mistake that made
   * `attention` brown — the MARK and the TYPE are separate tokens.
   *   `signal`     strokes, bars, arcs, notches, dots.
   *   `signalInk`  anything that is words.
   *
   * `accentLive` is deliberately untouched: repainting it would change the
   * report, the viewer and the status dot, none of which anyone asked for.
   */
  signal: string;
  signalInk: string;
  signalSoft: string;
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
  /* ★ A clean GOLD, not the amber-700 brown it was.
     #B45309 was picked to clear 4.5:1 as body text on white — and any
     amber dark enough to do that is brown. The fix is structural rather
     than chromatic: attention text is now drawn in the ordinary text
     colours and this token is only ever a STROKE, a BORDER or a soft
     FILL, so it is free to be the colour it should have been. */
  attention: '#D99A2B',
  attentionSoft: 'rgba(217, 154, 43, 0.13)',
  signal: '#00A862',
  signalInk: '#00764B',
  signalSoft: 'rgba(0, 168, 98, 0.12)',
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
  attention: '#F0B84A',
  attentionSoft: 'rgba(240, 184, 74, 0.16)',
  /* On near-black the green can be the bright one, and type does not need
     a darker weight — so both point at the same value rather than
     inventing a difference the background does not require. */
  signal: '#3DDC84',
  signalInk: '#4EE79A',
  signalSoft: 'rgba(61, 220, 132, 0.16)',
};

export const RADIUS = { lg: 20, md: 12, sm: 8 } as const;

// v0.4.0 — `teal` → `signal` / `signalInk` / `signalSoft`: a deep
//          continuous-monitor GREEN. Teal read as an app; green reads as an
//          instrument, which is why every CGM on the market is green. Two
//          weights because a green vivid enough to be worth having is ~2.6:1 on
//          white — fine for a 0.22 mm trace, unreadable as 12 px type — and
//          darkening one token until it served both is exactly what made
//          `attention` brown.
// v0.3.0 — Adds `teal` (the brand's own, from authTheme) for the ECG ID, which
//          was drawn in `accentLive` — a generic UI blue meaning "live", doing
//          a job it was never chosen for. `attention` became a clean gold
//          rather than the amber-700 brown: it is now only ever a stroke, a
//          border or a soft fill, so it no longer has to clear body-text
//          contrast on white, which is what forced it brown.
// v0.2.0 — Adds `attention` (amber): "worth a look", which is a different
//          statement from `danger` (red = alarm, act now). Insights paints every
//          deviation with it — a difference from your own baseline is a
//          measurement, and colouring it red interprets it.
// v0.1.0 — Brand tokens ported 1:1 from web tokens.css (light + dark).
