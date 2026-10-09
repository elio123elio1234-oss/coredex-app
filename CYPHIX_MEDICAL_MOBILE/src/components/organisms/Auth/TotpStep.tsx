/* ==================================================================
   TotpStep (organism) — the sign-in's second step: the password was
   right and the account asks for a code from an authenticator app
   (server v0.24.0, LAUNCH_PLAN 5.5). One field that takes the six
   digits OR a recovery code; Verify spends the challenge the slice is
   holding; back (the header, the link, the hardware button) drops it.
   A dead challenge (five minutes, or spent) is said in words and the
   only way on is back to the password. The web's TotpCodeForm, on a
   phone.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import AuthLinkButton from '@/components/atoms/Auth/AuthLinkButton';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthField from '@/components/molecules/Auth/AuthField';
import AuthStepHeader from '@/components/molecules/Auth/AuthStepHeader';
import AuthStepLayout from '@/components/templates/AuthStepLayout';
import { useTranslation } from '@/i18n/useTranslation';
import type { AuthPalette } from '@/theme/authTheme';

interface Props {
  palette: AuthPalette;
  rtl: boolean;
  code: string;
  onChangeCode: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  /** Already translated, or null. */
  errorMessage: string | null;
  /** The server said the challenge is dead: hide the field, offer the way back. */
  expired: boolean;
  busy: boolean;
  ready: boolean;
}

export default function TotpStep({
  palette,
  rtl,
  code,
  onChangeCode,
  onSubmit,
  onBack,
  errorMessage,
  expired,
  busy,
  ready,
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
          label={tr('authTotpBtn')}
          onPress={onSubmit}
          palette={palette}
          enabled={ready && !expired}
          busy={busy}
        />
      }
    >
      <Text style={[styles.title, { color: palette.heading, textAlign: align }]}>
        {tr('authTotpTitle')}
      </Text>
      <Text style={[styles.sub, { color: palette.body, textAlign: align }]}>
        {tr('authTotpHint')}
      </Text>

      {!expired && (
        <AuthField
          label={tr('authTotpLabel')}
          value={code}
          onChangeText={onChangeCode}
          palette={palette}
          placeholder={tr('totpCodePlaceholder')}
          autoCapitalize="characters"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
          rtl={rtl}
        />
      )}

      {errorMessage != null && (
        <Text style={[styles.error, { color: palette.weak, textAlign: align }]}>
          {errorMessage}
        </Text>
      )}

      <View style={styles.links}>
        <AuthLinkButton
          label={tr('authTotpCancel')}
          onPress={onBack}
          palette={palette}
          align={rtl ? 'flex-end' : 'flex-start'}
        />
      </View>
    </AuthStepLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '600', letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 21, marginBottom: 26 },
  error: { fontSize: 13.5, lineHeight: 19, marginTop: 14 },
  links: { marginTop: 16 },
});

// v1.0.0 — The sign-in's code step (TOTP or a recovery code), server v0.24.0.
