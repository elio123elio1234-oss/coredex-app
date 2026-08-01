/* ==================================================================
   preferencesSlice — the on-device settings the patient controls.

   The mobile twin of the web's PreferencesProvider + ThemeProvider +
   BackgroundProvider. Nothing here is clinical and nothing here is
   secret: it is appearance and what the phone is allowed to nag about,
   so it lives in plain storage (AsyncStorage). **Tokens do NOT belong
   here** — those stay in expo-secure-store (`services/api/tokenStore`).

   Persistence is deliberately fire-and-forget: a setting that resets on
   every launch is a broken setting, but a storage write that fails must
   never take the app down with it.
   ================================================================== */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_LANG, type LangCode } from '@/i18n/config';
import type { BgStyle } from '@/theme/shellTheme';
import { DEFAULT_BG } from '@/theme/shellTheme';

/** 'system' follows the OS appearance — the app's default, as on the web. */
export type ThemeChoice = 'system' | 'light' | 'dark';
/** Who a message reaches: a named clinician, or the clinic's triage queue. */
export type CareMode = 'clinician' | 'clinic';

export interface NotificationPrefs {
  testReminders: boolean;
  resultsReady: boolean;
  doctorMessages: boolean;
}

export interface PreferencesState {
  theme: ThemeChoice;
  background: BgStyle;
  notifications: NotificationPrefs;
  careMode: CareMode;
  /**
   * The app's language. It lives HERE rather than in its own store because
   * this slice is the one thing `PreferencesGate` reads back before the
   * first paint — a language on a separate async key would open the app in
   * English and repaint in Hebrew a frame later. See i18n/I18nProvider.
   */
  language: LangCode;
  /** False until the stored values have been read back — see `hydrate`. */
  loaded: boolean;
}

const initialState: PreferencesState = {
  theme: 'system',
  background: DEFAULT_BG,
  notifications: { testReminders: true, resultsReady: true, doctorMessages: true },
  careMode: 'clinician',
  language: DEFAULT_LANG,
  loaded: false,
};

const STORAGE_KEY = 'cyphix.preferences.v1';

const slice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    /** Replace the defaults with whatever was on disk (partial is fine). */
    hydrate(state, action: PayloadAction<Partial<PreferencesState>>) {
      return { ...state, ...action.payload, loaded: true };
    },
    setTheme(state, action: PayloadAction<ThemeChoice>) {
      state.theme = action.payload;
    },
    setBackground(state, action: PayloadAction<BgStyle>) {
      state.background = action.payload;
    },
    setNotification(
      state,
      action: PayloadAction<{ key: keyof NotificationPrefs; value: boolean }>,
    ) {
      state.notifications[action.payload.key] = action.payload.value;
    },
    setCareMode(state, action: PayloadAction<CareMode>) {
      state.careMode = action.payload;
    },
    setLanguage(state, action: PayloadAction<LangCode>) {
      state.language = action.payload;
    },
  },
});

export const { hydrate, setTheme, setBackground, setNotification, setCareMode, setLanguage } =
  slice.actions;
export default slice.reducer;

/* ── Storage, kept next to the slice that owns the shape ── */

/** Read the saved preferences. Resolves to `null` when there are none. */
export async function readPreferences(): Promise<Partial<PreferencesState> | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    const parsed: unknown = JSON.parse(raw);
    // Anything on disk is untrusted input — narrow, never cast blindly.
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as Partial<PreferencesState>;
  } catch {
    return null;
  }
}

/** Persist the current preferences. Never throws. */
export async function writePreferences(state: PreferencesState): Promise<void> {
  try {
    const { loaded: _loaded, ...persisted } = state;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // A device with no room left must still let the patient take a reading.
  }
}

// v1.1.0 — Adds `language`: it rides in the same pre-hydrated blob as the
//          theme so the app never opens in the wrong language for a frame.
