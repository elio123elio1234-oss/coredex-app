/* App — composition root: gesture handler, safe areas, Redux, the
   app-lifetime BLE client, navigation. No business logic here. */

import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { OverlayPortalHost } from '@/components/atoms/OverlayPortal';
import { AuthGate } from '@/features/auth/AuthGate';
import { BleProvider } from '@/features/ble/BleProvider';
import { PreferencesGate } from '@/features/preferences/PreferencesGate';
import { SyncProvider } from '@/features/sync/SyncProvider';
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
                  {/* INSIDE the gate: every question the sync engine asks
                      is scoped to an account, so it must not exist before
                      there is one. It renders nothing — it decides when
                      the device asks the server what changed. */}
                  <SyncProvider>
                    <RootNavigator />
                  </SyncProvider>
                </AuthGate>
                {/* ★ LAST, and that is the whole point. Sheets and dialogs
                    render HERE rather than inside the screen that opens
                    them, because a screen cannot paint above the floating
                    dock — the dock is the tab navigator's own bar, a
                    SIBLING of the screen, and zIndex only orders siblings
                    of one parent. A sheet's pinned Save button therefore
                    sat underneath it, the scrim never dimmed it, and it
                    stayed tappable through a modal.
                    Inside every provider above, because the elements
                    resolve their contexts from here — and deliberately
                    OUTSIDE the navigator, so overlay content may not call
                    useNavigation(). See components/atoms/OverlayPortal. */}
                <OverlayPortalHost />
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

// v2.7.0 — Mounts OverlayPortalHost after the navigator: sheets and dialogs are
//          rendered at the root so they are ABOVE the floating dock. Inside a
//          screen they could not be — the dock is the navigator's tab bar, a
//          sibling of the screen — which is why a sheet's Save button sat under
//          it and the dock stayed tappable through a modal.
// v2.6.0 — Mounts SyncProvider inside the AuthGate: the device now keeps its own
//          copy of the record and asks the server only what changed.
// v2.5.0 — Starts the bundled-image warm-up at module scope, before the first
//          render, so no photograph is first asked for on the screen showing it.
// v2.4.0 — Adds the AuthGate around the navigator: splash → onboarding → app.
// v2.3.0 — Adds I18nProvider inside the preference gate, so the first paint is
//          already in the patient's stored language.
