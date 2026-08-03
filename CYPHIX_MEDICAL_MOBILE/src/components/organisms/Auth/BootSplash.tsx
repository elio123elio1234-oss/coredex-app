/* ==================================================================
   BootSplash (organism) — the first thing anyone sees: the CYPHIX
   lockup, large, on white.

   It is shown while the device is checked for a stored session, and for
   a moment longer so the entrance completes rather than being cut off by
   a fast disk. That is the whole reason it has a minimum: a splash that
   flickers reads as a fault, and this is the frame in which the app says
   what it is.

   ── How big, and why it is measured rather than typed ──
   A fixed point size is a guess that is wrong on every screen but one —
   210 pt looked deliberate in a mock-up and small on a real phone. The
   lockup is 82 % of the window's width instead, capped at 460 so a
   tablet does not get a billboard. It is the only thing on the screen;
   it should look like it.

   ── What used to be here, and why it is gone ──
   The design reference put a pulsing ring with a stylised ECG trace
   drawing itself inside it above the wordmark. It is out at the user's
   instruction: it is not the CYPHIX identity, and a mark that behaves
   like a logo without being one teaches people the wrong thing to
   recognise.

   The version is printed under the tagline deliberately — it is the one
   screen everybody reaches, so "is my build actually on the phone?" is
   answered without opening Settings.
   ================================================================== */

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import FadeUpView from '@/components/atoms/Auth/FadeUpView';
import CyphixLogo from '@/components/atoms/CyphixLogo';
import { APP_VERSION } from '@/config/version';
import { LABEL_TYPE, authPalette } from '@/theme/authTheme';
import { useTranslation } from '@/i18n/useTranslation';
import { useIsDark } from '@/theme/useTheme';

/** Share of the window the lockup takes, and the point it stops growing. */
const WIDTH_RATIO = 0.82;
const MAX_WIDTH = 460;

export default function BootSplash() {
  /* White is what the brand file is drawn for, so light is the default and
     the case that matters. Dark still gets the app's own dark surface: an
     opening frame of white at 2 a.m., on a phone whose owner set the app
     dark, is the same flash `PreferencesGate` exists to prevent. */
  const dark = useIsDark();
  const palette = authPalette(dark);
  const { t: tr } = useTranslation();
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * WIDTH_RATIO, MAX_WIDTH);

  return (
    <View style={[styles.root, { backgroundColor: dark ? palette.page : '#FFFFFF' }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />

      <FadeUpView delay={120}>
        <CyphixLogo width={logoWidth} tint={dark ? 'light' : 'brand'} />
      </FadeUpView>

      <View style={styles.footer}>
        <FadeUpView delay={520}>
          <Text style={[styles.tagline, { color: palette.label }]} allowFontScaling={false}>
            {tr('authTagline')}
          </Text>
        </FadeUpView>
        <FadeUpView delay={720}>
          <Text style={[styles.version, { color: palette.muted }]} allowFontScaling={false}>
            {`v${APP_VERSION}`}
          </Text>
        </FadeUpView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', bottom: 56, alignItems: 'center', gap: 8 },
  tagline: { ...LABEL_TYPE, fontSize: 11, letterSpacing: 1.54 },
  version: { fontSize: 10, letterSpacing: 0.6, opacity: 0.7 },
});

// v1.2.0 — White screen, and the lockup is sized from the window (82 %, capped
//          at 460) instead of a fixed 210 pt that read as small on a phone.
