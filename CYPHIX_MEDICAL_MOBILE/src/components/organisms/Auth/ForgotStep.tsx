/* ==================================================================
   ForgotStep (organism) — one field and one button.

   The confirmation deliberately does NOT say "we sent you an email". It
   says a link is on its way IF that address is on an account, because
   confirming which addresses exist is an enumeration oracle — and
   because, in this stage, no mail server exists at all. The wording is
   true either way, which is the only wording worth shipping.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthField from '@/components/molecules/Auth/AuthField';
import AuthStepHeader from '@/components/molecules/Auth/AuthStepHeader';
import AuthStepLayout from '@/components/templates/AuthStepLayout';
import { useTranslation } from '@/i18n/useTranslation';
import { AUTH_METRICS, type AuthPalette } from '@/theme/authTheme';

interface Props {
  palette: AuthPalette;
  email: string;
  onChangeEmail: (v: string) => void;
  onBack: () => void;
  onSend: () => void;
  sent: boolean;
  ready: boolean;
  rtl: boolean;
}

export default function ForgotStep({
  palette,
  email,
  onChangeEmail,
  onBack,
  onSend,
  sent,
  ready,
  rtl,
}: Props) {
  const { t: tr } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);

  return (
    <AuthStepLayout
      background={palette.page}
      keyboard
      header={
        <AuthStepHeader onBack={onBack} palette={palette} backLabel={tr('authBack')} rtl={rtl} />
      }
      footer={
        <AuthPrimaryButton
          label={tr('authSendReset')}
          onPress={onSend}
          palette={palette}
          enabled={ready}
        />
      }
    >
      <Text style={[styles.title, { color: palette.heading, textAlign: align }]}>
        {tr('authResetTitle')}
      </Text>
      <Text style={[styles.sub, { color: palette.body, textAlign: align }]}>
        {tr('authResetSub')}
      </Text>

      <AuthField
        label={tr('authEmail')}
        value={email}
        onChangeText={onChangeEmail}
        palette={palette}
        placeholder={tr('authEmailPlaceholder')}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="go"
        onSubmitEditing={onSend}
        rtl={rtl}
      />

      {sent && (
        <View
          accessibilityRole="alert"
          style={[
            styles.banner,
            { backgroundColor: palette.tealSoft, borderColor: palette.tealSoftBorder },
          ]}
        >
          <Text style={[styles.bannerText, { color: palette.heading, textAlign: align }]}>
            {tr('authResetSent')}
          </Text>
        </View>
      )}
    </AuthStepLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '600', letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 21, marginBottom: 26 },
  banner: {
    marginTop: 18,
    padding: 15,
    borderWidth: 1,
    borderRadius: AUTH_METRICS.fieldRadius,
  },
  bannerText: { fontSize: 13.5, lineHeight: 20 },
});

// v1.0.0 — Password reset request (enumeration-safe confirmation).
