/* ==================================================================
   StatCard (molecule) — one number, big, on its own card.

   The Interpretation tab's statistics used `MetricTile`, which is the
   REPORT's atom: small, bordered, dense, six to a screen, designed to sit
   in a table a clinician scans. On a patient screen that reads as a
   spreadsheet, which was the "looks dated, not professional" half of the
   feedback.

   This is the same information at patient scale — Apple Health's inset
   card: the value at 30 pt, the label under it, an optional coloured
   accent, and a progress track when the number is a fraction of something.

   ══ THE VALUE IS ALLOWED TO BE COLOURED, THE LABEL IS NOT ══
   Colour here means "this is the reading", not "this is bad" — the tokens
   file is explicit that `attention` and `danger` carry specific meanings
   and may not be spent on decoration. So a stat card takes an accent only
   when its caller has a reason, and defaults to plain text.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '@/i18n/useTranslation';
import { useTheme } from '@/theme/useTheme';

interface Props {
  label: string;
  /** `null` renders as "—". Never 0, never blank: the difference between
      "the measurement is zero" and "there is no measurement" is the whole
      honesty rule of the analysis layer, and it survives into the UI. */
  value: number | string | null;
  unit?: string;
  accent?: string;
  /** 0…1. Draws a track under the value — for "43 of 43", "97 %". */
  progress?: number;
}

export default function StatCard({ label, value, unit, accent, progress }: Props) {
  const t = useTheme();
  const { rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);
  const missing = value === null || value === undefined || value === '';
  const ink = missing ? t.textTertiary : (accent ?? t.textPrimary);

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={[styles.valueRow, rtl && styles.rowRtl]}>
        {/* Digits read left-to-right in Hebrew too; only the row mirrors.
            `allowFontScaling={false}` on the NUMBER alone — at 30 pt a large
            accessibility setting overflows the card, and the label beside it
            still scales, which is where the reading help actually is. */}
        <Text style={[styles.value, { color: ink }]} allowFontScaling={false} numberOfLines={1}>
          {missing ? '—' : String(value)}
        </Text>
        {!missing && unit != null && (
          <Text style={[styles.unit, { color: t.textTertiary }]}>{unit}</Text>
        )}
      </View>

      {progress !== undefined && (
        <View style={[styles.track, { backgroundColor: t.surfaceHover }]}>
          <View
            style={[
              styles.fill,
              {
                backgroundColor: accent ?? t.textSecondary,
                width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
              },
            ]}
          />
        </View>
      )}

      <Text style={[styles.label, { color: t.textSecondary, textAlign: align }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /* `flexBasis: 46%` + `flexGrow` gives exactly two per row on a phone and
     shares the remainder so the row ends flush rather than ragged — the
     same arithmetic MetricTile uses, at a larger scale. */
  card: {
    flexBasis: '46%',
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  rowRtl: { flexDirection: 'row-reverse' },
  value: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, flexShrink: 1 },
  unit: { fontSize: 13, fontWeight: '700' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
});

// v1.0.0 — A statistic at patient scale: 30 pt value, optional accent and
//          progress track. Replaces MetricTile on the Interpretation tab, which
//          is the report's dense table atom and read as a spreadsheet there.
