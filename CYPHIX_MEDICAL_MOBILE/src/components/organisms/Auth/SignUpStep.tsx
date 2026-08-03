/* ==================================================================
   SignUpStep (organism) — name, address, password, and the strength
   meter under it. "Step 1 of 3 · Credentials" names the three phases the
   patient is about to go through (credentials → phone → health profile),
   so the flow is not an unbounded corridor.

   The address is checked for an existing account HERE, on the step that
   owns the field, rather than at the end where the answer arrives after
   five more screens of typing.
   ================================================================== */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MIN_PASSWORD_LENGTH, passwordStrength } from '@cyphix/shared';
import AuthLinkButton from '@/components/atoms/Auth/AuthLinkButton';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthField from '@/components/molecules/Auth/AuthField';
import AuthStepHeader from '@/components/molecules/Auth/AuthStepHeader';
import PasswordMeter from '@/components/molecules/Auth/PasswordMeter';
import AuthStepLayout from '@/components/templates/AuthStepLayout';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import type { AuthPalette } from '@/theme/authTheme';

interface Props {
  palette: AuthPalette;
  fullName: string;
  email: string;
  password: string;
  onChangeName: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onChangePassword: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  onSignInInstead: () => void;
  /** Already translated, or null. */
  errorMessage: string | null;
  /** True when the message above is "that address already has an account". */
  offerSignIn: boolean;
  busy: boolean;
  ready: boolean;
  rtl: boolean;
}

const VERDICT_KEYS: TranslationKey[] = [
  'authStrengthNone',
  'authStrengthWeak',
  'authStrengthWeak',
  'authStrengthFair',
  'authStrengthStrong',
];

export default function SignUpStep({
  palette,
  fullName,
  email,
  password,
  onChangeName,
  onChangeEmail,
  onChangePassword,
  onBack,
  onNext,
  onSignInInstead,
  errorMessage,
  offerSignIn,
  busy,
  ready,
  rtl,
}: Props) {
  const { t: tr } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const align = rtl ? ('right' as const) : ('left' as const);
  const score = passwordStrength(password);

  return (
    <AuthStepLayout
      background={palette.page}
      keyboard
      scroll
      header={
        <AuthStepHeader onBack={onBack} palette={palette} backLabel={tr('authBack')} rtl={rtl} />
      }
      footer={
        <AuthPrimaryButton
          label={tr('authContinue')}
          onPress={onNext}
          palette={palette}
          enabled={ready}
          busy={busy}
        />
      }
    >
      <Text style={[styles.title, { color: palette.heading, textAlign: align }]}>
        {tr('authSignUpTitle')}
      </Text>
      <Text style={[styles.sub, { color: palette.body, textAlign: align }]}>
        {tr('authSignUpStep')}
      </Text>

      <View style={styles.fields}>
        <AuthField
          label={tr('authFullName')}
          value={fullName}
          onChangeText={onChangeName}
          palette={palette}
          placeholder={tr('authNamePlaceholder')}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="next"
          rtl={rtl}
        />
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
        <View>
          <AuthField
            label={tr('authPassword')}
            value={password}
            onChangeText={onChangePassword}
            palette={palette}
            placeholder={tr('authPasswordHint', { n: MIN_PASSWORD_LENGTH })}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
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
          <PasswordMeter
            score={score}
            verdict={tr(VERDICT_KEYS[score])}
            palette={palette}
          />
        </View>
      </View>

      {errorMessage != null && (
        <View style={styles.errorBlock}>
          <Text style={[styles.error, { color: palette.weak, textAlign: align }]}>
            {errorMessage}
          </Text>
          {offerSignIn && (
            <AuthLinkButton
              label={tr('authSignInInstead')}
              onPress={onSignInInstead}
              palette={palette}
              align={rtl ? 'flex-end' : 'flex-start'}
            />
          )}
        </View>
      )}
    </AuthStepLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '600', letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 21, marginBottom: 24 },
  fields: { gap: 16 },
  errorBlock: { marginTop: 16 },
  error: { fontSize: 13.5, lineHeight: 19 },
});

// v1.0.0 — Credentials step with live strength meter and early address check.
