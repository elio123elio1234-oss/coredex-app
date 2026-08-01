/* ==================================================================
   EcgAnalysisSheet (organism) — page 2 of the report: the measurements.
   Ported from the web organism.

   Page 1 is the waveform (what was recorded). This page is what can be
   MEASURED from it: rate, rhythm, the frontal axis, the standard
   intervals, and per-lead voltages.

   ══ THE LINE THIS SHEET DOES NOT CROSS ══
   Measurements only. No finding, no "normal/abnormal" label, no suggested
   diagnosis, anywhere. Reference bands appear because every hospital ECG
   form carries them for context, and each is captioned as such. If a
   future request is "add what it means", that belongs to a clinician — or
   to a separately validated feature with its own regulatory story.

   Purely presentational: it is handed an EcgAnalysis and lays it out.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import type { AxisClass, EcgAnalysis, RegularityClass } from '@cyphix/shared';
import MetricTile from '@/components/atoms/MetricTile';
import AmplitudeTable from '@/components/molecules/AmplitudeTable';
import AxisDial from '@/components/molecules/AxisDial';
import IntervalBar from '@/components/molecules/IntervalBar';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  analysis: EcgAnalysis;
  /**
   * Draw the sheet's own "Automated Measurements" title. Off when the caller
   * already names this content (the mobile report puts it behind a segmented
   * control labelled "Measurements", so the title would say it twice). The
   * "measurements only" sub-line is NOT optional — it is the honesty
   * statement, not decoration.
   */
  showTitle?: boolean;
}

/* Reference bands — the ranges these intervals typically fall in for
   adults, printed for context exactly as on a hospital ECG form. */
const REF = {
  pr: { low: 120, high: 200, min: 60, max: 320 },
  qrs: { low: 80, high: 120, min: 40, max: 200 },
  qt: { low: 300, high: 440, min: 200, max: 600 },
  qtc: { low: 350, high: 450, min: 280, max: 600 },
} as const;

/* Classification → locale KEY. Exported because the report's summary card
   shows the same rhythm word in its chip, and two copies of a label table
   drift apart the first time one of them is edited. */
export const REGULARITY_KEY: Record<RegularityClass, TranslationKey> = {
  regular: 'regRegular',
  slightlyIrregular: 'regSlightlyIrregular',
  irregular: 'regIrregular',
  indeterminate: 'regIndeterminate',
};

export const AXIS_KEY: Record<AxisClass, TranslationKey> = {
  normal: 'axisNormal',
  left: 'axisLeft',
  right: 'axisRight',
  extreme: 'axisExtreme',
  indeterminate: 'axisIndeterminate',
};

/**
 * One block of the sheet, on its own surface.
 *
 * The web draws these as bare `.analysis-block`s separated only by the accent
 * rule, because they sit on a white `.report-page` that already is the sheet.
 * On mobile there is no page under them, so five dense blocks sat directly on
 * the app's grey background and read as loose parts floating on nothing.
 * Giving each one a surface is the platform's own answer — an inset grouped
 * list — and it costs nothing but a container.
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  const { rtl } = useTranslation();
  return (
    <View style={[styles.block, { backgroundColor: t.surface, borderColor: t.border }]}>
      {/* `.analysis-section` — uppercase, letter-spaced, in the ACCENT colour
          with a hairline under it. It is the only thing separating five dense
          blocks, so it has to read as a rule, not as another line of text.
          `toUpperCase()` is a no-op on Hebrew, which has no letter case —
          the letter-spacing and the rule still do the separating. */}
      <Text
        style={[
          styles.sectionTitle,
          { color: t.accent, borderBottomColor: t.border, textAlign: rtl ? 'right' : 'left' },
        ]}
      >
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

export default function EcgAnalysisSheet({ analysis, showTitle = true }: Props) {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);
  const { rate, intervals, axis, amplitudes, quality } = analysis;

  const rrRange =
    rate.rrMinMs !== null && rate.rrMaxMs !== null ? `${rate.rrMinMs}–${rate.rrMaxMs}` : null;

  return (
    <View style={styles.sheet}>
      <View>
        {showTitle && (
          <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>
            {tr('analysisTitle')}
          </Text>
        )}
        <Text style={[styles.sub, { color: t.textSecondary, textAlign: align }]}>
          {tr('analysisSubtitle')}
        </Text>
      </View>

      {/* Too few clean beats must never read as a confident measurement sheet. */}
      {quality.insufficient && (
        <Text style={[styles.warn, { textAlign: align }]}>{tr('qInsufficient')}</Text>
      )}

      {/* ── Rate & rhythm ── */}
      <Section title={tr('secRate')}>
        <View style={styles.grid}>
          {/* Not `variant="hero"` here as on web: the report's summary card
              already carries the rate at 46 px directly above this sheet, and
              two hero treatments of one number is the "thrown on the screen"
              look. It stays in the table because a measurement sheet must be
              complete on its own. */}
          <MetricTile
            label={tr('mBpm')}
            value={rate.bpm}
            unit="BPM"
            hint={tr('mBpmHint')}
            accent={t.accentLive}
          />
          <MetricTile label={tr('mRrMean')} value={rate.rrMeanMs} unit="ms" />
          <MetricTile label={tr('mRrRange')} value={rrRange} unit="ms" />
          <MetricTile label={tr('mRegularity')} value={tr(REGULARITY_KEY[rate.regularity])} />
          <MetricTile
            label={tr('mSdnn')}
            value={rate.sdnnMs}
            unit="ms"
            hint={tr('mSdnnHint')}
          />
          <MetricTile
            label={tr('mRmssd')}
            value={rate.rmssdMs}
            unit="ms"
            hint={tr('mRmssdHint')}
          />
          <MetricTile
            label={tr('mPBefore')}
            value={rate.pBeforeQrsPct}
            unit="%"
            hint={tr('mPBeforeHint')}
          />
          <MetricTile label={tr('mBeats')} value={rate.beatsAnalyzed} />
        </View>
      </Section>

      {/* ── Frontal axis ── */}
      <Section title={tr('secAxis')}>
        <View style={styles.axisLayout}>
          <AxisDial
            degrees={axis.degrees}
            classLabel={tr(AXIS_KEY[axis.classification])}
            normalRangeLabel={tr('axisNormalRange')}
          />
          <View style={styles.grid}>
            <MetricTile label={tr('axisNetI')} value={axis.netI} unit="mV·s" />
            <MetricTile label={tr('axisNetAvf')} value={axis.netAvf} unit="mV·s" />
          </View>
        </View>
      </Section>

      {/* ── Intervals ── */}
      <Section title={tr('secIntervals')}>
        <View style={styles.intervals}>
          <IntervalBar
            label={tr('iPR')}
            value={intervals.prMs}
            unit="ms"
            refLow={REF.pr.low}
            refHigh={REF.pr.high}
            scaleMin={REF.pr.min}
            scaleMax={REF.pr.max}
            refCaption={tr('refRange')}
          />
          <IntervalBar
            label={tr('iQRS')}
            value={intervals.qrsMs}
            unit="ms"
            refLow={REF.qrs.low}
            refHigh={REF.qrs.high}
            scaleMin={REF.qrs.min}
            scaleMax={REF.qrs.max}
            refCaption={tr('refRange')}
          />
          <IntervalBar
            label={tr('iQT')}
            value={intervals.qtMs}
            unit="ms"
            refLow={REF.qt.low}
            refHigh={REF.qt.high}
            scaleMin={REF.qt.min}
            scaleMax={REF.qt.max}
            refCaption={tr('refRange')}
          />
          <IntervalBar
            label={tr('iQTcB')}
            value={intervals.qtcBazettMs}
            unit="ms"
            refLow={REF.qtc.low}
            refHigh={REF.qtc.high}
            scaleMin={REF.qtc.min}
            scaleMax={REF.qtc.max}
            refCaption={tr('refRange')}
          />
          <IntervalBar
            label={tr('iQTcF')}
            value={intervals.qtcFridericiaMs}
            unit="ms"
            refLow={REF.qtc.low}
            refHigh={REF.qtc.high}
            scaleMin={REF.qtc.min}
            scaleMax={REF.qtc.max}
            refCaption={tr('refRange')}
          />
        </View>
        <Text style={[styles.note, { color: t.textTertiary, textAlign: align }]}>
          {tr('intervalsNote')}
        </Text>
      </Section>

      {/* ── Amplitudes ──
          The wave NAMES (P, Q, R, S, T) are the international ECG symbols and
          are the same in every language — they go through the locale only so
          the table has one source for its headers, not because they change. */}
      <Section title={tr('secAmplitudes')}>
        <AmplitudeTable
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
      </Section>

      {/* ── Signal quality ── */}
      <Section title={tr('secQuality')}>
        <View style={styles.grid}>
          <MetricTile label={tr('qSqi')} value={quality.sqi} unit="%" />
          <MetricTile label={tr('qAnalysed')} value={quality.analysedSeconds} unit="s" />
          <MetricTile label={tr('qSampleRate')} value={analysis.sampleRate} unit="Hz" />
        </View>
      </Section>

      <Text style={[styles.disclaimer, { color: t.textTertiary, textAlign: align }]}>
        {tr('analysisDisclaimer')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  block: { gap: 12, borderWidth: 1, borderRadius: RADIUS.lg, padding: 14 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  /* `.metric-grid { gap: 10px }` */
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  /* NOT `alignItems: 'center'` — that shrank the metric grid below to its
     text width and left the row ragged. The dial centres itself. */
  axisLayout: { gap: 16 },
  intervals: { gap: 14 },
  note: { fontSize: 10.5, lineHeight: 15 },
  warn: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    color: '#B45309',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: '600',
  },
  disclaimer: { fontSize: 10.5, lineHeight: 15.5 },
});

// v1.4.0 — Every label comes from the locale; the classification tables now
//          export locale KEYS (REGULARITY_KEY / AXIS_KEY) so one map serves
//          the sheet and the report's summary chip in any language.
