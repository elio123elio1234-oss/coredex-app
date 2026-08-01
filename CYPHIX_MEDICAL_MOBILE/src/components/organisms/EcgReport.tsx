/* ==================================================================
   EcgReport (organism) — the end-of-measurement report, in two pages.
   A port of the web organism.

     Page 1 — the WAVEFORMS, as vector strips on true mm grid paper.
     Page 2 — the MEASUREMENTS.

   ══ THIS SCREEN IS PORTRAIT ══
   The exam runs landscape because six live traces need the long edge. A
   report is the opposite shape of problem: it is a document, read top to
   bottom, one full-width strip after another. The caller flips the route
   back (see LimbMeasureScreen) — sideways would give each strip half the
   width and put the measurement sheet behind a scroll.

   ══ WHY THE STRIPS ARE VECTOR, NOT THE LIVE CANVAS ══
   The live monitor's Skia canvas is patient feedback. This is a record: a
   clinician measures intervals off it. Each strip is drawn in MILLIMETRES
   at the clinical 25 mm/s and 10 mm/mV, from the same `@cyphix/shared`
   geometry the web report uses, so the two are drawn against one ruler.

   The letterhead repeats on both pages so a separated sheet still
   identifies itself.
   ================================================================== */

import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LIMB_LEAD_ORDER, type LimbLeadName } from '@cyphix/shared';
import EcgStripSvg from '@/components/molecules/EcgStripSvg';
import ReportHeader from '@/components/molecules/ReportHeader';
import EcgAnalysisSheet from '@/components/organisms/EcgAnalysisSheet';
import type { LimbReport } from '@/features/measurement/hooks/useLimbRecorder';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  report: LimbReport;
  onRecordAgain: () => void;
  onFinish: () => void;
}

/* Copy verbatim from the web locale (en.ts). */
const TITLE = 'Limb Leads — Report';
const LEAD_SET = '6 limb leads (I, II, III, aVR, aVL, aVF)';
const SIMULATED = 'SIMULATED SIGNAL — NOT A PATIENT RECORDING';
const DISCLAIMER =
  'For wellness and training only. Not a diagnostic device. Consult a clinician for medical interpretation.';

/** Printable column width, as on the web's A4 portrait sheet. */
const STRIP_WIDTH_MM = 182;
/** Strip height: 28 mm ≙ ±1.4 mV at 10 mm/mV. */
const STRIP_HEIGHT_MM = 28;

export default function EcgReport({ report, onRecordAgain, onFinish }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const padH = Math.max(insets.left, insets.right, 16);
  const pagePad = 16;
  const stripW = width - padH * 2 - pagePad * 2;

  const longest = LIMB_LEAD_ORDER.reduce(
    (max, l) => Math.max(max, report.filtered[l]?.length ?? 0),
    0,
  );
  const durationSec = report.sampleRate > 0 ? longest / report.sampleRate : 0;

  const meta = [
    { label: 'Recorded', value: report.recordedAt.toLocaleString() },
    { label: 'Duration', value: `${durationSec.toFixed(1)} s` },
    { label: 'Lead set', value: LEAD_SET },
    { label: 'Sample rate', value: `${report.sampleRate} Hz` },
  ];

  const page = [styles.page, { backgroundColor: t.surface, borderColor: t.border }];

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 12) + 12,
            paddingLeft: padH,
            paddingRight: padH,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page 1 — waveforms ── */}
        <View style={page}>
          <ReportHeader
            title={TITLE}
            pageLabel="Waveforms"
            meta={meta}
            simulatedNotice={report.isSimulated ? SIMULATED : undefined}
          />

          {report.heartRate > 0 && (
            <View style={styles.headline}>
              <Text style={[styles.headlineLabel, { color: t.textTertiary }]}>BPM</Text>
              <Text style={[styles.headlineValue, { color: t.accentLive }]}>
                {report.heartRate}
              </Text>
            </View>
          )}

          <View style={styles.strips}>
            {LIMB_LEAD_ORDER.map((lead: LimbLeadName) => (
              <EcgStripSvg
                key={lead}
                label={lead}
                data={report.filtered[lead]}
                sampleRate={report.sampleRate}
                width={stripW}
                widthMm={STRIP_WIDTH_MM}
                heightMm={STRIP_HEIGHT_MM}
                /* Lead II carries the ticks: it is the rhythm strip the rate
                   was computed from, and marking all six would imply six
                   independent detections. */
                rPeaks={lead === 'II' ? report.analysis.rPeaks : undefined}
              />
            ))}
          </View>

          <Text style={[styles.disclaimer, { color: t.textTertiary }]}>{DISCLAIMER}</Text>
        </View>

        {/* ── Page 2 — measurements ── */}
        <View style={page}>
          <ReportHeader
            title={TITLE}
            pageLabel="Measurements"
            meta={meta}
            simulatedNotice={report.isSimulated ? SIMULATED : undefined}
          />
          <EcgAnalysisSheet analysis={report.analysis} />
        </View>
      </ScrollView>

      {/* Pinned, not scrolled: after a ten-second capture the patient's next
          action must not be to find it. */}
      <View
        style={[
          styles.actions,
          {
            backgroundColor: t.surface,
            borderTopColor: t.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={onRecordAgain}
          style={({ pressed }) => [
            styles.btn,
            styles.ghost,
            { borderColor: t.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { color: t.textPrimary }]}>Record again</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onFinish}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Finish</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { gap: 14 },
  /* .report-page { surface, border, radius-lg, padding 26/28, gap 18 } */
  page: { borderWidth: 1, borderRadius: RADIUS.lg, padding: 16, gap: 16 },
  /* .report-headline */
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  headlineLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.9 },
  headlineValue: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  strips: { gap: 12 },
  disclaimer: { fontSize: 10.5, lineHeight: 15.5 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center' },
  ghost: { borderWidth: 1 },
  btnText: { fontSize: 16, fontWeight: '700' },
});

// v2.0.0 — Two-page report ported from the web: letterhead per page, vector
//          mm-paper strips with calibration pulse, and the measurement sheet.
