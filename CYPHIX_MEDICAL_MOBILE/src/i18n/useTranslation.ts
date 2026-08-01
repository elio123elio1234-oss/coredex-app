/* ==================================================================
   useTranslation — the ONE way any component reads copy.
   Identical surface to the web hook, so a component ports across
   platforms without its text handling changing at all.

   ★ NAMING, because it differs from the web on purpose: this app already
   binds `t` to the THEME tokens in ~30 files (`const t = useTheme()`), so
   screens here destructure the translator as `const { t: tr } = …` and
   call `tr('key')`. Renaming the theme instead would have touched every
   file in the app to save one character in the new ones. A pasted web
   `t('key')` fails to compile rather than doing something surprising.
   ================================================================== */

import { useContext } from 'react';
import { I18nContext, type I18nContextValue } from './I18nContext';

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within <I18nProvider>.');
  return ctx;
}

// v1.0.0 — Translation hook.
