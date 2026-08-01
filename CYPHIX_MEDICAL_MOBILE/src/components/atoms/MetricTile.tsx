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
        hero
          ? { backgroundColor: t.accentSoft, borderColor: t.accent }
          : { backgroundColor: t.bgSoft, borderColor: t.border },
      ]}
    >
      {/* `.metric-label` — uppercase, letter-spaced, tertiary. */}
      <Text style={[styles.label, { color: t.textTertiary }]}>{label.toUpperCase()}</Text>
      <View style={styles.valueRow}>
        {/* ★ `flexShrink` is what keeps the value INSIDE the tile.
            A Text in a `flexDirection: 'row'` does not wrap by default — it
            overflows its parent and prints straight through the border. It
            was not the numbers that escaped but the word-valued measurements
            ("Slightly variable" is 17 characters at 22 px, ~200 pt in a 147 pt
            tile). This is the RN equivalent of the web's
            `.metric-value { overflow-wrap: anywhere }`. */}
        <Text
          style={[
            styles.value,
            hero && styles.valueHero,
            { color: missing ? t.textTertiary : (accent ?? t.textPrimary) },
          ]}
        >
          {missing ? '—' : String(value)}
        </Text>
        {/* The unit never shrinks: "ms" broken across two lines is worse than
            a slightly narrower number. */}
        {!missing && unit != null && (
          <Text style={[styles.unit, { color: t.textTertiary }]}>{unit}</Text>
        )}
      </View>
      {hint != null && <Text style={[styles.hint, { color: t.textTertiary }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  /* `.metric-grid` is `repeat(auto-fit, minmax(140px, 1fr))`, which on a
     phone's column resolves to TWO tiles per row. `flexBasis: 46%` reproduces
     exactly that — two fit, three cannot — and `flexGrow` then shares out the
     remainder so the row ends flush instead of ragged. */
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 130,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.7, marginBottom: 4 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  value: {
    flexShrink: 1,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 25.3,
    fontVariant: ['tabular-nums'],
  },
  valueHero: { fontSize: 32, lineHeight: 36.8 },
  unit: { flexShrink: 0, fontSize: 12, fontWeight: '600', marginLeft: 4 },
  hint: { fontSize: 10.5, lineHeight: 14.7, marginTop: 4 },
});

// v1.2.0 — `flexShrink` on the value so word-valued measurements wrap inside
//          the tile instead of printing through its border.
