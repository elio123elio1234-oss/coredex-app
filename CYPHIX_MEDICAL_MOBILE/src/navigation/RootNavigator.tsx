/* ==================================================================
   RootNavigator — two layers, mirroring the web AppShell:

     1. The five patient destinations behind the floating glass dock, in
        the web's order: History · Tests · HOME · Chat · Profile.
     2. The ACTIVE EXAM (`LimbMeasure`) as a full-screen route stacked
        ABOVE the tabs — immersive, no dock, no chrome to distract
        mid-measurement, exactly as `isExam` does on the web.

   The default tab bar is replaced entirely by <BottomDock/> so the bar
   FLOATS over the content instead of being welded to the screen edge.
   ================================================================== */

import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import BottomDock from '@/components/organisms/BottomDock';
import ChatScreen from '@/screens/ChatScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import HomeScreen from '@/screens/HomeScreen';
import LimbMeasureScreen from '@/screens/LimbMeasureScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import TestsScreen from '@/screens/TestsScreen';
import { DARK, LIGHT } from '@/theme/tokens';

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
  const dark = useColorScheme() === 'dark';
  return (
    <NavigationContainer theme={navTheme(dark)}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen
          name="LimbMeasure"
          component={LimbMeasureScreen}
          // A measurement in progress must not be swiped away by accident.
          options={{ gestureEnabled: false, animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// v2.0.0 — Adds the immersive exam route above the tabs (web parity).
