/* ==================================================================
   HeartbeatSearch (molecule) — what the system is "feeling" right now,
   while it waits for a real heartbeat before arming the recording.
   Ported from the web molecule, copy and layout included.

   ══ WHY SHOW THIS AT ALL ══
   The capture starts by itself. A device that starts on its own without
   saying why is a black box, and a black box is exactly what a regulated
   instrument must not be. So the gate is made visible: the patient sees
   beats being counted up, and the operator sees the reason the recording
   has NOT started yet (no signal, electrode off, irregular).

   Purely presentational — it renders the gate's verdict, never computes
   one.
   ================================================================== */

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { ValidatorResult } from '@cyphix/shared';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  status: ValidatorResult['status'];
  failReason?: ValidatorResult['failReason'];
  /** Confirmed R-peaks so far. */
  peaksFound: number;
  /** How many the validator needs before it opens the gate. */
  peaksNeeded: number;
  hr: number;
  sqi: number;
  /** Tighter padding and type for a short (landscape-phone) stage, where
      every point this card takes comes out of the six traces above it. */
  compact?: boolean;
}

/**
 * One honest line explaining exactly what the gate is waiting for.
 *
 * Returns the locale KEY rather than the sentence: the mapping from a
 * validator verdict to what the patient is told is the interesting part and
 * belongs here, while the wording belongs in the locale (and matches the web
 * app's `gate*` keys word for word).
 */
function statusKey(
  status: ValidatorResult['status'],
  failReason: ValidatorResult['failReason'] | undefined,
): TranslationKey {
  switch (status) {
    case 'settling':
      return 'gateSettling';
    case 'lead_off':
      return 'gateLeadOff';
    case 'detecting':
      return 'gateDetecting';
    case 'valid':
      return 'gateValid';
    case 'failed':
      return failReason === 'lead_off'
        ? 'gateLeadOff'
        : failReason === 'irregular'
          ? 'gateIrregular'
          : 'gateNoSignal';
    case 'searching':
    default:
      return 'gateSearching';
  }
}

/** `.hb-pulse.live` — one beat a second, as `@keyframes hb-beat`.
    It pulses ONLY once beats are actually being detected: an animation that
    ran regardless would imply a signal that isn't there. */
function PulseDot({ live, color }: { live: boolean; color: string }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!live) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.45,
          duration: 180,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 180,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(640),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [live, scale]);

  return <Animated.View style={[styles.pulse, { backgroundColor: color, transform: [{ scale }] }]} />;
}

export default function HeartbeatSearch({
  status,
  failReason,
  peaksFound,
  peaksNeeded,
  hr,
  sqi,
  compact = false,
}: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const live = peaksFound > 0;

  /* `.hb-search.ok` / `.hb-search.bad` */
  const tone =
    status === 'valid'
      ? { borderColor: t.success, backgroundColor: t.successSoft }
      : status === 'failed' || status === 'lead_off'
        ? { borderColor: 'rgba(245, 158, 11, 0.5)', backgroundColor: t.surface }
        : { borderColor: t.border, backgroundColor: t.surface };

  return (
    <View
      style={[
        styles.card,
        tone,
        {
          gap: compact ? 14 : 22,
          paddingVertical: compact ? 8 : 12,
          paddingHorizontal: compact ? 14 : 20,
        },
      ]}
    >
      <View style={styles.main}>
        <PulseDot live={live} color={live ? t.danger : t.textTertiary} />
        <Text style={[styles.msg, { color: t.textPrimary, fontSize: compact ? 15 : 18 }]}>
          {tr(statusKey(status, failReason))}
        </Text>
      </View>

      {/* Beats counted so far — the "we can feel it" readout */}
      <View
        style={styles.beats}
        accessibilityRole="image"
        accessibilityLabel={tr('gateBeatsA11y', {
          found: Math.min(peaksFound, peaksNeeded),
          needed: peaksNeeded,
        })}
      >
        {Array.from({ length: peaksNeeded }, (_, i) => (
          <View
            key={i}
            style={[
              styles.beat,
              i < peaksFound
                ? {
                    backgroundColor: t.success,
                    borderColor: t.success,
                    transform: [{ scale: 1.1 }],
                  }
                : { backgroundColor: t.border, borderColor: t.border },
            ]}
          />
        ))}
      </View>

      {/* The raw numbers, for the operator */}
      <View style={styles.metrics}>
        <Text style={[styles.metric, { color: t.textSecondary }]}>
          {tr('gateBpm')}{' '}
          <Text style={[styles.metricValue, { color: t.textPrimary }]}>{hr > 0 ? hr : '--'}</Text>
        </Text>
        <Text style={[styles.metric, { color: t.textSecondary }]}>
          {tr('gateSteadiness')}{' '}
          <Text style={[styles.metricValue, { color: t.textPrimary }]}>
            {sqi > 0 ? `${Math.round(sqi)}%` : '--'}
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* .hb-search { row; center; gap 22; wrap; padding 12px 20px } */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  pulse: { width: 14, height: 14, borderRadius: 7 },
  msg: { fontWeight: '700', flexShrink: 1 },
  beats: { flexDirection: 'row', gap: 7 },
  beat: { width: 13, height: 13, borderRadius: 7, borderWidth: 1 },
  metrics: { flexDirection: 'row', gap: 18 },
  metric: { fontSize: 14 },
  metricValue: { fontWeight: '700', fontVariant: ['tabular-nums'] },
});

// v2.2.0 — The verdict→message map now returns a locale key, so the gate
//          explains itself in the patient's language.
