/* ==================================================================
   SettingsScreen — the patient's control panel, ported from the web
   SettingsPage. Reached from the bottom of the Profile tab.

   Everything here is a PREFERENCE or an on-device status readout — no
   clinical data — so it needs no RBAC gate. All state comes from hooks
   (preferences, theme, BLE); this screen only wires them to the
   presentational SettingsSection / SettingsRow molecules (CLAUDE.md
   §3.2). Same sections, same order, same illustrations as the web.

   ── Rows the web has and this does not (all recorded in PARITY.md) ──
   • Language — the mobile app has no i18n layer yet.
   • AI voice-guide key — Gemini Live is web-only today, so a key field
     here would configure nothing.
   • "Preview as role" / Sign out — mobile auth is still the demo card;
     a sign-out button that cannot sign anyone out is worse than none.
   • Clinic & Server — admin-only on the web, and there is no role to
     check against yet.
   Text size is present but DIFFERENT on purpose: see the row's comment.
   ================================================================== */

import { useNavigation } from '@react-navigation/native';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';
import HeroBackdrop from '@/components/atoms/HeroBackdrop';
import SettingsChip from '@/components/atoms/SettingsChip';
import {
  AboutIllustration,
  AccountIllustration,
  AppearanceIllustration,
  CareConnectionIllustration,
  EcgDeviceIllustration,
  NotificationsIllustration,
  PrivacyIllustration,
} from '@/components/atoms/Illustration';
import BackgroundSelectRow from '@/components/molecules/BackgroundSelectRow';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import SettingsRow from '@/components/molecules/SettingsRow';
import SettingsSection from '@/components/molecules/SettingsSection';
import { APP_BUILD_LABEL, APP_VERSION } from '@/config/version';
import { useBle } from '@/features/ble/useBle';
import { usePreferences } from '@/features/preferences/usePreferences';
import { DEMO_CARD } from '@/features/profile/demoCard';
import type { CareMode, ThemeChoice } from '@/features/preferences/preferencesSlice';
import { shellPalette } from '@/theme/shellTheme';
import { useIsDark, useTheme } from '@/theme/useTheme';

const THEME_OPTIONS: readonly { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const CARE_OPTIONS: readonly { value: CareMode; label: string }[] = [
  { value: 'clinician', label: 'My doctor' },
  { value: 'clinic', label: 'Clinic' },
];

function BackChevron({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function SettingsScreen() {
  const t = useTheme();
  const dark = useIsDark();
  const nav = useNavigation<{ goBack: () => void }>();
  const insets = useSafeAreaInsets();
  const { prefs, setTheme, setBackground, setNotification, setCareMode } = usePreferences();
  const ble = useBle();
  const palette = shellPalette(prefs.background, dark);

  /* Device connection in WORDS, never colour alone — the same wording the
     patient's home screen uses, so one device reads as one state. */
  let deviceStatus: string;
  if (ble.isSimulated) deviceStatus = 'Simulation — not a patient signal';
  else if (ble.status === 'streaming') deviceStatus = 'Streaming';
  else if (ble.isConnected) deviceStatus = 'Device connected';
  else if (ble.status === 'connecting') deviceStatus = 'Connecting…';
  else if (ble.status === 'error') deviceStatus = ble.error ?? 'Connection error';
  else if (!ble.isSupported) deviceStatus = 'No Bluetooth in this build';
  else deviceStatus = 'No device connected';

  return (
    <View style={styles.root}>
      <HeroBackdrop palette={palette} />

      {/* The exam route is immersive; this one is a normal page, so it keeps
          a real back affordance rather than relying on the swipe gesture. */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={() => {
            void Haptics.selectionAsync();
            nav.goBack();
          }}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <BackChevron color={t.textPrimary} />
          <Text style={[styles.backLabel, { color: t.textPrimary }]}>Profile</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingBottom: Math.max(insets.bottom, 16) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: t.textPrimary }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            Manage your preferences and account
          </Text>
        </View>

        {/* ── Appearance ── */}
        <SettingsSection
          art={AppearanceIllustration}
          title="Appearance"
          description="How CYPHIX looks on this device"
        >
          <SettingsRow
            first
            label="Theme"
            description="Follow the phone, or pick one"
            control={
              <SegmentedControl
                options={THEME_OPTIONS}
                value={prefs.theme}
                onChange={setTheme}
                accessibilityLabel="Theme"
              />
            }
          />
          {/* ★ Deliberately NOT the web's four-step control. The web scales its
              own root font because a browser page has one; iOS and Android
              already own text size system-wide (Dynamic Type / Font size), and
              every screen here respects it. A second, app-only scale would
              fight the phone's own setting and confuse exactly the patients it
              is meant to help. Recorded in PARITY.md. */}
          <SettingsRow
            label="Text size"
            description="CYPHIX follows the text size set in your phone's own display settings"
            value={<SettingsChip label="Phone setting" />}
          />
          {/* The swatches are too wide to sit at the end of a row, so the label
              and the control stack — the same thing `.bg-select` does on the
              web, where the picker gets its own full-width block. */}
          <SettingsRow label="Background" description="The colour behind your screens" />
          <BackgroundSelectRow value={prefs.background} onChange={setBackground} />
        </SettingsSection>

        {/* ── Notifications ── */}
        <SettingsSection
          art={NotificationsIllustration}
          title="Notifications"
          description="Choose what you want to be reminded about"
        >
          <SettingsRow
            first
            label="Test reminders"
            description="Remind me when a test is due"
            control={
              <Switch
                value={prefs.notifications.testReminders}
                onValueChange={(v) => setNotification('testReminders', v)}
                accessibilityLabel="Test reminders"
              />
            }
          />
          <SettingsRow
            label="Results ready"
            description="Tell me when a recording has been reviewed"
            control={
              <Switch
                value={prefs.notifications.resultsReady}
                onValueChange={(v) => setNotification('resultsReady', v)}
                accessibilityLabel="Results ready"
              />
            }
          />
          <SettingsRow
            label="Doctor messages"
            description="Notify me about new messages"
            control={
              <Switch
                value={prefs.notifications.doctorMessages}
                onValueChange={(v) => setNotification('doctorMessages', v)}
                accessibilityLabel="Doctor messages"
              />
            }
          />
        </SettingsSection>

        {/* ── Care connection (who your messages go to) ── */}
        <SettingsSection
          art={CareConnectionIllustration}
          title="Care connection"
          description="Who your messages go to"
        >
          <SettingsRow
            first
            label="Connection"
            description={
              prefs.careMode === 'clinic'
                ? 'Requests are triaged by the clinic to an available clinician'
                : 'Direct chat with your private doctor'
            }
            control={
              <SegmentedControl
                options={CARE_OPTIONS}
                value={prefs.careMode}
                onChange={setCareMode}
                accessibilityLabel="Care connection"
              />
            }
          />
        </SettingsSection>

        {/* ── ECG Device ── */}
        <SettingsSection
          art={EcgDeviceIllustration}
          title="ECG Device"
          description="Your Bluetooth ECG connection"
        >
          <SettingsRow first label="Status" value={deviceStatus} />
          <SettingsRow label="Device" value={ble.deviceName || 'No device paired'} />
          {ble.isConnected ? (
            <SettingsRow
              label="Disconnect"
              value={<SettingsChip label="Tap" />}
              onPress={ble.disconnect}
            />
          ) : (
            <SettingsRow
              label="Connect a device"
              description={
                ble.isSupported
                  ? undefined
                  : 'This build has no Bluetooth — the simulator is the path'
              }
              value={<SettingsChip label={ble.isSupported ? 'Scan' : 'Demo'} />}
              onPress={ble.isSupported ? () => void ble.connect() : ble.connectSimulator}
            />
          )}
        </SettingsSection>

        {/* ── Privacy & Security ── */}
        <SettingsSection
          art={PrivacyIllustration}
          title="Privacy & Security"
          description="Your data and how it is protected"
        >
          <SettingsRow
            first
            label="On-device processing"
            description="Your ECG never leaves this device. There is no server today."
            value={<SettingsChip label="Secure On-Device Processing" tone="ok" />}
          />
          <SettingsRow
            label="Export my data"
            description="Download everything stored on this device"
            value={<SettingsChip label="Coming soon" />}
          />
        </SettingsSection>

        {/* ── Account ── */}
        <SettingsSection
          art={AccountIllustration}
          title="Account"
          description="Who you are signed in as"
        >
          <SettingsRow first label="Name" value={DEMO_CARD.displayName} />
          <SettingsRow label="Role" value={<SettingsChip label="Patient" />} />
          {/* No sign-out until there is something to sign out OF — mobile auth
              is still the fictitious demo card (web CLAUDE.md §7.4). */}
          <SettingsRow
            label="Sign out"
            description="Available once accounts are connected to the server"
            value={<SettingsChip label="Coming soon" />}
            disabled
          />
        </SettingsSection>

        {/* ── About ── */}
        <SettingsSection
          art={AboutIllustration}
          title="About"
          description="Version and compliance"
        >
          <SettingsRow first label="App version" value={APP_VERSION} />
          <SettingsRow label="This build" value={APP_BUILD_LABEL} />
          <SettingsRow label="Compliance" value="HIPAA · GDPR · Israeli Privacy Law" />
        </SettingsSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6 },
  backLabel: { fontSize: 17, fontWeight: '600' },
  /* .settings-inner { max-width: 720px; gap: 16px } */
  page: { paddingHorizontal: 20, paddingTop: 8, gap: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { paddingHorizontal: 4, marginBottom: 4 },
  title: { fontSize: 32, fontWeight: '800' },
  subtitle: { fontSize: 14.5, marginTop: 6 },
});

// v1.0.0 — Settings ported from the web page: same sections, same order, the
//          same pastel illustrations, wired to the preferences slice + BLE.
