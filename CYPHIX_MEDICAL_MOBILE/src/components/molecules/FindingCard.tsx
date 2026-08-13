/* ==================================================================
   FindingCard (molecule) — one named pattern, with the arithmetic that
   produced it.

   ══ THE SHAPE IS THE ARGUMENT ══
   Four bands, in the order a worried person actually reads them:

     1. WHAT IT IS      the pattern's name — what a doctor would call it
     2. WHAT IT MEANS   one plain line, no jargon left untranslated
     3. HOW SURE        Clear / Likely / Possible, as a word
     4. WHAT WAS MEASURED  PR 236 ms · QTc 512 ms — the checkable part

   Band 4 is not decoration and is never collapsed behind a tap. A finding
   whose evidence is hidden asks to be believed; a finding showing "QTc
   512 ms" can be argued with, and being arguable is the difference between
   a screening tool and an oracle.

   ══ THE LEADING RULE, NOT A LEADING DOT ══
   Urgency is carried by a 3 pt bar down the leading edge rather than a
   coloured card. A red-filled card in a list of four is a list of four
   alarms; a bar reads as a margin mark and lets the WORDS carry the
   weight. It is on the leading edge (`start`), so it flips with Hebrew
   without a second style.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import type { ScreeningFinding } from '@cyphix/shared';
import { verdictPalette } from '@/components/molecules/ScreeningVerdict';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  finding: ScreeningFinding;
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

export default function FindingCard({ finding }: Props) {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);
  const p = verdictPalette(finding.level, t);

  /* ★ NO `as TranslationKey` HERE, and that is the entire point.
     These are ANNOTATED, not cast: TypeScript checks the template literal
     type `scrF_${FindingId}` against the locale's key union, so adding a
     rule to the engine is a COMPILE ERROR in this file until both
     languages carry its two strings. A cast would type-check identically
     and silently print `scrF_myNewRule` to a patient — which is the one
     failure mode a translated medical screen must not have. */
  const nameKey: TranslationKey = `scrF_${finding.id}`;
  const meaningKey: TranslationKey = `scrM_${finding.id}`;

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={[styles.bar, { backgroundColor: p.accent }]} />

      <View style={styles.body}>
        <Text style={[styles.name, { color: t.textPrimary, textAlign: align }]}>
          {tr(nameKey)}
        </Text>
        <Text style={[styles.meaning, { color: t.textSecondary, textAlign: align }]}>
          {tr(meaningKey)}
        </Text>

        <View style={[styles.chips, rtl && styles.rowRtl]}>
          <Text style={[styles.chip, { color: t.textSecondary, backgroundColor: t.surfaceHover }]}>
            {tr(CATEGORY_KEY[finding.category])}
          </Text>
          <Text style={[styles.chip, { color: p.ink, backgroundColor: p.soft }]}>
            {tr(CONFIDENCE_KEY[finding.confidence])}
          </Text>
          {finding.leads && finding.leads.length > 0 && (
            <Text style={[styles.chip, { color: t.textTertiary, backgroundColor: t.surfaceHover }]}>
              {finding.leads.join(' · ')}
            </Text>
          )}
        </View>

        {/* ── The checkable part ── */}
        <View style={[styles.evidence, { borderTopColor: t.border }]}>
          {finding.evidence.map((e) => (
            <View key={`${e.label}${e.value}`} style={[styles.evRow, rtl && styles.rowRtl]}>
              <Text style={[styles.evLabel, { color: t.textTertiary }]} numberOfLines={1}>
                {e.label}
              </Text>
              <Text style={[styles.evValue, { color: t.textPrimary }]} numberOfLines={1}>
                {e.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* `row` + a leading bar rather than a `borderStartWidth`, so the bar can
     run the full height including the evidence block. */
  card: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  bar: { width: 3 },
  body: { flex: 1, padding: 14, gap: 5 },
  name: { fontSize: 16.5, fontWeight: '800', letterSpacing: -0.2 },
  meaning: { fontSize: 14, lineHeight: 19.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 },
  rowRtl: { flexDirection: 'row-reverse' },
  chip: {
    fontSize: 11.5,
    fontWeight: '700',
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  evidence: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 8, gap: 4 },
  evRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  evLabel: { fontSize: 12.5, flexShrink: 1 },
  /* Tabular figures so a column of measurements lines up on the decimal
     rather than drifting with the digits. */
  evValue: { fontSize: 12.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

// v1.0.0 — One screening finding: name, plain meaning, category/confidence
//          chips, and the measurements that fired the rule.
