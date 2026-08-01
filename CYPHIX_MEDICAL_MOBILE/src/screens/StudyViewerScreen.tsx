/* ==================================================================
   StudyViewerScreen — open one stored recording and read it.
   The mobile counterpart of the web `ScanHistoryPage` + `EcgViewer`.

   ══ WHY THIS IS A ROUTE AND NOT A PANEL ══
   The web reads a study in a two-column layout: the trace on the left, the
   measurements beside it, the list one click away in the sidebar. A phone
   has one column, so those three things become a LIST SCREEN and a STUDY
   SCREEN, and the measurements move behind the second tab of the study —
   the same split the end-of-exam report already uses.

   ══════════════════════════════════════════════════════════════════
   ★ THE WAVEFORM IS THE SUBJECT, AND IT GETS THE SCREEN
   ══════════════════════════════════════════════════════════════════
   v0.15.0 spent ~a third of a portrait phone on chrome: labelled 44 pt tool
   chips, a headline, a separate metadata line, tabs, and a hint. On the one
   module whose entire content is a trace, that ratio is backwards. Two
   changes fix it, and they are different answers to the same problem:

   1. PORTRAIT is compacted. The tools are icons (38 pt row instead of
      ~120 pt of wrapped chips); the metadata folds into the headline; the
      hint line only exists while a tool is on, and is replaced by the
      caliper readout rather than stacked with it. Everything that needs
      WORDS to be honest — the filter stages, the comparison, the alignment
      modes — moved into a labelled sheet behind ⋯, where it can be read.

   2. FULL SCREEN is landscape, and it is the real answer. Rotating gives
      the sheet ~90 % of the display with one slim bar of dense icons
      floating over it, and it opens at the window that fits ALL SIX LEADS
      to the height (`fitWindowMm`) — the whole study, at the clinical scale,
      in one look. Same idea as the web's full-screen button; the rotation is
      the part a phone adds, because a six-lead ECG is 259 × 180 mm and that
      is a landscape shape.

   Orientation is declared through `navigation.setOptions`, never
   `lockAsync` — react-native-screens stays the single owner of that API
   (see the post-mortem in RootNavigator).

   ══ THE TOOLS ARE MODES, AND ONLY ONE IS ON ══
   A finger cannot hover and there is only one of it, so turning a tool on
   turns the others off. Every switch also closes any open composer.
   ================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  buildRecordingCsv,
  buildRecordingEdf,
  LIMB_LEAD_ORDER,
  recordingFilename,
  STANDARD_MM_PER_SEC,
  type LimbLeadName,
  type RecordingAnnotation,
} from '@cyphix/shared';
import ToolToggle from '@/components/atoms/ToolToggle';
import ActionSheet, { type ActionSheetItem } from '@/components/molecules/ActionSheet';
import AnnotationComposer from '@/components/molecules/AnnotationComposer';
import ClinicalNote from '@/components/molecules/ClinicalNote';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import { CAL_WIDTH_MM } from '@/components/molecules/EcgReviewStrip';
import { ECG_PAPER_DARK, ECG_PAPER_LIGHT } from '@/components/molecules/EcgStripSvg';
import SegmentedTabs from '@/components/molecules/SegmentedTabs';
import EcgAnalysisSheet, { REGULARITY_KEY } from '@/components/organisms/EcgAnalysisSheet';
import EcgReviewSheet, { type ViewerMode } from '@/components/organisms/EcgReviewSheet';
import { usePermissions, useCurrentUser } from '@/features/auth/useCurrentUser';
import { useAnnotations } from '@/features/history/hooks/useAnnotations';
import { useCalipers } from '@/features/history/hooks/useCalipers';
import {
  useOverlayRecording,
  type OverlayAlignMode,
} from '@/features/history/hooks/useOverlayRecording';
import { useRecordingNote } from '@/features/history/hooks/useRecordingNote';
import { useRecordingView } from '@/features/history/hooks/useRecordingView';
import { useViewerFeatures } from '@/features/history/useViewerFeatures';
import {
  DEFAULT_VIEWER_SETTINGS,
  fitWindowMm,
  hasFiltersOff,
  MAX_WINDOW_MM,
  MIN_WINDOW_MM,
  SINGLE_STRIP_HEIGHT_MM,
  STRIP_HEIGHT_MM,
  type ViewerSettings,
} from '@/features/history/viewerSettings';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/config';
import { logAudit } from '@/services/audit/auditLogger';
import { shareFile } from '@/services/export/recordingExport';
import { shareRecordingPdf } from '@/services/export/recordingPdf';
import {
  HISTORY_PAGE_SIZE,
  useDeleteRecordingMutation,
  useGetRecordingQuery,
  useListRecordingsQuery,
} from '@/services/api/endpoints/recordingApi';
import { RADIUS } from '@/theme/tokens';
import { useIsDark, useTheme } from '@/theme/useTheme';

type Tab = 'waveform' | 'measurements';
type ViewerRoute = RouteProp<{ StudyViewer: { id: string } }, 'StudyViewer'>;
type Nav = {
  goBack: () => void;
  setOptions: (o: { orientation?: 'portrait_up' | 'landscape' }) => void;
};

/** One zoom step. 0.65 is roughly the web's 0.6, softened for a tap. */
const ZOOM_STEP = 0.65;
/** Tap within this many mm of a reference line to remove it (2.5 mm ≙ 100 ms). */
const CURSOR_HIT_MM = 2.5;

export default function StudyViewerScreen() {
  const t = useTheme();
  const dark = useIsDark();
  const { t: tr, lang, rtl } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ViewerRoute>();
  const user = useCurrentUser();
  const { can } = usePermissions();
  const features = useViewerFeatures();

  const [selectedId, setSelectedId] = useState(route.params.id);
  const [tab, setTab] = useState<Tab>('waveform');
  const [settings, setSettings] = useState<ViewerSettings>(DEFAULT_VIEWER_SETTINGS);
  const [mode, setMode] = useState<ViewerMode>('read');
  const [fullscreen, setFullscreen] = useState(false);
  const [lockedCursorsSec, setLockedCursorsSec] = useState<number[]>([]);
  const [alignMode, setAlignMode] = useState<OverlayAlignMode>('warp');
  const [manualShift, setManualShift] = useState(0);
  const [ghostOffsetMm, setGhostOffsetMm] = useState(0);
  const [pending, setPending] = useState<{
    lead: LimbLeadName;
    sampleIndex: number;
    timeSec: number;
  } | null>(null);
  const [editing, setEditing] = useState<RecordingAnnotation | null>(null);
  const [sheet, setSheet] = useState<'none' | 'actions' | 'studies' | 'tools'>('none');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [sheetBox, setSheetBox] = useState({ width: 0, height: 0 });

  /* A patient sees only their own studies. Expressed as the QUERY ARGUMENT,
     not as client-side filtering — the same shape the web uses, so the
     server can enforce it the day it exists. */
  const selfOnly = !can('history:read') && can('history:read:self');
  const subject = selfOnly ? (user?.linkedPatientId ?? 'MOCK-SELF') : undefined;
  const list = useListRecordingsQuery({ patientId: subject, limit: HISTORY_PAGE_SIZE });
  const detail = useGetRecordingQuery(selectedId);
  const recording = detail.data;

  const [deleteRecording, deleteState] = useDeleteRecordingMutation();
  const noteAllowed = features.has('annotate') || can('history:read:self');
  const note = useRecordingNote(noteAllowed);
  const annotations = useAnnotations(features.has('annotate'));

  const actor = useMemo(
    () => ({ id: user?.id ?? 'anonymous', role: user?.role ?? 'guest' }),
    [user],
  );

  /* One audit entry per study OPENED, not per render. Keyed on the id alone —
     `recording` is a fresh object on every RTK Query render. */
  useEffect(() => {
    if (!recording) return;
    logAudit({
      actor,
      action: 'recording:read',
      resourceType: 'EcgRecording',
      resourceId: recording.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording?.id]);

  /* Reference lines belong to the recording they were dropped on — a new
     study starts with a clean trace, not the previous one's markers. */
  useEffect(() => {
    setLockedCursorsSec([]);
    setSettings((s) => ({ ...s, overlayId: null, layout: 'all' }));
    setMode('read');
  }, [selectedId]);

  useEffect(() => {
    setManualShift(0);
    setGhostOffsetMm(0);
  }, [settings.overlayId, alignMode]);

  /* ── Full screen is a ROTATION ──
     Declarative, exactly like the exam route's own option, so
     react-native-screens stays the single owner of the orientation API. */
  useEffect(() => {
    navigation.setOptions({ orientation: fullscreen ? 'landscape' : 'portrait_up' });
  }, [navigation, fullscreen]);

  const view = useRecordingView(recording, settings);
  const overlay = useOverlayRecording(
    features.has('compare') ? settings.overlayId : null,
    settings,
    view,
    alignMode,
    manualShift,
  );
  const overlayActive = Boolean(
    features.has('compare') && settings.overlayId && overlay && !overlay.isLoading,
  );

  const leads: LimbLeadName[] =
    settings.layout === 'single' ? [settings.focusLead] : [...LIMB_LEAD_ORDER];
  const stripHeightMm = settings.layout === 'single' ? SINGLE_STRIP_HEIGHT_MM : STRIP_HEIGHT_MM;

  const traceMm = CAL_WIDTH_MM + (view?.durationSec ?? 0) * STANDARD_MM_PER_SEC;
  const windowMm = settings.windowMm;
  const fitMm = fitWindowMm(sheetBox.width, sheetBox.height, leads.length, stripHeightMm);

  /* Entering full screen re-fits ONCE, after the rotated layout has been
     measured — computing it from the pre-rotation box would size the sheet to
     a portrait width and then leave it there. The ref is what makes it once:
     without it, every re-render would drag the reader's own zoom back. */
  const refitRef = useRef(false);
  useEffect(() => {
    if (!fullscreen) {
      refitRef.current = false;
      return;
    }
    if (refitRef.current || sheetBox.width === 0) return;
    refitRef.current = true;
    setSettings((s) => ({ ...s, windowMm: fitMm }));
  }, [fullscreen, sheetBox.width, sheetBox.height, fitMm]);

  const calipers = useCalipers(
    {
      mmPerSec: STANDARD_MM_PER_SEC,
      mmPerMv: 10,
      xOffsetMm: CAL_WIDTH_MM,
      baselineMm: stripHeightMm / 2,
    },
    { minXMm: 0, maxXMm: Math.max(traceMm, windowMm), minYMm: 0, maxYMm: stripHeightMm },
    mode === 'calipers',
  );

  const fmtWhen = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleString(lang, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [lang],
  );

  /* ── Mode switching. One tool at a time; every switch closes composers. ── */
  const pickMode = (next: ViewerMode) => {
    void Haptics.selectionAsync();
    setPending(null);
    setEditing(null);
    setMode((cur) => (cur === next ? 'read' : next));
  };

  const patch = (p: Partial<ViewerSettings>) => setSettings((s) => ({ ...s, ...p }));

  /**
   * How far out zooming is allowed to go.
   *
   * NOT `MAX_WINDOW_MM` — that is only the ceiling the fit calculation needs.
   * Past the point where either the whole recording is on screen OR all six
   * leads fit the height, zooming out only adds blank paper, and a control
   * that keeps responding by showing more nothing reads as broken.
   */
  const maxUsefulMm = () => Math.min(MAX_WINDOW_MM, Math.max(traceMm, fitMm));

  const zoom = (factor: number) =>
    setSettings((s) => ({
      ...s,
      windowMm: Math.min(maxUsefulMm(), Math.max(MIN_WINDOW_MM, s.windowMm * factor)),
    }));

  const dropCursor = (timeSec: number) =>
    setLockedCursorsSec((prev) => {
      const hit = prev.findIndex(
        (s) => Math.abs(s - timeSec) * STANDARD_MM_PER_SEC <= CURSOR_HIT_MM,
      );
      if (hit >= 0) return prev.filter((_, i) => i !== hit);
      // Kept in insertion order, NOT sorted — a stable index is what lets a
      // later drag move the right line.
      return [...prev, timeSec];
    });

  const removeCursor = useCallback(
    (index: number) => setLockedCursorsSec((prev) => prev.filter((_, i) => i !== index)),
    [],
  );

  const moveCursor = useCallback(
    (index: number, timeSec: number) =>
      setLockedCursorsSec((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        const next = prev.slice();
        next[index] = timeSec;
        return next;
      }),
    [],
  );

  const focusLead = (lead: LimbLeadName) =>
    patch(
      settings.layout === 'single' && settings.focusLead === lead
        ? { layout: 'all' }
        : { layout: 'single', focusLead: lead },
    );

  const onGhostDrag = useCallback(
    (dxMm: number, dyMm: number) => {
      if (!view) return;
      setManualShift((s) => s + Math.round((dxMm / STANDARD_MM_PER_SEC) * view.sampleRate));
      const limit = stripHeightMm / 2;
      setGhostOffsetMm((o) => Math.max(-limit, Math.min(limit, o + dyMm)));
    },
    [view, stripHeightMm],
  );

  const onSheetLayout = useCallback(
    (b: { width: number; height: number }) =>
      setSheetBox((prev) =>
        prev.width === b.width && prev.height === b.height ? prev : b,
      ),
    [],
  );

  /* ── Exports ── */
  const exportAudit = (detailText: string, ok = true) =>
    logAudit({
      actor,
      action: 'recording:export',
      resourceType: 'EcgRecording',
      resourceId: recording?.id,
      outcome: ok ? 'success' : 'failure',
      detail: detailText,
    });

  const pdfLabels = useMemo(() => {
    const a = view?.analysis;
    const num = (v: number | null, unit: string) => (v == null ? '—' : `${v} ${unit}`);
    return {
      title: tr('reportLimbTitle'),
      brand: 'CYPHIX MEDICAL',
      recorded: tr('reportRecorded'),
      duration: tr('reportDuration'),
      leads: tr('reportLeads'),
      leadSet: tr('reportLeadSetShort'),
      sampleRate: tr('reportSampleRate'),
      device: tr('histDevice'),
      simulated: tr('reportSimulated'),
      sheetOf: tr('pdfSheetOf'),
      measurements: tr('reportTabMeasurements'),
      disclaimer: tr('analysisDisclaimer'),
      note: tr('noteTitle'),
      rows: a
        ? [
            { label: tr('mBpm'), value: num(a.rate.bpm, 'BPM') },
            { label: tr('mRegularity'), value: tr(REGULARITY_KEY[a.rate.regularity]) },
            { label: tr('mRrMean'), value: num(a.rate.rrMeanMs, 'ms') },
            { label: tr('mSdnn'), value: num(a.rate.sdnnMs, 'ms') },
            { label: tr('mRmssd'), value: num(a.rate.rmssdMs, 'ms') },
            { label: tr('mBeats'), value: String(a.rate.beatsAnalyzed) },
            { label: tr('secAxis'), value: num(a.axis.degrees, '°') },
            { label: tr('iPR'), value: num(a.intervals.prMs, 'ms') },
            { label: tr('iQRS'), value: num(a.intervals.qrsMs, 'ms') },
            { label: tr('iQT'), value: num(a.intervals.qtMs, 'ms') },
            { label: tr('iQTcB'), value: num(a.intervals.qtcBazettMs, 'ms') },
            { label: tr('iQTcF'), value: num(a.intervals.qtcFridericiaMs, 'ms') },
            { label: tr('qSqi'), value: num(a.quality.sqi, '%') },
            { label: tr('qAnalysed'), value: num(a.quality.analysedSeconds, 's') },
          ]
        : [],
    };
  }, [view?.analysis, tr]);

  const runExport = async (kind: 'csv' | 'edf' | 'pdf') => {
    if (!recording) return;
    try {
      if (kind === 'csv') {
        await shareFile(
          recordingFilename(recording, 'csv'),
          buildRecordingCsv(recording),
          'text/csv',
          tr('histExportCsv'),
        );
      } else if (kind === 'edf') {
        await shareFile(
          recordingFilename(recording, 'edf'),
          buildRecordingEdf(recording),
          'application/octet-stream',
          tr('histExportEdf'),
        );
      } else {
        await shareRecordingPdf(recording, pdfLabels, tr('printReport'));
      }
      exportAudit(kind);
    } catch {
      exportAudit(kind, false);
      setBanner(tr('histExportFailed'));
    }
  };

  /* ── Sheets ── */
  const actionItems: ActionSheetItem[] = [
    ...(features.has('exportPdf')
      ? [
          {
            id: 'pdf',
            label: tr('printReport'),
            hint: tr('pdfHint'),
            icon: 'document-text-outline' as const,
            onSelect: () => void runExport('pdf'),
          },
        ]
      : []),
    ...(features.has('exportRaw')
      ? [
          {
            id: 'csv',
            label: tr('histExportCsv'),
            hint: tr('histExportCsvHint'),
            icon: 'grid-outline' as const,
            onSelect: () => void runExport('csv'),
          },
          {
            id: 'edf',
            label: tr('histExportEdf'),
            hint: tr('histExportEdfHint'),
            icon: 'pulse-outline' as const,
            onSelect: () => void runExport('edf'),
          },
        ]
      : []),
    ...(features.has('delete')
      ? [
          {
            id: 'del',
            label: tr('histDelete'),
            icon: 'trash-outline' as const,
            danger: true,
            onSelect: () => setConfirmDelete(true),
          },
        ]
      : []),
  ];

  const studyItems: ActionSheetItem[] = (list.data ?? []).map((r) => ({
    id: r.id,
    label: fmtWhen(r.recordedAt),
    hint: `${r.summary.bpm ?? '—'} ${tr('bpm')}${r.isSimulated ? ` · ${tr('histSimulated')}` : ''}`,
    icon: r.id === selectedId ? ('checkmark-circle' as const) : ('ellipse-outline' as const),
    onSelect: () => setSelectedId(r.id),
  }));

  /* ★ Everything that needs WORDS lives here, not on the toolbar. "50 Hz",
     "Align P-QRS-T" and "Savitzky-Golay smoothing" have no honest pictogram,
     and guessing at one is worse than a second tap. */
  const toolItems: ActionSheetItem[] = [
    ...(features.has('filters')
      ? [
          {
            id: 'f-base',
            section: tr('vtFilters'),
            label: tr('vtBaseline'),
            hint: tr('vtBaselineHint'),
            checked: settings.filters.baseline,
            onSelect: () =>
              patch({ filters: { ...settings.filters, baseline: !settings.filters.baseline } }),
          },
          {
            id: 'f-notch',
            label: tr('vtNotch'),
            hint: tr('vtNotchHint'),
            checked: settings.filters.notch,
            onSelect: () =>
              patch({ filters: { ...settings.filters, notch: !settings.filters.notch } }),
          },
          {
            id: 'f-smooth',
            label: tr('vtSmooth'),
            hint: tr('vtSmoothHint'),
            checked: settings.filters.smoothing,
            onSelect: () =>
              patch({ filters: { ...settings.filters, smoothing: !settings.filters.smoothing } }),
          },
        ]
      : []),
    ...(features.has('compare') && (list.data ?? []).length > 1
      ? [
          {
            id: 'cmp-none',
            section: tr('vtCompare'),
            label: tr('ovNone'),
            checked: !settings.overlayId,
            onSelect: () => patch({ overlayId: null }),
          },
          ...(list.data ?? [])
            .filter((r) => r.id !== selectedId)
            .map((r) => ({
              id: `cmp-${r.id}`,
              label: fmtWhen(r.recordedAt),
              hint: `${r.summary.bpm ?? '—'} ${tr('bpm')}`,
              checked: settings.overlayId === r.id,
              onSelect: () => patch({ overlayId: r.id }),
            })),
        ]
      : []),
    ...(overlayActive
      ? [
          {
            id: 'al-beat',
            section: tr('ovAlignSection'),
            label: tr('ovModeBeat'),
            hint: tr('ovModeBeatHint'),
            checked: alignMode === 'beat',
            onSelect: () => setAlignMode('beat'),
          },
          {
            id: 'al-warp',
            label: tr('ovModeWarp'),
            hint: tr('ovModeWarpHint'),
            checked: alignMode === 'warp',
            onSelect: () => setAlignMode('warp'),
          },
          {
            id: 'al-manual',
            label: tr('ovModeManual'),
            hint: tr('ovModeManualHint'),
            checked: mode === 'ghost',
            onSelect: () => {
              setAlignMode('manual');
              setMode('ghost');
            },
          },
        ]
      : []),
  ];

  /* ── Derived display values ── */
  const align = rtl ? ('right' as const) : ('left' as const);
  const durationSec = view?.durationSec ?? 0;
  const visibleSec = Math.min(durationSec, Math.max(0, (windowMm - CAL_WIDTH_MM) / STANDARD_MM_PER_SEC));
  const canZoomOut = windowMm < maxUsefulMm() - 0.5;
  const canZoomIn = windowMm > MIN_WINDOW_MM + 0.5;
  const offFit = Math.abs(windowMm - fitMm) > 1;

  const hintKey: TranslationKey | null =
    mode === 'mark'
      ? 'annHintTouch'
      : mode === 'cursor'
        ? 'curHintTouch'
        : mode === 'ghost'
          ? 'ovDragHint'
          : null;

  const palette = { ...(dark ? ECG_PAPER_DARK : ECG_PAPER_LIGHT), ghost: t.textTertiary };

  /* The tool row, shared by the portrait toolbar and the full-screen bar so
     the two can never offer different tools. */
  const tools = (dense: boolean) => (
    <>
      {features.has('calipers') && (
        <ToolToggle
          dense={dense}
          label={tr('vtCalipers')}
          hint={tr('vtCalipersHintTouch')}
          icon="resize-outline"
          active={mode === 'calipers'}
          onToggle={() => pickMode('calipers')}
        />
      )}
      {features.has('annotate') && (
        <ToolToggle
          dense={dense}
          label={tr('vtMark')}
          hint={tr('vtMarkHintTouch')}
          icon="pricetag-outline"
          active={mode === 'mark'}
          onToggle={() => pickMode('mark')}
        />
      )}
      <ToolToggle
        dense={dense}
        label={tr('vtCursor')}
        hint={tr('vtCursorHintTouch')}
        icon="git-compare-outline"
        active={mode === 'cursor'}
        onToggle={() => pickMode('cursor')}
      />
      <ToolToggle
        dense={dense}
        label={tr('vtRPeaks')}
        hint={tr('vtRPeaksHint')}
        icon="analytics-outline"
        active={settings.showRPeaks}
        onToggle={() => patch({ showRPeaks: !settings.showRPeaks })}
      />
      {toolItems.length > 0 && (
        <ToolToggle
          dense={dense}
          label={tr('vtMoreTools')}
          icon="options-outline"
          active={overlayActive || hasFiltersOff(settings)}
          onToggle={() => setSheet('tools')}
        />
      )}
      <ToolToggle
        dense={dense}
        label={fullscreen ? tr('vtExitFullscreen') : tr('vtFullscreen')}
        icon={fullscreen ? 'contract-outline' : 'expand-outline'}
        active={fullscreen}
        onToggle={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setFullscreen((f) => !f);
        }}
      />
    </>
  );

  /* The zoom control, likewise shared. The readout says how many SECONDS are
     on screen, because the scale never changes — a percentage would be a
     number with no clinical meaning. */
  const zoomControls = (dense: boolean) => (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr('vtZoomOut')}
        disabled={!canZoomOut}
        hitSlop={6}
        onPress={() => zoom(1 / ZOOM_STEP)}
        style={({ pressed }) => [
          dense ? styles.zoomBtnDense : styles.zoomBtn,
          { borderColor: t.border, opacity: !canZoomOut ? 0.3 : pressed ? 0.6 : 1 },
        ]}
      >
        <Ionicons name="remove" size={dense ? 16 : 20} color={t.textPrimary} />
      </Pressable>

      <Text
        style={[dense ? styles.zoomTextDense : styles.zoomText, { color: t.textSecondary }]}
        allowFontScaling={false}
      >
        {visibleSec >= durationSec - 0.05
          ? `${durationSec.toFixed(1)}s`
          : `${visibleSec.toFixed(1)}/${durationSec.toFixed(1)}s`}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr('vtZoomIn')}
        disabled={!canZoomIn}
        hitSlop={6}
        onPress={() => zoom(ZOOM_STEP)}
        style={({ pressed }) => [
          dense ? styles.zoomBtnDense : styles.zoomBtn,
          { borderColor: t.border, opacity: !canZoomIn ? 0.3 : pressed ? 0.6 : 1 },
        ]}
      >
        <Ionicons name="add" size={dense ? 16 : 20} color={t.textPrimary} />
      </Pressable>

      {offFit && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('vtFit')}
          hitSlop={6}
          onPress={() => patch({ windowMm: fitMm, layout: 'all' })}
          style={({ pressed }) => [styles.fitBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text
            style={[styles.fitText, { color: t.brandNavy, fontSize: dense ? 12 : 13.5 }]}
            allowFontScaling={false}
          >
            {tr('vtFit')}
          </Text>
        </Pressable>
      )}
    </>
  );

  /* The live caliper readout. ★ Rendered in the CHROME, above the paper —
     never floating on the trace, where it covers the very deflections whose
     distance it is reporting. */
  const caliperReadout =
    mode === 'calipers' && calipers.delta ? (
      <View style={[styles.readout, { backgroundColor: t.brandNavy }]} pointerEvents="none">
        <Text style={styles.readoutMain} allowFontScaling={false}>
          {Math.round(calipers.delta.ms)}
          <Text style={styles.readoutUnit}> ms</Text>
        </Text>
        {calipers.delta.impliedBpm != null && (
          <Text style={styles.readoutSide} allowFontScaling={false}>
            {Math.round(calipers.delta.impliedBpm)} {tr('bpm')}
          </Text>
        )}
        <Text style={styles.readoutSide} allowFontScaling={false}>
          {calipers.delta.mv >= 0 ? '+' : ''}
          {calipers.delta.mv.toFixed(2)} mV
        </Text>
      </View>
    ) : null;

  const reviewSheet =
    view && recording ? (
      <EcgReviewSheet
        view={view}
        leads={leads}
        windowMm={windowMm}
        stripHeightMm={stripHeightMm}
        showRPeaks={settings.showRPeaks}
        ghost={overlayActive ? overlay : null}
        ghostOffsetMm={ghostOffsetMm}
        annotations={recording.annotations}
        lockedCursorsSec={lockedCursorsSec}
        mode={mode}
        calipers={calipers}
        palette={palette}
        onTapLead={focusLead}
        onTapPoint={(lead, sampleIndex, timeSec) => setPending({ lead, sampleIndex, timeSec })}
        onTapAnnotation={setEditing}
        onDropCursor={dropCursor}
        onRemoveCursor={removeCursor}
        onMoveCursor={moveCursor}
        onMoveAnnotation={(annotation, sampleIndex) =>
          annotations.move({ recordingId: recording.id, annotation, sampleIndex })
        }
        onGhostDrag={onGhostDrag}
        onLayoutBox={onSheetLayout}
      />
    ) : null;

  const sheets = (
    <>
      <ActionSheet
        visible={sheet === 'actions'}
        title={tr('histActions')}
        items={actionItems}
        cancelLabel={tr('annCancel')}
        onClose={() => setSheet('none')}
      />
      <ActionSheet
        visible={sheet === 'studies'}
        title={tr('histListLabel')}
        items={studyItems}
        cancelLabel={tr('annCancel')}
        onClose={() => setSheet('none')}
      />
      <ActionSheet
        visible={sheet === 'tools'}
        title={tr('vtMoreTools')}
        items={toolItems}
        cancelLabel={tr('setDone')}
        onClose={() => setSheet('none')}
      />

      {(pending || editing) && recording && (
        <AnnotationComposer
          key={editing?.id ?? `${pending?.lead}-${pending?.sampleIndex}`}
          visible
          lead={pending?.lead ?? editing?.lead ?? '—'}
          timeSec={pending?.timeSec ?? (editing ? editing.sampleIndex / recording.sampleRate : 0)}
          existingText={editing?.text}
          busy={annotations.busy}
          onDelete={
            editing
              ? () => {
                  annotations.remove(recording.id, editing.id);
                  setEditing(null);
                }
              : undefined
          }
          onCancel={() => {
            setPending(null);
            setEditing(null);
          }}
          onSubmit={(text) => {
            if (editing) {
              annotations.retext(recording.id, editing.id, text);
              setEditing(null);
            } else if (pending) {
              annotations.add({
                recordingId: recording.id,
                lead: pending.lead,
                sampleIndex: pending.sampleIndex,
                text,
              });
              setPending(null);
            }
          }}
        />
      )}

      {recording && (
        <ConfirmDialog
          visible={confirmDelete}
          destructive
          busy={deleteState.isLoading}
          title={tr('histDeleteTitle')}
          subject={fmtWhen(recording.recordedAt)}
          body={tr('histDeleteBody')}
          confirmLabel={tr('histDelete')}
          cancelLabel={tr('annCancel')}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            setConfirmDelete(false);
            try {
              await deleteRecording(recording.id).unwrap();
              logAudit({
                actor,
                action: 'recording:delete',
                resourceType: 'EcgRecording',
                resourceId: recording.id,
              });
              navigation.goBack();
            } catch (err) {
              // A delete that fails must never look like one that worked.
              const status =
                typeof err === 'object' && err !== null && 'status' in err
                  ? (err as { status?: number }).status
                  : undefined;
              setBanner(status === 403 ? tr('histDeleteForbidden') : tr('histDeleteFailed'));
              logAudit({
                actor,
                action: 'recording:delete',
                resourceType: 'EcgRecording',
                resourceId: recording.id,
                outcome: 'failure',
              });
            }
          }}
        />
      )}
    </>
  );

  /* ══════════ FULL SCREEN ══════════
     One slim bar over the paper, everything else gone. The bar is drawn ON
     the sheet rather than above it so the trace keeps the full height; it is
     the only element here that is allowed to overlap the paper, and it sits
     in the top margin where the strips have their quietest millimetres. */
  if (fullscreen) {
    return (
      <View style={[styles.root, { backgroundColor: palette.paper }]}>
        {/* Guarded rather than falling through to the portrait branch: the
            device is already rotated, and a portrait layout drawn sideways is
            worse than an honest message. */}
        <View style={styles.fsSheet}>
          {reviewSheet ?? (
            <View style={styles.centre}>
              <Text style={[styles.centreText, { color: t.textSecondary }]}>
                {tr('histEmptyWaveform')}
              </Text>
            </View>
          )}
        </View>

        <View
          style={[
            styles.fsBar,
            {
              backgroundColor: t.surface,
              borderColor: t.border,
              top: Math.max(insets.top, 8),
              left: Math.max(insets.left, 10),
              right: Math.max(insets.right, 10),
            },
          ]}
        >
          <View style={styles.fsTools}>{tools(true)}</View>
          <View style={styles.fsZoom}>{zoomControls(true)}</View>
        </View>

        {caliperReadout && (
          <View style={[styles.fsReadout, { top: Math.max(insets.top, 8) + 44 }]}>
            {caliperReadout}
          </View>
        )}

        {hintKey && (
          <Text
            style={[
              styles.fsHint,
              { color: t.textSecondary, backgroundColor: t.surface, bottom: Math.max(insets.bottom, 8) },
            ]}
            numberOfLines={1}
          >
            {tr(hintKey)}
          </Text>
        )}

        {sheets}
      </View>
    );
  }

  /* ══════════ PORTRAIT ══════════ */
  return (
    <View style={[styles.root, { backgroundColor: t.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, rtl && styles.rowRtl]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('back')}
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
          hitSlop={8}
        >
          <Ionicons
            name={rtl ? 'chevron-forward' : 'chevron-back'}
            size={26}
            color={t.textPrimary}
          />
        </Pressable>

        {/* The date IS the switcher, exactly as on the web: tapping the study
            you are reading opens the list of the others. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('histSelectOne')}
          onPress={() => setSheet('studies')}
          style={styles.titleBtn}
        >
          <Text style={[styles.title, { color: t.brandNavy }]} numberOfLines={1}>
            {recording ? fmtWhen(recording.recordedAt) : tr('histLoading')}
          </Text>
          <Ionicons name="chevron-down" size={14} color={t.textSecondary} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('histActions')}
          onPress={() => setSheet('actions')}
          disabled={!recording || actionItems.length === 0}
          style={styles.iconBtn}
          hitSlop={8}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={22}
            color={recording && actionItems.length > 0 ? t.textPrimary : t.textTertiary}
          />
        </Pressable>
      </View>

      {detail.isLoading && (
        <View style={styles.centre}>
          <ActivityIndicator color={t.brandNavy} />
          <Text style={[styles.centreText, { color: t.textSecondary }]}>{tr('histLoading')}</Text>
        </View>
      )}

      {!detail.isLoading && !view && (
        <View style={styles.centre}>
          <Text style={[styles.centreText, { color: t.textSecondary }]}>
            {detail.isError ? tr('histLoadError') : tr('histEmptyWaveform')}
          </Text>
        </View>
      )}

      {view && recording && (
        <>
          {/* Rate, rhythm and provenance in ONE row. They were three rows,
              which cost the trace ~60 pt to say what fits on one line. */}
          <View style={[styles.headline, rtl && styles.rowRtl]}>
            <Text style={[styles.bpm, { color: t.textPrimary }]} allowFontScaling={false}>
              {view.analysis.rate.bpm ?? '—'}
              <Text style={[styles.bpmUnit, { color: t.textTertiary }]}> {tr('bpm')}</Text>
            </Text>
            <Text style={[styles.rhythm, { color: t.textSecondary }]} numberOfLines={1}>
              {tr(REGULARITY_KEY[view.analysis.rate.regularity])} · {durationSec.toFixed(1)}s ·{' '}
              {recording.sampleRate} Hz
            </Text>
            {recording.isSimulated && (
              <Text style={[styles.simChip, { color: t.danger, backgroundColor: t.dangerSoft }]}>
                {tr('histSimulated')}
              </Text>
            )}
          </View>

          <View style={styles.tabs}>
            <SegmentedTabs
              options={[
                { value: 'waveform' as const, label: tr('reportTabWaveform') },
                { value: 'measurements' as const, label: tr('reportTabMeasurements') },
              ]}
              value={tab}
              onChange={setTab}
              accessibilityLabel={tr('reportSectionA11y')}
            />
          </View>

          {banner && (
            <Text style={[styles.banner, { color: t.danger, backgroundColor: t.dangerSoft }]}>
              {banner}
            </Text>
          )}

          {tab === 'waveform' ? (
            <>
              <View style={[styles.toolbar, rtl && styles.rowRtl]}>{tools(false)}</View>

              {/* ONE line, and only when something needs saying. The caliper
                  readout takes this slot rather than adding another, so the
                  trace's height never depends on which tool is on. */}
              <View style={styles.statusRow}>
                {caliperReadout ??
                  (hasFiltersOff(settings) ? (
                    <Text style={[styles.warn, { color: t.danger }]} numberOfLines={1}>
                      {tr('vtFiltersOff')}
                    </Text>
                  ) : overlayActive && overlay ? (
                    <Text style={[styles.hint, { color: t.textSecondary }]} numberOfLines={1}>
                      {tr('ovComparing', { when: fmtWhen(overlay.recordedAt) })} ·{' '}
                      {overlay.mode === 'warp'
                        ? overlay.degraded
                          ? tr('ovWarpFailed')
                          : tr('ovWarpApplied', { n: String(overlay.anchorCount) })
                        : tr('ovShifted', { ms: String(Math.round(overlay.shiftMs)) })}
                    </Text>
                  ) : hintKey ? (
                    <Text style={[styles.hint, { color: t.textSecondary }]} numberOfLines={1}>
                      {tr(hintKey)}
                    </Text>
                  ) : null)}
              </View>

              <View style={[styles.sheet, { borderColor: t.border, backgroundColor: t.surface }]}>
                {reviewSheet}
              </View>

              <View
                style={[
                  styles.zoomBar,
                  rtl && styles.rowRtl,
                  { paddingBottom: Math.max(insets.bottom, 8) },
                ]}
              >
                {zoomControls(false)}
                {settings.layout === 'single' && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => patch({ layout: 'all' })}
                    style={({ pressed }) => [styles.fitBtn, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Text style={[styles.fitText, { color: t.brandNavy }]}>
                      {tr('vtLayoutStack')}
                    </Text>
                  </Pressable>
                )}
              </View>
            </>
          ) : (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[
                styles.analysis,
                { paddingBottom: Math.max(insets.bottom, 16) + 16 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <EcgAnalysisSheet analysis={view.analysis} showTitle={false} />
              <ClinicalNote
                value={recording.note ?? ''}
                resetKey={recording.id}
                canEdit={noteAllowed}
                busy={note.busy}
                rtl={rtl}
                onSave={(text) => note.save(recording.id, text)}
                labels={{
                  title: tr('noteTitle'),
                  placeholder: tr('notePlaceholder'),
                  save: tr('noteSave'),
                  saved: tr('noteSaved'),
                  hint: tr('noteHint'),
                }}
              />
              {recording.annotations.length > 0 && (
                <View
                  style={[styles.annList, { backgroundColor: t.surface, borderColor: t.border }]}
                >
                  <Text style={[styles.annListTitle, { color: t.textPrimary, textAlign: align }]}>
                    {tr('annListTitle')}
                  </Text>
                  {recording.annotations.map((a) => (
                    <Pressable
                      key={a.id}
                      accessibilityRole="button"
                      disabled={!features.has('annotate')}
                      onPress={() => {
                        setTab('waveform');
                        setMode('mark');
                        setEditing(a);
                      }}
                      style={({ pressed }) => [
                        styles.annRow,
                        rtl && styles.rowRtl,
                        { borderTopColor: t.border, opacity: pressed ? 0.6 : 1 },
                      ]}
                    >
                      <Text style={[styles.annText, { color: t.textPrimary }]} numberOfLines={1}>
                        {a.text}
                      </Text>
                      <Text style={[styles.annAt, { color: t.textTertiary }]}>
                        {a.lead ?? '—'} · {(a.sampleIndex / recording.sampleRate).toFixed(2)}s
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}

      {sheets}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  rowRtl: { flexDirection: 'row-reverse' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, height: 42 },
  iconBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  titleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  title: { flexShrink: 1, fontSize: 15.5, fontWeight: '700' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 30 },
  centreText: { fontSize: 14.5, textAlign: 'center', lineHeight: 21 },

  headline: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 14 },
  bpm: { fontSize: 27, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bpmUnit: { fontSize: 11, fontWeight: '700' },
  // Word-valued and can be long: without flexShrink it overflows the row.
  rhythm: { flex: 1, flexShrink: 1, fontSize: 12, fontWeight: '600' },
  simChip: {
    flexShrink: 0,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  tabs: { paddingHorizontal: 14, paddingTop: 8 },
  banner: {
    marginHorizontal: 14,
    marginTop: 6,
    padding: 8,
    borderRadius: RADIUS.sm,
    fontSize: 12,
    fontWeight: '600',
  },

  toolbar: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 4 },
  /* Fixed height so the trace's size does not depend on which tool is on. */
  statusRow: { height: 26, justifyContent: 'center', paddingHorizontal: 14 },
  hint: { fontSize: 11 },
  warn: { fontSize: 11, fontWeight: '700' },

  sheet: { flex: 1, marginHorizontal: 10, borderWidth: 1, borderRadius: RADIUS.md, overflow: 'hidden' },

  zoomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  zoomBtn: {
    width: 42,
    height: 34,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnDense: {
    width: 34,
    height: 28,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    minWidth: 96,
    textAlign: 'center',
    fontSize: 12.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  zoomTextDense: {
    minWidth: 78,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  fitBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  fitText: { fontSize: 13, fontWeight: '700' },

  readout: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
  },
  readoutMain: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  readoutUnit: { fontSize: 10, fontWeight: '700' },
  readoutSide: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  /* ── Full screen ── */
  fsSheet: { flex: 1 },
  fsBar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    opacity: 0.97,
  },
  fsTools: { flexDirection: 'row', gap: 6 },
  fsZoom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fsReadout: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fsHint: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },

  analysis: { padding: 16, gap: 14 },
  annList: { borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  annListTitle: { fontSize: 15.5, fontWeight: '700', marginBottom: 4 },
  annRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  annText: { flex: 1, flexShrink: 1, fontSize: 14.5, fontWeight: '600' },
  annAt: { flexShrink: 0, fontSize: 12, fontVariant: ['tabular-nums'] },
});

// v2.0.0 — The trace gets the screen: icon toolbar, one-line headline, a fixed
//          26 pt status slot that the caliper readout shares rather than adds
//          to, and a LANDSCAPE full-screen view that opens fitted to all six
//          leads. Filters / compare / alignment moved into a labelled sheet.
