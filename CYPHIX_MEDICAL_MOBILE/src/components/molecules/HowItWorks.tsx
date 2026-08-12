/* ==================================================================
   HowItWorks (molecule) — three lines that make the rest of the screen
   legible to someone who has never seen an ECG.

     ①  Every heartbeat draws the same shape. Yours is yours.
     ②  We averaged 26 of your recordings to find it.
     ③  Each new recording is laid over it to see what moved.

   ══ WHY THIS IS ON THE SCREEN AND NOT BEHIND A "?" ══
   Because without it the screen is a green curve, a row of percentages
   and some Latin. The panel's own header records that prose was cut down
   to "one line or it is deleted", and that rule was written against
   PARAGRAPHS explaining things the picture already said. This is the
   opposite case: three short lines carrying the one idea the picture
   cannot state, which is *what the picture is*. A reader who does not
   have that idea cannot use anything below it.

   It is placed after the signature rather than before it. The curve is
   the subject; leading with an explanation of a thing not yet on screen
   is how a manual reads, not how an instrument does. By the time the
   reader reaches these lines they have already seen the shape being
   described, and the numbering then does real work — it says the three
   lines are a sequence, which is the part that makes the feature click.

   ══ IT NEVER SAYS WHAT THE RESULT MEANS ══
   It describes the METHOD, not the finding. "See what moved" is the
   strongest phrasing allowed; anything about what a movement would mean
   is a clinical claim and belongs to nobody in this app.

   Purely presentational — the counts come from the caller.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** Three lines, already localised and already filled in. */
  steps: readonly string[];
  rtl?: boolean;
}

export default function HowItWorks({ steps, rtl }: Props) {
  const t = useTheme();
  const align = rtl ? ('right' as const) : ('left' as const);

  return (
    <View style={styles.list}>
      {steps.map((s, i) => (
        <View key={s} style={[styles.step, rtl && styles.rtl]}>
          {/* A numbered pip rather than a bullet: these are a sequence,
              and the numbers are what say so. Fixed width so the text
              column starts on one line down the list — ragged left edges
              are what make a short list read as clutter. */}
          <View style={[styles.pip, { backgroundColor: t.signalSoft }]}>
            <Text style={[styles.pipText, { color: t.signalInk }]} allowFontScaling={false}>
              {i + 1}
            </Text>
          </View>
          <Text style={[styles.text, { color: t.textSecondary, textAlign: align }]}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 11 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  rtl: { flexDirection: 'row-reverse' },
  pip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    // Optical centring against the first line of a multi-line paragraph.
    marginTop: 1,
  },
  pipText: { fontSize: 12, fontWeight: '800' },
  text: { flex: 1, flexShrink: 1, minWidth: 0, fontSize: 13.5, lineHeight: 19.5 },
});

// v1.0.0 — Three numbered lines saying what the ECG ID IS, placed after the
//          signature rather than before it: the curve is the subject, and
//          explaining a thing before showing it is how a manual reads. Describes
//          the method only — "see what moved" is the strongest phrasing allowed.
