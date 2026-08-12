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
   • Clinic & Server — admin-only on the web, and there is no role to
     check against yet.
   "Preview as role" USED to be in that list and is live now (Account
   section): connected mode has a real principal, so there is finally a
   role to switch away from. It re-draws the app only — the server still
   authorises against the session's real role, so previewing `admin` on a
   patient account renders the admin buttons and every request behind them
   returns 403. That is the demonstration, not a defect.
   Sign out USED to be in that list. It is live now: the onboarding flow
   creates a real account on the device, so there is something to sign
   out of — and without this row the signed-out experience could never be
   reached a second time.
   Text size is present but DIFFERENT on purpose: see the row's comment.
   ================================================================== */

import { useEffect, useState } from 'react';
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
import { useReminders } from '@/features/reminders/useReminders';
import { DEMO_CARD } from '@/features/profile/demoCard';
import type { CareMode, ThemeChoice } from '@/features/preferences/preferencesSlice';
import { useTranslation } from '@/i18n/useTranslation';
import { debugRoleSet, setAppLockEnabled } from '@/features/auth/authSlice';
import { canUseAppLock } from '@/services/auth/biometrics';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { Role } from '@/types/rbac';
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

/* The roles worth previewing. `guest` is deliberately absent: it is the
   signed-OUT principal, and previewing it from a settings screen that only
   exists behind sign-in would render a shell nothing can navigate out of. */
const DEBUG_ROLES: readonly Role[] = ['patient', 'clinician', 'technician', 'admin'];

const ROLE_LABEL_KEY: Record<Role, TranslationKey> = {
  patient: 'roleLabelPatient',
  clinician: 'roleLabelClinician',
  technician: 'roleLabelTechnician',
  admin: 'roleLabelAdmin',
  guest: 'roleLabelPatient',
};

export default function SettingsScreen() {
  const t = useTheme();
  const dark = useIsDark();
  const nav = useNavigation<{ goBack: () => void; navigate: (screen: string) => void }>();
  const insets = useSafeAreaInsets();
  const { prefs, setTheme, setBackground, setNotification, setCareMode } = usePreferences();
  const { t: tr, lang, setLang } = useTranslation();
  const ble = useBle();
  const { user, logout } = useAuth();
  const dispatch = useAppDispatch();
  const debugRole = useAppSelector((st) => st.auth.debugRole);
  const sessionRole = useAppSelector((st) => st.auth.user?.role);
  /* What the account REALLY is, shown beneath the picker while a preview is
     active — otherwise there is no way to tell a previewed role from a real
     one, which is how a demo becomes a false belief about an account. */
  const realRole: Role = sessionRole ?? 'clinician';
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const appLockEnabled = useAppSelector((st) => st.auth.appLockEnabled);
  /* Whether the OS can honour a lock at all — asked once, on mount, and
     used to decide whether the row exists. See the row itself for why a
     switch that cannot be honoured is worse than no switch. */
  const [canLock, setCanLock] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void canUseAppLock().then((ok) => {
      if (!cancelled) setCanLock(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const reminders = useReminders();
  const palette = shellPalette(prefs.background, dark);

  /* What the reminders row says instead of its generic description once
     there is a real schedule: how many a day, and when the next one is.
     A row whose subtitle never changes cannot tell a patient whether the
     thing behind it is actually set up. */
  const reminderSummary = reminders.active
    ? [
        tr('remPerDay', { n: String(reminders.schedule.slots.length) }),
        reminders.next
          ? tr('remNextAt', {
              when: reminders.next.toLocaleString(lang, {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }),
            })
          : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

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
          {/* ★ The master switch and the TIMES are two settings, and this
              row now carries both: the switch answers "may this app remind
              me at all", and tapping the row opens the schedule. Folding
              them into one control would mean a patient silencing
              reminders for a fortnight lost the times they had chosen. */}
          <SettingsRow
            first
            label={tr('setNotifReminders')}
            description={
              prefs.notifications.testReminders
                ? (reminderSummary ?? tr('setNotifRemindersDesc'))
                : tr('setNotifRemindersDesc')
            }
            onPress={() => {
              void Haptics.selectionAsync();
              nav.navigate('Reminders');
            }}
            control={
              <Switch
                value={prefs.notifications.testReminders}
                onValueChange={(v) => {
                  setNotification('testReminders', v);
                  // Turning it on with nothing scheduled yet goes straight
                  // to the question it raises — "when?" — rather than
                  // leaving the patient to find the row again.
                  if (v && !reminders.schedule.enabled) nav.navigate('Reminders');
                }}
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
            value={<SettingsChip label={tr(ROLE_LABEL_KEY[user?.role ?? 'patient'])} />}
          />
          {/* DEBUG — "Preview as role", the web's Settings row ported.
              It re-draws the app as the chosen role and grants NOTHING: the
              server authorises against the session's real role, so previewing
              `admin` on a patient account renders the admin buttons and each
              request behind them returns 403. That is the point — it shows
              which UI a role gets, on a device, without keeping four test
              accounts. The description says so on screen, because a switch
              labelled only "Admin" invites the opposite conclusion. */}
          <SettingsRow
            label={tr('setDevRole')}
            description={tr('setDevRoleDesc')}
            control={
              <View style={styles.roleRow}>
                {DEBUG_ROLES.map((r) => (
                  <Pressable
                    key={r}
                    accessibilityRole="button"
                    accessibilityState={{ selected: user?.role === r }}
                    accessibilityLabel={tr(ROLE_LABEL_KEY[r])}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      /* Tapping the role already shown clears the override, so
                         there is always a way back to the real principal
                         without knowing which one it was. */
                      dispatch(debugRoleSet(debugRole === r ? null : r));
                    }}
                    style={styles.roleChipHit}
                  >
                    <SettingsChip
                      label={tr(ROLE_LABEL_KEY[r])}
                      tone={user?.role === r ? 'ok' : undefined}
                    />
                  </Pressable>
                ))}
              </View>
            }
          />
          {debugRole && (
            <SettingsRow
              label={tr('setDevRoleReal')}
              value={<SettingsChip label={tr(ROLE_LABEL_KEY[realRole])} />}
            />
          )}
          {/* ── The app lock ──
              The app now opens on a session restored from this phone's
              enclave rather than waiting for the server to confirm it,
              which is what stopped a cold start with no signal from
              dumping the patient on the sign-in screen. This is the
              control that pays for it: a device unlock in front of that
              restored session, so a phone somebody else is holding does
              not open onto a medical record.

              ★ Offered ONLY where it can be honoured. A switch that
              silently does nothing on a phone with no passcode and no
              enrolled biometric is worse than no switch — it is a
              security control the patient believes in. Same rule the
              sign-in screen's biometric button follows. */}
          {canLock ? (
            <SettingsRow
              label={tr('setAppLock')}
              description={tr('setAppLockDesc')}
              control={
                <Switch
                  value={appLockEnabled}
                  onValueChange={(next) => {
                    void Haptics.selectionAsync();
                    void dispatch(setAppLockEnabled(next));
                  }}
                  trackColor={{ true: t.accent, false: t.border }}
                />
              }
            />
          ) : null}
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
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  // 44 pt of touch on a chip that is drawn smaller — the chip is the label,
  // the Pressable is the target.
  roleChipHit: { minHeight: 44, justifyContent: 'center' },
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

// v2.3.0 — Adds the app-lock row (Account), offered only where the OS can
//          honour it: a security switch that silently does nothing is worse
//          than no switch, because the patient believes in it.
// v2.2.0 — About names the frosted material this phone actually resolved.
//          "It doesn't look like glass" has three indistinguishable causes and
//          only the device can say which one it is.
// v2.1.0 — Sign out is live (with a confirmation), and the Account section
//          shows the account that is actually signed in.
// v2.0.0 — Fully translated, and gains the Language picker at the top of
//          Appearance (the one setting a patient must be able to find while
//          unable to read the rest of the screen).
