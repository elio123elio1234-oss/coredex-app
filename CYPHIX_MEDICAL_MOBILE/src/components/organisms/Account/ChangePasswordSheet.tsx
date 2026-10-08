/* ==================================================================
   ChangePasswordSheet (organism) — Settings → Account → "Change
   password", in the app's own bottom sheet. Two fields; the current
   password is proven by the server (a miss is its own sentence, not
   "wrong e-mail or password"), and on success every OTHER device is
   signed out — this phone stays, and the sheet says whether anything
   went. The web's ChangePasswordDialog, on a phone.

   Wires useAuth to BottomSheet/AuthField (CLAUDE.md §3.2); the fields
   start empty every time it opens — a secret is never pre-rendered.
   ================================================================== */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  MIN_PASSWORD_LENGTH,
  passwordStrength,
  type AuthErrorCode,
  type PasswordChangeResult,
} from '@cyphix/shared';
import AuthLinkButton from '@/components/atoms/Auth/AuthLinkButton';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthField from '@/components/molecules/Auth/AuthField';
import PasswordMeter from '@/components/molecules/Auth/PasswordMeter';
import BottomSheet from '@/components/molecules/BottomSheet';
import { authErrorKey } from '@/features/auth/authMessages';
import { useAuth } from '@/features/auth/useAuth';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import { authPalette } from '@/theme/authTheme';
import { useIsDark, useTheme } from '@/theme/useTheme';

/** Same scale as SignUpStep / ResetStep — one meter, one vocabulary. */
const VERDICT_KEYS: TranslationKey[] = [
  'authStrengthNone',
  'authStrengthWeak',
  'authStrengthWeak',
  'authStrengthFair',
  'authStrengthStrong',
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ChangePasswordSheet({ visible, onClose }: Props) {
  const { t: tr, rtl } = useTranslation();
  const theme = useTheme();
  const dark = useIsDark();
  const palette = authPalette(dark);
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [showNext, setShowNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [done, setDone] = useState<PasswordChangeResult | null>(null);

  useEffect(() => {
    if (visible) {
      setCurrent('');
      setNext('');
      setShowNext(false);
      setBusy(false);
      setError(null);
      setDone(null);
    }
  }, [visible]);

  const ready = current.length > 0 && next.length >= MIN_PASSWORD_LENGTH && !busy;
  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      setDone(await changePassword({ currentPassword: current, newPassword: next }));
    } catch (code) {
      setError(typeof code === 'string' ? (code as AuthErrorCode) : 'unknown');
    } finally {
      setBusy(false);
    }
  };

  const align = rtl ? ('right' as const) : ('left' as const);
  const errKey = authErrorKey(error);
  const score = passwordStrength(next);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={tr('setAccountChangePassword')}
      closeLabel={tr('acctClose')}
      scrollable
      footer={
        <View style={styles.footer}>
          {done ? (
            <AuthPrimaryButton label={tr('acctClose')} onPress={onClose} palette={palette} />
          ) : (
            <AuthPrimaryButton
              label={tr('acctSave')}
              onPress={() => void submit()}
              palette={palette}
              enabled={ready}
              busy={busy}
            />
          )}
        </View>
      }
    >
      <View style={styles.body}>
        {done ? (
          <>
            <Text style={[styles.title, { color: theme.textPrimary, textAlign: align }]}>
              {tr('setAccountPasswordChanged')}
            </Text>
            <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
              {done.revokedSessions > 0
                ? tr('setAccountPasswordChangedOthers')
                : tr('setAccountPasswordChangedAlone')}
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
              {tr('setAccountChangePasswordDesc')}
            </Text>
            <AuthField
              label={tr('setAccountCurrentPassword')}
              value={current}
              onChangeText={(v) => {
                if (error) setError(null);
                setCurrent(v);
              }}
              palette={palette}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="next"
              rtl={rtl}
            />
            <View>
              <AuthField
                label={tr('authNewPassword')}
                value={next}
                onChangeText={(v) => {
                  if (error) setError(null);
                  setNext(v);
                }}
                palette={palette}
                placeholder={tr('authPasswordHint', { n: MIN_PASSWORD_LENGTH })}
                secureTextEntry={!showNext}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
                rtl={rtl}
                trailing={
                  <AuthLinkButton
                    label={showNext ? tr('authHide') : tr('authShow')}
                    onPress={() => setShowNext((v) => !v)}
                    palette={palette}
                    size={12.5}
                    align="center"
                  />
                }
              />
              <PasswordMeter score={score} verdict={tr(VERDICT_KEYS[score])} palette={palette} />
            </View>
            {errKey && (
              <Text style={[styles.error, { color: palette.weak, textAlign: align }]}>
                {tr(errKey)}
              </Text>
            )}
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 14, paddingBottom: 8, gap: 14 },
  footer: { paddingHorizontal: 14, paddingTop: 10 },
  title: { fontSize: 20, fontWeight: '700' },
  desc: { fontSize: 14, lineHeight: 20 },
  error: { fontSize: 13.5, lineHeight: 20 },
});

// v1.0.0 — Change password from inside the account (server v0.12.0).
