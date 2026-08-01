/* App — composition root: gesture handler, safe areas, Redux, the
   app-lifetime BLE client, navigation. No business logic here. */

import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { BleProvider } from '@/features/ble/BleProvider';
import { lockPortrait } from '@/features/measurement/hooks/useExamOrientation';
import { store } from '@/store/store';
import RootNavigator from '@/navigation/RootNavigator';

export default function App() {
  // `app.json` allows every orientation so the exam can go landscape; the rest
  // of the app opts back in to portrait here rather than the other way round.
  useEffect(lockPortrait, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Provider store={store}>
          {/* One BleClient above the navigator: a connection must survive
              navigating from Home into the exam, and the ring buffer must
              not reset mid-recording. */}
          <BleProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </BleProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

// v2.0.0 — Adds the app-lifetime BleProvider; version badge moved into Profile.
