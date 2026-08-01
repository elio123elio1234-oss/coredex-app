/* Status dot — colour-codes the BLE lifecycle, mirroring web StatusDot. */

import { StyleSheet, View } from 'react-native';
import type { BleStatus } from '@cyphix/shared';
import { useTheme } from '@/theme/useTheme';

export default function StatusDot({ status }: { status: BleStatus }) {
  const t = useTheme();
  const color =
    status === 'streaming' ? t.success
    : status === 'connected' ? t.accentLive
    : status === 'connecting' ? t.brandSlate
    : status === 'error' ? t.danger
    : t.textTertiary;
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  dot: { width: 10, height: 10, borderRadius: 5 },
});

// v0.1.0 — BLE lifecycle colour dot.
