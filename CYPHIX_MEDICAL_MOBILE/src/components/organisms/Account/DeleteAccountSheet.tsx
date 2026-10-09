/* ==================================================================
   DeleteAccountSheet (organism) — Settings → Account → "Delete
   account", in the app's own bottom sheet. One field: the password,
   proven by the server (a miss is its own sentence). On success nothing
   is erased yet — the account is SCHEDULED, 14 days out, and the sheet
   says the day; the Settings row then reads "Deletion scheduled" and
   cancels it. The web's DeleteAccountDialog, on a phone.

   Wires useAccountLifecycle to BottomSheet/AuthField (CLAUDE.md §3.2);
   the field starts empty every time it opens — a secret is never
   pre-rendered. The destructive button is grey until something is typed
   (the grey state still fires; `submit` guards it).
   ================================================================== */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthError, DELETION_GRACE_DAYS, type AuthErrorCode, type DeletionStatus } from '@cyphix/shared';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthField from '@/components/molecules/Auth/AuthField';
import BottomSheet from '@/components/molecules/BottomSheet';
import { authErrorKey } from '@/features/auth/authMessages';
import { useTranslation } from '@/i18n/useTranslation';
import { authPalette } from '@/theme/authTheme';
import { useIsDark, useTheme } from '@/theme/useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Rejects with an AuthError (`wrong-password`) — rendered in the sheet. */
  requestDeletion: (password: string) => Promise<DeletionStatus>;
}

/** "9 October 2026" / "9 באוקטובר 2026" — the day the account goes. */
export function formatDeletionDay(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DeleteAccountSheet({ visible, onClose, requestDeletion }: Props) {
  const { t: tr, rtl, lang } = useTranslation();
  const theme = useTheme();
  const dark = useIsDark();
  const palette = authPalette(dark);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [done, setDone] = useState<DeletionStatus | null>(null);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setBusy(false);
      setError(null);
      setDone(null);
    }
  }, [visible]);

  const ready = password.length > 0 && !busy;
  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      setDone(await requestDeletion(password));
    } catch (err) {
      setError(err instanceof AuthError ? err.code : typeof err === 'string' ? (err as AuthErrorCode) : 'unknown');
    } finally {
      setBusy(false);
    }
  };

  const align = rtl ? ('right' as const) : ('left' as const);
  const errKey = authErrorKey(error);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={done ? tr('acctDeleteScheduledTitle') : tr('acctDeleteTitle')}
      closeLabel={tr('acctClose')}
      scrollable
      footer={
        <View style={styles.footer}>
          {done ? (
            <AuthPrimaryButton label={tr('acctClose')} onPress={onClose} palette={palette} />
          ) : (
            <AuthPrimaryButton
              label={tr('acctDeleteConfirm')}
              onPress={() => void submit()}
              palette={palette}
              enabled={ready}
              busy={busy}
              tone="danger"
            />
          )}
        </View>
      }
    >
      <View style={styles.body}>
        {done ? (
          <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
            {tr('acctDeleteScheduledBody', {
              date: done.executeAfter ? formatDeletionDay(done.executeAfter, lang) : '—',
            })}
          </Text>
        ) : (
          <>
            <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
              {tr('acctDeleteBody', { days: DELETION_GRACE_DAYS })}
            </Text>
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
  desc: { fontSize: 14, lineHeight: 20 },
  error: { fontSize: 13.5, lineHeight: 20 },
});

// v1.0.0 — Schedule the account's deletion (14-day grace, password-proven), server v0.14.0.
