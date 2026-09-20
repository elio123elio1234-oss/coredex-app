/* ==================================================================
   HomeScreen — the patient's home and the entry point of the
   measurement pipeline, ported from the web MeasurePage.

   DESIGN INTENT (unchanged from the web, for elderly patients):
     ONE big round button whose meaning follows the device state:
       • no Bluetooth in this build → DEMO (the simulator IS the path,
         so the screen is never a dead end)
       • no device  → CONNECT
       • connected  → START TEST → the default 6-lead limb exam
     A quiet "use the simulator" link stays for bench testing.

   6 limb leads is the DEFAULT test — the big button starts it directly.

   Device status is stated in WORDS, never colour alone, and a synthetic
   signal is always surfaced as such (web CLAUDE.md §6).
   ================================================================== */

import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import HeroBlobButton from '@/components/organisms/HeroBlobButton';
import PatientShell from '@/components/templates/PatientShell';
import { useBle } from '@/features/ble/useBle';
import { useAuth } from '@/features/auth/useAuth';
import { DEMO_CARD } from '@/features/profile/demoCard';
import { useTranslation } from '@/i18n/useTranslation';
import { useTheme } from '@/theme/useTheme';

/**
 * First name for a warm greeting; keeps a title if the name starts with one.
 * Copied from the web MeasurePage so both platforms greet identically.
 */
function firstName(displayName: string | undefined): string {
  if (!displayName) return '';
  const parts = displayName.trim().split(/\s+/);
  // "Dr. Demo Clinician" → "Dr. Demo"; "Moshe Levi" → "Moshe".
  if (/^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?|ד"ר|ד״ר|פרופ')$/i.test(parts[0]) && parts[1]) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
}

export default function HomeScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const nav = useNavigation<{ navigate: (screen: string) => void }>();
  const ble = useBle();
  /* The name the patient gave when they registered. The fictitious demo
     card is the fallback for a session that carries no display name —
     greeting someone by the wrong name is worse than greeting them by
     none, but a blank hello is worse than either. */
  const { user } = useAuth();
  const greetName = firstName(user?.displayName ?? DEMO_CARD.displayName);

  /* ── Device status, in words ──
     No live BPM here. The web's MeasurePage does append one, but on the
     patient's home it competes with the one place a heart rate belongs —
     the measurement screen — and a number that is not a measurement should
     not sit under the start button. Removed at the user's instruction;
     the divergence from web is deliberate and recorded in PARITY.md. */
  let statusLabel: string;
  if (ble.isSimulated) statusLabel = tr('devSimulated');
  else if (ble.status === 'streaming') statusLabel = tr('devStreaming');
  else if (ble.isConnected) statusLabel = tr('devConnected');
  else if (ble.status === 'connecting') statusLabel = tr('devConnecting');
  /* The platform's own error text is not translatable; a specific cause
     untranslated beats a generic sentence that says nothing. */
  else if (ble.status === 'error') statusLabel = ble.error ?? tr('devError');
  else if (!ble.isSupported) statusLabel = tr('devNoBluetooth');
  else statusLabel = tr('devNone');

  /* ── The single big round button: its meaning follows the device state ── */
  let title: string;
  let onPress: () => void;
  let disabled = false;
  let showDemoLink = false;

  if (ble.isConnected) {
    title = tr('homeStart');
    onPress = () => nav.navigate('LimbMeasure');
  } else if (ble.status === 'connecting') {
    title = tr('devConnecting');
    onPress = () => {};
    disabled = true;
    showDemoLink = true;
  } else if (!ble.isSupported) {
    // Expo Go has no native BLE module: demo IS the only path, so it becomes
    // the primary button rather than a dead end.
    title = tr('homeStartDemo');
    onPress = ble.connectSimulator;
  } else {
    title = tr('homeConnect');
    onPress = () => void ble.connect();
    showDemoLink = true;
  }

  return (
    <PatientShell>
      <View style={styles.inner}>
        {/* `homeGreeting: 'Hello {name}'` — the web's GreetingHeader, with
            the same first-name resolution.

            ★ v0.68.0 — THE SUBTITLE IS GONE ("Performing a Home ECG Test",
            `homeSubPatient`). Removed at the user's instruction, and it
            earns its removal: it described what the screen is FOR to
            somebody already standing on it, directly above a button that
            says "Start Test". The greeting now sits alone above the hero,
            which is also the one thing on this screen the patient did not
            already know. The key is dropped from both locales rather than
            left orphaned — a string nothing renders is a string the next
            reader has to check. Divergence from web recorded in PARITY.md. */}
        <View style={styles.greet}>
          <Text style={[styles.greetTitle, { color: t.textPrimary }]}>
            {greetName ? tr('homeGreeting', { name: greetName }) : tr('homeGreetingNoName')}
          </Text>
        </View>

        <HeroBlobButton
          connected={ble.isConnected}
          title={title}
          subtitle={statusLabel}
          disabled={disabled}
          onPress={onPress}
        />

        {showDemoLink && (
          <Pressable
            accessibilityRole="button"
            onPress={ble.connectSimulator}
            style={styles.demoRow}
          >
            <Text style={[styles.demoLink, { color: t.textTertiary }]}>{tr('homeDemoLink')}</Text>
          </Pressable>
        )}
      </View>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  inner: { gap: 12, alignItems: 'stretch' },
  /**
   * ★ THE SPACE THE SUBTITLE USED TO OCCUPY IS KEPT (v0.73.0).
   *
   * Reported the moment v0.68.0 landed: *"now `Hello Elio` is really close
   * to the button, it should be a bit higher up."* Correct, and it is a
   * second-order effect of the deletion rather than anything about the
   * greeting: `PatientShell` centres its content vertically, so removing
   * ~30 pt from this block did two things at once — it left only the
   * `inner` gap (12) between a 38 pt heading and the hero, and it moved
   * the greeting DOWN by half the lost height as the column re-centred.
   *
   * 32 is not a taste value: it is `greetSub`'s old footprint (marginTop 6
   * + a ~24 pt line at fontSize 20), so the composition returns to exactly
   * where it stood before the text was removed. The words are gone; the
   * air they held is not, because that air was doing its own job.
   */
  greet: { alignItems: 'center', marginBottom: 32 },
  greetTitle: { fontSize: 38, fontWeight: '800', letterSpacing: -0.5 },
  demoRow: { alignItems: 'center', marginTop: 2 },
  demoLink: { fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});

// v2.3.1 — Keeps the space the subtitle held. Deleting it in v2.3.0 left the
//          38 pt greeting a 12 pt gap from the hero AND — because the shell
//          centres vertically — dropped it half the lost height down the
//          screen. Reported as "Hello Elio is really close to the button".
// v2.3.0 — The "Performing a Home ECG Test" subtitle is gone. It told a
//          patient standing on the home screen what the home screen is for,
//          one line above a button reading "Start Test".
// v2.2.0 — Greets the account that actually signed in, falling back to the
//          demo card when a session carries no display name.
// v2.1.0 — All copy comes from the locale; the greeting uses the shared
//          `homeGreeting: 'Hello {name}'` placeholder the web app uses.
