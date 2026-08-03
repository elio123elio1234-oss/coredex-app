/* ==================================================================
   The onboarding wizard, as pure data + pure functions: which step
   follows which, what has been typed so far, and whether a step is
   complete enough to continue.

   No React, no navigation, no storage — so the flow can be reasoned
   about (and, later, tested) without mounting a screen. The screen
   renders whatever `step` says and calls the actions below; every
   "should the Continue button be navy or grey" answer comes from here,
   never from a component.

   Ported from the reference flow's `STEPS` / `backTarget()` / `advance()`
   with the same ordering, because that ordering is the design.
   ================================================================== */

import {
  passwordStrength,
  isEmailShaped,
  MIN_PASSWORD_LENGTH,
  type AdministrativeGender,
  type BloodType,
  type RegistrationInput,
} from '@cyphix/shared';
import { AVATAR_TONES } from '@/theme/authTheme';

export type OnboardingStep =
  | 'welcome'
  | 'signin'
  | 'forgot'
  | 'signup'
  | 'phone'
  | 'otp'
  | 'sex'
  | 'height'
  | 'weight'
  | 'blood'
  | 'emergency'
  | 'photo'
  | 'review'
  | 'success';

/** The health steps, in order. They share a header (progress + Skip) and
    every one of them may be skipped — a patient who will not state their
    blood type must still be able to finish. */
export const PROFILE_STEPS = [
  'sex',
  'height',
  'weight',
  'blood',
  'emergency',
  'photo',
] as const satisfies readonly OnboardingStep[];

export type ProfileStep = (typeof PROFILE_STEPS)[number];

/** Every step in the order a patient meets them. Used ONLY to decide
    which way a transition should slide — going back must not look like
    going on. Not a navigation table: that is `BACK_MAP` + `advance`. */
export const STEP_ORDER: readonly OnboardingStep[] = [
  'welcome',
  'signin',
  'forgot',
  'signup',
  'phone',
  'otp',
  ...PROFILE_STEPS,
  'review',
  'success',
];

export function isProfileStep(step: OnboardingStep): step is ProfileStep {
  return (PROFILE_STEPS as readonly string[]).includes(step);
}

/** Where ← goes. Steps not listed fall back to their predecessor in
    PROFILE_STEPS, and the first of those returns to the OTP screen. */
const BACK_MAP: Partial<Record<OnboardingStep, OnboardingStep>> = {
  signin: 'welcome',
  forgot: 'signin',
  signup: 'welcome',
  phone: 'signup',
  otp: 'phone',
  sex: 'otp',
  review: 'photo',
};

export function backTarget(step: OnboardingStep): OnboardingStep {
  const mapped = BACK_MAP[step];
  if (mapped) return mapped;
  const i = PROFILE_STEPS.indexOf(step as ProfileStep);
  if (i > 0) return PROFILE_STEPS[i - 1];
  return 'welcome';
}

/** Country codes the number pad offers, tapped through in order.
    Israel first: this app ships Hebrew and its first patients are here. */
export const DIAL_CODES = ['+972', '+1', '+44', '+33', '+49'] as const;

export const RELATIONS = ['partner', 'parent', 'sibling', 'friend', 'doctor'] as const;
export type RelationKey = (typeof RELATIONS)[number];

export const OTP_LENGTH = 6;
export const PHONE_MAX_DIGITS = 11;
/** Below this the number cannot be a real one anywhere — the reference's
    own threshold for lighting up "Send code". */
export const PHONE_MIN_DIGITS = 6;

export const HEIGHT_RANGE = { min: 120, max: 215 } as const;
export const WEIGHT_RANGE = { min: 35, max: 180 } as const;

export type Units = 'metric' | 'imperial';

export interface OnboardingDraft {
  fullName: string;
  email: string;
  password: string;
  dialIndex: number;
  phone: string; // digits only
  otp: string;
  sex?: AdministrativeGender;
  units: Units;
  heightCm: number;
  weightKg: number;
  bloodType?: BloodType;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation?: RelationKey;
  photoUri?: string;
  avatarIndex: number;
  /** Steps the patient explicitly skipped — the review screen says so
      out loud rather than showing a blank and hoping. */
  skipped: ProfileStep[];
}

/* Defaults are the median adult, not zero: a slider that opens at 120 cm
   asks every patient to drag, and one that opens blank cannot render. */
export const EMPTY_DRAFT: OnboardingDraft = {
  fullName: '',
  email: '',
  password: '',
  dialIndex: 0,
  phone: '',
  otp: '',
  units: 'metric',
  heightCm: 174,
  weightKg: 72,
  emergencyName: '',
  emergencyPhone: '',
  avatarIndex: 1,
  skipped: [],
};

export type DraftPatch = Partial<Omit<OnboardingDraft, 'skipped'>>;

export type OnboardingAction =
  | { type: 'patch'; patch: DraftPatch }
  | { type: 'key'; field: 'phone' | 'otp'; value: string }
  | { type: 'skip'; step: ProfileStep }
  | { type: 'unskip'; step: ProfileStep }
  | { type: 'reset' };

/** A keypad press. `del` removes the last digit; anything else appends
    until the field is full — the pad cannot produce an invalid value. */
function applyKey(current: string, value: string, max: number): string {
  if (value === 'del') return current.slice(0, -1);
  if (current.length >= max) return current;
  return current + value;
}

export function onboardingReducer(
  state: OnboardingDraft,
  action: OnboardingAction,
): OnboardingDraft {
  switch (action.type) {
    case 'patch': {
      const next = { ...state, ...action.patch };
      /* Filling in a step un-skips it: the review screen must not keep
         calling a value "skipped" while showing it. */
      return next;
    }
    case 'key': {
      const max = action.field === 'otp' ? OTP_LENGTH : PHONE_MAX_DIGITS;
      return { ...state, [action.field]: applyKey(state[action.field], action.value, max) };
    }
    case 'skip':
      return state.skipped.includes(action.step)
        ? state
        : { ...state, skipped: [...state.skipped, action.step] };
    case 'unskip':
      return state.skipped.includes(action.step)
        ? { ...state, skipped: state.skipped.filter((s) => s !== action.step) }
        : state;
    case 'reset':
      return EMPTY_DRAFT;
    default:
      return state;
  }
}

/* ── Formatting helpers (pure) ─────────────────────────────────────── */

/** Group a national number in pairs, as the reference does. Deliberately
    country-agnostic: this is a legibility aid while typing, not a
    validator, and a wrong per-country grouping is worse than none. */
export function formatPhoneDigits(digits: string): string {
  return digits
    .replace(/(\d{1,2})(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})/, (_m, ...groups: string[]) =>
      groups.slice(0, 5).filter(Boolean).join(' '),
    )
    .trim();
}

export function fullPhone(draft: OnboardingDraft): string {
  return `${DIAL_CODES[draft.dialIndex]} ${formatPhoneDigits(draft.phone)}`.trim();
}

/** cm → the feet/inches the imperial toggle shows. */
export function heightImperial(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / 2.54);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function weightImperial(kg: number): number {
  return Math.round(kg * 2.2046);
}

/* ── "May the Continue button be pressed?" ─────────────────────────── */

export function canContinue(step: OnboardingStep, draft: OnboardingDraft): boolean {
  switch (step) {
    case 'signin':
      return isEmailShaped(draft.email) && draft.password.length > 0;
    case 'forgot':
      return isEmailShaped(draft.email);
    case 'signup':
      return (
        draft.fullName.trim().length > 1 &&
        isEmailShaped(draft.email) &&
        draft.password.length >= MIN_PASSWORD_LENGTH
      );
    case 'phone':
      return draft.phone.length >= PHONE_MIN_DIGITS;
    case 'otp':
      return draft.otp.length === OTP_LENGTH;
    case 'sex':
      return draft.sex !== undefined;
    case 'emergency':
      /* A name with no number cannot be called. Both, or neither and Skip. */
      return draft.emergencyName.trim().length > 0 && draft.emergencyPhone.trim().length >= 5;
    /* Height, weight, blood and photo always have a value (a default, a
       chosen avatar, or an explicit "unknown"), so their button is live
       from the first frame. */
    default:
      return true;
  }
}

export const passwordScore = passwordStrength;

/** What the review screen lists, and what registration finally sends. */
export function toRegistrationInput(draft: OnboardingDraft): RegistrationInput {
  const skipped = new Set<ProfileStep>(draft.skipped);
  return {
    fullName: draft.fullName.trim(),
    email: draft.email.trim(),
    password: draft.password,
    phone: draft.phone ? fullPhone(draft) : undefined,
    sex: skipped.has('sex') ? undefined : draft.sex,
    heightCm: skipped.has('height') ? undefined : draft.heightCm,
    weightKg: skipped.has('weight') ? undefined : draft.weightKg,
    bloodType: skipped.has('blood') ? undefined : draft.bloodType,
    emergencyName: skipped.has('emergency') ? undefined : draft.emergencyName.trim() || undefined,
    emergencyPhone: skipped.has('emergency') ? undefined : draft.emergencyPhone.trim() || undefined,
    emergencyRelation: skipped.has('emergency') ? undefined : draft.emergencyRelation,
    photoUri: draft.photoUri,
    avatarTone: AVATAR_TONES[draft.avatarIndex % AVATAR_TONES.length],
  };
}

/** Which optional details are still missing, for the review screen's
    one-line summary. Height and weight are never listed: they always
    carry a value, even when it is the default. */
export function profileGaps(draft: OnboardingDraft): ProfileStep[] {
  const gaps: ProfileStep[] = [];
  if (!draft.sex || draft.skipped.includes('sex')) gaps.push('sex');
  if (!draft.bloodType || draft.skipped.includes('blood')) gaps.push('blood');
  if (!draft.emergencyPhone.trim() || draft.skipped.includes('emergency')) gaps.push('emergency');
  return gaps;
}

/** Initials for the avatar bubble. Two letters, upper case, and never
    fewer than one — an empty circle looks like a failed image load. */
export function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  return parts
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// v1.0.0 — The onboarding wizard as pure state: step order, draft, gating.
