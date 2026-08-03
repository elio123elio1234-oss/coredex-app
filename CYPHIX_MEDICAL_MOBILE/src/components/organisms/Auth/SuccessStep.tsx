/* ==================================================================
   SuccessStep (organism) — the account exists. One pulse ring, a filled
   check, and the next thing worth doing: pairing the device.

   Both buttons enter the app. That is the reference's own behaviour and
   it is the honest one here — the pairing card lives on the home screen,
   so "Pair my device" cannot mean anything more specific until the flow
   can hand the home screen an intent (tracked in PARITY.md). The primary
   button still says what to do next, which is most of its job.
   ================================================================== */

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import FadeUpView from '@/components/atoms/Auth/FadeUpView';
import PulseRing from '@/components/atoms/Auth/PulseRing';
import AuthLinkButton from '@/components/atoms/Auth/AuthLinkButton';
import { useTranslation } from '@/i18n/useTranslation';
import { AUTH_METRICS, type AuthPalette } from '@/theme/authTheme';

interface Props {
  palette: AuthPalette;
  onEnter: () => void;
}

export default function SuccessStep({ palette, onEnter }: Props) {
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: palette.navy }]}>
      <StatusBar style="light" />

      <View style={styles.mark}>
        <PulseRing color={palette.teal} duration={2200} />
        <View style={[styles.disc, { backgroundColor: palette.teal }]}>
          <Text style={[styles.check, { color: palette.navy }]} allowFontScaling={false}>
            ✓
          </Text>
        </View>
      </View>

      <FadeUpView delay={120}>
        <Text style={[styles.title, { color: palette.onNavy }]}>{tr('authSuccessTitle')}</Text>
      </FadeUpView>
      <FadeUpView delay={220}>
        <Text style={[styles.sub, { color: palette.onNavySoft }]}>{tr('authSuccessSub')}</Text>
      </FadeUpView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <AuthPrimaryButton
          label={tr('authPairDevice')}
          onPress={onEnter}
          palette={palette}
          tone="white"
        />
        <AuthLinkButton
          label={tr('authLater')}
          onPress={onEnter}
          palette={palette}
          size={14}
          align="center"
          color={palette.onNavySoft}
          style={styles.later}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  mark: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  disc: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center' },
  check: { fontSize: 34, fontWeight: '600', lineHeight: 40 },
  title: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.56,
    textAlign: 'center',
    marginBottom: 10,
  },
  sub: { fontSize: 14.5, lineHeight: 22, textAlign: 'center', maxWidth: 280 },
  actions: {
    position: 'absolute',
    left: AUTH_METRICS.gutter,
    right: AUTH_METRICS.gutter,
    bottom: 0,
    gap: 4,
  },
  later: { alignSelf: 'center', paddingVertical: 10 },
});

// v1.0.0 — Account created; the way into the app.
