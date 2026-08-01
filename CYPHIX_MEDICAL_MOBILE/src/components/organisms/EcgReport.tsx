/* ==================================================================
   EcgReport (organism) — what the patient sees when the recording ends.

   ══ THIS SCREEN IS PORTRAIT ══
   The exam runs landscape because six live traces need the long edge. A
   report is the opposite shape of problem: it is read top to bottom. The
   caller flips the route back (see LimbMeasureScreen).

   ══ WHY THIS IS NOT A PAGE-FOR-PAGE PORT OF THE WEB REPORT ══
   The web report is two A4 sheets stacked in a scroll, each with its own
   full letterhead, built to be sent to a printer. Ported literally to a
   phone that produced: the brand mark and four provenance fields twice,
   six 51 pt slivers of grid paper (a 182 mm sheet squeezed into 361 pt is
   1.9 pt per millimetre — a 1 mV R wave stood 19 pt tall), and every
   measurement in one undifferentiated column. Correct content, and it read
   as a fax.

   Same content, same tokens, same frozen 25 mm/s · 10 mm/mV geometry,
   restructured for the platform per root CLAUDE.md §3.3:

     · ONE letterhead for the document, not one per sheet.
     · A summary card answers "what did it say" in the first screenful.
     · A segmented control replaces the two paper pages — the native way to
       hold two views of one record without stacking them.
     · The waveform window shows ~3.6 s of paper at 3.6 pt/mm and SCROLLS
       horizontally through the full recording. The alternative was to keep
       the whole strip on screen, which on a phone means either rescaling
       the time axis (banned — see ecgPath.ts) or throwing away 6 s of a
       10 s clinical recording.

   All six leads live in ONE horizontal ScrollView, so they move together:
   comparing leads means comparing the same instant, and six independently
   scrolled strips would silently break that.
   ================================================================== */

import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  PixelRatio,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LIMB_LEAD_ORDER, STANDARD_MM_PER_MV, STANDARD_MM_PER_SEC, type LimbLeadName } from '@cyphix/shared';
import EcgStripSvg, {
  CAL_WIDTH_MM,
  ECG_PAPER_DARK,
  ECG_PAPER_LIGHT,
} from '@/components/molecules/EcgStripSvg';
import ReportHeader from '@/components/molecules/ReportHeader';
import ReportSummaryCard from '@/components/molecules/ReportSummaryCard';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import EcgAnalysisSheet, { REGULARITY } from '@/components/organisms/EcgAnalysisSheet';
import type { LimbReport } from '@/features/measurement/hooks/useLimbRecorder';
import { RADIUS } from '@/theme/tokens';
import { useIsDark, useTheme } from '@/theme/useTheme';

interface Props {
  report: LimbReport;
  onRecordAgain: () => void;
  onFinish: () => void;
}

/* Copy verbatim from the web locale (en.ts). */
const TITLE = 'Limb Leads Report';
const LEAD_SET = '6 limb';
const SIMULATED = 'SIMULATED SIGNAL — NOT A PATIENT RECORDING';
const DISCLAIMER =
  'For wellness and training only. Not a diagnostic device. Consult a clinician for medical interpretation.';

type Tab = 'waveform' | 'measurements';

const TABS = [
  { value: 'waveform', label: 'Waveform' },
  { value: 'measurements', label: 'Measurements' },
] as const satisfies readonly { value: Tab; label: string }[];

/**
 * How much paper the window shows, in millimetres.
 *
 * This is the one number that sets how big the traces look: the scale is
 * `viewportWidthPt / VIEWPORT_MM`, so a SMALLER window means BIGGER squares.
 * At 100 mm on a 361 pt column that is 3.61 pt/mm — a 1 mV deflection stands
 * 36 pt tall instead of the 19 pt the A4 port gave — and the window holds
 * (100 − 9) / 25 ≈ 3.6 s, which is three to four beats. Fewer beats per
 * screen than paper, and each one actually legible.
 */
const VIEWPORT_MM = 100;

/** Strip height: 32 mm ≙ ±1.6 mV at 10 mm/mV, before the 0.6 mm clip margin. */
const STRIP_HEIGHT_MM = 32;

/** `.ecg-report-strips { gap: 10px }` */
const STRIP_GAP = 10;

/**
 * Ceiling on how wide one strip may be in DEVICE pixels.
 *
 * react-native-svg hands each `<Svg>` to a single native texture, and past the
 * GPU's limit (4096 px on a lot of Android hardware) it draws nothing at all —
 * a blank strip, not a clipped one. Ten seconds of paper is 2 805 px on a 3×
 * phone, comfortably inside; this only ever engages on an unusually wide
 * screen, where it costs a little zoom instead of the whole trace.
 */
const MAX_STRIP_PX = 3600;

export default function EcgReport({ report, onRecordAgain, onFinish }: Props) {
  const t = useTheme();
  const paper = useIsDark() ? ECG_PAPER_DARK : ECG_PAPER_LIGHT;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('waveform');

  const padH = Math.max(insets.left, insets.right, 16);
  const viewportW = width - padH * 2;

  const longest = LIMB_LEAD_ORDER.reduce(
    (max, l) => Math.max(max, report.filtered[l]?.length ?? 0),
    0,
  );
  const durationSec = report.sampleRate > 0 ? longest / report.sampleRate : 0;

  /* The paper is as long as the recording at the clinical sweep speed — never
     the other way round. It is floored at the window width so a short capture
     shows blank paper to its right rather than a narrow card. */
  const paperMm = Math.max(VIEWPORT_MM, CAL_WIDTH_MM + durationSec * STANDARD_MM_PER_SEC);
  const ptPerMm = Math.min(
    viewportW / VIEWPORT_MM,
    MAX_STRIP_PX / (paperMm * PixelRatio.get()),
  );
  const paperW = ptPerMm * paperMm;
  const stripH = ptPerMm * STRIP_HEIGHT_MM;
  const scrollable = paperMm > VIEWPORT_MM + 1;

  const stamp = report.recordedAt;
  const timestamp = `${stamp.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} · ${stamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

  const stats = [
    { label: 'Duration', value: `${durationSec.toFixed(1)} s` },
    { label: 'Leads', value: LEAD_SET },
    { label: 'Sample rate', value: `${report.sampleRate} Hz` },
  ];

  const press = (fn: () => void) => () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fn();
  };

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 10,
            paddingBottom: 20,
            paddingLeft: padH,
            paddingRight: padH,
          },
        ]}
        /* The waveform window scrolls sideways inside this one; without the
           lock a diagonal drag fights itself. */
        directionalLockEnabled
        showsVerticalScrollIndicator={false}
      >
        <ReportHeader
          title={TITLE}
          timestamp={timestamp}
          simulatedNotice={report.isSimulated ? SIMULATED : undefined}
        />

        <ReportSummaryCard
          bpm={report.heartRate > 0 ? report.heartRate : null}
          rhythm={REGULARITY[report.analysis.rate.regularity]}
          stats={stats}
        />

        <SegmentedControl
          options={TABS}
          value={tab}
          onChange={setTab}
          accessibilityLabel="Report section"
        />

        {tab === 'waveform' ? (
          <View style={styles.section}>
            <View style={{ height: stripH * 6 + STRIP_GAP * 5 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={scrollable}
              >
                <View style={{ gap: STRIP_GAP }}>
                  {LIMB_LEAD_ORDER.map((lead: LimbLeadName) => (
                    <EcgStripSvg
                      key={lead}
                      label={lead}
                      data={report.filtered[lead]}
                      sampleRate={report.sampleRate}
                      width={paperW}
                      widthMm={paperMm}
                      heightMm={STRIP_HEIGHT_MM}
                      chrome={false}
                      /* Lead II carries the ticks: it is the rhythm strip the
                         rate was computed from, and marking all six would
                         imply six independent detections. */
                      rPeaks={lead === 'II' ? report.analysis.rPeaks : undefined}
                    />
                  ))}
                </View>
              </ScrollView>

              {/* Pinned lead labels. They sit outside the scroll because a
                  label that slides off the paper is worse than none — you
                  would be looking at an unidentified trace. The rows are laid
                  out from the same stripH/gap constants as the strips, so they
                  cannot drift out of alignment. */}
              <View pointerEvents="none" style={[styles.gutter, { gap: STRIP_GAP }]}>
                {LIMB_LEAD_ORDER.map((lead: LimbLeadName) => (
                  <View key={lead} style={{ height: stripH }}>
                    <View style={[styles.leadChip, { backgroundColor: paper.paper }]}>
                      <Text
                        style={[styles.leadChipText, { color: paper.trace }]}
                        allowFontScaling={false}
                      >
                        {lead}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.caption}>
              <Text style={[styles.captionText, { color: t.textTertiary }]}>
                {STANDARD_MM_PER_SEC} mm/s · {STANDARD_MM_PER_MV} mm/mV
              </Text>
              {scrollable && (
                <Text style={[styles.captionText, { color: t.textTertiary }]}>
                  Swipe to scan all {durationSec.toFixed(1)} s →
                </Text>
              )}
            </View>
          </View>
        ) : (
          <EcgAnalysisSheet analysis={report.analysis} showTitle={false} />
        )}

        {/* Waveform tab only — exactly as on web, where this sits on page 1
            and page 2 carries the analysis sheet's own disclaimer. Printing
            both here would stack two grey paragraphs on one screen. */}
        {tab === 'waveform' && (
          <Text style={[styles.disclaimer, { color: t.textTertiary }]}>{DISCLAIMER}</Text>
        )}
      </ScrollView>

      {/* Pinned, not scrolled: after a ten-second capture the patient's next
          action must not be to find it. */}
      <View
        style={[
          styles.actions,
          {
            backgroundColor: t.surface,
            borderTopColor: t.border,
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={press(onRecordAgain)}
          style={({ pressed }) => [
            styles.btn,
            styles.ghost,
            { borderColor: t.border, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { color: t.textPrimary }]}>Record again</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={press(onFinish)}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: t.brandNavy, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollView: { flex: 1 },
  scroll: { gap: 16 },
  section: { gap: 8 },
  gutter: { position: 'absolute', left: 0, top: 0 },
  /* Backed with the paper colour so the millimetre grid does not run through
     the letters. */
  leadChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  leadChipText: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.5 },
  caption: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  captionText: { fontSize: 10.5, fontWeight: '600' },
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

// v3.0.0 — Rebuilt as a native document: one letterhead, a summary card, a
//          segmented control instead of two A4 pages, and a synchronised
//          horizontal window showing 3.6 s of paper at 2× the old scale.
