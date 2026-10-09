/* ==================================================================
   TwoFactorSheet (organism) — Settings → Account → "Two-factor
   sign-in", in the app's own bottom sheet (server v0.24.0, LAUNCH_PLAN
   5.5). The web's TwoFactorDialog, on a phone, with one deliberate
   difference: NO QR CODE. The authenticator app lives on this same
   device, so a picture to scan with itself would be absurd — the key is
   handed over as an `otpauth://` link ("Open in authenticator app",
   via Linking) and as selectable text to type by hand.

   Five faces: off (what it is, Turn on) → setup (the key, the link, a
   code, Verify and turn on) → codes (eight recovery codes, shown ONCE,
   I saved them) → on (since when, codes left, Turn off) → turning off
   (the password + a code). Wires useTwoFactor to BottomSheet/AuthField
   (CLAUDE.md §3.2); the secret and the codes live in the hook for
   exactly as long as the sheet is open.
   ================================================================== */

import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { isTotpInputShaped } from '@cyphix/shared';
import AuthLinkButton from '@/components/atoms/Auth/AuthLinkButton';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import SettingsChip from '@/components/atoms/SettingsChip';
import AuthField from '@/components/molecules/Auth/AuthField';
import BottomSheet from '@/components/molecules/BottomSheet';
import { authErrorKey } from '@/features/auth/authMessages';
import { useTwoFactor } from '@/features/auth/useTwoFactor';
import { useTranslation } from '@/i18n/useTranslation';
import { logAudit } from '@/services/audit/auditLogger';
import { useAuth } from '@/features/auth/useAuth';
import { authPalette } from '@/theme/authTheme';
import { useIsDark, useTheme } from '@/theme/useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function TwoFactorSheet({ visible, onClose }: Props) {
  const { t: tr, rtl, lang } = useTranslation();
  const theme = useTheme();
  const dark = useIsDark();
  const palette = authPalette(dark);
  const { user } = useAuth();
  const tf = useTwoFactor();
  const { load, reset } = tf;
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);

  /* Fresh every time: load the status, forget any secret from last time. */
  useEffect(() => {
    if (visible) {
      setCode('');
      setPassword('');
      setDisabling(false);
      setDisabled(false);
      setOpenFailed(false);
      void load();
    } else {
      reset();
    }
  }, [visible, load, reset]);

  const align = rtl ? ('right' as const) : ('left' as const);
  const actor = { id: user?.id ?? 'anonymous', role: user?.role ?? 'guest' };
  const errKey = authErrorKey(tf.error);
  const errorText = errKey ? tr(errKey) : null;
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-GB', { dateStyle: 'long' }).format(
      new Date(iso),
    );

  const onEnable = async () => {
    if (!isTotpInputShaped(code) || tf.busy) return;
    if (await tf.enable(code)) {
      setCode('');
      logAudit({ actor, action: 'auth:totp-enable', resourceType: 'User', resourceId: user?.id, outcome: 'success' });
    }
  };

  const onDisable = async () => {
    if (!password || !isTotpInputShaped(code) || tf.busy) return;
    if (await tf.disable(password, code)) {
      setDisabled(true);
      setDisabling(false);
      setPassword('');
      setCode('');
      logAudit({ actor, action: 'auth:totp-disable', resourceType: 'User', resourceId: user?.id, outcome: 'success' });
    }
  };

  /** Hand the key to whichever authenticator app claims otpauth://. No
      canOpenURL first: iOS answers that only for schemes listed at build
      time, and a refused open is reported honestly instead. */
  const openInApp = () => {
    if (!tf.setup) return;
    setOpenFailed(false);
    Linking.openURL(tf.setup.otpauthUrl).catch(() => setOpenFailed(true));
  };

  /* ── which face ── */
  const s = tf.status;
  const loading = tf.phase === 'loading' || tf.phase === 'idle';
  let face: 'codes' | 'disabled' | 'setup' | 'disabling' | 'status';
  if (tf.recoveryCodes) face = 'codes';
  else if (disabled) face = 'disabled';
  else if (tf.setup) face = 'setup';
  else if (disabling) face = 'disabling';
  else face = 'status';

  const title =
    face === 'codes'
      ? tr('totpEnabledTitle')
      : face === 'disabled'
        ? tr('totpDisabledTitle')
        : face === 'setup'
          ? tr('totpKeyTitle')
          : face === 'disabling'
            ? tr('totpTurnOff')
            : tr('totpTitle');

  const statusLine = loading
    ? tr('totpLoading')
    : !s
      ? (errorText ?? tr('authErrUnknown'))
      : !s.eligible
        ? tr('totpNotEligible')
        : s.enabled
          ? tr('totpStatusOn', {
              date: s.enabledAt ? fmtDate(s.enabledAt) : '—',
              n: s.recoveryCodesLeft,
            })
          : tr('totpIntro');

  const footer = (() => {
    switch (face) {
      case 'codes':
        return <AuthPrimaryButton label={tr('totpSavedBtn')} onPress={onClose} palette={palette} />;
      case 'disabled':
        return <AuthPrimaryButton label={tr('acctClose')} onPress={onClose} palette={palette} />;
      case 'setup':
        return (
          <AuthPrimaryButton
            label={tr('totpVerifyBtn')}
            onPress={() => void onEnable()}
            palette={palette}
            enabled={isTotpInputShaped(code) && !tf.busy}
            busy={tf.busy}
          />
        );
      case 'disabling':
        return (
          <AuthPrimaryButton
            label={tr('totpDisableBtn')}
            onPress={() => void onDisable()}
            palette={palette}
            enabled={password.length > 0 && isTotpInputShaped(code) && !tf.busy}
            busy={tf.busy}
            tone="danger"
          />
        );
      default:
        if (s?.eligible && !s.enabled) {
          return (
            <AuthPrimaryButton
              label={tr('totpTurnOn')}
              onPress={() => void tf.beginSetup()}
              palette={palette}
              enabled={!tf.busy}
              busy={tf.busy}
            />
          );
        }
        if (s?.eligible && s.enabled) {
          return (
            <AuthPrimaryButton
              label={tr('totpTurnOff')}
              onPress={() => setDisabling(true)}
              palette={palette}
              tone="danger"
            />
          );
        }
        return <AuthPrimaryButton label={tr('acctClose')} onPress={onClose} palette={palette} />;
    }
  })();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      closeLabel={tr('acctClose')}
      scrollable
      footer={<View style={styles.footer}>{footer}</View>}
    >
      <View style={styles.body}>
        {face === 'codes' && tf.recoveryCodes && (
          <>
            <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
              {tr('totpRecoveryIntro')}
            </Text>
            <View style={styles.codes} accessibilityLabel={tr('totpRecoveryCodes')}>
              {tf.recoveryCodes.map((c) => (
                <Text
                  key={c}
                  selectable
                  style={[styles.code, { color: theme.textPrimary, backgroundColor: palette.field }]}
                >
                  {c}
                </Text>
              ))}
            </View>
          </>
        )}

        {face === 'disabled' && (
          <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
            {tr('totpDisabledBody')}
          </Text>
        )}

        {face === 'setup' && tf.setup && (
          <>
            <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
              {tr('totpKeyHint')}
            </Text>
            <Text
              selectable
              style={[styles.secret, { color: theme.textPrimary, borderColor: palette.border }]}
            >
              {tf.setup.secret.replace(/(.{4})/g, '$1 ').trim()}
            </Text>
            <AuthLinkButton
              label={tr('totpOpenApp')}
              onPress={openInApp}
              palette={palette}
              align={rtl ? 'flex-end' : 'flex-start'}
            />
            {openFailed && (
              <Text style={[styles.note, { color: theme.textSecondary, textAlign: align }]}>
                {tr('totpOpenAppFailed')}
              </Text>
            )}
            <AuthField
              label={tr('totpCodeLabel')}
              value={code}
              onChangeText={(v) => {
                if (tf.error) tf.clearError();
                setCode(v);
              }}
              palette={palette}
              placeholder={tr('totpCodePlaceholder')}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              returnKeyType="done"
              onSubmitEditing={() => void onEnable()}
              numeric
              rtl={rtl}
            />
            {errorText && (
              <Text style={[styles.error, { color: palette.weak, textAlign: align }]}>{errorText}</Text>
            )}
          </>
        )}

        {face === 'disabling' && (
          <>
            <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
              {tr('totpDisableIntro')}
            </Text>
            <AuthField
              label={tr('setAccountCurrentPassword')}
              value={password}
              onChangeText={(v) => {
                if (tf.error) tf.clearError();
                setPassword(v);
              }}
              palette={palette}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="next"
              rtl={rtl}
            />
            <AuthField
              label={tr('authTotpLabel')}
              value={code}
              onChangeText={(v) => {
                if (tf.error) tf.clearError();
                setCode(v);
              }}
              palette={palette}
              placeholder={tr('totpCodePlaceholder')}
              autoCapitalize="characters"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              returnKeyType="done"
              onSubmitEditing={() => void onDisable()}
              rtl={rtl}
            />
            <AuthLinkButton
              label={tr('acctCancel')}
              onPress={() => setDisabling(false)}
              palette={palette}
              align={rtl ? 'flex-end' : 'flex-start'}
            />
            {errorText && (
              <Text style={[styles.error, { color: palette.weak, textAlign: align }]}>{errorText}</Text>
            )}
          </>
        )}

        {face === 'status' && (
          <>
            <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
              {statusLine}
            </Text>
            {s && (
              <View style={[styles.chipRow, rtl && styles.chipRowRtl]}>
                <SettingsChip label={s.enabled ? tr('totpOn') : tr('totpOff')} tone={s.enabled ? 'ok' : 'neutral'} />
              </View>
            )}
            {!loading && s && errorText && (
              <Text style={[styles.error, { color: palette.weak, textAlign: align }]}>{errorText}</Text>
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
  note: { fontSize: 13, lineHeight: 18 },
  error: { fontSize: 13.5, lineHeight: 20 },
  chipRow: { flexDirection: 'row' },
  chipRowRtl: { flexDirection: 'row-reverse' },
  /* The key: tracked monospace, LTR whatever the UI language, selectable
     so it can be copied into an app without a clipboard package. */
  secret: {
    fontFamily: 'monospace',
    fontSize: 15,
    letterSpacing: 1.5,
    textAlign: 'center',
    writingDirection: 'ltr',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  codes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  code: {
    width: '47%',
    fontFamily: 'monospace',
    fontSize: 15,
    letterSpacing: 1,
    textAlign: 'center',
    writingDirection: 'ltr',
    paddingVertical: 8,
    borderRadius: 8,
  },
});

// v1.0.0 — Two-factor sign-in: status, setup (the key as text + otpauth:// link — no QR on a
//          phone), the recovery codes once, turn off with the password + a code
//          (server v0.24.0, LAUNCH_PLAN 5.5).
