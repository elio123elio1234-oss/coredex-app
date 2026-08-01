/* ==================================================================
   IntervalBar (molecule) — a measured duration shown against the typical
   adult reference band. Ported from the web molecule.

   ══ WHAT THE BAND IS AND IS NOT ══
   The shaded band is REFERENCE INFORMATION — the range these intervals
   usually fall in for adults — exactly as printed on any hospital ECG
   form. It is context for the clinician reading the number. It is NOT a
   verdict: this component never renders "normal" or "abnormal", never
   colours a value red for being outside, and never draws a conclusion.
   The reader decides; the sheet only measures. Keep it that way.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface Props {
  label: string;
  /** Measured value; null renders the row as unmeasured. */
  value: number | null;
  unit: string;
  /** Reference band start/end, in the same unit. */
  refLow: number;
  refHigh: number;
  /** Axis extent, so several bars share one visual scale. */
  scaleMin: number;
  scaleMax: number;
  /** Caption naming the band (e.g. "Typical adult range"). */
  refCaption: string;
}

export default function IntervalBar({
  label,
  value,
  unit,
  refLow,
  refHigh,
  scaleMin,
  scaleMax,
  refCaption,
}: Props) {
  const t = useTheme();
  const span = Math.max(1, scaleMax - scaleMin);
  const pct = (v: number): number => Math.max(0, Math.min(100, ((v - scaleMin) / span) * 100));

  const bandStart = pct(refLow);
  const bandWidth = Math.max(0, pct(refHigh) - bandStart);
  const markerAt = value === null ? null : pct(value);

  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <Text style={[styles.label, { color: t.textPrimary }]}>{label}</Text>
        <View style={styles.valueRow}>
          <Text
            style={[styles.value, { color: value === null ? t.textTertiary : t.textPrimary }]}
          >
            {value === null ? '—' : String(value)}
          </Text>
          {value !== null && <Text style={[styles.unit, { color: t.textTertiary }]}>{unit}</Text>}
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: t.bgSoft, borderColor: t.border }]}>
        <View
          style={[
            styles.band,
            { left: `${bandStart}%`, width: `${bandWidth}%`, backgroundColor: t.accentSoft },
          ]}
        />
        {markerAt !== null && (
          <View style={[styles.marker, { left: `${markerAt}%`, backgroundColor: t.accent }]} />
        )}
      </View>

      <Text style={[styles.foot, { color: t.textTertiary }]}>
        {refCaption} {refLow}–{refHigh} {unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 5 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { fontSize: 13.5, fontWeight: '700' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 10.5, fontWeight: '700' },
  track: { height: 12, borderRadius: 6, borderWidth: 1, overflow: 'hidden', justifyContent: 'center' },
  band: { position: 'absolute', top: 0, bottom: 0 },
  /* 2px wide and centred on its value: a wider marker would claim a
     precision the measurement does not have. */
  marker: { position: 'absolute', top: -2, bottom: -2, width: 2.5, marginLeft: -1.25, borderRadius: 2 },
  foot: { fontSize: 10.5 },
});

// v1.0.0 — Interval against a reference band (context only, never a verdict).
