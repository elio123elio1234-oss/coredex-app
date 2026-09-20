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
   ★ ORIENTATION HAS EXACTLY ONE AUTHORITY, AND IT IS
     `expo-screen-orientation` — NOT react-native-screens (v0.76.0)
   ══════════════════════════════════════════════════════════════════
   Read the two sections below before changing anything here. They are
   the history of getting this wrong twice, in opposite directions.

   The rule now: **`orientation` is NOT declared on any route.** The
   baseline portrait lock is applied once, here; the exam raises it to
   landscape while it is focused and puts it back on the way out
   (`LimbMeasureScreen`). One writer, one API, no negotiation.

   ── Why the declarative version could never have worked on iOS ──
   v0.75.0 installed `expo-screen-orientation` WITHOUT calling it, on the
   theory that its root view controller would defer to react-native-screens'
   per-route masks. It does not, and the source says so plainly:

     ScreenOrientationAppDelegate:
       application(_:supportedInterfaceOrientationsFor:)
         -> ScreenOrientationRegistry.shared.currentOrientationMask
     ScreenOrientationRegistry:
       currentOrientationMask -> rootViewController.supportedInterfaceOrientations
     ScreenOrientationViewController (a plain UIViewController):
       guard !shouldUseRNScreenOrientation() else {
         return super.supportedInterfaceOrientations   // ← UIKit's DEFAULT
       }

   `super` there is `UIViewController`, whose default is
   `allButUpsideDown`. So the moment react-native-screens HAS a trait set —
   which, with `orientation` declared on the stack, is always — the package
   steps out of the way and reports "everything is allowed". Installing it
   without using it changed nothing; the name
   `shouldUseRNScreenOrientation` reads as "defer to RNS's mask" and means
   "defer to UIKit's default behaviour". That misreading cost a build.

   ⚠️ The consequence that matters for edits: **declaring `orientation` on
   a route does not restrict anything on iOS — it actively DISABLES the
   package that does.** That is why the declarations are gone rather than
   kept "for documentation".

   ══════════════════════════════════════════════════════════════════
   ★ AND WHY `lockAsync` IS ALLOWED AGAIN — CAREFULLY
   ══════════════════════════════════════════════════════════════════
   ⚠️ HISTORICAL — this is the reasoning that produced the declarations
   above, kept because it is exactly half right and the half that is wrong
   is not obvious.

   `orientation` IS passed straight through to react-native-screens, and
   on ANDROID it does what it claims: the activity's requested orientation
   is set per screen, so the rotation happens as part of the push and the
   mask is enforced afterwards. Android was never broken. **On iOS it only
   ever rotated** — nothing was enforcing the mask between navigations,
   because nothing was asking the screens for it (see the section above).
   One codebase, one prop, two completely different amounts of work done.

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
   to tame it and could not.

   ★ THE DIAGNOSIS WAS RIGHT AND THE CURE WAS HALF-APPLIED. The race was
   between TWO WRITERS of one native API — react-native-screens' declared
   mask and `lockAsync`. Deleting the locker did remove the contention; it
   also removed the only writer iOS actually listens to, which is how the
   tabs ended up free-rotating for months without anyone noticing (see
   above). Deleting the OTHER writer is the same cure and the one that
   leaves a working app.

   So `lockAsync` is back, and the invariant that replaces the ban is:

     ⚠️ **NO ROUTE MAY DECLARE `orientation`.** Not the stack, not the
     exam, not a future full-screen viewer. A declaration does not merely
     duplicate the lock — on iOS it makes `shouldUseRNScreenOrientation()`
     answer YES, which switches `expo-screen-orientation` off and returns
     UIKit's "anything goes". One declaration anywhere unlocks the whole
     app. If a screen needs a different orientation, it locks and unlocks
     it itself, the way `LimbMeasureScreen` does.

   The flicker cannot come back from this shape: there is nothing left to
   race with. The cost, stated honestly, is that the exam's rotation now
   happens just AFTER its push rather than as part of it — a beat of
   portrait before it turns. That is the price of the platform only
   honouring one mechanism, and it is far cheaper than a phone that
   rotates on every screen.
   ================================================================== */

import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
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

  /**
   * The app's baseline, applied ONCE. See the header: this is the only
   * mechanism iOS honours, and a per-route `orientation` would switch it off.
   *
   * Not in a cleanup: there is nothing to restore to. The navigator lives as
   * long as the app does, and the exam is responsible for putting the lock
   * back when it leaves.
   */
  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  return (
    <NavigationContainer theme={navTheme(dark)}>
      {/* ⚠️ NO `orientation` HERE, deliberately — see the header. Declaring it
          does not restrict anything on iOS; it disables the package that
          does, for the whole app. */}
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen
          name="LimbMeasure"
          component={LimbMeasureScreen}
          options={{
            // A measurement in progress must not be swiped away by accident.
            gestureEnabled: false,
            animation: 'slide_from_bottom',
            /* ⚠️ `orientation: 'landscape'` USED TO BE HERE and is gone on
               purpose. Six simultaneous limb traces still need the long
               edge — the screen now takes it itself, with `lockAsync` in a
               focus effect, because a declaration here would switch
               `expo-screen-orientation` off app-wide. See the header. */
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
