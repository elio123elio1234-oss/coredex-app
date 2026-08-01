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

/* Copy verbatim from the web locale (en.ts). Exported because the report's
   summary card shows the same rhythm word in its chip, and two copies of a
   label table drift apart the first time one of them is edited. */
export const REGULARITY: Record<RegularityClass, string> = {
  regular: 'Regular',
  slightlyIrregular: 'Slightly variable',
  irregular: 'Variable',
  indeterminate: 'Not determined',
};

export const AXIS: Record<AxisClass, string> = {
  normal: 'Normal axis',
  left: 'Left axis',
  right: 'Right axis',
  extreme: 'Extreme axis',
  indeterminate: 'Not determined',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.block}>
      {/* `.analysis-section` — uppercase, letter-spaced, in the ACCENT colour
          with a hairline under it. It is the only thing separating five dense
          blocks, so it has to read as a rule, not as another line of text. */}
      <Text style={[styles.sectionTitle, { color: t.accent, borderBottomColor: t.border }]}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

export default function EcgAnalysisSheet({ analysis, showTitle = true }: Props) {
  const t = useTheme();
  const { rate, intervals, axis, amplitudes, quality } = analysis;

  const rrRange =
    rate.rrMinMs !== null && rate.rrMaxMs !== null ? `${rate.rrMinMs}–${rate.rrMaxMs}` : null;

  return (
    <View style={styles.sheet}>
      <View>
        {showTitle && (
          <Text style={[styles.title, { color: t.textPrimary }]}>Automated Measurements</Text>
        )}
        <Text style={[styles.sub, { color: t.textSecondary }]}>
          Computed from the recorded waveform. Measurements only — no interpretation is made or
          implied.
        </Text>
      </View>

      {/* Too few clean beats must never read as a confident measurement sheet. */}
      {quality.insufficient && (
        <Text style={styles.warn}>
          Too few clean beats were detected for reliable measurement. Repeat the recording.
        </Text>
      )}

      {/* ── Rate & rhythm ── */}
      <Section title="Rate & Rhythm">
        <View style={styles.grid}>
          {/* Not `variant="hero"` here as on web: the report's summary card
              already carries the rate at 46 px directly above this sheet, and
              two hero treatments of one number is the "thrown on the screen"
              look. It stays in the table because a measurement sheet must be
              complete on its own. */}
          <MetricTile
            label="Heart rate"
            value={rate.bpm}
            unit="BPM"
            hint="From the mean R-to-R interval"
            accent={t.accentLive}
          />
          <MetricTile label="Mean R-R" value={rate.rrMeanMs} unit="ms" />
          <MetricTile label="R-R range" value={rrRange} unit="ms" />
          <MetricTile label="Rhythm" value={REGULARITY[rate.regularity]} />
          <MetricTile label="SDNN" value={rate.sdnnMs} unit="ms" hint="Spread of beat intervals" />
          <MetricTile label="RMSSD" value={rate.rmssdMs} unit="ms" hint="Beat-to-beat variation" />
          <MetricTile
            label="P before QRS"
            value={rate.pBeforeQrsPct}
            unit="%"
            hint="Beats with a detectable P wave"
          />
          <MetricTile label="Beats analysed" value={rate.beatsAnalyzed} />
        </View>
      </Section>

      {/* ── Frontal axis ── */}
      <Section title="Frontal Plane Axis">
        <View style={styles.axisLayout}>
          <AxisDial
            degrees={axis.degrees}
            classLabel={AXIS[axis.classification]}
            normalRangeLabel="Shaded sector: −30° to +90°"
          />
          <View style={styles.grid}>
            <MetricTile label="Net QRS, lead I" value={axis.netI} unit="mV·s" />
            <MetricTile label="Net QRS, lead aVF" value={axis.netAvf} unit="mV·s" />
          </View>
        </View>
      </Section>

      {/* ── Intervals ── */}
      <Section title="Intervals & Durations">
        <View style={styles.intervals}>
          <IntervalBar
            label="PR interval"
            value={intervals.prMs}
            unit="ms"
            refLow={REF.pr.low}
            refHigh={REF.pr.high}
            scaleMin={REF.pr.min}
            scaleMax={REF.pr.max}
            refCaption="Typical adult range"
          />
          <IntervalBar
            label="QRS duration"
            value={intervals.qrsMs}
            unit="ms"
            refLow={REF.qrs.low}
            refHigh={REF.qrs.high}
            scaleMin={REF.qrs.min}
            scaleMax={REF.qrs.max}
            refCaption="Typical adult range"
          />
          <IntervalBar
            label="QT interval"
            value={intervals.qtMs}
            unit="ms"
            refLow={REF.qt.low}
            refHigh={REF.qt.high}
            scaleMin={REF.qt.min}
            scaleMax={REF.qt.max}
            refCaption="Typical adult range"
          />
          <IntervalBar
            label="QTc (Bazett)"
            value={intervals.qtcBazettMs}
            unit="ms"
            refLow={REF.qtc.low}
            refHigh={REF.qtc.high}
            scaleMin={REF.qtc.min}
            scaleMax={REF.qtc.max}
            refCaption="Typical adult range"
          />
          <IntervalBar
            label="QTc (Fridericia)"
            value={intervals.qtcFridericiaMs}
            unit="ms"
            refLow={REF.qtc.low}
            refHigh={REF.qtc.high}
            scaleMin={REF.qtc.min}
            scaleMax={REF.qtc.max}
            refCaption="Typical adult range"
          />
        </View>
        <Text style={[styles.note, { color: t.textTertiary }]}>
          Shaded bands are typical adult reference ranges shown for context. They are not a
          finding.
        </Text>
      </Section>

      {/* ── Amplitudes ── */}
      <Section title="Wave Amplitudes">
        <AmplitudeTable
          amplitudes={amplitudes}
          labels={{
            lead: 'Lead',
            p: 'P',
            q: 'Q',
            r: 'R',
            s: 'S',
            t: 'T',
            qrs: 'QRS p-p',
            unit: 'All values in millivolts (mV), median across analysed beats.',
          }}
        />
      </Section>

      {/* ── Signal quality ── */}
      <Section title="Signal Quality">
        <View style={styles.grid}>
          <MetricTile label="Rhythm steadiness" value={quality.sqi} unit="%" />
          <MetricTile label="Signal analysed" value={quality.analysedSeconds} unit="s" />
          <MetricTile label="Sample rate" value={analysis.sampleRate} unit="Hz" />
        </View>
      </Section>

      <Text style={[styles.disclaimer, { color: t.textTertiary }]}>
        Automated measurements produced by CYPHIX from a 6-lead limb recording. This report is not
        a diagnosis and does not replace clinical assessment. All values require review by a
        qualified clinician.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: 20 },
  title: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  block: { gap: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  /* `.metric-grid { gap: 10px }` */
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  axisLayout: { gap: 16, alignItems: 'center' },
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

// v1.2.0 — Optional title (the report names this content itself), label maps
//          exported for the summary chip, rate tile no longer doubles as a hero.
