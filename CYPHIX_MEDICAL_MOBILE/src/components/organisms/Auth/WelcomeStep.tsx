/* ==================================================================
   WelcomeStep (organism) — the door. A photograph of the product being
   used, the wordmark and the promise over it, and three ways in.

   ── Why a photograph and not the reference's navy panel ──
   The reference fills the top two thirds with flat navy. The picture
   says the same sentence faster: this is a device an older person puts
   on their own wrist, at home, without help. Everything else about the
   panel is unchanged — the same 34 pt bottom corners, the same type, the
   same white on navy.

   ── The scrim is structural, not decoration ──
   The photo is warm and LIGHT, and white type on it would be unreadable
   in exactly the places the eye lands. So a navy gradient sits between
   them: clear at the top where the image is the subject, opaque at the
   bottom where the words are. The headline is therefore always on navy,
   whatever the picture is doing underneath — which is also what keeps
   the light status-bar glyphs legible at the top edge.

   The legal line names the Terms and the Privacy Notice and does NOT
   link to them: those documents do not exist yet, and a link that opens
   nothing is worse than a sentence that names them (tracked in
   PARITY.md).
   ================================================================== */

import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HERO_IMAGE } from '@/services/media/heroImage';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthSecondaryButton from '@/components/atoms/Auth/AuthSecondaryButton';
import CyphixWordmark from '@/components/atoms/CyphixWordmark';
import { useTranslation } from '@/i18n/useTranslation';
import { AUTH_METRICS, type AuthPalette } from '@/theme/authTheme';

interface Props {
  palette: AuthPalette;
  onCreateAccount: () => void;
  onSignIn: () => void;
  rtl: boolean;
}

export default function WelcomeStep({ palette, onCreateAccount, onSignIn, rtl }: Props) {
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const align = rtl ? ('right' as const) : ('left' as const);
  /* The photograph is prefetched during the splash (heroImage.ts), so it
     is normally ready before this mounts. When it is not — a cold Expo Go
     over Wi-Fi — it FADES IN over the navy instead of appearing between
     two frames. The wordmark and the headline never wait for it: they sit
     on the scrim, which is drawn over navy whether there is a picture
     behind it or not. */
  const heroOpacity = useSharedValue(0);
  const heroStyle = useAnimatedStyle(() => ({ opacity: heroOpacity.value }));

  return (
    <View style={[styles.root, { backgroundColor: palette.page }]}>
      <StatusBar style="light" />

      <View style={styles.hero}>
        {/* Layered by hand rather than with ImageBackground: only the
            PHOTO may fade. Fading the container would take the gradient
            and the type with it, which is the flicker this fixes. One
            image, decoded once, revealed when it is actually ready. */}
        <Animated.View style={[StyleSheet.absoluteFill, heroStyle]} pointerEvents="none">
          <Image
            source={HERO_IMAGE}
            resizeMode="cover"
            style={styles.photoLayer}
            onLoad={() => {
              heroOpacity.value = withTiming(1, { duration: 260 });
            }}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>

        <View style={styles.photo}>
          {/* Two jobs, one gradient: a light wash at the very top so the
              status bar stays readable, and a solid base at the bottom
              for the type. The middle stays clear — that is the picture. */}
          <LinearGradient
            colors={[
              'rgba(13,32,65,0.45)',
              'rgba(13,32,65,0.10)',
              'rgba(13,32,65,0.72)',
              'rgba(13,32,65,0.97)',
            ]}
            locations={[0, 0.28, 0.68, 1]}
            style={styles.scrim}
          />
          <View style={[styles.copy, { paddingTop: insets.top + 24 }]}>
            <CyphixWordmark width={124} tint="light" />
            <Text style={[styles.title, { color: palette.onNavy, textAlign: align }]}>
              {tr('authWelcomeTitle')}
            </Text>
            <Text style={[styles.sub, { color: palette.onNavySoft, textAlign: align }]}>
              {tr('authWelcomeSub')}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
        <AuthPrimaryButton
          label={tr('authCreateAccount')}
          onPress={onCreateAccount}
          palette={palette}
        />
        <View style={[styles.row, rtl && styles.rowRtl]}>
          <AuthSecondaryButton
            label={tr('authSignIn')}
            onPress={onSignIn}
            palette={palette}
            style={styles.grow}
          />
          {/* The two platform identities. They land on the same form for
              now — see PARITY.md: neither Apple nor Google sign-in can be
              wired until the server holds the client secrets. */}
          <AuthSecondaryButton
            label="Ap"
            accessibilityLabel={tr('authAppleSignIn')}
            onPress={onSignIn}
            palette={palette}
            square
          />
          <AuthSecondaryButton
            label="G"
            accessibilityLabel={tr('authGoogleSignIn')}
            onPress={onSignIn}
            palette={palette}
            square
          />
        </View>
        <Text style={[styles.legal, { color: palette.label, textAlign: align }]}>
          {tr('authLegalBefore')}
          <Text style={{ color: palette.body, fontWeight: '600' }}>{tr('authLegalTerms')}</Text>
          {tr('authLegalAnd')}
          <Text style={{ color: palette.body, fontWeight: '600' }}>{tr('authLegalPrivacy')}</Text>
          {tr('authLegalAfter')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  /* The rounding lives on this WRAPPER, not on the image: an Image is a
     native view that ignores a parent's radius on Android unless the clip
     is on the view that owns `overflow`. The navy here is also what the
     photograph fades IN from, so it is load-bearing, not a fallback. */
  hero: {
    flex: 1,
    overflow: 'hidden',
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    backgroundColor: '#0D2041',
  },
  /* The photograph fills the hero; the copy layer sits over it. Both are
     `flex: 1` so the two stay the same box whatever the screen height. */
  photoLayer: { width: '100%', height: '100%' },
  photo: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject },
  copy: { paddingHorizontal: 28, paddingBottom: 28, gap: 10 },
  title: { fontSize: 31, lineHeight: 35, fontWeight: '600', letterSpacing: -0.6, marginTop: 8 },
  sub: { fontSize: 14.5, lineHeight: 22, maxWidth: 300 },
  actions: { paddingHorizontal: AUTH_METRICS.gutter, paddingTop: 26, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  rowRtl: { flexDirection: 'row-reverse' },
  grow: { flex: 1 },
  legal: { fontSize: 11.5, lineHeight: 17, marginTop: 8, paddingHorizontal: 2 },
});

// v2.0.0 — The photograph FADES IN when it is ready instead of appearing
//          between two frames: the layers are explicit now (image / scrim /
//          copy), so only the picture animates and the wordmark never waits
//          for it. Prefetched during the splash — see services/media/heroImage.
// v1.1.0 — The hero is the product in use, with a navy scrim under the type;
//          the lockup is the text-only wordmark.
