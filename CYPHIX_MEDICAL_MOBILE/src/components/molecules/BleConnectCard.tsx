/* BLE connect card — device status + connect/disconnect action.
   Pure presentation: everything arrives via props (mirrors web
   BleConnectCard; the screen wires it to useBle). */

import { StyleSheet, Text, View } from 'react-native';
import type { BleStatus } from '@cyphix/shared';
import PrimaryButton from '@/components/atoms/PrimaryButton';
import StatusDot from '@/components/atoms/StatusDot';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  status: BleStatus;
  deviceName: string | null;
  simulated: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

const STATUS_LABEL: Record<BleStatus, string> = {
  disconnected: 'Not connected',
  connecting: 'Connecting…',
  connected: 'Connected',
  streaming: 'Live',
  error: 'Connection error',
};

export default function BleConnectCard({
  status,
  deviceName,
  simulated,
  onConnect,
  onDisconnect,
}: Props) {
  const t = useTheme();
  const active = status === 'connected' || status === 'streaming';
  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={styles.row}>
        <StatusDot status={status} />
        <Text style={[styles.status, { color: t.textPrimary }]}>{STATUS_LABEL[status]}</Text>
        {simulated && (
          <Text style={[styles.sim, { color: t.brandSlate, backgroundColor: t.accentSoft }]}>
            SIMULATED
          </Text>
        )}
      </View>
      {deviceName != null && (
        <Text style={[styles.device, { color: t.textSecondary }]}>{deviceName}</Text>
      )}
      <PrimaryButton
        label={active ? 'Disconnect' : 'Connect device'}
        variant={active ? 'danger' : 'primary'}
        onPress={active ? onDisconnect : onConnect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 20, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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

// v0.1.0 — Status + connect/disconnect card, simulator honestly badged.
