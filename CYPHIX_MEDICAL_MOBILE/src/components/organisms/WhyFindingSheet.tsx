/* ==================================================================
   WhyFindingSheet (organism) — the answer to "why is this yellow?".

   ══ THE REPORT THAT CAUSED THIS FILE ══
   *"I look at this and I have no idea what you are talking about. As a
   healthy person I see it and I get stressed. Maybe even a button that
   explains it like to a small child, with drawings and proof from my own
   measurement, of what happened and why it is yellow."*

   That is the whole specification, and it decomposes into four questions
   asked in this order — which is the order someone frightened asks them:

     1. WHAT DID YOU LOOK AT?   the part of the beat, named in ordinary
                                words, shaded on THEIR OWN waveform
     2. WHAT DID YOU FIND?      their number on a scale, against typical
     3. WHY DOES IT HAPPEN?     the plain-language cause — the ordinary
                                explanation FIRST, because it is also the
                                likelier one
     4. WHAT DOES IT MEAN?      the one-line consequence, and the criterion

   ══ THE PROOF IS THEIR OWN RECORDING, NOT AN ILLUSTRATION ══
   A stock diagram of a heart teaches the concept and proves nothing. The
   question is not "what is a QT interval", it is "why did you flag MINE",
   and only their own trace answers it. Everything drawn here comes from the
   recording on screen.

   ══ A BORDERLINE FINDING SAYS SO, HERE, FIRST ══
   If the reading was a hair past the line, that is the first sentence in
   the sheet — before the waveform, before the cause. Someone who opened
   this because they are worried should not have to read to the bottom to
   discover the answer is "barely, and it did not change your result".
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import type { EcgAnalysis, ScreeningFinding } from '@cyphix/shared';
import RangeBar from '@/components/atoms/RangeBar';
import BottomSheet from '@/components/molecules/BottomSheet';
import FindingBeatChart from '@/components/molecules/FindingBeatChart';
import { verdictPalette } from '@/components/molecules/ScreeningVerdict';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  finding: ScreeningFinding | null;
  onClose: () => void;
  /** Filtered lead II — the same waveform the finding was measured from. */
  signal: Float32Array | null;
  analysis: EcgAnalysis | null;
}

const FOCUS_KEY: Record<ScreeningFinding['focus'], TranslationKey> = {
  p: 'scrFocus_p',
  pr: 'scrFocus_pr',
  qrs: 'scrFocus_qrs',
  st: 'scrFocus_st',
  t: 'scrFocus_t',
  qt: 'scrFocus_qt',
  rhythm: 'scrFocus_rhythm',
  none: 'scrFocus_none',
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  const { rtl } = useTranslation();
  return (
    <View style={styles.block}>
      <Text
        style={[styles.blockTitle, { color: t.textTertiary, textAlign: rtl ? 'right' : 'left' }]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function WhyFindingSheet({ finding, onClose, signal, analysis }: Props) {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);

  /* Rendered even while closed so the sheet's own entrance animation has
     content to size against — but with nothing to draw, which costs
     nothing. (`BottomSheet` measures its children before it rises; see the
     v0.39.2 post-mortem on committing a panel off screen.) */
  const p = finding ? verdictPalette(finding.level, t) : verdictPalette('clear', t);

  return (
    <BottomSheet
      visible={finding !== null}
      onClose={onClose}
      closeLabel={tr('scrClose')}
      title={tr('scrWhyTitle')}
      scrollable
    >
      {finding && (
        <View style={styles.body}>
          <Text style={[styles.name, { color: t.textPrimary, textAlign: align }]}>
            {tr(`scrF_${finding.id}` as TranslationKey)}
          </Text>

          {/* ★ The most important line in the sheet, and it is first. */}
          {finding.borderline && (
            <Text
              style={[
                styles.borderline,
                { color: t.textSecondary, backgroundColor: t.surfaceHover, textAlign: align },
              ]}
            >
              {tr('scrWhyBorderline')}
            </Text>
          )}

          {/* 1 — what we looked at, drawn on their own beat */}
          <Block title={tr('scrWhyMeasured')}>
            <Text style={[styles.para, { color: t.textSecondary, textAlign: align }]}>
              {tr(FOCUS_KEY[finding.focus])}
            </Text>
            {signal && analysis && (
              <FindingBeatChart
                signal={signal}
                rPeaks={analysis.rPeaks}
                sampleRate={analysis.sampleRate}
                focus={finding.focus}
                accent={p.accent}
              />
            )}
          </Block>

          {/* 2 — their number, on a scale */}
          {finding.scale && (
            <Block title={tr('scrWhyEvidence')}>
              <RangeBar
                value={finding.scale.value}
                unit={finding.scale.unit}
                min={finding.scale.min}
                max={finding.scale.max}
                normalLow={finding.scale.normalLow}
                normalHigh={finding.scale.normalHigh}
                accent={p.accent}
                bandColor={t.successSoft}
                labels={{ yours: tr('scrWhyYours'), normal: tr('scrWhyNormal') }}
              />
            </Block>
          )}

          {/* The raw numbers stay too. The bar says "barely"; only the
              figures let a doctor check the arithmetic. */}
          <View style={[styles.figures, { borderColor: t.border }]}>
            {finding.evidence.map((e) => (
              <View key={e.label + e.value} style={[styles.figRow, rtl && styles.rowRtl]}>
                <Text style={[styles.figLabel, { color: t.textTertiary }]} numberOfLines={1}>
                  {e.label}
                </Text>
                <Text style={[styles.figValue, { color: t.textPrimary }]} numberOfLines={1}>
                  {e.value}
                </Text>
              </View>
            ))}
          </View>

          {/* 3 — why it happens, in ordinary words */}
          <Block title={tr('scrWhyCause')}>
            <Text style={[styles.para, { color: t.textPrimary, textAlign: align }]}>
              {tr(`scrCause_${finding.id}` as TranslationKey)}
            </Text>
          </Block>

          {/* 4 — what it means, and the criterion behind it */}
          <Block title={tr('scrWhyMeaning')}>
            <Text style={[styles.para, { color: t.textPrimary, textAlign: align }]}>
              {tr(`scrM_${finding.id}` as TranslationKey)}
            </Text>
            <Text style={[styles.source, { color: t.textTertiary, textAlign: align }]}>
              {tr('scrWhySource')}: {finding.source}
            </Text>
          </Block>

          <Text style={[styles.disclaimer, { color: t.textTertiary, textAlign: align }]}>
            {tr('scrDisclaimer')}
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 18, paddingBottom: 8 },
  name: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  borderline: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  block: { gap: 9 },
  blockTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  para: { fontSize: 15.5, lineHeight: 22.5 },
  figures: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 6 },
  figRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowRtl: { flexDirection: 'row-reverse' },
  figLabel: { fontSize: 13.5, flexShrink: 1 },
  figValue: { fontSize: 13.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  source: { fontSize: 11.5, lineHeight: 16.5, marginTop: 2 },
  disclaimer: { fontSize: 11.5, lineHeight: 16.5 },
});

// v1.0.0 — "Why is this yellow": the part of the beat we looked at, shaded on
//          the patient's OWN waveform; their number against the typical band;
//          the plain-language cause; and the criterion. Borderline says so first.
