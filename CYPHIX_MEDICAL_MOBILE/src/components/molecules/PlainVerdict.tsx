/* ==================================================================
   PlainVerdict (molecule) — the one sentence someone who knows nothing
   about ECGs actually came for.

     ╭──────────────────────────────────────────────╮
     │ ●  Your last recording looks like you        │   soft green tint
     │    24 of 26 recordings match your signature  │
     ╰──────────────────────────────────────────────╯

   ══ WHY IT IS A TINTED BAND AND NOT A CARD ══
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

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { PlainVerdict as Verdict } from '@cyphix/shared';
import { RADIUS } from '@/theme/tokens';
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

  /* `learning` is deliberately NEUTRAL rather than amber. An app that has
     not finished getting to know someone is not raising a concern about
     them, and tinting that state with the attention colour would teach
     the reader to read amber as "the app is unsure" — which then dilutes
     it on the day it means "look at this recording". */
  const calm = verdict === 'consistent';
  const neutral = verdict === 'learning';
  const fill = neutral ? t.surfaceHover : calm ? t.signalSoft : t.attentionSoft;
  const mark = neutral ? t.textTertiary : calm ? t.signal : t.attention;
  const icon = neutral ? 'ellipsis-horizontal' : calm ? 'checkmark-circle' : 'eye-outline';

  return (
    <View
      style={[styles.band, rtl && styles.rtl, { backgroundColor: fill }]}
      accessibilityRole="summary"
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
    >
      <Ionicons name={icon} size={20} color={mark} style={styles.icon} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>{title}</Text>
        {detail && (
          <Text style={[styles.detail, { color: t.textSecondary, textAlign: align }]}>
            {detail}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: RADIUS.lg,
  },
  rtl: { flexDirection: 'row-reverse' },
  /* Nudged down to sit on the first line's optical centre rather than its
     box's — an icon vertically centred against a two-line block floats. */
  icon: { marginTop: 1 },
  text: { flex: 1, flexShrink: 1, minWidth: 0, gap: 3 },
  title: { fontSize: 16.5, fontWeight: '700', lineHeight: 22, letterSpacing: -0.2 },
  detail: { fontSize: 13, lineHeight: 18.5 },
});

// v1.0.0 — The plain-language answer, as a tinted band rather than a card: a
//          soft fill of the colour that already carries the meaning, so it
//          reads as the page speaking rather than as an object on the page.
//          `learning` stays neutral on purpose — an app still getting to know
//          someone is not raising a concern, and spending the attention colour
//          there would dilute it for the day it means something.
