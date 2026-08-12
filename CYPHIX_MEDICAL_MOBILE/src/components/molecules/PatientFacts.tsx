/* ==================================================================
   PatientFacts (molecule) — the three numbers a person recognises.

        72              26              4
        YOUR USUAL      RECORDINGS      MONTHS
        HEART RATE                      TRACKED

   ══ WHY THESE THREE AND NOT THE CLINICAL FIVE ══
   The baseline row below this one prints PR, QRS, QTc and axis. Those are
   the right numbers and they are addressed to a clinician: a patient
   reading "PR 156 ms" learns that something is 156 of something, and
   nothing else. Worse, an unexplained clinical number does not sit
   neutrally — it worries, which is the same failure the deviation chips
   were fixed for in v0.32.0 ("a number nobody can interpret is worse than
   no number").

   So the patient gets the three figures they can already place:
     • a heart rate, which everyone has a feel for;
     • a count of their own recordings, which is a statement about THEM
       rather than about their heart, and is the honest way to say how
       much the app knows;
     • how long they have been at it, because a baseline built over four
       months means something a baseline built over four days does not.

   None of them is graded. There is no "good"/"high" tint on the rate:
   a resting rate has a wide normal range that depends on age, fitness and
   medication, and this layer may not interpret (`ecgAnalysis.ts`). It is
   printed as a fact about them, with a caption saying what it is.

   ══ THE UNITS ARE SMALL AND THE NUMBERS ARE BIG ══
   Deliberate. The number is the content and the unit is a footnote to it;
   equal weight makes a row of figures read as a specification sheet,
   which is precisely the "outdated instrument panel" feel this replaced.

   Purely presentational.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

export interface PatientFact {
  /** The figure itself, already formatted. "—" when it cannot be shown. */
  value: string;
  /** A small unit riding on the number, or null. */
  unit?: string | null;
  /** Two words at most, in plain language. Never an abbreviation. */
  caption: string;
}

interface Props {
  facts: readonly PatientFact[];
  rtl?: boolean;
}

export default function PatientFacts({ facts, rtl }: Props) {
  const t = useTheme();
  const align = rtl ? ('right' as const) : ('left' as const);

  return (
    <View style={[styles.row, rtl && styles.rtl]}>
      {facts.map((f) => (
        <View key={f.caption} style={styles.cell}>
          <Text
            style={[styles.value, { color: t.textPrimary, textAlign: align }]}
            /* Off, like every other figure in this panel: a tabular number
               that grows with the system font size wraps its caption onto
               three lines and the row stops being a row. */
            allowFontScaling={false}
            numberOfLines={1}
          >
            {f.value}
            {f.unit ? <Text style={[styles.unit, { color: t.textTertiary }]}>{f.unit}</Text> : null}
          </Text>
          <Text
            style={[styles.caption, { color: t.textSecondary, textAlign: align }]}
            numberOfLines={2}
          >
            {f.caption}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14 },
  rtl: { flexDirection: 'row-reverse' },
  /* Equal thirds with `minWidth: 0`, so a long caption wraps inside its
     own cell instead of pushing the next one off the screen — the same
     overflow that printed "Confidence 48 %" through the ring in v0.32.0. */
  cell: { flex: 1, minWidth: 0, gap: 2 },
  value: { fontSize: 30, fontWeight: '800', letterSpacing: -1.1, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 13, fontWeight: '700', letterSpacing: 0 },
  caption: { fontSize: 11.5, lineHeight: 15, fontWeight: '600' },
});

// v1.0.0 — Three figures a patient can already place — resting rate, their own
//          recording count, how long they have been tracking — sized so the
//          number is the content and the unit is a footnote. None of them is
//          graded or tinted: a resting rate's normal range depends on age,
//          fitness and medication, and this layer does not interpret.
