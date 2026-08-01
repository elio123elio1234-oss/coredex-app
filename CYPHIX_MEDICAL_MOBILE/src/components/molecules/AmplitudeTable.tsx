/* ==================================================================
   AmplitudeTable (molecule) — per-lead wave voltages, with a bar that
   makes the pattern across the six leads readable at a glance.
   Ported from the web molecule.

   The bar is deliberately drawn on the QRS peak-to-peak column only: the
   shape of that profile across I → aVF is what a reader actually scans
   for, and six columns of competing bars would hide it.

   A voltage that could not be measured is "—", never 0.
   ================================================================== */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LIMB_LEAD_ORDER, type LeadAmplitudes, type LimbLeadName } from '@cyphix/shared';
import { useTheme } from '@/theme/useTheme';

interface Props {
  amplitudes: Record<LimbLeadName, LeadAmplitudes>;
  labels: {
    lead: string;
    p: string;
    q: string;
    r: string;
    s: string;
    t: string;
    qrs: string;
    unit: string;
  };
}

const LEAD_COL = 46;
const VALUE_COL = 44;
const BAR_COL = 96;

function cell(value: number | null | undefined): string {
  return value == null ? '—' : value.toFixed(2);
}

export default function AmplitudeTable({ amplitudes, labels }: Props) {
  const t = useTheme();
  const peak = Math.max(0.1, ...LIMB_LEAD_ORDER.map((l) => amplitudes[l]?.qrsAmplitudeMv ?? 0));

  return (
    <View style={styles.wrap}>
      {/* Six numeric columns will not fit a phone's width at a legible size,
          so the table scrolls sideways rather than shrinking the type — a
          voltage nobody can read is not a measurement. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.row, styles.headRow, { borderBottomColor: t.border }]}>
            <Text style={[styles.th, { width: LEAD_COL, color: t.textTertiary }]}>
              {labels.lead}
            </Text>
            {[labels.p, labels.q, labels.r, labels.s, labels.t].map((h) => (
              <Text key={h} style={[styles.th, styles.num, { width: VALUE_COL, color: t.textTertiary }]}>
                {h}
              </Text>
            ))}
            <Text style={[styles.th, { width: BAR_COL, color: t.textTertiary }]}>{labels.qrs}</Text>
          </View>

          {LIMB_LEAD_ORDER.map((lead) => {
            const a = amplitudes[lead];
            const qrs = a?.qrsAmplitudeMv ?? null;
            const pctWidth = qrs === null ? 0 : Math.max(2, (qrs / peak) * 100);
            return (
              <View key={lead} style={[styles.row, { borderBottomColor: t.border }]}>
                <Text style={[styles.lead, { width: LEAD_COL, color: t.textPrimary }]}>{lead}</Text>
                {[a?.pMv, a?.qMv, a?.rMv, a?.sMv, a?.tMv].map((v, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.td,
                      styles.num,
                      { width: VALUE_COL, color: v == null ? t.textTertiary : t.textSecondary },
                    ]}
                  >
                    {cell(v)}
                  </Text>
                ))}
                <View style={[styles.barCell, { width: BAR_COL }]}>
                  <View style={[styles.track, { backgroundColor: t.bgSoft }]}>
                    <View
                      style={[styles.fill, { width: `${pctWidth}%`, backgroundColor: t.accent }]}
                    />
                  </View>
                  <Text style={[styles.td, styles.num, { color: t.textPrimary }]}>{cell(qrs)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <Text style={[styles.note, { color: t.textTertiary }]}>{labels.unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  headRow: { borderBottomWidth: 1 },
  th: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  td: { fontSize: 12.5, fontVariant: ['tabular-nums'] },
  num: { textAlign: 'right' },
  lead: { fontSize: 12.5, fontWeight: '800' },
  barCell: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6 },
  track: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  note: { fontSize: 10.5, lineHeight: 15 },
});

// v1.0.0 — Per-lead amplitude table with a QRS voltage profile bar.
