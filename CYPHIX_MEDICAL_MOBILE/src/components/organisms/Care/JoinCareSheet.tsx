/* ==================================================================
   JoinCareSheet (organism) — "Join a doctor or clinic": where a patient
   redeems the 8-character code their clinician gave them (server
   v0.16.0, LAUNCH_PLAN 2.4). The web's JoinCareDialog, as a sheet.

   Raised from Settings → Care connection, from the request form's
   banner when nobody is linked, and by `CareLinkHost` when a
   `cyphix://link/CODE` (or the web URL a QR carries) opened the app —
   the code then arrives pre-filled.

   Redeeming IS the consent — the server records the moment — so the
   sentence under the field says what is being agreed to before the
   button. Success names who was joined; the card refreshes on its own
   (the mutation invalidates it). Wires AuthField / AuthPrimaryButton /
   BottomSheet to one RTK mutation (CLAUDE.md §3.2).
   ================================================================== */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  formatInviteCode,
  INVITE_CODE_LENGTH,
  isInviteCodeShaped,
  normalizeInviteCode,
  type CareLinkResult,
} from '@cyphix/shared';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthField from '@/components/molecules/Auth/AuthField';
import BottomSheet from '@/components/molecules/BottomSheet';
import { useTranslation } from '@/i18n/useTranslation';
import { useLinkCareMutation } from '@/services/api/endpoints/careApi';
import { authPalette } from '@/theme/authTheme';
import { useIsDark, useTheme } from '@/theme/useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** From a deep link: shown formatted, ready to submit. */
  initialCode?: string | null;
}

/** Upper-case, dashed after four, never longer than a code. */
const shape = (v: string) => formatInviteCode(normalizeInviteCode(v).slice(0, INVITE_CODE_LENGTH));

export default function JoinCareSheet({ visible, onClose, initialCode }: Props) {
  const { t: tr, rtl } = useTranslation();
  const theme = useTheme();
  const dark = useIsDark();
  const palette = authPalette(dark);
  const [linkCare, { isLoading: busy }] = useLinkCareMutation();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<CareLinkResult | null>(null);

  useEffect(() => {
    if (visible) {
      setCode(initialCode ? shape(initialCode) : '');
      setError(null);
      setDone(null);
    }
  }, [visible, initialCode]);

  const ready = isInviteCodeShaped(code) && !busy;
  const align = rtl ? ('right' as const) : ('left' as const);

  const submit = async () => {
    if (!ready) return;
    setError(null);
    try {
      setDone(await linkCare({ code: normalizeInviteCode(code) }).unwrap());
    } catch (err) {
      const status = (err as { status?: number } | undefined)?.status;
      /* One sentence for wrong / used / expired / cancelled — the server
         answers all four with the same 404 so a code cannot be probed. */
      setError(
        status === 404
          ? tr('careJoinNotFound')
          : status === 409
            ? tr('careJoinAlready')
            : tr('authErrUnknown'),
      );
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={done ? tr('careJoinedTitle') : tr('careJoinTitle')}
      closeLabel={tr('acctClose')}
      scrollable
      footer={
        <View style={styles.footer}>
          {done ? (
            <AuthPrimaryButton label={tr('acctClose')} onPress={onClose} palette={palette} />
          ) : (
            <AuthPrimaryButton
              label={busy ? tr('careJoining') : tr('careJoinBtn')}
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
          <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
            {tr('careJoinedBody', { name: done.counterpartName, role: done.counterpartRole })}
          </Text>
        ) : (
          <>
            <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
              {tr('careJoinDesc')}
            </Text>
            <AuthField
              label={tr('careJoinCodeLabel')}
              value={code}
              onChangeText={(v) => {
                if (error) setError(null);
                setCode(shape(v));
              }}
              palette={palette}
              placeholder="ABCD-EFGH"
              autoCapitalize="characters"
              autoComplete="one-time-code"
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
              numeric
              rtl={rtl}
            />
            <Text style={[styles.consent, { color: theme.textSecondary, textAlign: align }]}>
              {tr('careJoinConsent')}
            </Text>
            {error && (
              <Text style={[styles.error, { color: palette.weak, textAlign: align }]}>{error}</Text>
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
  consent: { fontSize: 12.5, lineHeight: 18 },
  error: { fontSize: 13.5, lineHeight: 20 },
});

// v1.0.0 — Redeem an invite code (server v0.16.0, LAUNCH_PLAN 2.4); pre-filled from a deep link.
