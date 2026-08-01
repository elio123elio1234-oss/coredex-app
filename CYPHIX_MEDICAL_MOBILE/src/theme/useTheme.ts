/* Theme hook — follows the OS appearance (userInterfaceStyle: automatic). */

import { useColorScheme } from 'react-native';
import { DARK, LIGHT, type ThemeTokens } from './tokens';

export function useTheme(): ThemeTokens {
  return useColorScheme() === 'dark' ? DARK : LIGHT;
}

// v0.1.0 — OS-driven light/dark token selection.
