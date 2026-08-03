/* ==================================================================
   WelcomeStep (organism) — the door. A navy hero that says what CYPHIX
   is, and three ways in: create an account, sign in, or one of the two
   platform identities.

   The hero takes the top two thirds and the actions the bottom third,
   which is the reference's layout and also the reachable one: every
   control sits in the lower half of a large phone.

   The legal line names the Terms and the Privacy Notice. It does NOT
   link to them — those documents do not exist yet, and a link that opens
   nothing is worse than a sentence that is honest about naming them
   (tracked in PARITY.md).
   ================================================================== */

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthSecondaryButton from '@/components/atoms/Auth/AuthSecondaryButton';
import BrandLogo from '@/components/atoms/BrandLogo';
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

  return (
    <View style={[styles.root, { backgroundColor: palette.page }]}>
      <StatusBar style="light" />

      <LinearGradient
        colors={[palette.navy, palette.navyDeep]}
        style={[styles.hero, { paddingTop: insets.top + 24 }]}
      >
        <BrandLogo width={132} tint="light" />
        <Text style={[styles.title, { color: palette.onNavy, textAlign: align }]}>
          {tr('authWelcomeTitle')}
        </Text>
        <Text style={[styles.sub, { color: palette.onNavySoft, textAlign: align }]}>
          {tr('authWelcomeSub')}
        </Text>
      </LinearGradient>

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
  hero: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 28,
    paddingBottom: 28,
    gap: 10,
    /* Only the bottom corners round: the hero runs off the top of the
       screen, under the status bar. */
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  title: { fontSize: 31, lineHeight: 35, fontWeight: '600', letterSpacing: -0.6, marginTop: 8 },
  sub: { fontSize: 14.5, lineHeight: 22, maxWidth: 300 },
  actions: { paddingHorizontal: AUTH_METRICS.gutter, paddingTop: 26, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  rowRtl: { flexDirection: 'row-reverse' },
  grow: { flex: 1 },
  legal: { fontSize: 11.5, lineHeight: 17, marginTop: 8, paddingHorizontal: 2 },
});

// v1.0.0 — Navy hero + the three ways into the app.
