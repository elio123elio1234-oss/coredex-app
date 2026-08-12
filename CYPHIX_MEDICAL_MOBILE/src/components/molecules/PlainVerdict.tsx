/* ==================================================================
   PlainVerdict (molecule) — the one sentence someone who knows nothing
   about ECGs actually came for.

     ╭──────────────────────────────────────────────╮
     │ ●  Your last recording looks like you        │   soft green tint
     │    24 of 26 recordings match your signature  │
     ╰──────────────────────────────────────────────╯

   ⚠️ v0.44.0: THE TICK AND THE TINTED BAND ARE BOTH GONE, and the
   component moved out from the top of the screen to sit under the lead
   buttons. Reported as reading like an attendance system rather than
   something native — and that was exactly right for a reason worth
   keeping: a green ✓ is a PASS MARK, and this layer does not get to pass
   anything. The band around it made it a status widget on top of the
   page instead of the page speaking.

   What is left is a sentence in the app's own type, large enough to read
   at arm's length, with colour on the SECOND line only and only when
   there is something to look at. Under the trace rather than above it,
   which is also the right order for the argument: the picture, then what
   it says.

   ══ THE OLD RATIONALE, KEPT BECAUSE THE CARD RULE STILL HOLDS ══
   Insights has no cards, and that is not a style preference — it came
   from a device report that white ECG paper inside a white card on a grey
   page "looks like a drawing, not like information" (`EcgIdentityPanel`
   header, v3.0.0). This is a **tinted band**: a soft fill of the colour
   that already carries the meaning, no border, no shadow, no second
   surface. It reads as the page saying something rather than as an object
   sitting on the page — which is the distinction the card feedback was
   actually about, and it is why the ECG below it still bleeds to the
   screen edges untouched.

   ══ ⚠️ THE COLOUR IS ALLOWED TO BE CALM, NEVER TO BE A VERDICT ⚠️ ══
   Green here means "this is like your other recordings". It does not mean
   healthy, and the copy never lets it be read that way. Amber means
   "worth a look", never "bad" — `tokens.ts` documents why `danger` red is
   forbidden anywhere in Insights, and the same reasoning bans a green
   that could be heard as a pass.

   Purely presentational: the verdict is decided in
   `summariseIdentityPlainly`, against the patient's own spread rather
   than any absolute threshold. See that file's header for why that is
   load-bearing rather than fussy.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import type { PlainVerdict as Verdict } from '@cyphix/shared';
import { useTheme } from '@/theme/useTheme';

interface Props {
  verdict: Verdict;
  /** The headline — already localised, already in patient words. */
  title: string;
  /** One supporting line, or null when there is nothing honest to add. */
  detail: string | null;
  rtl?: boolean;
}

export default function PlainVerdict({ verdict, title, detail, rtl }: Props) {
  const t = useTheme();
  const align = rtl ? ('right' as const) : ('left' as const);

  /* ★ COLOUR ONLY ON THE SECOND LINE, and only when there is something
     to look at. The headline is always the ordinary text colour, so the
     sentence reads as the app talking rather than as a status being
     reported at the reader. */
  const calm = verdict === 'consistent' || verdict === 'learning';

  return (
    <View
      style={styles.block}
      accessibilityRole="summary"
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
    >
      <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>{title}</Text>
      {detail && (
        <Text
          style={[styles.detail, { color: calm ? t.textSecondary : t.attention, textAlign: align }]}
        >
          {detail}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 4 },
  /* Large, because this is the sentence the screen exists to say and the
     reader may be holding the phone at arm's length. Sized against the
     panel title rather than against body text. */
  title: { fontSize: 21, fontWeight: '700', lineHeight: 27, letterSpacing: -0.4 },
  detail: { fontSize: 15, lineHeight: 20.5 },
});

// v2.0.0 — No tick, no tinted band, and it lives under the lead buttons
//          instead of at the top. Reported as feeling like an attendance
//          system: a green ✓ is a pass mark and this layer may not pass
//          anything, while the band made it a widget sitting ON the page
//          rather than the page speaking. Now a large plain sentence, with
//          colour on the supporting line only and only when there is
//          something to look at.
// v1.0.0 — The plain-language answer, as a tinted band rather than a card: a
//          soft fill of the colour that already carries the meaning, so it
//          reads as the page speaking rather than as an object on the page.
//          `learning` stays neutral on purpose — an app still getting to know
//          someone is not raising a concern, and spending the attention colour
//          there would dilute it for the day it means something.
