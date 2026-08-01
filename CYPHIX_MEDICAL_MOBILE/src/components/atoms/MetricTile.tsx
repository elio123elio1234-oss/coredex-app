/* ==================================================================
   MetricTile (atom) — one measured number with its unit and caption.
   Ported from the web atom.

   ★ A measurement that could not be made renders as "—", never as 0 and
   never blank. On a clinical sheet the difference between "the QT is
   0 ms" and "the QT could not be measured" is the difference between a
   wrong number and an honest one.

   (The web's count-up animation is not ported: it is tied to
   scroll-into-view observers, and a number that animates while a
   clinician is reading it is a liability, not a flourish.)
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  label: string;
  value: number | string | null;
  unit?: string;
  /** Small explanatory line under the value (e.g. what it is derived from). */
  hint?: string;
  /** Visual weight — `hero` is for the headline number (the heart rate). */
  variant?: 'default' | 'hero';
  accent?: string;
}

export default function MetricTile({ label, value, unit, hint, variant, accent }: Props) {
  const t = useTheme();
  const missing = value === null || value === undefined || value === '';
  const hero = variant === 'hero';

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: t.bgSoft, borderColor: t.border },
        hero && { borderColor: t.accent },
      ]}
    >
      <Text style={[styles.label, { color: t.textSecondary }]}>{label}</Text>
      <View style={styles.valueRow}>
        <Text
          style={[
            styles.value,
            hero && styles.valueHero,
            { color: missing ? t.textTertiary : (accent ?? t.textPrimary) },
          ]}
        >
          {missing ? '—' : String(value)}
        </Text>
        {!missing && unit != null && (
          <Text style={[styles.unit, { color: t.textTertiary }]}>{unit}</Text>
        )}
      </View>
      {hint != null && <Text style={[styles.hint, { color: t.textTertiary }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flexGrow: 1, flexBasis: '30%', minWidth: 96, borderWidth: 1, borderRadius: RADIUS.md, padding: 10, gap: 2 },
  label: { fontSize: 11, fontWeight: '700' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'] },
  valueHero: { fontSize: 30 },
  unit: { fontSize: 10.5, fontWeight: '700' },
  hint: { fontSize: 10, lineHeight: 13.5 },
});

// v1.0.0 — One measured number; an unmeasurable one renders an explicit dash.
