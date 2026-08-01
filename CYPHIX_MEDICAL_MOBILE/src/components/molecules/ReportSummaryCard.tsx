/* ==================================================================
   ReportSummaryCard (molecule) — the headline of the report: the heart
   rate, the rhythm classification, and the recording's provenance.

   ══ WHY THIS EXISTS ON MOBILE AND NOT ON WEB ══
   The web report opens with `.report-headline`, a bare "BPM 72" line, and
   scatters duration / lead set / sample rate across the letterhead's meta
   grid. That works on an A4 sheet the eye takes in whole. A phone is a
   1.3-screen scroll, so the first screenful has to answer "what did the
   measurement say?" on its own — otherwise the report opens on a wall of
   grid paper and reads as a data dump. Same numbers, same tokens, one
   card.

   ══ THE RHYTHM CHIP IS NEUTRAL ON PURPOSE ══
   It is tinted with the accent, never green/red. "Regular" is a
   measurement, and a green chip would turn it into a finding — the exact
   line the analysis sheet refuses to cross (see EcgAnalysisSheet).

   Purely presentational.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export interface SummaryStat {
  label: string;
  value: string;
}

interface Props {
  /** Beats per minute, or null when no rate could be measured. */
  bpm: number | null;
  /** Human label for the rhythm classification, e.g. "Regular". */
  rhythm?: string;
  stats: SummaryStat[];
}

export default function ReportSummaryCard({ bpm, rhythm, stats }: Props) {
  const t = useTheme();
  const missing = bpm === null || bpm <= 0;

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={styles.top}>
        <View style={styles.rateBlock}>
          <Text style={[styles.label, { color: t.textTertiary }]}>HEART RATE</Text>
          <View style={styles.valueRow}>
            {/* An unmeasurable rate shows as "—", never as 0 (see MetricTile). */}
            <Text
              style={[styles.value, { color: missing ? t.textTertiary : t.accentLive }]}
              allowFontScaling={false}
            >
              {missing ? '—' : String(bpm)}
            </Text>
            <Text style={[styles.unit, { color: t.textTertiary }]}>BPM</Text>
          </View>
        </View>

        {rhythm != null && (
          <View style={[styles.chip, { backgroundColor: t.accentSoft, borderColor: t.border }]}>
            <Text style={[styles.chipText, { color: t.textSecondary }]} numberOfLines={1}>
              {rhythm}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.rule, { backgroundColor: t.border }]} />

      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={[styles.statLabel, { color: t.textTertiary }]} numberOfLines={1}>
              {s.label.toUpperCase()}
            </Text>
            <Text style={[styles.statValue, { color: t.textPrimary }]} numberOfLines={1}>
              {s.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: RADIUS.lg, padding: 16, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rateBlock: { flexShrink: 1 },
  /* `.report-headline-label` */
  label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.9 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  /* Larger than the web's 34 px headline: this is the whole first screen's
     answer, and it is read at arm's length rather than on a sheet. */
  value: { fontSize: 46, fontWeight: '800', lineHeight: 50, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 14, fontWeight: '700' },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  rule: { height: StyleSheet.hairlineWidth },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, minWidth: 0 },
  statLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.7, marginBottom: 3 },
  statValue: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

// v1.0.0 — Headline card: rate, neutral rhythm chip, and the provenance the
//          web keeps in its letterhead meta grid.
