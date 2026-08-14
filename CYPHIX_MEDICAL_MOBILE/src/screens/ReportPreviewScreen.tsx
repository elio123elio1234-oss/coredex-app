/* ==================================================================
   ReportPreviewScreen — see the exact report before it leaves the phone.

   ══ WHY A WEBVIEW, AND WHY THAT IS THE POINT ══
   The preview renders `buildRecordingHtml(...)` — the very string
   `Print.printToFileAsync` receives — in a WebView. Not a native mirror
   of the pages: this codebase already pays for every figure existing
   twice (react-native-svg on screen, SVG strings on paper), and a THIRD
   hand-kept copy of four pages of layout would drift within a release.
   One HTML, previewed and printed. What you see is what is shared, to
   the millimetre.

   ══ THE VIEWPORT TRICK ══
   For PRINT the document declares `width=device-width` (the print engine
   ignores it). For PREVIEW the meta is swapped to the A4 pixel width so
   the phone lays the page out at its real proportions and the reader
   pinch-zooms — the document itself is untouched; only the preview's
   copy of the string differs.

   ══ THE NATIVE DEPENDENCY, HANDLED HONESTLY ══
   `react-native-webview` ships in binaries from app.json 0.35.0. On an
   older binary `OptionalWebView` is null — the study viewer's menu then
   offers the direct share instead of routing here, and if this screen is
   somehow reached anyway it says what is missing and still offers the
   share. A preview is a luxury; the export never breaks for its sake.
   ================================================================== */

import { useMemo, useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { OptionalWebView } from '@/components/atoms/OptionalWebView';
import { usePdfLabels } from '@/features/history/hooks/usePdfLabels';
import { useReportContext } from '@/features/history/hooks/useReportContext';
import { useTranslation } from '@/i18n/useTranslation';
import { logAudit } from '@/services/audit/auditLogger';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { useGetRecordingQuery } from '@/services/api/endpoints/recordingApi';
import { buildRecordingHtml, shareRecordingPdf } from '@/services/export/recordingPdf';
import { useTheme } from '@/theme/useTheme';

type PreviewRoute = RouteProp<{ ReportPreview: { id: string } }, 'ReportPreview'>;

/** A4 at CSS 96 dpi — the width the preview viewport pretends to have. */
const A4_CSS_PX = 794;

function BackChevron({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ReportPreviewScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<{ goBack: () => void }>();
  const route = useRoute<PreviewRoute>();
  const { t: tr, rtl } = useTranslation();
  const user = useCurrentUser();
  const labels = usePdfLabels();

  const recordingQuery = useGetRecordingQuery(route.params.id);
  const recording = recordingQuery.data;
  const reportCtx = useReportContext(recording);
  const [sharing, setSharing] = useState(false);
  const [failed, setFailed] = useState(false);

  /* Built ONCE per study/context — the full DSP chain and 43 rules run
     inside, and a preview that recomputed them per render would freeze
     the very screen whose job is reassurance. */
  const html = useMemo(() => {
    if (!recording) return null;
    const doc = buildRecordingHtml({
      recording,
      labels,
      patient: reportCtx.context,
      patientName: reportCtx.patientName,
    });
    /* Preview-only viewport — see header. The printed path never sees this. */
    return doc.replace('width=device-width, initial-scale=1', `width=${A4_CSS_PX}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording?.id, labels, reportCtx.patientName, reportCtx.context.sex, reportCtx.context.ageYears]);

  const share = async () => {
    if (!recording || sharing) return;
    setSharing(true);
    setFailed(false);
    try {
      await shareRecordingPdf(
        {
          recording,
          labels,
          patient: reportCtx.context,
          patientName: reportCtx.patientName,
        },
        tr('printReport'),
      );
      logAudit({
        actor: { id: user?.id ?? 'anonymous', role: user?.role ?? 'guest' },
        action: 'recording:export',
        resourceType: 'EcgRecording',
        resourceId: recording.id,
        detail: 'pdf (from preview)',
      });
    } catch {
      setFailed(true);
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('back')}
          hitSlop={12}
          onPress={() => {
            void Haptics.selectionAsync();
            nav.goBack();
          }}
          style={({ pressed }) => [
            styles.backBtn,
            rtl && styles.rowRtl,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <BackChevron color={t.textPrimary} />
          <Text style={[styles.backLabel, { color: t.textPrimary }]}>
            {tr('pdfPreviewTitle')}
          </Text>
        </Pressable>
      </View>

      {/* The paper. Forced light ground behind it — the document is always
          white paper, and a dark app theme flashing through while the page
          loads reads as a broken render. */}
      <View style={styles.paperArea}>
        {OptionalWebView && html ? (
          <OptionalWebView
            source={{ html }}
            originWhitelist={['*']}
            style={styles.web}
            setBuiltInZoomControls
            setDisplayZoomControls={false}
          />
        ) : !OptionalWebView ? (
          <View style={styles.fallback}>
            <Text style={[styles.fallbackText, { color: t.textSecondary }]}>
              {tr('pdfPreviewUnavailable')}
            </Text>
          </View>
        ) : (
          <View style={styles.fallback}>
            <ActivityIndicator color={t.textSecondary} />
          </View>
        )}
      </View>

      {/* The one action a preview exists for. */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
        {failed && (
          <Text style={[styles.error, { color: t.danger }]}>{tr('histExportFailed')}</Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('pdfPreviewShare')}
          disabled={sharing || !recording}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            void share();
          }}
          style={({ pressed }) => [
            styles.shareBtn,
            {
              backgroundColor: t.brandNavy,
              opacity: !recording ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {sharing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.shareLabel}>{tr('pdfPreviewShare')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rowRtl: { flexDirection: 'row-reverse' },
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', padding: 6 },
  backLabel: { fontSize: 16, fontWeight: '700' },
  /* Neutral grey behind the sheet, like every PDF viewer — the white page
     needs an edge to be a page. */
  paperArea: { flex: 1, backgroundColor: '#8E97A8' },
  web: { flex: 1, backgroundColor: '#8E97A8' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  fallbackText: { fontSize: 14.5, lineHeight: 21, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 10, gap: 8 },
  error: { fontSize: 12.5, textAlign: 'center' },
  shareBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

// v1.0.0 — WYSIWYG report preview: the exact print HTML in a WebView with an
//          A4 viewport, patient context attached, share as the one action, and
//          an honest fallback on binaries without the native module.
