/* ==================================================================
   I18nProvider — owns the active language and exposes t()/setLang.

   ══ WHERE THE CHOICE IS STORED, AND WHY NOT localStorage ══
   The web provider reads/writes `localStorage` synchronously. Every
   equivalent on a phone (AsyncStorage, SecureStore) is ASYNC, so reading
   the language during the first render is impossible: the app would open
   in English and repaint in Hebrew a frame later — the same class of bug
   as the theme flash that `PreferencesGate` exists to prevent.

   So the language lives in the preferences slice, which `PreferencesGate`
   already hydrates from disk BEFORE the first paint. One gate, one write
   path, no flash. `LANG_STORAGE_KEY` therefore has no mobile twin — the
   value rides inside `cyphix.preferences.v1`.

   ══ WHAT `dir` DOES AND DOES NOT DO HERE ══
   On the web the provider sets `document.documentElement.dir` and the
   whole layout mirrors itself. React Native has no such switch: real
   mirroring is `I18nManager.forceRTL()`, which is PROCESS-WIDE and only
   takes effect after the app is relaunched — flipping it under a patient
   mid-session is not something this provider will do silently.

   What we do instead is expose `rtl` and let each layout use it for text
   alignment and row direction. That is honest and it works today. Full
   native mirroring is tracked as `pending` in PARITY.md; when it lands it
   belongs behind a deliberate "restart to apply" flow, not here.
   ================================================================== */

import { useCallback, useMemo, type ReactNode } from 'react';
import {
  DEFAULT_LANG,
  LANG_META,
  TRANSLATIONS,
  isLangCode,
  type LangCode,
  type TranslationKey,
} from './config';
import {
  I18nContext,
  type I18nContextValue,
  type TranslationParams,
} from './I18nContext';
import { usePreferences } from '@/features/preferences/usePreferences';

export function I18nProvider({ children }: { children: ReactNode }) {
  const { prefs, setLanguage } = usePreferences();
  /* Anything that came off disk is untrusted: an unregistered code (a
     language removed in a later build) falls back rather than crashing. */
  const lang: LangCode = isLangCode(prefs.language) ? prefs.language : DEFAULT_LANG;

  const setLang = useCallback(
    (next: LangCode) => setLanguage(isLangCode(next) ? next : DEFAULT_LANG),
    [setLanguage],
  );

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams): string => {
      const raw = TRANSLATIONS[lang][key] ?? TRANSLATIONS[DEFAULT_LANG][key] ?? key;
      if (!params) return raw;
      /* Replace {placeholders}; an unknown one is left visible so a missing
         param shows up in QA instead of silently blanking a sentence. */
      return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
        params[name] != null ? String(params[name]) : match,
      );
    },
    [lang],
  );

  const value = useMemo<I18nContextValue>(() => {
    const dir = LANG_META[lang].dir;
    return { lang, dir, rtl: dir === 'rtl', setLang, t };
  }, [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// v1.0.0 — Language provider backed by the (pre-hydrated) preferences slice.
