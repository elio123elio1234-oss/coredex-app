/* ==================================================================
   RootNavigator — two layers, mirroring the web AppShell:

     1. The five patient destinations behind the floating glass dock, in
        the web's order: History · Tests · HOME · Chat · Profile.
     2. Full-screen routes stacked ABOVE the tabs: the ACTIVE EXAM
        (`LimbMeasure`) and `Settings` — no dock, no chrome, exactly as
        `isExam` / the settings route do on the web.

   The default tab bar is replaced entirely by <BottomDock/> so the bar
   FLOATS over the content instead of being welded to the screen edge.

   ══════════════════════════════════════════════════════════════════
   ★ ORIENTATION IS DECLARED HERE, PER ROUTE — NEVER LOCKED IMPERATIVELY
   ══════════════════════════════════════════════════════════════════
   `orientation` is passed straight through to react-native-screens,
   which implements it the way the OS expects: on iOS the pushed view
   controller answers `supportedInterfaceOrientations`, on Android the
   activity's requested orientation is set. The rotation therefore
   happens as PART of the push transition — the exam's first layout pass
   already measures the landscape box.

   ── Why the previous approach flickered (landscape → portrait →
      landscape) ──
   The exam used to call `expo-screen-orientation`'s `lockAsync()` from a
   `useEffect` after mounting. That is a SECOND writer of the very same
   iOS API that react-native-screens already owns:

     1. the screen is pushed; iOS asks the new view controller what it
        supports and gets the app default (portrait allowed) → portrait;
     2. the effect runs a tick later and sets a global landscape mask
        → the device rotates;
     3. any re-query of the view controller (the push animation
        completing, the tab screen behind it resigning) answers with the
        app default again → back to portrait, then the global mask wins
        once more → landscape.

   Three rotations for one navigation. A mount/cleanup counter was added
   to tame it and could not: the race is between two native mechanisms,
   not between two React effects. Deleting the imperative locker removed
   the contention outright. **Do not reintroduce `lockAsync` anywhere.**
   ================================================================== */

import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomDock from '@/components/organisms/BottomDock';
import ChatScreen from '@/screens/ChatScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import HomeScreen from '@/screens/HomeScreen';
import LimbMeasureScreen from '@/screens/LimbMeasureScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import TestsScreen from '@/screens/TestsScreen';
import { DARK, LIGHT } from '@/theme/tokens';
import { useIsDark } from '@/theme/useTheme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TABS = {
  History: HistoryScreen,
  Tests: TestsScreen,
  Home: HomeScreen,
  Chat: ChatScreen,
  Profile: ProfileScreen,
} as const;

function navTheme(dark: boolean): Theme {
  const t = dark ? DARK : LIGHT;
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: t.accent,
      // Transparent so the shell field shows through during transitions.
      background: 'transparent',
      card: t.surface,
      border: t.border,
      text: t.textPrimary,
    },
  };
}

function Tabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <BottomDock {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      {Object.entries(TABS).map(([name, component]) => (
        <Tab.Screen key={name} name={name} component={component} />
      ))}
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  // The patient's Settings choice, not the raw OS appearance — otherwise the
  // navigator's own surfaces stay on the system theme and the app is half dark.
  const dark = useIsDark();
  return (
    <NavigationContainer theme={navTheme(dark)}>
      {/* `portrait_up` is the app's baseline, declared once on the stack so
          every route inherits it and only the exam opts out. */}
      <Stack.Navigator
        screenOptions={{ headerShown: false, orientation: 'portrait_up' }}
      >
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen
          name="LimbMeasure"
          component={LimbMeasureScreen}
          options={{
            // A measurement in progress must not be swiped away by accident.
            gestureEnabled: false,
            animation: 'slide_from_bottom',
            /* Six simultaneous limb traces need the long edge. Both landscape
               orientations are permitted so the phone may be turned either
               way; iOS picks the one matching how it is being held. */
            orientation: 'landscape',
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// v3.0.0 — Orientation is declared per route (react-native-screens) instead of
//          locked imperatively; adds the Settings route above the tabs.
