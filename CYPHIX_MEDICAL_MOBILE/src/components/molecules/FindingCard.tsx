/* ==================================================================
   FindingCard (molecule) — one named pattern, on a card you can tap.

   ══ WHAT THE FIRST VERSION GOT WRONG ══
   It printed the name, a line of meaning, two chips, and a table of raw
   measurements — `Largest QRS +0.48 mV / Threshold 0.50 mV`. Reported as:
   *"what is this? it is not informative. why did it decide that? I look at
   it and I have no idea what you are talking about."*

   Every word of that was fair. A table of figures is what you show a
   clinician who already knows which of them matters. To the person whose
   heart it is, it is two numbers and a colour, and a colour with numbers
   under it reads as a diagnosis.

   ══ WHAT IT DOES NOW ══
     · the name and the plain meaning, at a size meant to be read
     · a BAR showing how far past the line the reading actually is — this
       is what turns "0.48 vs 0.50" into "barely", without the word
     · "Only just past the line" said outright when it is borderline
     · a WHY button, because the full answer needs a screen of its own and
       burying it would leave this card exactly as unexplained as before

   The raw figures moved into the Why sheet. They are not gone — a doctor
   still needs them — they are simply no longer the first thing a
   frightened person meets.
   ================================================================== */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ScreeningFinding } from '@cyphix/shared';
import { verdictPalette } from '@/components/molecules/ScreeningVerdict';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  finding: ScreeningFinding;
  onExplain: (f: ScreeningFinding) => void;
}

const CONFIDENCE_KEY: Record<ScreeningFinding['confidence'], TranslationKey> = {
  high: 'scrConfHigh',
  moderate: 'scrConfModerate',
  limited: 'scrConfLimited',
};

const CATEGORY_KEY: Record<ScreeningFinding['category'], TranslationKey> = {
  rate: 'scrCatRate',
  rhythm: 'scrCatRhythm',
  conduction: 'scrCatConduction',
  repolarisation: 'scrCatRepolarisation',
  axis: 'scrCatAxis',
  chamber: 'scrCatChamber',
  ischaemia: 'scrCatIschaemia',
  other: 'scrCatOther',
  technical: 'scrCatTechnical',
};

/** The margin bar never renders as literally nothing — a zero-width fill
    reads as a broken component rather than as "only just". */
const MIN_FILL_PCT = 6;

export default function FindingCard({ finding, onExplain }: Props) {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);
  const p = verdictPalette(finding.level, t);

  /* ★ NO `as TranslationKey` on these two — they are ANNOTATED, so
     TypeScript checks the template-literal type against the locale's key
     union and adding a rule to the engine is a COMPILE ERROR here until
     both languages carry its strings. A cast would type-check identically
     and print `scrF_myNewRule` to a patient. */
  const nameKey: TranslationKey = `scrF_${finding.id}`;
  const meaningKey: TranslationKey = `scrM_${finding.id}`;

  const fill = Math.max(MIN_FILL_PCT, Math.round(finding.margin * 100));

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={[styles.head, rtl && styles.rowRtl]}>
        <View style={[styles.dot, { backgroundColor: p.accent }]} />
        <Text style={[styles.category, { color: t.textTertiary }]}>
          {tr(CATEGORY_KEY[finding.category])}
        </Text>
        <View style={styles.spacer} />
        <Text style={[styles.confidence, { color: p.ink, backgroundColor: p.soft }]}>
          {tr(CONFIDENCE_KEY[finding.confidence])}
        </Text>
      </View>

      <Text style={[styles.name, { color: t.textPrimary, textAlign: align }]}>{tr(nameKey)}</Text>
      <Text style={[styles.meaning, { color: t.textSecondary, textAlign: align }]}>
        {tr(meaningKey)}
      </Text>

      {/* ── How far past the line ──
          A finding 4 % over its threshold and one 200 % over used to draw
          identically. This is the whole difference. */}
      <View style={styles.marginRow}>
        <View style={[styles.marginTrack, { backgroundColor: t.surfaceHover }]}>
          <View
            style={[styles.marginFill, { backgroundColor: p.accent, width: `${fill}%` }]}
          />
        </View>
        {finding.borderline && (
          <Text style={[styles.borderline, { color: t.textTertiary, textAlign: align }]}>
            {tr('scrWhyBorderline')}
          </Text>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${tr(nameKey)} — ${tr('scrWhyTitle')}`}
        onPress={() => {
          void Haptics.selectionAsync();
          onExplain(finding);
        }}
        style={({ pressed }) => [
          styles.why,
          rtl && styles.rowRtl,
          { backgroundColor: p.soft, opacity: pressed ? 0.65 : 1 },
        ]}
      >
        <Text style={[styles.whyText, { color: p.ink }]}>{tr('scrWhyButton')}</Text>
        <Ionicons
          name={rtl ? 'chevron-back' : 'chevron-forward'}
          size={15}
          color={p.ink}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Apple Health's inset grouped card: generous padding, a large radius, a
     hairline rather than a shadow. The old version's 3 pt colour bar down
     the edge is gone — with a coloured dot in the header the bar was the
     same statement twice, and it made every card read as a warning stripe. */
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 8,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rowRtl: { flexDirection: 'row-reverse' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  category: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  spacer: { flex: 1 },
  confidence: {
    fontSize: 11.5,
    fontWeight: '800',
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  name: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginTop: 2 },
  meaning: { fontSize: 15, lineHeight: 21 },
  marginRow: { gap: 6, marginTop: 4 },
  marginTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  marginFill: { height: '100%', borderRadius: 3 },
  borderline: { fontSize: 12.5, lineHeight: 17 },
  why: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  whyText: { fontSize: 14.5, fontWeight: '800' },
});

// v2.0.0 — Rebuilt after "what is this? it is not informative". The raw figures
//          moved into the Why sheet; the card now carries the name, the plain
//          meaning, a bar showing how far past the line the reading is, and the
//          button that opens the full explanation.
