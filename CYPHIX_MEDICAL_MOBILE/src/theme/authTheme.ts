/* ==================================================================
   Onboarding palette + type scale — the numbers from the CYPHIX
   Onboarding design reference, in ONE place so no step re-invents them.

   ── Why this is not just `tokens.ts` ──
   The signed-out flow is its own visual world: a navy hero, a teal
   accent for anything optional, and a page that is white rather than the
   app's grey shell. `tokens.ts` describes the SIGNED-IN app and does not
   contain teal at all. Rather than bend the app's tokens (which ~30 files
   read) to a screen the patient sees once, the reference's values live
   here and nowhere else.

   ── Fonts ──
   The reference sets IBM Plex Mono on every label, digit and keycap. We
   do not ship a webfont: root CLAUDE.md §3.1 says mobile uses the SYSTEM
   font (San Francisco / Roboto). What carries across is the TREATMENT —
   uppercase, wide tracking, small — plus `tabular-nums` wherever digits
   change in place (the height/weight readouts, the OTP boxes, the
   keypad), so a changing number never shifts the layout under a thumb.
   The divergence is recorded in PARITY.md.
   ================================================================== */

import { Platform, type TextStyle } from 'react-native';

export interface AuthPalette {
  /** Page behind every light step. */
  page: string;
  /** The navy the brand is: hero panel, primary button, headings. */
  navy: string;
  /** Bottom stop of the welcome hero's gradient. */
  navyDeep: string;
  /** Teal — links, "Skip", anything the patient may decline. */
  teal: string;
  tealSoft: string;
  tealSoftBorder: string;
  /** Hairline around inputs, cards and secondary buttons. */
  border: string;
  /** Resting input background (goes to `page` white on focus). */
  field: string;
  /** Background of a chosen option. */
  selected: string;
  /** Keypad key, unit-toggle track. */
  key: string;
  keyPressed: string;
  /** 4 px progress/strength track. */
  track: string;
  /** "Enter a number manually" — a dashed invitation, not a button. */
  dashed: string;
  heading: string;
  body: string;
  /** Small uppercase labels. */
  label: string;
  /** A disabled primary button, and a value that was skipped. */
  muted: string;
  placeholder: string;
  onNavy: string;
  onNavySoft: string;
  onNavyFaint: string;
  /** Password meter, weakest → strongest. */
  weak: string;
  fair: string;
  strong: string;
}

const LIGHT: AuthPalette = {
  page: '#FFFFFF',
  navy: '#0D2041',
  navyDeep: '#16305C',
  teal: '#0AA3B2',
  tealSoft: '#E6F6F8',
  tealSoftBorder: '#BEE6EB',
  border: '#E4E8EF',
  field: '#FBFCFD',
  selected: '#F3F6FA',
  key: '#F6F7F9',
  keyPressed: '#E9ECF1',
  track: '#EDEFF3',
  dashed: '#C9D1DC',
  heading: '#0D2041',
  body: '#6B7A90',
  label: '#8994A6',
  muted: '#B3BCC9',
  placeholder: '#9AA6B8',
  onNavy: '#FFFFFF',
  onNavySoft: 'rgba(255,255,255,0.62)',
  onNavyFaint: 'rgba(255,255,255,0.42)',
  weak: '#E2725B',
  fair: '#D9A441',
  strong: '#0AA3B2',
};

/* Dark is a translation of the same design, not a second design: the navy
   surfaces stay navy (they are the brand, and they already read as dark),
   the white page becomes the app's dark surface, and every hairline is
   lifted off it. The reference is light-only — this exists because the
   app has a theme switch and a flash of white at 2 a.m. is a real
   complaint, not because the design asked for it. */
const DARK: AuthPalette = {
  page: '#0A0F1A',
  navy: '#0D2041',
  navyDeep: '#16305C',
  teal: '#2FC4D2',
  tealSoft: 'rgba(47,196,210,0.12)',
  tealSoftBorder: 'rgba(47,196,210,0.32)',
  border: 'rgba(255,255,255,0.10)',
  field: '#111A2B',
  selected: '#16233A',
  key: '#141D2E',
  keyPressed: '#1D2942',
  track: 'rgba(255,255,255,0.10)',
  dashed: 'rgba(255,255,255,0.22)',
  heading: '#F1F5F9',
  body: '#94A3B8',
  label: '#7A879C',
  muted: '#3F4B60',
  placeholder: '#5B6B85',
  onNavy: '#FFFFFF',
  onNavySoft: 'rgba(255,255,255,0.62)',
  onNavyFaint: 'rgba(255,255,255,0.42)',
  weak: '#E2725B',
  fair: '#D9A441',
  strong: '#2FC4D2',
};

export function authPalette(dark: boolean): AuthPalette {
  return dark ? DARK : LIGHT;
}

/** Avatar tones — the reference's six, in its order. Also the tones the
    initials bubble falls back to when there is no photo. */
export const AVATAR_TONES = [
  '#0D2041',
  '#0AA3B2',
  '#4C6EA8',
  '#7A5AA6',
  '#C2703D',
  '#3E8E6E',
] as const;

/** Shared metrics. Named because three steps reuse each of them and a
    54 pt button next to a 52 pt one is the kind of drift nobody reports
    but everybody feels. */
export const AUTH_METRICS = {
  gutter: 24,
  primaryHeight: 54,
  secondaryHeight: 52,
  fieldHeight: 52,
  radius: 14,
  fieldRadius: 13,
  backSize: 38,
  keyHeight: 56,
  otpHeight: 60,
} as const;

/** The reference's `IBM Plex Mono` label: 10.5 px, `.1em` tracking, caps.
    Tracking is absolute in RN, so `.1em × 10.5` ≈ 1.05. */
export const LABEL_TYPE: TextStyle = {
  fontSize: 10.5,
  fontWeight: '600',
  letterSpacing: 1.05,
};

/** Digits that change in place. `tabular-nums` is the whole point. */
export const NUMERIC_TYPE: TextStyle = {
  fontVariant: ['tabular-nums'],
  /* iOS tracks digits a touch loose at display sizes; Android does not. */
  letterSpacing: Platform.OS === 'ios' ? -0.5 : 0,
};

// v1.0.0 — Palette, metrics and type treatment from the onboarding reference.
