/* ==================================================================
   Theme hooks — the resolved light/dark decision, in ONE place.

   `useIsDark()` IS that decision: the patient's stored choice, falling
   back to the OS appearance when it is 'system' (the default, and what
   `userInterfaceStyle: automatic` in app.json advertises).

   Every screen that used to ask `useColorScheme() === 'dark'` directly
   must ask this instead — otherwise the Settings toggle repaints the
   tokens while the backdrop, the navigator theme and the ECG paper stay
   on the OS setting, and the app ends up half dark.
   ================================================================== */

import { useColorScheme } from 'react-native';
import { useAppSelector } from '@/store/hooks';
import { DARK, LIGHT, type ThemeTokens } from './tokens';

export function useIsDark(): boolean {
  const os = useColorScheme();
  const choice = useAppSelector((s) => s.preferences.theme);
  if (choice === 'dark') return true;
  if (choice === 'light') return false;
  return os === 'dark';
}

export function useTheme(): ThemeTokens {
  return useIsDark() ? DARK : LIGHT;
}

// v1.0.0 — Theme follows the stored preference, falling back to the OS.
