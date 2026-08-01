/* ==================================================================
   usePreferences — the one way a screen reads or changes a preference.

   Mirrors the web `usePreferences` hook: components never touch the
   slice or storage themselves, they call this (CLAUDE.md §3.2).
   ================================================================== */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { BgStyle } from '@/theme/shellTheme';
import {
  setBackground,
  setCareMode,
  setNotification,
  setTheme,
  type CareMode,
  type NotificationPrefs,
  type PreferencesState,
  type ThemeChoice,
} from './preferencesSlice';

export interface UsePreferences {
  prefs: PreferencesState;
  setTheme: (v: ThemeChoice) => void;
  setBackground: (v: BgStyle) => void;
  setNotification: (key: keyof NotificationPrefs, value: boolean) => void;
  setCareMode: (v: CareMode) => void;
}

export function usePreferences(): UsePreferences {
  const dispatch = useAppDispatch();
  const prefs = useAppSelector((s) => s.preferences);

  return {
    prefs,
    setTheme: useCallback((v: ThemeChoice) => void dispatch(setTheme(v)), [dispatch]),
    setBackground: useCallback((v: BgStyle) => void dispatch(setBackground(v)), [dispatch]),
    setNotification: useCallback(
      (key: keyof NotificationPrefs, value: boolean) =>
        void dispatch(setNotification({ key, value })),
      [dispatch],
    ),
    setCareMode: useCallback((v: CareMode) => void dispatch(setCareMode(v)), [dispatch]),
  };
}

// v1.0.0 — Preference read/write hook (the only door into the slice).
