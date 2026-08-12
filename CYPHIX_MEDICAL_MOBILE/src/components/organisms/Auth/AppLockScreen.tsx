/* ==================================================================
   AppLockScreen (organism) — the wall in front of a session that was
   restored from this device rather than granted by a server just now.

   ══ WHAT IT IS FOR, PRECISELY ══
   The app can now open with no network, on the strength of the principal
   in the enclave. That is the right behaviour and it is what every app
   with a session does — but it means a phone somebody else is holding
   opens onto a medical record without anyone proving anything. The lock
   is what closes that, and it is the ONLY thing the offline session
   needed that the online one did not.

   ══ WHAT IT IS NOT ══
   It is not an authorisation boundary and it must never be described as
   one. The tokens are in the enclave whether this screen is up or not,
   and the server authorises every request regardless. What passing this
   screen unlocks is RENDERING — the device's own cached copy of a record
   already on this device. Anyone who can defeat the OS's own biometric /
   passcode check can read those files directly and never meet this
   screen at all. Claiming more for it would be the kind of security
   theatre this release removed elsewhere.

   ══ WHY IT LOOKS LIKE THE SPLASH ══
   Same wordmark, same white page, same position. A patient who opens the
   app sees one continuous surface that asks for a thumb, rather than a
   splash that is replaced by a different screen — and it is deliberately
   NOT the sign-in screen, because a lock is not a sign-out and must not
   look like one. Their session is intact; they are being asked to prove
   they are holding their own phone.

   The prompt fires on its own the moment this mounts. Making someone tap
   a button to be shown a system prompt is a tap that carries no
   information — but the button stays for after a cancel, because a
   prompt that re-fires the instant it is dismissed cannot be dismissed.
   ================================================================== */

import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthLinkButton from '@/components/atoms/Auth/AuthLinkButton';
import CyphixWordmark from '@/components/atoms/CyphixWordmark';
import { useTranslation } from '@/i18n/useTranslation';
import { unlockApp } from '@/services/auth/biometrics';
import { authPalette } from '@/theme/authTheme';

/** `.auth-wordmark { width: min(58vw, 240px) }` — the web's own rule,
    matched to BootSplash so the two screens do not jump. */
const WIDTH_RATIO = 0.58;
const MAX_WIDTH = 240;

interface Props {
  /** Whose record is behind the lock. Shown so nobody unlocks blind. */
  displayName: string;
  onUnlocked: () => void;
  /** Sign out instead — the way past a phone whose sensor has stopped
      working, and the only other door out of this screen. */
  onSignOut: () => void;
}

export default function AppLockScreen({ displayName, onUnlocked, onSignOut }: Props) {
  const { t: tr } = useTranslation();
  const palette = authPalette(false);
  const { width } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  /* The OS shows one prompt at a time; a second `authenticateAsync` while
     one is up resolves immediately as an error on Android, which would
     read as a failed unlock the patient never triggered. */
  const inFlight = useRef(false);

  const attempt = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const result = await unlockApp(tr('lockPrompt'));
    inFlight.current = false;
    setBusy(false);
    if (result.ok) onUnlocked();
    /* A cancel is not a failure and gets no error message — the patient
       chose it. What it does is stop the auto-prompt, so the screen can
       actually be looked at and the sign-out link reached. */
    else setDismissed(true);
  }, [onUnlocked, tr]);

  useEffect(() => {
    void attempt();
    // Once, on mount. `attempt` is stable, and re-running on a re-render
    // would be the re-firing prompt described in the header.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: palette.page }]}>
      <StatusBar style="dark" />

      <View style={styles.center}>
        <CyphixWordmark width={Math.min(width * WIDTH_RATIO, MAX_WIDTH)} />
        <Text style={[styles.name, { color: palette.heading }]} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={[styles.hint, { color: palette.body }]}>{tr('lockSubtitle')}</Text>
      </View>

      <View style={styles.actions}>
        <AuthPrimaryButton
          label={tr('lockUnlock')}
          onPress={() => void attempt()}
          palette={palette}
          busy={busy}
        />
        {/* Only after a dismissal. Offering "sign out" beside a prompt
            that has not been answered invites answering the wrong one,
            and signing out is the destructive option here — it ends the
            session on the server and the next entry needs a password. */}
        {dismissed ? (
          <AuthLinkButton
            label={tr('lockSignOut')}
            onPress={onSignOut}
            palette={palette}
            align="center"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { marginTop: 30, fontSize: 18, fontWeight: '600' },
  hint: { marginTop: 8, fontSize: 14, textAlign: 'center' },
  actions: { gap: 12 },
});

// v1.0.0 — The app lock: a device unlock in front of a session restored from
//          this phone's enclave rather than granted by a server just now.
