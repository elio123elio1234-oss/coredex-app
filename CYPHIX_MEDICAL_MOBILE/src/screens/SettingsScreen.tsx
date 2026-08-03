/* ==================================================================
   SettingsScreen — the patient's control panel, ported from the web
   SettingsPage. Reached from the bottom of the Profile tab.

   Everything here is a PREFERENCE or an on-device status readout — no
   clinical data — so it needs no RBAC gate. All state comes from hooks
   (preferences, theme, BLE); this screen only wires them to the
   presentational SettingsSection / SettingsRow molecules (CLAUDE.md
   §3.2). Same sections, same order, same illustrations as the web.

   ── Rows the web has and this does not (all recorded in PARITY.md) ──
   • AI voice-guide key — Gemini Live is web-only today, so a key field
     here would configure nothing.
   • "Preview as role" — there is still no role to switch between.
   • Clinic & Server — admin-only on the web, and there is no role to
     check against yet.
   Sign out USED to be in that list. It is live now: the onboarding flow
   creates a real account on the device, so there is something to sign
   out of — and without this row the signed-out experience could never be
   reached a second time.
   Text size is present but DIFFERENT on purpose: see the row's comment.
   ================================================================== */

import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';
import { GLASS_MATERIAL } from '@/components/atoms/GlassSurface';
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
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import LanguageSelectRow from '@/components/molecules/LanguageSelectRow';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import SettingsRow from '@/components/molecules/SettingsRow';
import SettingsSection from '@/components/molecules/SettingsSection';
import { APP_BUILD_LABEL, APP_VERSION } from '@/config/version';
import { useAuth } from '@/features/auth/useAuth';
import { useBle } from '@/features/ble/useBle';
import { usePreferences } from '@/features/preferences/usePreferences';
import { DEMO_CARD } from '@/features/profile/demoCard';
import type { CareMode, ThemeChoice } from '@/features/preferences/preferencesSlice';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/config';
import { shellPalette } from '@/theme/shellTheme';
import { useIsDark, useTheme } from '@/theme/useTheme';

/* Option tables hold KEYS, not sentences: the labels are resolved at render
   so switching the language re-labels the controls with everything else. */
const THEME_OPTIONS: readonly { value: ThemeChoice; labelKey: TranslationKey }[] = [
  { value: 'system', labelKey: 'setThemeSystem' },
  { value: 'light', labelKey: 'setThemeLight' },
  { value: 'dark', labelKey: 'setThemeDark' },
];

const CARE_OPTIONS: readonly { value: CareMode; labelKey: TranslationKey }[] = [
  { value: 'clinician', labelKey: 'careClinician' },
  { value: 'clinic', labelKey: 'careClinic' },
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
  const { t: tr, lang, setLang } = useTranslation();
  const ble = useBle();
  const { user, logout } = useAuth();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const palette = shellPalette(prefs.background, dark);

  /* Device connection in WORDS, never colour alone — the same wording the
     patient's home screen uses, so one device reads as one state. */
  let deviceStatus: string;
  if (ble.isSimulated) deviceStatus = tr('devSimulated');
  else if (ble.status === 'streaming') deviceStatus = tr('devStreaming');
  else if (ble.isConnected) deviceStatus = tr('devConnected');
  else if (ble.status === 'connecting') deviceStatus = tr('devConnecting');
  /* `ble.error` is the platform's own message and is not translatable —
     showing it untranslated beats replacing a specific cause with a
     generic sentence. */
  else if (ble.status === 'error') deviceStatus = ble.error ?? tr('devError');
  else if (!ble.isSupported) deviceStatus = tr('devNoBluetooth');
  else deviceStatus = tr('devNone');

  return (
    <View style={styles.root}>
      <HeroBackdrop palette={palette} />

      {/* The exam route is immersive; this one is a normal page, so it keeps
          a real back affordance rather than relying on the swipe gesture. */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('back')}
          hitSlop={12}
          onPress={() => {
            void Haptics.selectionAsync();
            nav.goBack();
          }}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <BackChevron color={t.textPrimary} />
          <Text style={[styles.backLabel, { color: t.textPrimary }]}>{tr('dockProfile')}</Text>
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
          <Text style={[styles.title, { color: t.textPrimary }]}>{tr('settingsTitle')}</Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            {tr('settingsSubtitle')}
          </Text>
        </View>

        {/* ── Appearance ── */}
        <SettingsSection
          art={AppearanceIllustration}
          title={tr('setSecAppearance')}
          description={tr('setSecAppearanceDesc')}
        >
          {/* ★ Language FIRST in the section, ahead of theme.
              Everything below it is a preference about how the app looks;
              this one decides whether the patient can read any of them. A
              patient who opened the app in the wrong language has to find
              this row while unable to read its label — so it is the first
              thing under the first heading, and its options are written in
              their own scripts rather than translated. */}
          <SettingsRow first label={tr('language')} description={tr('languageDesc')} />
          <LanguageSelectRow value={lang} onChange={setLang} accessibilityLabel={tr('language')} />

          <SettingsRow
            label={tr('setTheme')}
            description={tr('setThemeDesc')}
            control={
              <SegmentedControl
                options={THEME_OPTIONS.map((o) => ({ value: o.value, label: tr(o.labelKey) }))}
                value={prefs.theme}
                onChange={setTheme}
                accessibilityLabel={tr('setTheme')}
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
            label={tr('setTextSize')}
            description={tr('setTextSizeDescMobile')}
            value={<SettingsChip label={tr('setTextSizePhone')} />}
          />
          {/* The swatches are too wide to sit at the end of a row, so the label
              and the control stack — the same thing `.bg-select` does on the
              web, where the picker gets its own full-width block. */}
          <SettingsRow label={tr('bgLabel')} description={tr('bgLabelDesc')} />
          <BackgroundSelectRow value={prefs.background} onChange={setBackground} />
        </SettingsSection>

        {/* ── Notifications ── */}
        <SettingsSection
          art={NotificationsIllustration}
          title={tr('setSecNotifications')}
          description={tr('setSecNotificationsDesc')}
        >
          <SettingsRow
            first
            label={tr('setNotifReminders')}
            description={tr('setNotifRemindersDesc')}
            control={
              <Switch
                value={prefs.notifications.testReminders}
                onValueChange={(v) => setNotification('testReminders', v)}
                accessibilityLabel={tr('setNotifReminders')}
              />
            }
          />
          <SettingsRow
            label={tr('setNotifResults')}
            description={tr('setNotifResultsDesc')}
            control={
              <Switch
                value={prefs.notifications.resultsReady}
                onValueChange={(v) => setNotification('resultsReady', v)}
                accessibilityLabel={tr('setNotifResults')}
              />
            }
          />
          <SettingsRow
            label={tr('setNotifMessages')}
            description={tr('setNotifMessagesDesc')}
            control={
              <Switch
                value={prefs.notifications.doctorMessages}
                onValueChange={(v) => setNotification('doctorMessages', v)}
                accessibilityLabel={tr('setNotifMessages')}
              />
            }
          />
        </SettingsSection>

        {/* ── Care connection (who your messages go to) ── */}
        <SettingsSection
          art={CareConnectionIllustration}
          title={tr('setSecCare')}
          description={tr('setSecCareDesc')}
        >
          <SettingsRow
            first
            label={tr('setCareConnection')}
            description={
              prefs.careMode === 'clinic' ? tr('setCareClinicDesc') : tr('setCareClinicianDesc')
            }
            control={
              <SegmentedControl
                options={CARE_OPTIONS.map((o) => ({ value: o.value, label: tr(o.labelKey) }))}
                value={prefs.careMode}
                onChange={setCareMode}
                accessibilityLabel={tr('setSecCare')}
              />
            }
          />
        </SettingsSection>

        {/* ── ECG Device ── */}
        <SettingsSection
          art={EcgDeviceIllustration}
          title={tr('setSecDevice')}
          description={tr('setSecDeviceDesc')}
        >
          <SettingsRow first label={tr('setDeviceStatus')} value={deviceStatus} />
          <SettingsRow
            label={tr('setDeviceName')}
            value={ble.deviceName || tr('setDeviceNonePaired')}
          />
          {ble.isConnected ? (
            <SettingsRow
              label={tr('setDeviceDisconnect')}
              value={<SettingsChip label={tr('setDeviceTap')} />}
              onPress={ble.disconnect}
            />
          ) : (
            <SettingsRow
              label={tr('setDeviceConnect')}
              description={ble.isSupported ? undefined : tr('setDeviceNoBleDesc')}
              value={
                <SettingsChip label={ble.isSupported ? tr('setDeviceScan') : tr('setDeviceDemo')} />
              }
              onPress={ble.isSupported ? () => void ble.connect() : ble.connectSimulator}
            />
          )}
        </SettingsSection>

        {/* ── Privacy & Security ── */}
        <SettingsSection
          art={PrivacyIllustration}
          title={tr('setSecPrivacy')}
          description={tr('setSecPrivacyDesc')}
        >
          <SettingsRow
            first
            label={tr('setPrivacyOnDevice')}
            description={tr('setPrivacyOnDeviceDesc')}
            value={<SettingsChip label={tr('encryptionBadge')} tone="ok" />}
          />
          <SettingsRow
            label={tr('setPrivacyExport')}
            description={tr('setPrivacyExportDesc')}
            value={<SettingsChip label={tr('setComingSoon')} />}
          />
        </SettingsSection>

        {/* ── Account ── */}
        <SettingsSection
          art={AccountIllustration}
          title={tr('setSecAccount')}
          description={tr('setSecAccountDesc')}
        >
          <SettingsRow
            first
            label={tr('setAccountName')}
            value={user?.displayName ?? DEMO_CARD.displayName}
          />
          <SettingsRow
            label={tr('setAccountRole')}
            value={<SettingsChip label={tr('roleLabelPatient')} />}
          />
          {/* There IS something to sign out of now: the account created by
              the onboarding flow. Confirmed first — on a device-local
              account, signing out means the password is needed again (or
              a face), and a mis-tap here is a locked-out patient. */}
          <SettingsRow
            label={tr('setAccountSignOut')}
            description={tr('setAccountSignOutDesc')}
            onPress={() => setConfirmSignOut(true)}
          />
        </SettingsSection>

        {/* ── About ── */}
        <SettingsSection
          art={AboutIllustration}
          title={tr('setSecAbout')}
          description={tr('setSecAboutDesc')}
        >
          <SettingsRow first label={tr('setAboutVersion')} value={APP_VERSION} />
          {/* The build label is a developer identifier, not patient copy —
              it stays in English on purpose so a bug report quotes the same
              string the changelog does. */}
          <SettingsRow label={tr('setAboutBuild')} value={APP_BUILD_LABEL} />
          {/* Which frosted material this phone actually resolved. "It doesn't
              look like glass" has three causes that look identical — no
              Liquid Glass on this iOS, no `expo-glass-effect` in this client,
              or a design problem — and only the phone can say which. English
              for the same reason as the build label: a bug report should quote
              the string the changelog uses. */}
          <SettingsRow label={tr('setAboutMaterial')} value={GLASS_MATERIAL} />
          <SettingsRow label={tr('setAboutCompliance')} value={tr('setAboutComplianceValue')} />
        </SettingsSection>
      </ScrollView>

      <ConfirmDialog
        visible={confirmSignOut}
        title={tr('setAccountSignOut')}
        subject={user?.displayName}
        body={tr('setSignOutBody')}
        confirmLabel={tr('setAccountSignOut')}
        cancelLabel={tr('back')}
        onConfirm={() => {
          setConfirmSignOut(false);
          /* The gate above the navigator swaps this whole screen for the
             welcome screen the moment the session goes. */
          void logout();
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
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

// v2.2.0 — About names the frosted material this phone actually resolved.
//          "It doesn't look like glass" has three indistinguishable causes and
//          only the device can say which one it is.
// v2.1.0 — Sign out is live (with a confirmation), and the Account section
//          shows the account that is actually signed in.
// v2.0.0 — Fully translated, and gains the Language picker at the top of
//          Appearance (the one setting a patient must be able to find while
//          unable to read the rest of the screen).
