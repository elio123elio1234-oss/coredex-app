/* ==================================================================
   i18n config — the LANGUAGE REGISTRY. This is the one file you edit to
   add a language, exactly as on the web (`CYPHIX_MEDICAL_WEB/src/i18n/
   config.ts`).

   ★ TO ADD A LANGUAGE (e.g. Arabic):
     1. `cp locales/en.ts locales/ar.ts` and translate the VALUES.
     2. Add `ar` to `LangCode`, a row to `LANG_META`, a line to
        `TRANSLATIONS`.
     Nothing else changes anywhere: the Settings picker is driven by
     `LANG_META`, so the new language appears in it on its own, and any
     key missing from the new file is a compile error rather than a blank
     label in front of a patient.
   ================================================================== */

import { en, type TranslationKey } from './locales/en';
import { he } from './locales/he';

export type LangCode = 'en' | 'he';
export type Direction = 'ltr' | 'rtl';

export interface LangMeta {
  dir: Direction;
  /** The language's name IN that language — never translated. */
  name: string;
}

export const LANG_META: Record<LangCode, LangMeta> = {
  en: { dir: 'ltr', name: 'English' },
  he: { dir: 'rtl', name: 'עברית' },
};

export const TRANSLATIONS: Record<LangCode, Record<TranslationKey, string>> = {
  en,
  he,
};

/** Same default as the web app, so a patient meets one CYPHIX. */
export const DEFAULT_LANG: LangCode = 'en';

/** Every registered code, in registry order — what the picker renders. */
export const LANG_CODES = Object.keys(LANG_META) as LangCode[];

/** Narrow untrusted input (a value read back from disk) to a real code. */
export function isLangCode(value: unknown): value is LangCode {
  return typeof value === 'string' && value in LANG_META;
}

export type { TranslationKey };

// v1.0.0 — Language registry + translation tables (en/he); add a language here.
