/* BLE connect card — device status + connect/disconnect action.
   Pure presentation: everything arrives via props (mirrors web
   BleConnectCard; the screen wires it to useBle). */

import { StyleSheet, Text, View } from 'react-native';
import type { BleStatus } from '@cyphix/shared';
import PrimaryButton from '@/components/atoms/PrimaryButton';
import StatusDot from '@/components/atoms/StatusDot';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  status: BleStatus;
  deviceName: string | null;
  simulated: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

const STATUS_KEY: Record<BleStatus, TranslationKey> = {
  disconnected: 'bleNotConnected',
  connecting: 'devConnecting',
  connected: 'bleConnected',
  streaming: 'bleLive',
  error: 'devError',
};

export default function BleConnectCard({
  status,
  deviceName,
  simulated,
  onConnect,
  onDisconnect,
}: Props) {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();
  const active = status === 'connected' || status === 'streaming';
  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={[styles.row, rtl && styles.rowRtl]}>
        <StatusDot status={status} />
        <Text style={[styles.status, { color: t.textPrimary }]}>{tr(STATUS_KEY[status])}</Text>
        {simulated && (
          <Text
            style={[
              styles.sim,
              { color: t.brandSlate, backgroundColor: t.accentSoft },
              /* `marginLeft: auto` pushes it to the far end — which is the
                 other end once the row is reversed. */
              rtl && { marginLeft: 0, marginRight: 'auto' },
            ]}
          >
            {tr('bleSimulatedTag')}
          </Text>
        )}
      </View>
      {deviceName != null && (
        <Text
          style={[styles.device, { color: t.textSecondary, textAlign: rtl ? 'right' : 'left' }]}
        >
          {deviceName}
        </Text>
      )}
      <PrimaryButton
        label={active ? tr('bleDisconnect') : tr('bleConnectDevice')}
        variant={active ? 'danger' : 'primary'}
        onPress={active ? onDisconnect : onConnect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 20, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowRtl: { flexDirection: 'row-reverse' },
  status: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  sim: {
    marginLeft: 'auto',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  device: { fontSize: 13 },
});

// v0.2.0 — Status words come from the locale; the row reverses under RTL.
