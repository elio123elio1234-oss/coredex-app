/* App — composition root: gesture handler, safe areas, Redux, the
   app-lifetime BLE client, navigation. No business logic here. */

import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { AuthGate } from '@/features/auth/AuthGate';
import { BleProvider } from '@/features/ble/BleProvider';
import { PreferencesGate } from '@/features/preferences/PreferencesGate';
import { I18nProvider } from '@/i18n/I18nProvider';
import { preloadAppImages } from '@/services/media/imagePreload';
import { store } from '@/store/store';
import RootNavigator from '@/navigation/RootNavigator';

/* ★ Module scope, on purpose — the one side effect allowed in this file.
   Every photograph the app ships is fetched and decoded starting HERE,
   before the first render, so the work happens while `PreferencesGate`
   is reading storage and the splash is holding. Put it in a component
   and it starts one gate too late; put it in the screen that draws the
   image and it starts while the patient is already looking at it, which
   is the bug this exists to close (services/media/imagePreload.ts).
   Nothing waits for it: it returns immediately. */
preloadAppImages();

export default function App() {
  /* No orientation call here. `app.json` allows every orientation so the exam
     CAN go landscape, and each route declares what it wants in RootNavigator —
     locking imperatively from an effect is what made the exam flicker. */
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Provider store={store}>
          {/* Saved preferences are read BEFORE the first paint, so the app
              never opens light and repaints dark a frame later. */}
          <PreferencesGate>
            {/* INSIDE the gate on purpose: the language is one of the
                preferences it hydrates, so by the time this mounts the
                stored choice is already in the store and the first paint
                is in the right language. */}
            <I18nProvider>
              {/* One BleClient above the navigator: a connection must survive
                  navigating from Home into the exam, and the ring buffer must
                  not reset mid-recording. */}
              <BleProvider>
                <StatusBar style="auto" />
                {/* The signed-out flow stands in FRONT of the navigator,
                    not inside it: the splash, the sign-in and the
                    registration wizard have no tabs, no dock and no
                    routes of their own, and the app behind them must not
                    mount until there is an account to mount it for. */}
                <AuthGate>
                  <RootNavigator />
                </AuthGate>
              </BleProvider>
            </I18nProvider>
          </PreferencesGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

// v2.5.0 — Starts the bundled-image warm-up at module scope, before the first
//          render, so no photograph is first asked for on the screen showing it.
// v2.4.0 — Adds the AuthGate around the navigator: splash → onboarding → app.
// v2.3.0 — Adds I18nProvider inside the preference gate, so the first paint is
//          already in the patient's stored language.
