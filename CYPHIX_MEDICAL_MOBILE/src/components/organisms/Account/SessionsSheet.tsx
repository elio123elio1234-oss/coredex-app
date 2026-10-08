/* ==================================================================
   SessionsSheet (organism) — Settings → Account → "Devices & sessions".
   Every device signed into the account, newest activity first: what it
   is (the user-agent through the shared classifier — never the raw
   string), when it signed in, when it was last used, and a way to sign
   it out. The one this phone is using is marked and cannot be revoked
   from here — that is what the Sign out row is for. The web's
   SessionsDialog, on a phone.

   Both sign-outs confirm first, with the platform alert: they are
   remote, and a mis-tap signs somebody's tablet out of a medical record.
   ================================================================== */

import { useEffect } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  describeUserAgent,
  type ClientKind,
  type ClientPlatform,
  type SessionView,
} from '@cyphix/shared';
import AuthLinkButton from '@/components/atoms/Auth/AuthLinkButton';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import SettingsChip from '@/components/atoms/SettingsChip';
import BottomSheet from '@/components/molecules/BottomSheet';
import { authErrorKey } from '@/features/auth/authMessages';
import { useSessions } from '@/features/auth/useSessions';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import { authPalette } from '@/theme/authTheme';
import { useIsDark, useTheme } from '@/theme/useTheme';

const PLATFORM_KEY: Record<ClientPlatform, TranslationKey> = {
  ios: 'devPlatformIos',
  android: 'devPlatformAndroid',
  windows: 'devPlatformWindows',
  mac: 'devPlatformMac',
  linux: 'devPlatformLinux',
  unknown: 'devPlatformUnknown',
};

/** `null` = say nothing about the client (an unknown one adds no fact). */
const CLIENT_KEY: Record<ClientKind, TranslationKey | null> = {
  app: 'devClientApp',
  chrome: 'devClientChrome',
  safari: 'devClientSafari',
  firefox: 'devClientFirefox',
  edge: 'devClientEdge',
  browser: 'devClientBrowser',
  unknown: null,
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SessionsSheet({ visible, onClose }: Props) {
  const { t: tr, lang, rtl } = useTranslation();
  const theme = useTheme();
  const dark = useIsDark();
  const palette = authPalette(dark);
  const { status, sessions, error, busy, load, revoke, revokeOthers } = useSessions();

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const others = sessions.filter((s) => !s.current);
  const align = rtl ? ('right' as const) : ('left' as const);
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(lang, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  const deviceLabel = (s: SessionView): string => {
    /* The device mock has no request to read a user-agent off; the
       current row IS this phone, and the OS knows which kind. */
    if (!s.userAgent && s.current) {
      return `${tr(Platform.OS === 'android' ? 'devPlatformAndroid' : 'devPlatformIos')} · ${tr('devClientApp')}`;
    }
    const d = describeUserAgent(s.userAgent);
    const clientKey = CLIENT_KEY[d.client];
    return [tr(PLATFORM_KEY[d.platform]), clientKey ? tr(clientKey) : null]
      .filter(Boolean)
      .join(' · ');
  };
  const failed = () => Alert.alert(tr('setAccountSessionsError'));

  const confirmOthers = () => {
    void Haptics.selectionAsync();
    Alert.alert(tr('setAccountSignOutOthers'), tr('setAccountSignOutOthersBody'), [
      { text: tr('acctCancel'), style: 'cancel' },
      {
        text: tr('setAccountSignOutOthers'),
        style: 'destructive',
        onPress: () => {
          void revokeOthers().catch(failed);
        },
      },
    ]);
  };
  const confirmOne = (s: SessionView) => {
    void Haptics.selectionAsync();
    Alert.alert(tr('setAccountSignOutDevice'), deviceLabel(s), [
      { text: tr('acctCancel'), style: 'cancel' },
      {
        text: tr('setAccountSignOutDevice'),
        style: 'destructive',
        onPress: () => {
          void revoke(s.id).catch(failed);
        },
      },
    ]);
  };

  const errKey = authErrorKey(error);
  let statusLine: string | null = null;
  if (status === 'loading' && sessions.length === 0) statusLine = tr('setAccountSessionsLoading');
  else if (status === 'error') statusLine = errKey ? tr(errKey) : tr('setAccountSessionsError');
  else if (status === 'success' && sessions.length === 0) statusLine = tr('setAccountSessionsEmpty');

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={tr('setAccountSessions')}
      closeLabel={tr('acctClose')}
      scrollable
      footer={
        <View style={styles.footer}>
          {others.length > 0 && (
            <AuthLinkButton
              label={tr('setAccountSignOutOthers')}
              onPress={confirmOthers}
              palette={palette}
              align="center"
            />
          )}
          <AuthPrimaryButton label={tr('acctClose')} onPress={onClose} palette={palette} />
        </View>
      }
    >
      <View style={styles.body}>
        <Text style={[styles.desc, { color: theme.textSecondary, textAlign: align }]}>
          {tr('setAccountSessionsDesc')}
        </Text>
        {statusLine ? (
          <View style={styles.statusBlock}>
            <Text style={[styles.status, { color: theme.textSecondary, textAlign: align }]}>
              {statusLine}
            </Text>
            {status === 'error' && (
              <AuthLinkButton
                label={tr('acctRetry')}
                onPress={() => void load()}
                palette={palette}
                align={rtl ? 'flex-end' : 'flex-start'}
              />
            )}
          </View>
        ) : (
          <View>
            {sessions.map((s, i) => (
              <View
                key={s.id}
                style={[
                  styles.row,
                  rtl && styles.rowRtl,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                ]}
              >
                <View style={styles.main}>
                  <View style={[styles.deviceLine, rtl && styles.rowRtl]}>
                    <Text style={[styles.device, { color: theme.textPrimary }]}>{deviceLabel(s)}</Text>
                    {s.current && <SettingsChip label={tr('setAccountThisDevice')} tone="ok" />}
                  </View>
                  <Text style={[styles.meta, { color: theme.textSecondary, textAlign: align }]}>
                    {`${tr('setAccountSessionLastSeen')}: ${fmt(s.lastSeenAt)} · ${tr('setAccountSessionSince')}: ${fmt(s.createdAt)}${s.ip ? ` · ${s.ip}` : ''}`}
                  </Text>
                </View>
                {!s.current && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${tr('setAccountSignOutDevice')}: ${deviceLabel(s)}`}
                    disabled={busy}
                    onPress={() => confirmOne(s)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.revoke,
                      { borderColor: theme.danger, opacity: pressed || busy ? 0.6 : 1 },
                    ]}
                  >
                    <Text style={[styles.revokeText, { color: theme.danger }]}>
                      {tr('setAccountSignOutDevice')}
                    </Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 14, paddingBottom: 8, gap: 10 },
  footer: { paddingHorizontal: 14, paddingTop: 10, gap: 10 },
  desc: { fontSize: 14, lineHeight: 20 },
  statusBlock: { paddingVertical: 10, gap: 6 },
  status: { fontSize: 14.5, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowRtl: { flexDirection: 'row-reverse' },
  main: { flex: 1, gap: 4 },
  deviceLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  device: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12.5, lineHeight: 18 },
  // 44 pt tall: a remote sign-out is a target an unsteady hand must hit on purpose.
  revoke: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderRadius: 999 },
  revokeText: { fontSize: 13, fontWeight: '700' },
});

// v1.0.0 — Devices & sessions: list, sign one out, sign all others out (server v0.12.0).
