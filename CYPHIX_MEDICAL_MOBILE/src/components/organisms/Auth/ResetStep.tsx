/* ==================================================================
   ResetStep (organism) — where the e-mailed reset link lands: one
   password field with the sign-up's strength meter, one button.

   Reached only through a `cyphix://reset-password?token=…` link (never
   from a tap inside the flow), so there is nothing to confirm about the
   person — the token IS the proof. Success is a sign-in: the server has
   already ended every other session and the gate opens the app. A dead
   link (expired, already used, forged) is one state with one way out:
   "Request a new link", which goes to the forgot screen.
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

/** Same scale as SignUpStep — one meter, one vocabulary. */
const VERDICT_KEYS: TranslationKey[] = [
  'authStrengthNone',
  'authStrengthWeak',
  'authStrengthWeak',
  'authStrengthFair',
  'authStrengthStrong',
];

interface Props {
  palette: AuthPalette;
  rtl: boolean;
  password: string;
  onChangePassword: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onRequestNewLink: () => void;
  busy: boolean;
  ready: boolean;
  errorMessage: string | null;
  /** The server said the link is spent or expired: hide the field, offer
      a new link. Editing must not resurrect a form that cannot succeed. */
  linkDead: boolean;
}

export default function ResetStep({
  palette,
  rtl,
  password,
  onChangePassword,
  onSubmit,
  onBack,
  onRequestNewLink,
  busy,
  ready,
  errorMessage,
  linkDead,
}: Props) {
  const { t: tr } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const align = rtl ? ('right' as const) : ('left' as const);
  const score = passwordStrength(password);

  return (
    <AuthStepLayout
      background={palette.page}
      keyboard
      header={
        <AuthStepHeader onBack={onBack} palette={palette} backLabel={tr('authBack')} rtl={rtl} />
      }
      footer={
        <AuthPrimaryButton
          label={tr('authSetPassword')}
          onPress={onSubmit}
          palette={palette}
          enabled={ready && !linkDead}
          busy={busy}
        />
      }
    >
      <Text style={[styles.title, { color: palette.heading, textAlign: align }]}>
        {tr('authNewPasswordTitle')}
      </Text>
      <Text style={[styles.sub, { color: palette.body, textAlign: align }]}>
        {tr('authNewPasswordSub')}
      </Text>

      {!linkDead && (
        <View>
          <AuthField
            label={tr('authNewPassword')}
            value={password}
            onChangeText={onChangePassword}
            palette={palette}
            placeholder={tr('authPasswordHint', { n: MIN_PASSWORD_LENGTH })}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
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
          <PasswordMeter score={score} verdict={tr(VERDICT_KEYS[score])} palette={palette} />
        </View>
      )}

      {errorMessage != null && (
        <View style={styles.errorBlock}>
          <Text style={[styles.error, { color: palette.weak, textAlign: align }]}>
            {errorMessage}
          </Text>
          {linkDead && (
            <AuthLinkButton
              label={tr('authRequestNewLink')}
              onPress={onRequestNewLink}
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
  sub: { fontSize: 14, lineHeight: 21, marginBottom: 26 },
  errorBlock: { marginTop: 14, gap: 6 },
  error: { fontSize: 13.5, lineHeight: 20 },
});

// v1.0.0 — The reset link's step (server v0.11.0): one field, sign-in on success.
