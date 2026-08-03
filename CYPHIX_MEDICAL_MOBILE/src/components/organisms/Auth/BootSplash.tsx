/* ==================================================================
   BootSplash (organism) — the first thing anyone sees: the full CYPHIX
   lockup on navy, landing with the tagline behind it.

   It is shown while the device is checked for a stored session, and for
   a moment longer so the entrance completes rather than being cut off by
   a fast disk. That is the whole reason it has a minimum: a splash that
   flickers reads as a fault, and this is the frame in which the app says
   what it is.

   ── How big, and why it is measured rather than typed ──
   `BrandLogo` was drawn at a flat 210 pt here, which is a guess that is
   right on exactly one screen — deliberate in a mock-up, small on a real
   phone. It is 82 % of the window's width instead, capped at 460 so a
   tablet does not get a billboard. The lockup is wide and thin (aspect
   ≈ 5.8), so a near-full-width setting reads as confident rather than
   loud: ~320 pt on a standard iPhone against the old 210.

   ── What used to be here, and why it is gone ──
   The design reference put a pulsing ring with a stylised ECG trace
   drawing itself inside it above the wordmark. It is out at the user's
   instruction: it is not part of the CYPHIX identity, and a mark that
   behaves like a logo but is not one is worse than no mark. The brand
   lockup carries the screen on its own.

   The version is printed under the tagline deliberately — it is the one
   screen everybody reaches, so "is my build actually on the phone?" is
   answered without opening Settings.
   ================================================================== */

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import FadeUpView from '@/components/atoms/Auth/FadeUpView';
import BrandLogo from '@/components/atoms/BrandLogo';
import { APP_VERSION } from '@/config/version';
import { LABEL_TYPE, authPalette } from '@/theme/authTheme';
import { useTranslation } from '@/i18n/useTranslation';

/** Share of the window the lockup takes, and the point it stops growing. */
const WIDTH_RATIO = 0.82;
const MAX_WIDTH = 460;

export default function BootSplash() {
  const palette = authPalette(false); // the splash is navy in both themes
  const { t: tr } = useTranslation();
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * WIDTH_RATIO, MAX_WIDTH);

  return (
    <View style={[styles.root, { backgroundColor: palette.navy }]}>
      {/* Light glyphs: this screen is navy whatever the phone's theme is. */}
      <StatusBar style="light" />

      <FadeUpView delay={120}>
        <BrandLogo width={logoWidth} tint="light" />
      </FadeUpView>

      <View style={styles.footer}>
        <FadeUpView delay={520}>
          <Text style={[styles.tagline, { color: palette.onNavyFaint }]} allowFontScaling={false}>
            {tr('authTagline')}
          </Text>
        </FadeUpView>
        <FadeUpView delay={720}>
          <Text style={[styles.version, { color: palette.onNavyFaint }]} allowFontScaling={false}>
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

// v1.3.0 — Back to the navy screen and the full `BrandLogo` (v0.19.3's white
//          screen + mark-only lockup is reverted), keeping the one thing that
//          was actually wanted: the lockup is sized from the window (82 %,
//          capped at 460) instead of a fixed 210 pt.
