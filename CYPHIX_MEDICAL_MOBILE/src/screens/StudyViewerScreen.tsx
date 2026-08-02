/* ==================================================================
   StudyViewerScreen — open one stored recording and read it.
   The mobile counterpart of the web `ScanHistoryPage` + `EcgViewer`.

   ══ WHY THIS IS A ROUTE AND NOT A PANEL ══
   The web reads a study in a two-column layout: the trace on the left, the
   measurements beside it, the list one click away in the sidebar. A phone
   has one column, so those three things become a LIST SCREEN and a STUDY
   SCREEN, and the measurements move behind the second tab of the study.

   ══════════════════════════════════════════════════════════════════
   ★ THE WAVEFORM IS THE SUBJECT, AND IT GETS THE SCREEN
   ══════════════════════════════════════════════════════════════════
   Two different answers to the same problem:

   1. PORTRAIT compacts the chrome, and what chrome remains is a MATERIAL:
      the header is a blurred glass bar the measurements scroll UNDER,
      picking up a hairline only once something has actually gone behind it.
      A header that content slides beneath with no edge and no blur is what
      made this read as a form from 2004; a header that is opaque and static
      just eats the trace. Neither was necessary.

   2. FULL SCREEN is landscape, and it is the real answer. A six-lead ECG is
      259 × 180 mm — a landscape shape — so portrait can never give it 90 %
      of the display however hard the chrome is squeezed.

      ★ In full screen the bar is IN FLOW above the sheet, not floating over
      it, and the whole screen is inset for the safe area. In landscape the
      notch/Dynamic Island is on a SIDE, and a full-bleed sheet puts the
      first ~50 pt of every trace underneath it. A cut-off ECG is not a
      cosmetic problem.

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
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
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
import GlassSurface from '@/components/atoms/GlassSurface';
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
/** Points of scroll before the header earns its edge. Below this, nothing is
    behind it yet and a line would be drawing a boundary that isn't there. */
const HEADER_SHADOW_AT = 6;
/** The glass bar's own bottom padding, added back when measuring it. */
const HEADER_PAD_BOTTOM = 10;
/**
 * First-frame estimate of the header's height, used only until `onLayout`
 * reports the real one. Without it the first paint puts the toolbar under the
 * glass and then jumps — one frame, but a visible one.
 */
const HEADER_H_GUESS = 150;

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
  const [headerH, setHeaderH] = useState(HEADER_H_GUESS);
  const [scrolled, setScrolled] = useState(false);

  /* A patient sees only their own studies. Expressed as the QUERY ARGUMENT,
     not as client-side filtering — the same shape the web uses. */
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

  /* One audit entry per study OPENED, not per render. */
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

  /* Reference lines belong to the recording they were dropped on. */
  useEffect(() => {
    setLockedCursorsSec([]);
    setSettings((s) => ({ ...s, overlayId: null, layout: 'all' }));
    setMode('read');
  }, [selectedId]);

  useEffect(() => {
    setManualShift(0);
    setGhostOffsetMm(0);
  }, [settings.overlayId, alignMode]);

  /* ── Full screen is a ROTATION ── */
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
     a portrait width and leave it there. The ref is what makes it once:
     without it every re-render would drag the reader's own zoom back. */
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

  /* ── Mode switching ── */
  const pickMode = (next: ViewerMode) => {
    void Haptics.selectionAsync();
    setPending(null);
    setEditing(null);
    setMode((cur) => (cur === next ? 'read' : next));
  };

  const patch = (p: Partial<ViewerSettings>) => setSettings((s) => ({ ...s, ...p }));

  /**
   * How far out zooming is allowed to go. NOT `MAX_WINDOW_MM` — that is only
   * the ceiling the fit calculation needs. Past the point where either the
   * whole recording is on screen OR all six leads fit the height, zooming out
   * adds blank paper, and a control that responds by showing more nothing
   * reads as broken.
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
      // Insertion order, NOT sorted — a stable index is what lets a later drag
      // move the right line.
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
      setSheetBox((prev) => (prev.width === b.width && prev.height === b.height ? prev : b)),
    [],
  );

  /* Only re-render when the header actually crosses the threshold — an
     onScroll that setStates every frame would re-run the six-lead layout. */
  const onAnalysisScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const past = e.nativeEvent.contentOffset.y > HEADER_SHADOW_AT;
    setScrolled((was) => (was === past ? was : past));
  };

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

  /* Everything that needs WORDS lives here, not on the toolbar. */
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
  const visibleSec = Math.min(
    durationSec,
    Math.max(0, (windowMm - CAL_WIDTH_MM) / STANDARD_MM_PER_SEC),
  );
  const canZoomOut = windowMm < maxUsefulMm() - 0.5;
  const canZoomIn = windowMm > MIN_WINDOW_MM + 0.5;
  const offFit = Math.abs(windowMm - fitMm) > 1;

  const hintKey: TranslationKey | null =
    mode === 'mark' ? 'annHintTouch' : mode === 'cursor' ? 'curHintTouch' : null;

  const palette = { ...(dark ? ECG_PAPER_DARK : ECG_PAPER_LIGHT), ghost: t.textTertiary };

  /* The point a composer is open on, so the reader keeps their place while the
     sheet covers the trace. */
  const pendingMark = pending
    ? { lead: pending.lead, sampleIndex: pending.sampleIndex }
    : editing && editing.lead
      ? { lead: editing.lead as LimbLeadName, sampleIndex: editing.sampleIndex }
      : null;

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
      {!fullscreen && (
        <ToolToggle
          dense={dense}
          label={tr('vtFullscreen')}
          icon="expand-outline"
          active={false}
          onToggle={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFullscreen(true);
          }}
        />
      )}
    </>
  );

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

  /* The live caliper readout. Rendered in the CHROME, above the paper — never
     floating on the trace, where it covers the deflections whose distance it
     is reporting. */
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

  /* The comparison status line doubles as the way INTO moving the ghost. It
     was only reachable through two levels of the ⋯ sheet, which is why
     "compare" read as a feature with no way to use it. */
  const compareStatus =
    overlayActive && overlay ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr('ovDragHandle')}
        onPress={() => pickMode('ghost')}
        style={({ pressed }) => [styles.compareRow, rtl && styles.rowRtl, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons
          name="move"
          size={13}
          color={mode === 'ghost' ? t.accentLive : t.textSecondary}
        />
        <Text
          style={[styles.hint, { color: mode === 'ghost' ? t.accentLive : t.textSecondary }]}
          numberOfLines={1}
        >
          {tr('ovComparing', { when: fmtWhen(overlay.recordedAt) })} ·{' '}
          {overlay.mode === 'warp'
            ? overlay.degraded
              ? tr('ovWarpFailed')
              : tr('ovWarpApplied', { n: String(overlay.anchorCount) })
            : tr('ovShifted', { ms: String(Math.round(overlay.shiftMs)) })}
        </Text>
      </Pressable>
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
        pending={pendingMark}
        lockedCursorsSec={lockedCursorsSec}
        mode={mode}
        calipers={calipers}
        palette={palette}
        ghostHandleLabel={tr('ovDragHandle')}
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
     The bar is IN FLOW above the sheet — it never covers a trace — and the
     whole screen is inset for the safe area, because in landscape the notch
     is on a SIDE and a full-bleed sheet hides the first ~50 pt of every lead. */
  if (fullscreen) {
    return (
      <View
        style={[
          styles.root,
          {
            backgroundColor: t.bg,
            paddingTop: Math.max(insets.top, 6),
            paddingBottom: Math.max(insets.bottom, 6),
            paddingLeft: Math.max(insets.left, 8),
            paddingRight: Math.max(insets.right, 8),
          },
        ]}
      >
        <View style={[styles.fsBar, rtl && styles.rowRtl]}>
          {/* The way out, first and unmistakable. Full screen had no exit of
              its own — only the toolbar's contract icon, which nobody found. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('vtExitFullscreen')}
            hitSlop={8}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFullscreen(false);
            }}
            style={({ pressed }) => [
              styles.fsExit,
              { backgroundColor: t.brandNavy, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Ionicons name="contract-outline" size={17} color={dark ? t.bg : '#FFFFFF'} />
            <Text
              style={[styles.fsExitText, { color: dark ? t.bg : '#FFFFFF' }]}
              allowFontScaling={false}
            >
              {tr('vtExitFullscreen')}
            </Text>
          </Pressable>

          <View style={styles.fsTools}>{tools(true)}</View>
          <View style={styles.fsZoom}>{zoomControls(true)}</View>
        </View>

        {/* One line under the bar, still outside the paper. */}
        {(caliperReadout || hintKey || compareStatus) && (
          <View style={styles.fsStatus}>{caliperReadout ?? compareStatus ?? (
            hintKey ? (
              <Text style={[styles.hint, { color: t.textSecondary }]} numberOfLines={1}>
                {tr(hintKey)}
              </Text>
            ) : null
          )}</View>
        )}

        <View style={[styles.fsSheet, { borderColor: t.border }]}>
          {reviewSheet ?? (
            <View style={styles.centre}>
              <Text style={[styles.centreText, { color: t.textSecondary }]}>
                {tr('histEmptyWaveform')}
              </Text>
            </View>
          )}
        </View>

        {sheets}
      </View>
    );
  }

  /* ══════════ PORTRAIT ══════════ */
  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      {/* Content FIRST in the tree, so the glass header paints over it. */}
      {detail.isLoading && (
        <View style={[styles.centre, { paddingTop: headerH }]}>
          <ActivityIndicator color={t.brandNavy} />
          <Text style={[styles.centreText, { color: t.textSecondary }]}>{tr('histLoading')}</Text>
        </View>
      )}

      {!detail.isLoading && !view && (
        <View style={[styles.centre, { paddingTop: headerH }]}>
          <Text style={[styles.centreText, { color: t.textSecondary }]}>
            {detail.isError ? tr('histLoadError') : tr('histEmptyWaveform')}
          </Text>
        </View>
      )}

      {view && recording && tab === 'waveform' && (
        <View style={[styles.flex, { paddingTop: headerH }]}>
          {banner && (
            <Text style={[styles.banner, { color: t.danger, backgroundColor: t.dangerSoft }]}>
              {banner}
            </Text>
          )}

          <View style={[styles.toolbar, rtl && styles.rowRtl]}>{tools(false)}</View>

          {/* ONE fixed-height slot. The caliper readout SHARES it rather than
              adding a row, so the trace's height never depends on which tool
              is on. */}
          <View style={styles.statusRow}>
            {caliperReadout ??
              compareStatus ??
              (hasFiltersOff(settings) ? (
                <Text style={[styles.warn, { color: t.danger }]} numberOfLines={1}>
                  {tr('vtFiltersOff')}
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
                <Text style={[styles.fitText, { color: t.brandNavy }]}>{tr('vtLayoutStack')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {view && recording && tab === 'measurements' && (
        /* Full-height scroll with the header's height as top padding: the
           measurements pass UNDER the glass rather than starting below it,
           which is the whole point of the material. */
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.analysis,
            { paddingTop: headerH + 14, paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
          scrollEventThrottle={32}
          onScroll={onAnalysisScroll}
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
            <View style={[styles.annList, { backgroundColor: t.surface, borderColor: t.border }]}>
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

      {/* ── The glass header, over everything ── */}
      <GlassSurface
        dark={dark}
        fallbackTint={dark ? 'rgba(19, 27, 44, 0.72)' : 'rgba(255, 255, 255, 0.74)'}
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            paddingLeft: Math.max(insets.left, 0),
            paddingRight: Math.max(insets.right, 0),
            /* The edge appears only once something is behind it. A hairline
               drawn over an unscrolled page is a boundary between nothing and
               nothing. */
            borderBottomColor: scrolled ? t.border : 'transparent',
          },
        ]}
      >
        <View
          onLayout={(e: LayoutChangeEvent) => {
            /* The measured View is INSIDE the glass, so the bar's own padding
               has to be added back: without it the content sits ~34 pt too
               high and the first section hides behind the tabs. */
            const h = e.nativeEvent.layout.height + insets.top + HEADER_PAD_BOTTOM;
            setHeaderH((prev) => (Math.abs(prev - h) < 0.5 ? prev : h));
          }}
        >
          <View style={[styles.navRow, rtl && styles.rowRtl]}>
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

            {/* The date IS the switcher, exactly as on the web. */}
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

          {view && recording && (
            <>
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
                  <Text
                    style={[styles.simChip, { color: t.danger, backgroundColor: t.dangerSoft }]}
                  >
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
            </>
          )}
        </View>
      </GlassSurface>

      {sheets}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  rowRtl: { flexDirection: 'row-reverse' },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, height: 42 },
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
  statusRow: { height: 28, justifyContent: 'center', paddingHorizontal: 14 },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hint: { flexShrink: 1, fontSize: 11 },
  warn: { fontSize: 11, fontWeight: '700' },

  sheet: {
    flex: 1,
    marginHorizontal: 10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },

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
    minWidth: 74,
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
  fsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 5,
  },
  fsExit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: RADIUS.sm,
  },
  fsExitText: { fontSize: 12.5, fontWeight: '700' },
  fsTools: { flexDirection: 'row', gap: 6 },
  fsZoom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fsStatus: { height: 22, justifyContent: 'center', alignItems: 'center', paddingBottom: 3 },
  fsSheet: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: RADIUS.sm, overflow: 'hidden' },

  analysis: { paddingHorizontal: 16, gap: 14 },
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

// v3.0.0 — The header is a GLASS bar the measurements scroll under, earning its
//          edge only once something is behind it. Full screen puts its bar IN
//          FLOW and insets the whole screen, so neither the bar nor the notch
//          covers a trace, and carries its own labelled way out. The comparison
//          status line is now the way in to moving the ghost.
