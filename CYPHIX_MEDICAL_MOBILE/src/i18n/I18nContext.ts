/* ==================================================================
   i18n context definition — kept in its own file so the provider and the
   hook split cleanly (same layout as the web app).
   ================================================================== */

import { createContext } from 'react';
import type { Direction, LangCode, TranslationKey } from './config';

/** Values substituted into `{placeholders}` inside a translation string. */
export type TranslationParams = Record<string, string | number>;

export interface I18nContextValue {
  lang: LangCode;
  dir: Direction;
  /** `dir === 'rtl'`, precomputed because layouts test it every render. */
  rtl: boolean;
  setLang: (lang: LangCode) => void;
  /** Translate a key; `{name}` placeholders are replaced from `params`. */
  t: (key: TranslationKey, params?: TranslationParams) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

// v1.0.0 — I18n React context (adds `rtl` over the web's shape).
