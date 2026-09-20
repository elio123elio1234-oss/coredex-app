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

   ══════════════════════════════════════════════════════════════════
   ★ AND WHY `expo-screen-orientation` IS INSTALLED BUT NEVER CALLED
   ══════════════════════════════════════════════════════════════════
   Reported in v0.74.0: *"after you leave the measurement screen, turning
   the phone sideways is suddenly legal in ALL the tabs, not just on the
   measurement page."* The masks above were not the problem — they read
   correctly in both platforms' react-native-screens source. The problem
   was that **on iOS nobody was asking them.**

   iOS decides whether the USER may rotate by asking the root view
   controller for `supportedInterfaceOrientations`. A bare Expo app has no
   root VC that knows about react-native-screens, so that question fell
   through to `Info.plist` — which `app.json`'s `"orientation": "default"`
   fills with every orientation. Free rotation, everywhere, always.

   The exam still worked, and that is exactly why this hid for so long:
   RNS does not rely on the root VC to ROTATE. It calls
   `requestGeometryUpdate` on the window scene directly
   (`RNSScreenWindowTraits.enforceDesiredDeviceOrientation`), so pushing
   the exam turned the phone even though nothing was enforcing the mask
   between navigations. Rotation on push: correct. Rotation by the user on
   any other screen: unchecked.

   `expo-screen-orientation` supplies the missing piece and nothing else.
   Its `ScreenOrientationReactDelegateHandler.createRootViewController()`
   installs a root VC whose `supportedInterfaceOrientations` begins:

       guard !shouldUseRNScreenOrientation() else {
         return super.supportedInterfaceOrientations
       }

   — i.e. when react-native-screens has a trait set (it always does here,
   `portrait_up` on the stack), it DEFERS to the declarations above.

   ⚠️ So the package is a dependency we never import. Installing it is
   what makes the declarative approach actually take effect; calling it is
   what broke the exam in the first place. **The ban stands: no
   `lockAsync`, no `unlockAsync`, no `OrientationLock` anywhere in `src/`.**
   If this file ever gains an `import … from 'expo-screen-orientation'`,
   that is the bug coming back.
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
import InsightsScreen from '@/screens/InsightsScreen';
import LeadDebugScreen from '@/screens/LeadDebugScreen';
import LimbMeasureScreen from '@/screens/LimbMeasureScreen';
import PersonalDetailsScreen from '@/screens/PersonalDetailsScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import RemindersScreen from '@/screens/RemindersScreen';
import ReportPreviewScreen from '@/screens/ReportPreviewScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import StudyViewerScreen from '@/screens/StudyViewerScreen';
/* TestsScreen (the test-choice carousel) is intentionally NOT imported:
   v0.59.0 gave its dock slot to Insights. The screen is kept in the tree so
   the choice UI is not lost, and a patient starts a test from HOME. */
import { LEAD_DEBUG_SCREEN_ENABLED } from '@/config/featureFlags';
import { DARK, LIGHT } from '@/theme/tokens';
import { useIsDark } from '@/theme/useTheme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TABS = {
  History: HistoryScreen,
  Insights: InsightsScreen,
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
        {/* Pushed FROM Settings, and it looks like Settings. On iOS a
            settings row with a chevron pushes a panel; the first version
            of this was a bottom sheet and read as small and improvised,
            because a sheet is for a quick action rather than for a switch,
            a picker and a list of times. */}
        <Stack.Screen
          name="Reminders"
          component={RemindersScreen}
          options={{ animation: 'slide_from_right' }}
        />
        {/* Pushed FROM Profile, and it looks like the screens around it —
            the Reminders precedent: two sliders, a blood-group grid and a
            contact form are a panel of settings, and a panel pushes. */}
        <Stack.Screen
          name="PersonalDetails"
          component={PersonalDetailsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        {/* The report, exactly as it prints, before it is shared. Pushed from
            the study viewer's actions menu. */}
        <Stack.Screen
          name="ReportPreview"
          component={ReportPreviewScreen}
          options={{ animation: 'slide_from_right' }}
        />
        {/* Reading a study is a full-screen job: the dock's five destinations
            would be competing with a toolbar, and the trace wants the height.
            It stays PORTRAIT (inherited from the stack) — the six leads are
            stacked and scrolled here, not shown at once as during the exam,
            so the long edge belongs to the leads, not to time. */}
        <Stack.Screen
          name="StudyViewer"
          component={StudyViewerScreen}
          options={{ animation: 'slide_from_right' }}
        />
        {/* ⚠️ TEMPORARY — hardware bring-up. With the flag off the route does
            not exist, so nothing can navigate to it even by name. */}
        {LEAD_DEBUG_SCREEN_ENABLED ? (
          <Stack.Screen
            name="LeadDebug"
            component={LeadDebugScreen}
            options={{ animation: 'slide_from_right' }}
          />
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// v3.5.0 — Adds the TEMPORARY LeadDebug route (Lead I / II-a / II-b live),
//          registered only while LEAD_DEBUG_SCREEN_ENABLED is on.
// v3.4.0 — Adds the ReportPreview route, pushed from the study viewer.
// v3.4.0 — Dock slot 2 routes to Insights (the ECG ID). TestsScreen is still
//          in the tree and deliberately unrouted — a test starts from HOME.
// v3.3.0 — Adds the PersonalDetails route, pushed from Profile.
// v3.2.0 — Adds the Reminders route, pushed from Settings.
// v3.1.0 — Adds the StudyViewer route (Scan History's reading screen) above the
//          tabs, portrait like every route but the exam.
