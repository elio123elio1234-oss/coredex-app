/* ==================================================================
   StudyReadout (molecule) — this recording's numbers, next to the usual
   ones. ALL of them, every time.

     Heart rate    68        usually 66
     PR           189 ms     usually 128        ← amber: this one moved
     QRS           94 ms     usually 96
     QTc          412 ms     usually 408

   ══ WHY EVERY ROW AND NOT ONLY THE ONES THAT MOVED ══
   Reported directly: *"I always want to see the average of that
   measurement against the current average — not only for the ones that
   disagree — but tell them apart by colour."*

   That is the right instinct and it fixes a real defect. Showing only the
   differences made the screen's content depend on whether anything was
   wrong: a good recording showed an empty space and a bad one showed
   chips, so the reader could not learn where to look, and an empty space
   is ambiguous between "everything agreed" and "nothing was measured".
   Printing every row always means the LAYOUT never moves, the eye lands
   in the same place each time, and the colour is the only thing carrying
   the message — which is what colour is for.

   ══ THE COLOUR IS THE ONLY DIFFERENCE, AND IT IS NOT RED ══
   A row that moved beyond this person's own repeatability is amber and
   its number is heavier. Nothing else changes: no icon, no border, no
   background, no reordering. `tokens.ts` documents why red is forbidden
   here — a distance from your own baseline is a measurement, and painting
   it red interprets it in the one direction this layer may not go.

   ══ NO UNITS ON THE BASELINE ══
   "189 ms · usually 128" — the unit is stated once. Repeating it doubles
   the ink for no information and turns a comparison into a specification
   sheet, which is the register this whole panel was rebuilt away from.

   Purely presentational.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

export interface ReadoutRow {
  key: string;
  /** Plain words. "Heart rate", not "HR". */
  label: string;
  /** What this recording measured, formatted, or "—" when it could not be. */
  value: string;
  /** The unit, once, riding on the value. */
  unit?: string;
  /** What the baseline holds, already formatted and prefixed by the caller. */
  usually: string;
  /** True when it moved beyond this person's own repeatability. */
  moved: boolean;
}

interface Props {
  rows: readonly ReadoutRow[];
  rtl?: boolean;
}

export default function StudyReadout({ rows, rtl }: Props) {
  const t = useTheme();

  return (
    <View style={styles.list}>
      {rows.map((r) => (
        <View key={r.key} style={[styles.row, rtl && styles.rtl]}>
          <Text
            style={[styles.label, { color: t.textSecondary }]}
            numberOfLines={1}
          >
            {r.label}
          </Text>
          <View style={[styles.right, rtl && styles.rtl]}>
            <Text
              style={[
                styles.value,
                { color: r.moved ? t.textPrimary : t.textPrimary, fontWeight: r.moved ? '800' : '600' },
              ]}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {r.value}
              {r.unit ? <Text style={styles.unit}>{r.unit}</Text> : null}
            </Text>
            {/* The baseline, quieter — it is the thing being compared
                AGAINST, so it must not compete with the thing being
                compared. Amber only when this row moved. */}
            <Text
              style={[styles.usually, { color: r.moved ? t.attention : t.textTertiary }]}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {r.usually}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    /* Tall rows on purpose. This screen is read by people who are not
       looking for a data table, and a 44 pt row is the same target size
       every other tappable thing in the app uses even though this one is
       not tappable — consistent rhythm reads as calm. */
    minHeight: 38,
  },
  rtl: { flexDirection: 'row-reverse' },
  label: { fontSize: 16, flexShrink: 1, minWidth: 0 },
  right: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexShrink: 0 },
  value: { fontSize: 19, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  unit: { fontSize: 13, fontWeight: '600' },
  usually: { fontSize: 13.5, fontVariant: ['tabular-nums'], minWidth: 74, textAlign: 'right' },
});

// v1.0.0 — Every measurement, every time, with colour as the only difference.
//          Showing only the rows that moved made the screen's CONTENT depend on
//          whether anything was wrong — so the layout jumped, the eye could not
//          learn where to look, and an empty space was ambiguous between
//          "everything agreed" and "nothing was measured".
