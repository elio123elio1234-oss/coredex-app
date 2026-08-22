/* ==================================================================
   EcgValuesSheet (organism) — the VALUES tab of a study, redesigned.

   ══ WHAT THIS REPLACED, AND WHY ══
   Until v0.59.0 this tab rendered `EcgAnalysisSheet` — the web report's
   measurement sheet, ported to the phone almost line for line. It was
   correct and it was a form: five bordered boxes of grey label/value
   pairs, a table that had to be dragged sideways to finish reading, and
   nothing on it that said which numbers mattered. Reported as "very
   old-fashioned", which it was: it is a printed page, and it was being
   read on a phone by a patient rather than on paper by a cardiologist.

   This is the same measurements, in the design handoff's language: the
   rate as the hero, the rest sectioned by colour on translucent cards
   over a soft glow field, and every value tappable for one sentence
   saying what it is.

   `EcgAnalysisSheet` is NOT deleted. It is still what the report preview
   and the PDF lay their measurements out from, where a printed form is
   exactly the right answer.

   ══ THE THREE RULES THAT SURVIVED THE REDESIGN ══
   1. MEASUREMENTS ONLY. No finding, no normal/abnormal, no suggested
      diagnosis, anywhere — including in the explainer sheets, which are
      the easiest place to slip one in.
   2. A measurement that could not be made is "—". Never 0, never blank.
   3. Colour SECTIONS, it never GRADES. The rhythm tile is amber whether
      the rhythm is regular or not; the steadiness ring is mint at 12 %
      and at 98 %; the reference bands are one flat tint at any value.
      Every one of those is load-bearing, and each is argued where it
      lives.

   Purely presentational: it is handed an `EcgAnalysis` and lays it out.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { EcgAnalysis } from '@cyphix/shared';
import ValueSurface from '@/components/atoms/ValueSurface';
import AxisDial from '@/components/molecules/AxisDial';
import ValueAmplitudeTable from '@/components/molecules/ValueAmplitudeTable';
import ValueHeroCard from '@/components/molecules/ValueHeroCard';
import ValueInfoSheet, { type ValueInfo } from '@/components/molecules/ValueInfoSheet';
import ValueIntervalRow from '@/components/molecules/ValueIntervalRow';
import ValueQualityCard from '@/components/molecules/ValueQualityCard';
import ValueTile from '@/components/molecules/ValueTile';
import { AXIS_KEY, REGULARITY_KEY } from '@/components/organisms/EcgAnalysisSheet';
import { useTranslation } from '@/i18n/useTranslation';
import { VALUE_RADIUS, useValuesPalette } from '@/theme/valuesPalette';

interface Props {
  analysis: EcgAnalysis;
  /** The study's length, for the hero chip and the quality card. */
  durationSec: number;
  isSimulated: boolean;
  /** Filtered lead II — the trace on the hero card. */
  signal: Float32Array | null;
  /** The CTA. Omitted (and the button hidden) when export is not permitted. */
  onExportReport?: (() => void) | null;
}

/* Reference bands — the ranges these intervals typically fall in for
   adults, printed for context exactly as on a hospital ECG form. The same
   numbers `EcgAnalysisSheet` uses; they are the report's bands, not this
   screen's, and a second opinion about them is the one thing that must
   not happen here. */
const REF = {
  pr: { low: 120, high: 200, min: 60, max: 320 },
  qrs: { low: 80, high: 120, min: 40, max: 200 },
  qt: { low: 300, high: 440, min: 200, max: 600 },
  qtc: { low: 350, high: 450, min: 280, max: 600 },
} as const;

/** Section heading — uppercase, letter-spaced, in the dim weight. */
function SectionTitle({ text, color, align }: { text: string; color: string; align: 'left' | 'right' }) {
  return <Text style={[styles.sectionTitle, { color, textAlign: align }]}>{text.toUpperCase()}</Text>;
}

export default function EcgValuesSheet({
  analysis,
  durationSec,
  isSimulated,
  signal,
  onExportReport,
}: Props) {
  const p = useValuesPalette();
  const { t: tr, rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);
  const { rate, intervals, axis, amplitudes, quality } = analysis;

  const [info, setInfo] = useState<ValueInfo | null>(null);
  /* The hero's trace is built against a measured width; a path built
     against zero is a vertical line at x = 0. */
  const [traceW, setTraceW] = useState(0);

  const rrRange =
    rate.rrMinMs !== null && rate.rrMaxMs !== null ? `${rate.rrMinMs}–${rate.rrMaxMs}` : null;
  const rhythmWord = tr(REGULARITY_KEY[rate.regularity]);
  const durationLabel = `${durationSec.toFixed(1)} ${tr('valSecUnit')}`;
  const sampleRateLabel = `${analysis.sampleRate} Hz`;

  /** One helper so every tile opens the sheet the same way. */
  const open = (title: string, value: number | string | null, unit: string, body: string) => () =>
    setInfo({ title, value: value === null ? '—' : String(value), unit, body });

  /** "Typical adult range 120–200 ms" — the caption under an interval. */
  const refCaption = (low: number, high: number) => `${tr('refRange')} ${low}–${high} ms`;

  return (
    <View style={styles.sheet}>
      {/* The honesty statement, first and unconditional. It is not
          decoration and it is not optional — see EcgAnalysisSheet. */}
      <Text style={[styles.sub, { color: p.dim, textAlign: align }]}>{tr('analysisSubtitle')}</Text>

      {/* Too few clean beats must never read as a confident measurement
          sheet, however handsome the sheet is. */}
      {quality.insufficient && (
        <Text
          style={[
            styles.warn,
            { color: p.amber, backgroundColor: p.amberChip, borderColor: p.amberBd, textAlign: align },
          ]}
        >
          {tr('qInsufficient')}
        </Text>
      )}

      <View onLayout={(e) => setTraceW(Math.round(e.nativeEvent.layout.width) - 44)}>
        <ValueHeroCard
          palette={p}
          bpm={rate.bpm}
          bpmUnit={tr('bpm')}
          signal={signal}
          traceWidth={traceW}
          rhythmLabel={rhythmWord}
          durationLabel={durationLabel}
          sampleRateLabel={sampleRateLabel}
          simulatedLabel={isSimulated ? tr('histSimulated') : null}
        />
      </View>

      {/* ── Rate & rhythm ── */}
      <View style={styles.section}>
        <SectionTitle text={tr('secRate')} color={p.dim} align={align} />
        <View style={styles.grid}>
          <ValueTile
            palette={p}
            label={tr('mBpm')}
            value={rate.bpm}
            unit={tr('bpm')}
            hint={tr('mBpmHint')}
            fill={p.redTile}
            valueColor={p.red}
            onPress={open(tr('mBpm'), rate.bpm, tr('bpm'), tr('valInfoHr'))}
            a11yHint={tr('valInfoTapHint')}
          />
          <ValueTile
            palette={p}
            label={tr('mRrMean')}
            value={rate.rrMeanMs}
            unit="ms"
            hint={tr('valRrMeanHint')}
            onPress={open(tr('mRrMean'), rate.rrMeanMs, 'ms', tr('valInfoRr'))}
            a11yHint={tr('valInfoTapHint')}
          />
          <ValueTile
            palette={p}
            label={tr('mRrRange')}
            value={rrRange}
            unit="ms"
            /* The range is two numbers with a dash: at 32 pt it wraps in a
               130 pt tile, so this one tile takes a smaller size rather
               than the grid taking a wider column. */
            valueSize={24}
            onPress={open(tr('mRrRange'), rrRange, 'ms', tr('valInfoRange'))}
            a11yHint={tr('valInfoTapHint')}
          >
            {/* Where this recording's spread sat inside its own range —
                a picture of the two numbers above, nothing more. */}
            <View style={[styles.meterTrack, { backgroundColor: p.track }]}>
              <LinearGradient
                colors={p.blueGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.meterFill}
              />
            </View>
          </ValueTile>
          <ValueTile
            palette={p}
            label={tr('mRegularity')}
            value={rhythmWord}
            /* A word, not a number: 32 pt would set "Slightly variable"
               across three lines. */
            valueSize={22}
            fill={p.amberTile}
            valueColor={p.amber}
            onPress={open(tr('mRegularity'), rhythmWord, '', tr('valInfoRhythm'))}
            a11yHint={tr('valInfoTapHint')}
          />
          <ValueTile
            palette={p}
            label={tr('mSdnn')}
            value={rate.sdnnMs}
            unit="ms"
            hint={tr('mSdnnHint')}
            onPress={open(tr('mSdnn'), rate.sdnnMs, 'ms', tr('valInfoSdnn'))}
            a11yHint={tr('valInfoTapHint')}
          />
          <ValueTile
            palette={p}
            label={tr('mRmssd')}
            value={rate.rmssdMs}
            unit="ms"
            hint={tr('mRmssdHint')}
            onPress={open(tr('mRmssd'), rate.rmssdMs, 'ms', tr('valInfoRmssd'))}
            a11yHint={tr('valInfoTapHint')}
          />
          <ValueTile
            palette={p}
            label={tr('mPBefore')}
            value={rate.pBeforeQrsPct}
            unit="%"
            hint={tr('mPBeforeHint')}
            onPress={open(tr('mPBefore'), rate.pBeforeQrsPct, '%', tr('valInfoPqrs'))}
            a11yHint={tr('valInfoTapHint')}
          />
          <ValueTile
            palette={p}
            label={tr('mBeats')}
            value={rate.beatsAnalyzed}
            hint={tr('valBeatsHint')}
            onPress={open(tr('mBeats'), rate.beatsAnalyzed, '', tr('valInfoBeats'))}
            a11yHint={tr('valInfoTapHint')}
          />
        </View>
      </View>

      {/* ── Intervals ── */}
      <View style={styles.section}>
        <SectionTitle text={tr('secIntervals')} color={p.dim} align={align} />
        <ValueSurface
          colors={p.cardBg}
          border={p.cardBd}
          radius={VALUE_RADIUS.card}
          style={styles.card}
        >
          <View style={styles.intervals}>
            <ValueIntervalRow
              palette={p}
              label={tr('iPR')}
              value={intervals.prMs}
              unit="ms"
              refLow={REF.pr.low}
              refHigh={REF.pr.high}
              scaleMin={REF.pr.min}
              scaleMax={REF.pr.max}
              caption={refCaption(REF.pr.low, REF.pr.high)}
              onPress={open(tr('iPR'), intervals.prMs, 'ms', tr('valInfoPr'))}
              a11yHint={tr('valInfoTapHint')}
            />
            <ValueIntervalRow
              palette={p}
              label={tr('iQRS')}
              value={intervals.qrsMs}
              unit="ms"
              refLow={REF.qrs.low}
              refHigh={REF.qrs.high}
              scaleMin={REF.qrs.min}
              scaleMax={REF.qrs.max}
              caption={refCaption(REF.qrs.low, REF.qrs.high)}
              onPress={open(tr('iQRS'), intervals.qrsMs, 'ms', tr('valInfoQrs'))}
              a11yHint={tr('valInfoTapHint')}
            />
            <ValueIntervalRow
              palette={p}
              label={tr('iQT')}
              value={intervals.qtMs}
              unit="ms"
              refLow={REF.qt.low}
              refHigh={REF.qt.high}
              scaleMin={REF.qt.min}
              scaleMax={REF.qt.max}
              caption={refCaption(REF.qt.low, REF.qt.high)}
              onPress={open(tr('iQT'), intervals.qtMs, 'ms', tr('valInfoQt'))}
              a11yHint={tr('valInfoTapHint')}
            />
            <ValueIntervalRow
              palette={p}
              label={tr('iQTcB')}
              value={intervals.qtcBazettMs}
              unit="ms"
              refLow={REF.qtc.low}
              refHigh={REF.qtc.high}
              scaleMin={REF.qtc.min}
              scaleMax={REF.qtc.max}
              caption={refCaption(REF.qtc.low, REF.qtc.high)}
              onPress={open(tr('iQTcB'), intervals.qtcBazettMs, 'ms', tr('valInfoQtcB'))}
              a11yHint={tr('valInfoTapHint')}
            />
            <ValueIntervalRow
              palette={p}
              label={tr('iQTcF')}
              value={intervals.qtcFridericiaMs}
              unit="ms"
              refLow={REF.qtc.low}
              refHigh={REF.qtc.high}
              scaleMin={REF.qtc.min}
              scaleMax={REF.qtc.max}
              caption={refCaption(REF.qtc.low, REF.qtc.high)}
              onPress={open(tr('iQTcF'), intervals.qtcFridericiaMs, 'ms', tr('valInfoQtcF'))}
              a11yHint={tr('valInfoTapHint')}
            />
          </View>
          <Text style={[styles.note, { color: p.faint, textAlign: align, borderTopColor: p.hair }]}>
            {tr('intervalsNote')}
          </Text>
        </ValueSurface>
      </View>

      {/* ── Frontal axis ── */}
      <View style={styles.section}>
        <SectionTitle text={tr('secAxis')} color={p.dim} align={align} />
        <ValueSurface
          colors={p.violetCard}
          border={p.cardBd}
          radius={VALUE_RADIUS.card}
          style={styles.card}
        >
          <AxisDial
            degrees={axis.degrees}
            classLabel={tr(AXIS_KEY[axis.classification])}
            normalRangeLabel={tr('axisNormalRange')}
            maxSize={260}
            /* Same dial, same convention, this screen's colours — see
               `AxisDialPalette`. */
            palette={{
              sector: p.violetFill,
              grid: p.grid2,
              needle: p.violet,
              hub: p.muted,
              leadLabel: p.dim,
            }}
            readout={false}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('secAxis')}
            accessibilityHint={tr('valInfoTapHint')}
            onPress={() => {
              void Haptics.selectionAsync();
              setInfo({
                title: tr('secAxis'),
                value: axis.degrees === null ? '—' : `${axis.degrees}°`,
                unit: '',
                body: tr('valInfoAxis'),
              });
            }}
            style={({ pressed }) => [styles.axisReadout, pressed && styles.pressed]}
          >
            <Text
              style={[styles.axisDeg, { color: axis.degrees === null ? p.dim : p.violet }]}
            >
              {axis.degrees === null ? '—' : `${axis.degrees}°`}
            </Text>
            <Text style={[styles.axisClass, { color: p.txt }]}>
              {tr(AXIS_KEY[axis.classification])}
            </Text>
            <Text style={[styles.axisHint, { color: p.dim }]}>{tr('axisNormalRange')}</Text>
          </Pressable>

          <View style={styles.grid}>
            <ValueTile
              palette={p}
              label={tr('axisNetI')}
              value={axis.netI}
              unit="mV·s"
              valueSize={24}
              onPress={open(tr('axisNetI'), axis.netI, 'mV·s', tr('valInfoNetI'))}
              a11yHint={tr('valInfoTapHint')}
            />
            <ValueTile
              palette={p}
              label={tr('axisNetAvf')}
              value={axis.netAvf}
              unit="mV·s"
              valueSize={24}
              onPress={open(tr('axisNetAvf'), axis.netAvf, 'mV·s', tr('valInfoNetAvf'))}
              a11yHint={tr('valInfoTapHint')}
            />
          </View>
        </ValueSurface>
      </View>

      {/* ── Amplitudes ──
          The wave NAMES (P, Q, R, S, T) are the international ECG symbols
          and are the same in every language; they go through the locale so
          the table has one source for its headers, not because they change. */}
      <View style={styles.section}>
        <SectionTitle text={tr('secAmplitudes')} color={p.dim} align={align} />
        <ValueSurface
          colors={p.cardBg}
          border={p.cardBd}
          radius={VALUE_RADIUS.card}
          style={styles.cardTight}
        >
          <ValueAmplitudeTable
            palette={p}
            amplitudes={amplitudes}
            labels={{
              lead: tr('ampLead'),
              p: tr('ampP'),
              q: tr('ampQ'),
              r: tr('ampR'),
              s: tr('ampS'),
              t: tr('ampT'),
              qrs: tr('ampQRSpp'),
              unit: tr('ampUnit'),
            }}
          />
        </ValueSurface>
      </View>

      {/* ── Signal quality ── */}
      <View style={styles.section}>
        <SectionTitle text={tr('secQuality')} color={p.dim} align={align} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('qSqi')}
          accessibilityHint={tr('valInfoTapHint')}
          onPress={() => {
            void Haptics.selectionAsync();
            setInfo({
              title: tr('qSqi'),
              value: String(quality.sqi),
              unit: '%',
              body: tr('valInfoSqi'),
            });
          }}
          style={({ pressed }) => (pressed ? styles.pressed : undefined)}
        >
          <ValueSurface
            colors={p.mintCard}
            border={p.cardBd}
            radius={VALUE_RADIUS.card}
            style={styles.card}
          >
            <ValueQualityCard
              palette={p}
              sqi={quality.sqi}
              title={tr('qSqi')}
              analysedLabel={tr('qAnalysed')}
              analysedValue={`${quality.analysedSeconds.toFixed(1)} ${tr('valSecUnit')}`}
              sampleRateLabel={tr('qSampleRate')}
              sampleRateValue={sampleRateLabel}
            />
          </ValueSurface>
        </Pressable>
      </View>

      {/* ── The one call to action ── */}
      {onExportReport ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('valExportReport')}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onExportReport();
          }}
          style={({ pressed }) => [styles.ctaWrap, pressed && styles.pressed]}
        >
          <LinearGradient
            colors={p.ctaBg}
            start={{ x: 0, y: 0.2 }}
            end={{ x: 1, y: 0.8 }}
            style={[styles.cta, { borderColor: p.ctaBd }]}
          >
            <Text style={styles.ctaText}>{tr('valExportReport')}</Text>
          </LinearGradient>
        </Pressable>
      ) : null}

      <Text style={[styles.disclaimer, { color: p.faint, textAlign: 'center' }]}>
        {tr('analysisDisclaimer')}
      </Text>

      <ValueInfoSheet info={info} onClose={() => setInfo(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: 4 },
  sub: { fontSize: 12, lineHeight: 17, marginBottom: 10, paddingHorizontal: 6 },
  section: { marginTop: 22 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, paddingHorizontal: 6, paddingBottom: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { padding: 18 },
  /* The amplitude table draws its own row rules edge to edge, so its card
     gives it less side padding than the others. */
  cardTight: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 },
  intervals: { gap: 18 },
  note: { fontSize: 11.5, lineHeight: 16.5, marginTop: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.62 },
  meterTrack: { height: 5, borderRadius: 99, overflow: 'hidden', marginTop: 11 },
  meterFill: { height: '100%', width: '64%', marginLeft: '14%', borderRadius: 99 },
  axisReadout: { alignItems: 'center', marginTop: -6, marginBottom: 16 },
  axisDeg: { fontSize: 48, fontWeight: '700', letterSpacing: -2, lineHeight: 52 },
  axisClass: { fontSize: 16, fontWeight: '600', marginTop: 6 },
  axisHint: { fontSize: 11.5, marginTop: 4 },
  ctaWrap: { marginTop: 18 },
  cta: { borderRadius: VALUE_RADIUS.tile, borderWidth: 1, paddingVertical: 17, alignItems: 'center' },
  /* White on the gradient in BOTH themes: the CTA is the one element on
     this screen that carries its own background rather than sitting on
     the page, so it does not follow the page's text colour. */
  ctaText: { fontSize: 16, fontWeight: '600', letterSpacing: 0.3, color: '#FFFFFF' },
  warn: {
    borderWidth: 1,
    borderRadius: VALUE_RADIUS.small,
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  disclaimer: { fontSize: 11, lineHeight: 16.5, marginTop: 14, paddingHorizontal: 8 },
});

// v0.59.0 — The redesigned Values tab, from the design handoff: the rate as
//           the hero, sections told apart by colour, every value tappable for
//           one sentence saying what it is. Measurements only, still.
