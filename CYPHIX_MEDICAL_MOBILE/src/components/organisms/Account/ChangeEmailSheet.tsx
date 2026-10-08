/* ==================================================================
   ChangeEmailSheet (organism) — Settings → Account → "Change e-mail".
   The new address and the current password; on success the server has
   mailed a link to the NEW inbox and a notice to the old one, and
   NOTHING has changed yet — the sheet says exactly that, with the
   address, so nobody watches the Account row waiting for it to move.
   The link itself opens the app (cyphix://change-email?token=) and is
   spent by AuthLinkListener. The web's ChangeEmailDialog, on a phone.
   ================================================================== */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { isEmailShaped, type AuthErrorCode } from '@cyphix/shared';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthField from '@/components/molecules/Auth/AuthField';
import BottomSheet from '@/components/molecules/BottomSheet';
import { authErrorKey } from '@/features/auth/authMessages';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from '@/i18n/useTranslation';
import { authPalette } from '@/theme/authTheme';
import { useIsDark, useTheme } from '@/theme/useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ChangeEmailSheet({ visible, onClose }: Props) {
  const { t: tr, rtl } = useTranslation();
  const theme = useTheme();
  const dark = useIsDark();
  const palette = authPalette(dark);
  const { user, requestEmailChange } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setEmail('');
      setPassword('');
      setBusy(false);
      setError(null);
      setLocalError(null);
      setSentTo(null);
    }
  }, [visible]);

  const trimmed = email.trim();
  const ready = isEmailShaped(trimmed) && password.length > 0 && !busy;
  const submit = async () => {
    if (!ready) return;
    setError(null);
    setLocalError(null);
    /* The one refusal the server would also make, said here first so the
       person is not asked for a password to learn it. */
    if (trimmed.toLowerCase() === (user?.email ?? '').toLowerCase()) {
      setLocalError(tr('setAccountEmailSame'));
      return;
    }
    setBusy(true);
    try {
      await requestEmailChange({ newEmail: trimmed, password });
      setSentTo(trimmed);
    } catch (code) {
      setError(typeof code === 'string' ? (code as AuthErrorCode) : 'unknown');
    } finally {
      setBusy(false);
    }
  };

  const align = rtl ? ('right' as const) : ('left' as const);
  const errKey = authErrorKey(error);
  const errorText = localError ?? (errKey ? tr(errKey) : null);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={tr('setAccountChangeEmail')}
      closeLabel={tr('acctClose')}
      scrollable
      footer={
        <View style={styles.footer}>
          {sentTo ? (
            <AuthPrimaryButton label={tr('acctClose')} onPress={onClose} palette={palette} />
          ) : (
            <AuthPrimaryButton
              label={tr('setAccountSendLink')}
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
        {sentTo ? (
          <>
            <Text style={[styles.address, { color: theme.textPrimary, textAlign: align }]}>
              {sentTo}
            </Text>
            <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
              {tr('setAccountEmailChangeSent')}
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
              {tr('setAccountChangeEmailDesc')}
            </Text>
            <AuthField
              label={tr('setAccountNewEmail')}
              value={email}
              onChangeText={(v) => {
                if (error) setError(null);
                if (localError) setLocalError(null);
                setEmail(v);
              }}
              palette={palette}
              placeholder={tr('authEmailPlaceholder')}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              autoCapitalize="none"
              returnKeyType="next"
              rtl={rtl}
            />
            <AuthField
              label={tr('setAccountCurrentPassword')}
              value={password}
              onChangeText={(v) => {
                if (error) setError(null);
                setPassword(v);
              }}
              palette={palette}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
              rtl={rtl}
            />
            {errorText && (
              <Text style={[styles.error, { color: palette.weak, textAlign: align }]}>
                {errorText}
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
  address: { fontSize: 17, fontWeight: '700' },
  desc: { fontSize: 14, lineHeight: 20 },
  error: { fontSize: 13.5, lineHeight: 20 },
});

// v1.0.0 — Change e-mail: link to the new address, nothing moves until it is opened (server v0.12.0).
