/* ==================================================================
   BootSplash (organism) — the first thing anyone sees: the mark drawing
   its own heartbeat inside two pulse rings, the wordmark landing at
   350 ms, the tagline at 700 ms.

   It is shown while the device is checked for a stored session, and for
   a moment longer so the animation completes rather than being cut off
   by a fast disk. That is the whole reason it has a minimum: a splash
   that flickers reads as a fault, and this is the frame in which the app
   says what it is.

   The version is printed under the tagline deliberately — it is the one
   screen everybody reaches, so "is my build actually on the phone?" is
   answered without opening Settings.
   ================================================================== */

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import EcgSweepMark from '@/components/atoms/Auth/EcgSweepMark';
import FadeUpView from '@/components/atoms/Auth/FadeUpView';
import PulseRing from '@/components/atoms/Auth/PulseRing';
import BrandLogo from '@/components/atoms/BrandLogo';
import { APP_VERSION } from '@/config/version';
import { LABEL_TYPE, authPalette } from '@/theme/authTheme';
import { useTranslation } from '@/i18n/useTranslation';

const MARK_SIZE = 96;

export default function BootSplash() {
  const palette = authPalette(false); // the splash is navy in both themes
  const { t: tr } = useTranslation();

  return (
    <View style={[styles.root, { backgroundColor: palette.navy }]}>
      {/* Light glyphs: this screen is navy whatever the phone's theme is. */}
      <StatusBar style="light" />

      <View style={styles.mark}>
        <PulseRing color={palette.teal} />
        <PulseRing color={palette.teal} delay={600} />
        <EcgSweepMark width={78} color={palette.teal} />
      </View>

      <FadeUpView delay={350}>
        <BrandLogo width={172} tint="light" />
      </FadeUpView>

      <View style={styles.footer}>
        <FadeUpView delay={700}>
          <Text style={[styles.tagline, { color: palette.onNavyFaint }]} allowFontScaling={false}>
            {tr('authTagline')}
          </Text>
        </FadeUpView>
        <FadeUpView delay={900}>
          <Text style={[styles.version, { color: palette.onNavyFaint }]} allowFontScaling={false}>
            {`v${APP_VERSION}`}
          </Text>
        </FadeUpView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26 },
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { position: 'absolute', bottom: 56, alignItems: 'center', gap: 8 },
  tagline: { ...LABEL_TYPE, fontSize: 11, letterSpacing: 1.54 },
  version: { fontSize: 10, letterSpacing: 0.6, opacity: 0.7 },
});

// v1.0.0 — Navy splash: drawn ECG mark, pulse rings, staggered wordmark.
