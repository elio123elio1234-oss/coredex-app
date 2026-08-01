/* ==================================================================
   HeartbeatSearch (molecule) — why the capture has not armed yet,
   ported from the web molecule.

   The gate arms the recording by itself, so its reasoning must stay on
   screen: a patient whose hands are occupied cannot ask why nothing is
   happening. Purely presentational.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import type { ValidatorResult } from '@cyphix/shared';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  status: ValidatorResult['status'];
  failReason?: ValidatorResult['failReason'];
  peaksFound: number;
  peaksNeeded: number;
  hr: number;
  sqi: number;
}

const STATUS_TEXT: Record<ValidatorResult['status'], string> = {
  settling: 'Settling the signal…',
  searching: 'Looking for your heartbeat…',
  detecting: 'Heartbeat found — confirming…',
  lead_off: 'Poor contact — press the electrodes firmly',
  valid: 'Heartbeat confirmed',
  failed: 'Could not confirm a heartbeat — trying again',
};

const FAIL_TEXT: Record<NonNullable<ValidatorResult['failReason']>, string> = {
  timeout: 'Took too long. Keep holding — the search restarts by itself.',
  lead_off: 'The electrodes are not making contact.',
  no_signal: 'No signal on this lead.',
  few_peaks: 'Too few beats detected.',
  irregular: 'The rhythm was too irregular to confirm.',
};

export default function HeartbeatSearch({
  status,
  failReason,
  peaksFound,
  peaksNeeded,
  hr,
  sqi,
}: Props) {
  const t = useTheme();
  const done = Math.min(peaksFound, peaksNeeded);

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Text style={[styles.status, { color: t.textPrimary }]}>{STATUS_TEXT[status]}</Text>

      <View style={styles.dots} accessibilityLabel={`${done} of ${peaksNeeded} beats confirmed`}>
        {Array.from({ length: peaksNeeded }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i < done ? t.success : t.border },
            ]}
          />
        ))}
      </View>

      {(hr > 0 || sqi > 0) && (
        <Text style={[styles.meta, { color: t.textSecondary }]}>
          {hr > 0 ? `${hr} bpm` : '— bpm'} · signal quality {Math.round(sqi)}
        </Text>
      )}

      {status === 'failed' && failReason != null && (
        <Text style={[styles.fail, { color: t.danger }]}>{FAIL_TEXT[failReason]}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.md, borderWidth: 1, padding: 14, gap: 9, alignItems: 'center' },
  status: { fontSize: 15.5, fontWeight: '700', textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 7 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  meta: { fontSize: 13, fontVariant: ['tabular-nums'] },
  fail: { fontSize: 12.5, textAlign: 'center' },
});

// v1.0.0 — Explains why the auto-arm gate has not fired yet.
