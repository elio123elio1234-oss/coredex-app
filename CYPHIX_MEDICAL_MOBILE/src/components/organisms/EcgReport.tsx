/* ==================================================================
   EcgReport (organism) — the finished 6-lead report, ported from the web
   EcgReport: six filtered strips plus the automated measurement sheet
   produced by the shared `analyseLimbEcg`.

   The strips are drawn from `report.filtered`, the same waveform the
   measurements were taken from — so every printed number can be checked
   against the trace beside it.

   A SIMULATED recording is labelled unmissably. Nothing produced from a
   synthetic signal may ever read as a clinical record.
   ================================================================== */

import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LIMB_LEAD_ORDER, type LimbLeadName } from '@cyphix/shared';
import type { LimbReport } from '@/features/measurement/hooks/useLimbRecorder';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const STRIP_H = 62;
const MV_SPAN = 3.0;

interface Props {
  report: LimbReport;
  onRecordAgain: () => void;
  onFinish: () => void;
}

function Strip({ data, width, color }: { data: Float32Array; width: number; color: string }) {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    const n = data.length;
    if (n < 2) return p;
    const columns = Math.max(1, Math.floor(width));
    const per = Math.max(1, Math.floor(n / columns));
    for (let c = 0; c < columns; c++) {
      const from = c * per;
      if (from >= n) break;
      const to = Math.min(from + per, n);
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = from; i < to; i++) {
        const v = data[i];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const x = (from / (n - 1)) * width;
      const yHi = STRIP_H / 2 - (hi / MV_SPAN) * STRIP_H;
      const yLo = STRIP_H / 2 - (lo / MV_SPAN) * STRIP_H;
      if (c === 0) p.moveTo(x, yHi);
      else p.lineTo(x, yHi);
      if (yLo !== yHi) p.lineTo(x, yLo);
    }
    return p;
  }, [data, width]);

  return (
    <Canvas style={{ width, height: STRIP_H }}>
      <Path path={path} color={color} style="stroke" strokeWidth={1.3} strokeJoin="round" />
    </Canvas>
  );
}

function Measure({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={styles.measure}>
      <Text style={[styles.measureLabel, { color: t.textSecondary }]}>{label}</Text>
      <Text style={[styles.measureValue, { color: t.textPrimary }]}>{value}</Text>
    </View>
  );
}

export default function EcgReport({ report, onRecordAgain, onFinish }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // The report also renders in the landscape exam, where the notch is on a
  // side — clear it, then subtract the page padding and the label gutter.
  const padH = Math.max(insets.left, insets.right, 20);
  const stripW = width - padH * 2 - 34;

  const a = report.analysis;
  /* Every measurement is nullable on purpose: one that could not be made
     honestly reads "—", never 0 and never a guess (types/ecgAnalysis.ts). */
  const ms = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v)} ms`);
  const REGULARITY: Record<string, string> = {
    regular: 'Regular',
    slightlyIrregular: 'Slightly irregular',
    irregular: 'Irregular',
    indeterminate: '—',
  };

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={[
        styles.page,
        {
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + 28,
          paddingLeft: padH,
          paddingRight: padH,
        },
      ]}
    >
      <Text style={[styles.title, { color: t.textPrimary }]}>Limb leads report</Text>
      <Text style={[styles.when, { color: t.textSecondary }]}>
        {report.recordedAt.toLocaleString()} · 6 limb leads · {report.sampleRate} Hz
      </Text>

      {report.isSimulated && (
        <Text style={[styles.simBanner, { color: '#FFFFFF', backgroundColor: t.danger }]}>
          SIMULATED SIGNAL — NOT A PATIENT RECORDING
        </Text>
      )}

      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <View style={styles.measures}>
          <Measure
            label="Heart rate"
            value={report.heartRate > 0 ? `${report.heartRate} bpm` : '—'}
          />
          <Measure label="Rhythm" value={REGULARITY[a.rate.regularity] ?? '—'} />
          <Measure
            label="QRS axis"
            value={a.axis.degrees == null ? '—' : `${Math.round(a.axis.degrees)}°`}
          />
          <Measure label="PR" value={ms(a.intervals.prMs)} />
          <Measure label="QRS" value={ms(a.intervals.qrsMs)} />
          <Measure label="QT" value={ms(a.intervals.qtMs)} />
          <Measure label="QTc (Bazett)" value={ms(a.intervals.qtcBazettMs)} />
          <Measure label="Beats" value={String(a.rate.beatsAnalyzed)} />
          <Measure label="Quality" value={`${Math.round(a.quality.sqi)}`} />
        </View>

        {/* Too few clean beats must not read as a confident measurement sheet. */}
        {a.quality.insufficient && (
          <Text style={[styles.insufficient, { color: t.danger }]}>
            Too few clean beats to trust these numbers — record again.
          </Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        {LIMB_LEAD_ORDER.map((lead: LimbLeadName) => (
          <View key={lead} style={styles.stripRow}>
            <Text style={[styles.stripLabel, { color: t.textTertiary }]}>{lead}</Text>
            <Strip data={report.filtered[lead]} width={stripW} color={t.textPrimary} />
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onRecordAgain}
          style={({ pressed }) => [
            styles.btn,
            styles.ghost,
            { borderColor: t.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { color: t.textPrimary }]}>Record again</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onFinish}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Finish</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Horizontal padding is set inline — it depends on the safe area in landscape.
  page: { gap: 14 },
  title: { fontSize: 26, fontWeight: '800' },
  when: { fontSize: 13, marginTop: -8 },
  simBanner: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 14 },
  measures: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  measure: { width: '33.33%' },
  measureLabel: { fontSize: 11.5, fontWeight: '600' },
  measureValue: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 2 },
  insufficient: { fontSize: 12.5, fontWeight: '600', marginTop: 12 },
  stripRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stripLabel: { width: 26, fontSize: 11, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center' },
  ghost: { borderWidth: 1 },
  btnText: { fontSize: 16, fontWeight: '700' },
});

// v1.0.0 — Six filtered strips + the shared analysis sheet; simulation labelled.
