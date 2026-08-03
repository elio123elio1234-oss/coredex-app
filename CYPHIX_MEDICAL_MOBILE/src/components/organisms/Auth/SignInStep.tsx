/* ==================================================================
   SignInStep (organism) — email, password, and the two shortcuts around
   them: "Forgot password?" and biometric unlock.

   ── Face ID / fingerprint ──
   The button is drawn ONLY when the device actually has an enrolled
   biometric AND this device remembers an account. Offering "Use Face ID"
   on a phone with no face enrolled, or on a fresh install with no
   account to unlock, is an offer that cannot be honoured — and the one
   place a medical app must not bluff is its front door.
   ================================================================== */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AuthLinkButton from '@/components/atoms/Auth/AuthLinkButton';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthSecondaryButton from '@/components/atoms/Auth/AuthSecondaryButton';
import AuthStepHeader from '@/components/molecules/Auth/AuthStepHeader';
import AuthField from '@/components/molecules/Auth/AuthField';
import AuthStepLayout from '@/components/templates/AuthStepLayout';
import { useTranslation } from '@/i18n/useTranslation';
import { biometricLabelKey, canUseBiometrics } from '@/services/auth/biometrics';
import type { AuthPalette } from '@/theme/authTheme';
import type { TranslationKey } from '@/i18n/config';

interface Props {
  palette: AuthPalette;
  email: string;
  password: string;
  onChangeEmail: (v: string) => void;
  onChangePassword: (v: string) => void;
  onBack: () => void;
  onForgot: () => void;
  onSubmit: () => void;
  onBiometric: () => void;
  /** Already translated line for a failed attempt, or null. */
  errorMessage: string | null;
  busy: boolean;
  ready: boolean;
  rtl: boolean;
}

export default function SignInStep({
  palette,
  email,
  password,
  onChangeEmail,
  onChangePassword,
  onBack,
  onForgot,
  onSubmit,
  onBiometric,
  errorMessage,
  busy,
  ready,
  rtl,
}: Props) {
  const { t: tr } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [biometric, setBiometric] = useState<TranslationKey | null>(null);
  const align = rtl ? ('right' as const) : ('left' as const);

  useEffect(() => {
    let alive = true;
    void canUseBiometrics().then(async (available) => {
      if (!alive) return;
      setBiometric(available ? await biometricLabelKey() : null);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <AuthStepLayout
      background={palette.page}
      keyboard
      scroll
      header={
        <AuthStepHeader
          onBack={onBack}
          palette={palette}
          backLabel={tr('authBack')}
          rtl={rtl}
        />
      }
      footer={
        <>
          <AuthPrimaryButton
            label={tr('authSignIn')}
            onPress={onSubmit}
            palette={palette}
            enabled={ready}
            busy={busy}
          />
          {biometric != null && (
            <AuthSecondaryButton
              label={tr(biometric)}
              onPress={onBiometric}
              palette={palette}
              leading={<View style={[styles.faceMark, { borderColor: palette.teal }]} />}
            />
          )}
        </>
      }
    >
      <Text style={[styles.title, { color: palette.heading, textAlign: align }]}>
        {tr('authSignInTitle')}
      </Text>
      <Text style={[styles.sub, { color: palette.body, textAlign: align }]}>
        {tr('authSignInSub')}
      </Text>

      <View style={styles.fields}>
        <AuthField
          label={tr('authEmail')}
          value={email}
          onChangeText={onChangeEmail}
          palette={palette}
          placeholder={tr('authEmailPlaceholder')}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          rtl={rtl}
        />
        <AuthField
          label={tr('authPassword')}
          value={password}
          onChangeText={onChangePassword}
          palette={palette}
          placeholder={tr('authPasswordPlaceholder')}
          secureTextEntry={!showPassword}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
          rtl={rtl}
          trailing={
            <AuthLinkButton
              label={showPassword ? tr('authHide') : tr('authShow')}
              onPress={() => setShowPassword((v) => !v)}
              palette={palette}
              size={12.5}
              align="center"
            />
          }
        />
      </View>

      <AuthLinkButton
        label={tr('authForgot')}
        onPress={onForgot}
        palette={palette}
        align={rtl ? 'flex-end' : 'flex-start'}
      />

      {errorMessage != null && (
        <Text style={[styles.error, { color: palette.weak, textAlign: align }]}>
          {errorMessage}
        </Text>
      )}
    </AuthStepLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '600', letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 21, marginBottom: 26 },
  fields: { gap: 16 },
  /* The reference's rounded square standing in for the platform's own
     biometric glyph — drawn, not an icon font. */
  faceMark: { width: 20, height: 20, borderRadius: 6, borderWidth: 2 },
  error: { fontSize: 13.5, lineHeight: 19, marginTop: 14 },
});

// v1.0.0 — Sign-in: credentials, forgot-password, biometric unlock.
