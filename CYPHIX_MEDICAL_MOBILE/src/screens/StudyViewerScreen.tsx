/* ==================================================================
   StudyViewerScreen — open one stored recording and read it.
   The mobile counterpart of the web `ScanHistoryPage` + `EcgViewer`.

   ══ WHY THIS IS A ROUTE AND NOT A PANEL ══
   The web reads a study in a two-column layout: the trace on the left, the
   measurements beside it, the list one click away in the sidebar. A phone
   has one column, so those three things become a LIST SCREEN and a STUDY
   SCREEN, and the measurements move behind the second tab of the study —
   the same split the end-of-exam report already uses, so a reader meets one
   idea of "waveform | measurements" in both places.

   ══ THE PAGE OWNS FETCHING ══
   Components below take data as props (web CLAUDE.md §3.2). This screen
   holds the cheap metadata list and the full waveform for the ONE selected
   recording, so no viewer component knows the API exists.

   ══ THE TOOLS ARE MODES, AND ONLY ONE IS ON ══
   A finger cannot hover and there is only one of it, so turning a tool on
   turns the others off. Every switch also closes any open composer: leaving
   a sheet up in a mode that no longer owns it is how a tap ends up doing
   something the reader did not ask for.
   ================================================================== */

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import AnnotationComposer from '@/components/molecules/AnnotationComposer';
import ActionSheet, { type ActionSheetItem } from '@/components/molecules/ActionSheet';
import ClinicalNote from '@/components/molecules/ClinicalNote';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import { ECG_PAPER_DARK, ECG_PAPER_LIGHT } from '@/components/molecules/EcgStripSvg';
import SegmentedTabs from '@/components/molecules/SegmentedTabs';
import ToolToggle from '@/components/atoms/ToolToggle';
import EcgAnalysisSheet, { REGULARITY_KEY } from '@/components/organisms/EcgAnalysisSheet';
import EcgReviewSheet, {
  CURSOR_HIT_MM,
  type ViewerMode,
} from '@/components/organisms/EcgReviewSheet';
import { usePermissions } from '@/features/auth/useCurrentUser';
import { useAnnotations } from '@/features/history/hooks/useAnnotations';
import { useCalipers } from '@/features/history/hooks/useCalipers';
import { useOverlayRecording, type OverlayAlignMode } from '@/features/history/hooks/useOverlayRecording';
import { useRecordingNote } from '@/features/history/hooks/useRecordingNote';
import { useRecordingView } from '@/features/history/hooks/useRecordingView';
import { useViewerFeatures } from '@/features/history/useViewerFeatures';
import {
  DEFAULT_VIEWER_SETTINGS,
  hasFiltersOff,
  MAX_WINDOW_MM,
  MIN_WINDOW_MM,
  SINGLE_STRIP_HEIGHT_MM,
  STRIP_HEIGHT_MM,
  type ViewerSettings,
} from '@/features/history/viewerSettings';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
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
import { CAL_WIDTH_MM } from '@/components/molecules/EcgReviewStrip';

type Tab = 'waveform' | 'measurements';
type ViewerRoute = RouteProp<{ StudyViewer: { id: string } }, 'StudyViewer'>;

/** One zoom step. 0.65 is roughly the web's 0.6, softened for a tap. */
const ZOOM_STEP = 0.65;

export default function StudyViewerScreen() {
  const t = useTheme();
  const dark = useIsDark();
  const { t: tr, lang, rtl } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<ViewerRoute>();
  const user = useCurrentUser();
  const { can } = usePermissions();
  const features = useViewerFeatures();

  const [selectedId, setSelectedId] = useState(route.params.id);
  const [tab, setTab] = useState<Tab>('waveform');
  const [settings, setSettings] = useState<ViewerSettings>(DEFAULT_VIEWER_SETTINGS);
  const [mode, setMode] = useState<ViewerMode>('read');
  const [lockedCursorsSec, setLockedCursorsSec] = useState<number[]>([]);
  const [alignMode, setAlignMode] = useState<OverlayAlignMode>('warp');
  const [manualShift, setManualShift] = useState(0);
  const [ghostOffsetMm, setGhostOffsetMm] = useState(0);
  const [pending, setPending] = useState<{ lead: LimbLeadName; sampleIndex: number; timeSec: number } | null>(null);
  const [editing, setEditing] = useState<RecordingAnnotation | null>(null);
  const [sheet, setSheet] = useState<'none' | 'actions' | 'studies' | 'compare'>('none');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

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

  /* One audit entry per study OPENED, not per render. Keyed on the id alone
     — `recording` is a fresh object on every RTK Query render, and depending
     on it would write a read entry several times for one reading. */
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

  // Reset the manual nudges whenever the comparison or its mode changes, so a
  // fresh alignment does not inherit the previous drag.
  useEffect(() => {
    setManualShift(0);
    setGhostOffsetMm(0);
  }, [settings.overlayId, alignMode]);

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

  const paperMm = CAL_WIDTH_MM + (view?.durationSec ?? 0) * STANDARD_MM_PER_SEC;
  const windowMm = Math.min(settings.windowMm, Math.max(MIN_WINDOW_MM, paperMm));

  const calipers = useCalipers(
    {
      mmPerSec: STANDARD_MM_PER_SEC,
      mmPerMv: 10,
      xOffsetMm: CAL_WIDTH_MM,
      baselineMm: stripHeightMm / 2,
    },
    { minXMm: 0, maxXMm: paperMm, minYMm: 0, maxYMm: stripHeightMm },
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

  const zoom = (factor: number) =>
    setSettings((s) => ({
      ...s,
      windowMm: Math.min(
        Math.max(MIN_WINDOW_MM, s.windowMm * factor),
        Math.min(MAX_WINDOW_MM, Math.max(MIN_WINDOW_MM, paperMm)),
      ),
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

  /* ── Exports. The audit entry is written whatever the share sheet does
     next: the data left this app the moment the file was created. ── */
  const exportAudit = (detailText: string, ok = true) =>
    logAudit({
      actor,
      action: 'recording:export',
      resourceType: 'EcgRecording',
      resourceId: recording?.id,
      outcome: ok ? 'success' : 'failure',
      detail: detailText,
    });

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

  const compareItems: ActionSheetItem[] = [
    {
      id: 'none',
      label: tr('ovNone'),
      icon: 'close-circle-outline' as const,
      onSelect: () => patch({ overlayId: null }),
    },
    ...(list.data ?? [])
      .filter((r) => r.id !== selectedId)
      .map((r) => ({
        id: r.id,
        label: fmtWhen(r.recordedAt),
        hint: `${r.summary.bpm ?? '—'} ${tr('bpm')}`,
        icon: 'layers-outline' as const,
        onSelect: () => patch({ overlayId: r.id }),
      })),
  ];

  /* ── Render ── */
  const align = rtl ? ('right' as const) : ('left' as const);
  const visibleSec = Math.max(0, (windowMm - CAL_WIDTH_MM) / STANDARD_MM_PER_SEC);
  const zoomedIn = view != null && windowMm < paperMm - 0.5;

  const hintKey: TranslationKey | null =
    mode === 'calipers'
      ? 'calHintTouch'
      : mode === 'mark'
        ? 'annHintTouch'
        : mode === 'cursor'
          ? 'curHintTouch'
          : mode === 'ghost'
            ? 'ovDragHint'
            : null;

  return (
    <View style={[styles.root, { backgroundColor: t.bg, paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={[styles.header, rtl && styles.rowRtl]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('back')}
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
          hitSlop={8}
        >
          <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={26} color={t.textPrimary} />
        </Pressable>

        {/* The date IS the switcher, exactly as on the web: tapping the study
            you are reading opens the list of the others. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('histSelectOne')}
          onPress={() => setSheet('studies')}
          style={styles.titleBtn}
        >
          <Text
            style={[styles.title, { color: t.brandNavy, textAlign: 'center' }]}
            numberOfLines={1}
          >
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
          {/* ── Rate + rhythm, once, above everything ── */}
          <View style={[styles.headline, rtl && styles.rowRtl]}>
            <Text style={[styles.bpm, { color: t.textPrimary }]} allowFontScaling={false}>
              {view.analysis.rate.bpm ?? '—'}
              <Text style={[styles.bpmUnit, { color: t.textTertiary }]}> {tr('bpm')}</Text>
            </Text>
            <Text style={[styles.rhythm, { color: t.textSecondary }]} numberOfLines={1}>
              {tr(REGULARITY_KEY[view.analysis.rate.regularity])}
            </Text>
            {recording.isSimulated && (
              <Text style={[styles.simChip, { color: t.danger, backgroundColor: t.dangerSoft }]}>
                {tr('histSimulated')}
              </Text>
            )}
          </View>
          <Text style={[styles.meta, { color: t.textTertiary, textAlign: align }]} numberOfLines={1}>
            {tr('reportLeadSetShort')} · {recording.durationSec.toFixed(1)}s · {recording.sampleRate} Hz
            {recording.deviceLabel ? ` · ${recording.deviceLabel}` : ''}
          </Text>

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
              {/* ── Tools. Scrolls sideways rather than wrapping: a wrapped
                  toolbar changes height when a tool is gated off, and that
                  moves the trace under the reader's thumb. ── */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.toolbar}
              >
                {features.has('calipers') && (
                  <ToolToggle
                    label={tr('vtCalipers')}
                    hint={tr('vtCalipersHintTouch')}
                    icon="resize-outline"
                    active={mode === 'calipers'}
                    onToggle={() => pickMode('calipers')}
                  />
                )}
                {features.has('annotate') && (
                  <ToolToggle
                    label={tr('vtMark')}
                    hint={tr('vtMarkHintTouch')}
                    icon="pricetag-outline"
                    active={mode === 'mark'}
                    onToggle={() => pickMode('mark')}
                  />
                )}
                <ToolToggle
                  label={tr('vtCursor')}
                  hint={tr('vtCursorHintTouch')}
                  icon="git-compare-outline"
                  active={mode === 'cursor'}
                  onToggle={() => pickMode('cursor')}
                />
                <ToolToggle
                  label={tr('vtRPeaks')}
                  hint={tr('vtRPeaksHint')}
                  icon="analytics-outline"
                  active={settings.showRPeaks}
                  onToggle={() => patch({ showRPeaks: !settings.showRPeaks })}
                />
                {features.has('compare') && (list.data ?? []).length > 1 && (
                  <ToolToggle
                    label={tr('vtCompare')}
                    icon="layers-outline"
                    active={overlayActive}
                    onToggle={() => setSheet('compare')}
                  />
                )}
                {overlayActive && (
                  <>
                    <ToolToggle
                      label={tr('ovModeBeat')}
                      hint={tr('ovModeBeatHint')}
                      active={alignMode === 'beat'}
                      onToggle={() => setAlignMode('beat')}
                    />
                    <ToolToggle
                      label={tr('ovModeWarp')}
                      hint={tr('ovModeWarpHint')}
                      active={alignMode === 'warp'}
                      onToggle={() => setAlignMode('warp')}
                    />
                    <ToolToggle
                      label={tr('ovModeManual')}
                      hint={tr('ovModeManualHint')}
                      icon="move-outline"
                      active={mode === 'ghost'}
                      onToggle={() => {
                        setAlignMode('manual');
                        pickMode('ghost');
                      }}
                    />
                  </>
                )}
                {features.has('filters') && (
                  <>
                    <ToolToggle
                      label={tr('vtBaseline')}
                      hint={tr('vtBaselineHint')}
                      active={settings.filters.baseline}
                      onToggle={() =>
                        patch({ filters: { ...settings.filters, baseline: !settings.filters.baseline } })
                      }
                    />
                    <ToolToggle
                      label={tr('vtNotch')}
                      hint={tr('vtNotchHint')}
                      active={settings.filters.notch}
                      onToggle={() =>
                        patch({ filters: { ...settings.filters, notch: !settings.filters.notch } })
                      }
                    />
                    <ToolToggle
                      label={tr('vtSmooth')}
                      hint={tr('vtSmoothHint')}
                      active={settings.filters.smoothing}
                      onToggle={() =>
                        patch({ filters: { ...settings.filters, smoothing: !settings.filters.smoothing } })
                      }
                    />
                  </>
                )}
              </ScrollView>

              {/* Status lines stay ONE line each and never claim the trace's
                  space. Ellipsised, never wrapped — a toolbar hint that grows
                  to two lines shortens every waveform below it. */}
              {hasFiltersOff(settings) && (
                <Text style={[styles.warn, { color: t.danger }]} numberOfLines={1}>
                  {tr('vtFiltersOff')}
                </Text>
              )}
              {overlayActive && overlay && (
                <Text style={[styles.hint, { color: t.textSecondary }]} numberOfLines={1}>
                  {tr('ovComparing', { when: fmtWhen(overlay.recordedAt) })} ·{' '}
                  {overlay.mode === 'warp'
                    ? overlay.degraded
                      ? tr('ovWarpFailed')
                      : tr('ovWarpApplied', { n: String(overlay.anchorCount) })
                    : tr('ovShifted', { ms: String(Math.round(overlay.shiftMs)) })}
                </Text>
              )}
              {hintKey && (
                <Text style={[styles.hint, { color: t.textSecondary }]} numberOfLines={1}>
                  {tr(hintKey)}
                </Text>
              )}

              <View style={[styles.sheet, { borderColor: t.border, backgroundColor: t.surface }]}>
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
                  palette={{
                    ...(dark ? ECG_PAPER_DARK : ECG_PAPER_LIGHT),
                    ghost: t.textTertiary,
                  }}
                  caliperLabels={{ ms: 'ms', bpm: tr('bpm'), mv: 'mV' }}
                  onTapLead={focusLead}
                  onTapPoint={(lead, sampleIndex, timeSec) =>
                    setPending({ lead, sampleIndex, timeSec })
                  }
                  onTapAnnotation={setEditing}
                  onDropCursor={dropCursor}
                  onMoveCursor={moveCursor}
                  onMoveAnnotation={(annotation, sampleIndex) =>
                    annotations.move({ recordingId: recording.id, annotation, sampleIndex })
                  }
                  onGhostDrag={onGhostDrag}
                />
              </View>

              {/* ── Zoom. The readout says how many SECONDS are on screen,
                  because the scale never changes — a percentage would be a
                  number with no clinical meaning. ── */}
              <View
                style={[styles.zoomBar, rtl && styles.rowRtl, { paddingBottom: Math.max(insets.bottom, 10) }]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tr('vtZoomOut')}
                  disabled={!zoomedIn}
                  onPress={() => zoom(1 / ZOOM_STEP)}
                  style={({ pressed }) => [
                    styles.zoomBtn,
                    { borderColor: t.border, opacity: !zoomedIn ? 0.35 : pressed ? 0.6 : 1 },
                  ]}
                >
                  <Ionicons name="remove" size={20} color={t.textPrimary} />
                </Pressable>

                <Text style={[styles.zoomText, { color: t.textSecondary }]} allowFontScaling={false}>
                  {visibleSec >= view.durationSec - 0.05
                    ? `${view.durationSec.toFixed(1)}s`
                    : `${visibleSec.toFixed(1)}s / ${view.durationSec.toFixed(1)}s`}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tr('vtZoomIn')}
                  disabled={windowMm <= MIN_WINDOW_MM + 0.5}
                  onPress={() => zoom(ZOOM_STEP)}
                  style={({ pressed }) => [
                    styles.zoomBtn,
                    {
                      borderColor: t.border,
                      opacity: windowMm <= MIN_WINDOW_MM + 0.5 ? 0.35 : pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <Ionicons name="add" size={20} color={t.textPrimary} />
                </Pressable>

                {zoomedIn && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => patch({ windowMm: Math.min(MAX_WINDOW_MM, paperMm) })}
                    style={({ pressed }) => [styles.fitBtn, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Text style={[styles.fitText, { color: t.brandNavy }]}>{tr('vtFit')}</Text>
                  </Pressable>
                )}

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
        </>
      )}

      {/* ── Sheets & dialogs ── */}
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
        visible={sheet === 'compare'}
        title={tr('vtCompare')}
        items={compareItems}
        cancelLabel={tr('annCancel')}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  rowRtl: { flexDirection: 'row-reverse' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  title: { flexShrink: 1, fontSize: 16, fontWeight: '700' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 30 },
  centreText: { fontSize: 14.5, textAlign: 'center', lineHeight: 21 },

  headline: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingHorizontal: 16 },
  bpm: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bpmUnit: { fontSize: 12, fontWeight: '700' },
  rhythm: { flexShrink: 1, fontSize: 14, fontWeight: '600' },
  simChip: {
    flexShrink: 0,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  meta: { paddingHorizontal: 16, fontSize: 11.5, fontVariant: ['tabular-nums'] },
  tabs: { paddingHorizontal: 16, paddingTop: 10 },
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 9,
    borderRadius: RADIUS.sm,
    fontSize: 12.5,
    fontWeight: '600',
  },

  toolbar: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  hint: { paddingHorizontal: 16, paddingBottom: 5, fontSize: 11.5 },
  warn: { paddingHorizontal: 16, paddingBottom: 5, fontSize: 11.5, fontWeight: '700' },

  sheet: {
    flex: 1,
    marginHorizontal: 12,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  zoomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  zoomBtn: {
    width: 44,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: { minWidth: 108, textAlign: 'center', fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  fitBtn: { paddingHorizontal: 12, paddingVertical: 11 },
  fitText: { fontSize: 13.5, fontWeight: '700' },

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

// v1.0.0 — The mobile study viewer: waveform + measurements behind one
//          segmented control, modal touch tools, exports through the share
//          sheet, and every RBAC gate the web viewer has.
