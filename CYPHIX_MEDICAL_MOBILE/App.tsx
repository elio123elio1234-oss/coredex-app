/* App — composition root: gesture handler, safe areas, Redux, the
   app-lifetime BLE client, navigation. No business logic here. */

import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { BleProvider } from '@/features/ble/BleProvider';
import { PreferencesGate } from '@/features/preferences/PreferencesGate';
import { I18nProvider } from '@/i18n/I18nProvider';
import { store } from '@/store/store';
import RootNavigator from '@/navigation/RootNavigator';

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
                <RootNavigator />
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

// v2.3.0 — Adds I18nProvider inside the preference gate, so the first paint is
//          already in the patient's stored language.
