/* ==================================================================
   HistoryScreen — every stored recording, newest first.

   ══ THE LIST IS THE SCREEN ══
   On the web this module is a two-column reading view with the studies
   tucked into a sidebar and a date dropdown. A phone cannot show a list and
   a waveform at once and should not try: choosing WHICH study to read and
   READING it are two different jobs, so they are two screens. This one
   answers "what do I have, and is it worth opening" from the cached summary
   the list already carries — no waveform is decoded to draw it.

   History stays doctor-dense (the CYPHIX UX direction): it is the one
   patient-facing tab that is allowed to be a list of records rather than
   one big button.

   ══ TWO TABS: STUDIES · INSIGHTS ══
   The list answers "what do I have". It cannot answer "has anything
   changed", because that question is about all the studies at once and a
   list is a thing you read one row at a time. INSIGHTS is that second
   view: the patient's ECG ID — a representative beat fused from every
   good study — with every study scored against it.

   They are TABS of one module rather than two dock destinations on
   purpose. Both are about the same set of records, the dock is already
   five items wide, and the reader moves between them constantly: flag on
   the Insights side → open the study → back. A segmented control at the
   top is one thumb-width away; a sixth dock item would be a different
   place to go.

   The control sits UNDER the title, not beside it: it belongs to History,
   and a switch level with a heading reads as a switch for the screen.

   ══ THE HEADER IS GLASS, AND THE PAGE GOES UNDER IT ══
   The title, the count and the tab switch sit on a frosted bar pinned to
   the top, and the list scrolls BEHIND it — the same material and the
   same rules as the study viewer's header and the dock. Two consequences
   worth knowing before editing this file:

     · the bar is absolutely positioned, so its height is not part of the
       layout. Every scroller therefore carries `headerH` on its CONTENT
       inset (`PatientShell.bleedTop` explains the third axis of this),
       and that height is MEASURED, because the bar grows a count line, a
       progress clause, a tab row and an error banner depending on state.
     · anything that would sit "between the header and the list" has to
       go INSIDE the glass instead. A sibling gets pushed down by the
       clearance and then the list pads for the header again below it.

   ══ THIS SCREEN OWNS FETCHING ══
   Cards take data as props. Storage, RBAC and audit live behind hooks.
   `EcgIdentityPanel` owns its own — it needs the WAVEFORMS, which this
   list deliberately never loads.
   ================================================================== */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseEcgCsv, type RecordingListItem } from '@cyphix/shared';
import FadeUpView from '@/components/atoms/Auth/FadeUpView';
import GlassSurface, { IS_LIQUID_GLASS } from '@/components/atoms/GlassSurface';
import HistorySkeleton from '@/components/molecules/HistorySkeleton';
import SegmentedTabs from '@/components/molecules/SegmentedTabs';
import StudyCard from '@/components/molecules/StudyCard';
import EcgIdentityPanel from '@/components/organisms/EcgIdentityPanel';
import PatientShell, { shellPaddingH } from '@/components/templates/PatientShell';
import { usePermissions, useCurrentUser } from '@/features/auth/useCurrentUser';
import { SELF_SUBJECT } from '@/features/history/hooks/useSaveRecording';
import { useStudyDigests } from '@/features/history/hooks/useStudyDigests';
import { useViewerFeatures } from '@/features/history/useViewerFeatures';
import { useSync } from '@/features/sync/useSync';
import { useTranslation } from '@/i18n/useTranslation';
import { logAudit } from '@/services/audit/auditLogger';
import {
  HISTORY_PAGE_SIZE,
  useCreateRecordingMutation,
  useListRecordingsQuery,
} from '@/services/api/endpoints/recordingApi';
import { dockFootprint } from '@/navigation/dockMetrics';
import { RADIUS } from '@/theme/tokens';
import { useIsDark, useTheme } from '@/theme/useTheme';

/** The glass bar's own bottom padding, added back when measuring it. */
const HEADER_PAD_BOTTOM = 12;
/** Points of scroll before the header earns its edge. Below this nothing is
    behind it yet and a hairline would divide nothing from nothing. */
const HEADER_SHADOW_AT = 6;
/**
 * ★ Air between the glass and the first card.
 *
 * `paddingTop: headerH` alone parks the newest study hard against the bar —
 * reported, and right: the one row a reader looks at first was the one row
 * with no room to breathe. The gap is the resting position only; the card
 * still travels under the glass as soon as the list moves.
 */
const CONTENT_TOP_GAP = 14;

/* ── The header's height BEFORE it has been measured ──
   It is measured (`onLayout`) because it grows a count line, a progress
   clause, a tab row and an error banner — but the first frame paints
   before any measurement exists, and a flat constant there was wrong by
   ~35 pt on a notched phone, which is a visible jolt as the list drops
   into place. These are the same blocks the bar is built from, so the
   estimate lands within a point or two and the correction is invisible. */
const EST_TITLE = 36;
const EST_COUNT = 20;
const EST_TABS = 56;

function estimateHeaderH(safeTop: number, withCount: boolean, withTabs: boolean): number {
  return (
    safeTop + 6 + EST_TITLE + (withCount ? EST_COUNT : 0) + (withTabs ? EST_TABS : 0) + HEADER_PAD_BOTTOM
  );
}

export default function HistoryScreen() {
  const t = useTheme();
  const dark = useIsDark();
  const { t: tr, lang, rtl } = useTranslation();
  const navigation = useNavigation<{ navigate: (screen: string, params: object) => void }>();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const user = useCurrentUser();
  const { can } = usePermissions();
  const features = useViewerFeatures();
  const sync = useSync();
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [tab, setTab] = useState<'studies' | 'insights'>('studies');
  /** Insights is mounted on its first visit and never unmounted after — the
      panel is kept alive so returning to Studies is not a rebuild. */
  const [insightsSeen, setInsightsSeen] = useState(false);
  const selectTab = useCallback((next: 'studies' | 'insights') => {
    if (next === 'insights') setInsightsSeen(true);
    setTab(next);
  }, []);

  /* A patient sees only their own studies — as the QUERY ARGUMENT, never as
     client-side filtering, so the server can enforce it unchanged. */
  const selfOnly = !can('history:read') && can('history:read:self');
  const subject = selfOnly ? (user?.linkedPatientId ?? 'MOCK-SELF') : undefined;
  const list = useListRecordingsQuery({ patientId: subject, limit: HISTORY_PAGE_SIZE });
  const [createRecording] = useCreateRecordingMutation();

  /* Verdicts + previews, computed once per study and cached on device —
     the list itself still never decodes a waveform. */
  const { digests, progress: digesting } = useStudyDigests(list.data);

  /* Rows animate in only on the screen's first landing. Digest updates and
     refetches re-render the same mounted rows (same keys), so they never
     re-stagger; rows mounted later by scrolling animate briefly, capped. */
  const mountedAt = useRef(Date.now());

  /* ── The frosted header's own state ──
     Its height is MEASURED rather than assumed: it carries a title, an
     optional count line that grows a progress clause, and tabs that only
     exist once there are studies, so any constant here would be wrong in
     at least one of those states. `HEADER_H_GUESS` covers the first frame
     only — without it the first cards paint under the bar and jump. */
  const [measuredHeaderH, setMeasuredHeaderH] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  /* Only re-render when the header actually crosses the threshold — an
     onScroll that setStates every frame would re-render the whole list. */
  const onContentScroll = useCallback((offsetY: number) => {
    const past = offsetY > HEADER_SHADOW_AT;
    setScrolled((was) => (was === past ? was : past));
  }, []);

  /* ── Which rows have been LOOKED AT ──
     A trace sweeps on when its row reaches the screen, so the ids that
     have been visible have to be tracked. A ref plus a counter rather than
     a state Set: this is written from a scroll callback, and rebuilding a
     Set into state on every viewability event would re-render the list
     mid-flick. The counter only ticks when a row is seen for the FIRST
     time, so scrolling back over drawn rows costs nothing and — by
     design — does not re-draw them. */
  const drawnIds = useRef<Set<string>>(new Set());
  const [drawnCount, setDrawnCount] = useState(0);

  /* ⚠️ Both of these must be reference-stable for the lifetime of the
     list: React Native throws "Changing onViewableItemsChanged on the fly
     is not supported" if the prop identity changes between renders. */
  const viewabilityConfig = useRef({
    /* ★ 30 %, and low on purpose. There is no timer revealing a trace that
       was never reported visible — a timer drew rows off-screen and made
       them flash when reached (see `EcgMiniPreview`) — so this threshold is
       the ONLY thing that puts a waveform on the page. A row peeking in at
       the bottom of the screen must qualify, or it sits blank until the
       reader scrolls. */
    itemVisiblePercentThreshold: 30,
    minimumViewTime: 0,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { item?: RecordingListItem; isViewable: boolean }[] }) => {
      let discovered = false;
      for (const entry of viewableItems) {
        const id = entry.item?.id;
        if (!entry.isViewable || !id || drawnIds.current.has(id)) continue;
        drawnIds.current.add(id);
        discovered = true;
      }
      if (discovered) setDrawnCount((n) => n + 1);
    },
  ).current;

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

  /* ── Import an ECG recorded somewhere else ──
     The parser is the shared one, so this phone accepts and rejects exactly
     the files the web app does. It refuses rather than guesses: an assumed
     sample rate silently rescales every interval the viewer then reports. */
  const handleImport = async () => {
    setImportError(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'public.comma-separated-values-text', '*/*'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;

    const asset = picked.assets[0];
    setImporting(true);
    try {
      const text = await new File(asset.uri).text();
      const result = parseEcgCsv(text, asset.name);
      if (!result.ok) {
        setImportError(`${result.error.problem} — ${result.error.remedy}`);
        return;
      }
      const { leadI, leadII, sampleRate, sourceLabel } = result.data;
      const created = await createRecording({
        subject: user?.linkedPatientId ? `Patient/${user.linkedPatientId}` : SELF_SUBJECT,
        recordedAt: new Date().toISOString(),
        type: 'limb',
        sampleRate,
        rawLeadI: leadI,
        rawLeadII: leadII,
        isSimulated: false,
        // Provenance: nobody may later mistake this for something this
        // device measured. Not `isSimulated` — it is real data — but it did
        // not come from our hardware and the record has to say so.
        deviceLabel: `${tr('histImported')} · ${sourceLabel}`,
        summary: {
          bpm: null,
          sqi: 0,
          qrsMs: null,
          qtcMs: null,
          prMs: null,
          axisDegrees: null,
          beatsAnalyzed: 0,
          insufficient: false,
        },
      }).unwrap();
      logAudit({
        actor: { id: user?.id ?? 'anonymous', role: user?.role ?? 'guest' },
        action: 'recording:create',
        resourceType: 'EcgRecording',
        resourceId: created.id,
        detail: 'import',
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (created?.id) navigation.navigate('StudyViewer', { id: created.id });
    } catch {
      setImportError(tr('histImportFailed'));
    } finally {
      setImporting(false);
    }
  };

  const align = rtl ? ('right' as const) : ('left' as const);

  /* ── The header's material ──
     Denser than the dock's (0.38/0.55) and lighter than the study
     viewer's (0.74), for a reason on each side: this bar carries a 30 pt
     title that has to stay readable while cards pass under it, but it was
     asked for as "glass like the dock", and the dock is a small floating
     pill over a strip of page rather than a full-width bar over a list.
     Liquid Glass tints itself a little, so it takes the lower pair —
     the same split the dock makes, for the same v0.19.2 reason. */
  const headerTint = IS_LIQUID_GLASS
    ? dark
      ? 'rgba(19, 27, 44, 0.46)'
      : 'rgba(255, 255, 255, 0.50)'
    : dark
      ? 'rgba(19, 27, 44, 0.58)'
      : 'rgba(255, 255, 255, 0.64)';

  const empty = !list.data || list.data.length === 0;
  const showTabs = !list.isLoading && !list.isError && !empty;
  /* Which pane is on show. Not simply `tab`: the switch itself disappears
     while the list is loading, erroring or empty, and a stale `insights`
     would then hide BOTH panes and leave an empty screen. */
  const activeTab = showTabs ? tab : 'studies';
  /* The measurement once it exists, an estimate built from the same blocks
     until then — see `estimateHeaderH`. */
  const headerH = measuredHeaderH || estimateHeaderH(insets.top, !empty, showTabs);
  /** Where content actually starts: under the glass, plus air. */
  const contentTop = headerH + CONTENT_TOP_GAP;
  /* The padding the shell would have applied, now applied here — one
     number, from one function, so the header and the scroll content can
     never disagree about where the margin is. */
  const padH = shellPaddingH(insets);

  /* ⚠️ MEMOISED, and it is not a micro-optimisation: `StudyCard` is
     `memo`ised, and a labels object rebuilt every render would defeat the
     shallow compare for every row at once. */
  const cardLabels = useMemo(
    () => ({
      bpm: tr('bpm'),
      simulated: tr('histSimulated'),
      lowQuality: tr('histLowQuality'),
      notes: tr('histNotes'),
      hasNote: tr('noteTitle'),
      leadSet: tr('reportLeadSetShort'),
      verdictClear: tr('histVerdictClear'),
      verdictAttention: tr('histVerdictAttention'),
      verdictUrgent: tr('histVerdictUrgent'),
      verdictInconclusive: tr('histVerdictInconclusive'),
      previewA11y: tr('histPreviewA11y'),
    }),
    [tr],
  );

  /* One handler for every row, so no card is handed a fresh closure. */
  const openStudy = useCallback(
    (id: string) => {
      void Haptics.selectionAsync();
      navigation.navigate('StudyViewer', { id });
    },
    [navigation],
  );

  const renderCard = useCallback(
    ({ item, index }: { item: RecordingListItem; index: number }) => {
      const digest = digests[item.id];
      /* First-landing stagger only (see `mountedAt`). Capped so a row far
         down a fast scroll never waits noticeably. */
      const stagger = Date.now() - mountedAt.current < 900 ? Math.min(index, 8) * 45 : 0;
      return (
        <FadeUpView delay={stagger} duration={420} distance={10}>
          <StudyCard
            id={item.id}
            when={fmtWhen(item.recordedAt)}
            /* Imported CSVs store a null summary bpm; the digest measured one. */
            bpm={item.summary.bpm ?? digest?.bpm ?? null}
            durationSec={item.durationSec}
            sampleRate={item.sampleRate}
            isSimulated={item.isSimulated}
            insufficient={item.summary.insufficient}
            annotationCount={item.annotations.length}
            hasNote={Boolean(item.note && item.note.trim() !== '')}
            verdict={digest ? digest.screeningLevel : undefined}
            /* The digest's own array, never a wrapper object — see StudyCard. */
            previewSamples={digest?.previewSamples ?? null}
            previewSampleRate={digest?.previewSampleRate ?? 0}
            animate={drawnIds.current.has(item.id)}
            rtl={rtl}
            labels={cardLabels}
            onOpen={openStudy}
          />
        </FadeUpView>
      );
    },
    [digests, fmtWhen, rtl, cardLabels, openStudy],
  );

  return (
    /* Both tabs scroll, so the dock's clearance belongs on their content
       insets rather than on the shell's padding — otherwise the page ends
       at a hard edge and the strip the dock floats over is bare
       background, which reads as a grey bar wedged under the content and
       leaves the frosted bar with nothing to refract. */
    /* `bleedHorizontal`: the Insights signature has to reach the screen
       edge, and a negative margin cannot escape a ScrollView — it gets
       cut at the scroller's frame, which is what was clipping the trace
       and the lead label. So the SHELL drops its side padding and this
       screen applies the same `shellPaddingH` itself, per element. */
    /* `bleedTop`: the title and tabs now ride a frosted bar that the page
       passes UNDER, so the shell must not also push the content down —
       the header takes the safe area, and the scrollers take the header's
       measured height on their content inset. */
    <PatientShell scrollsUnderDock bleedHorizontal bleedTop>
      <View style={styles.root}>
        {/* ── ★ THE TABS HIDE EACH OTHER, THEY DO NOT REPLACE EACH OTHER ──
            Rendering one OR the other unmounts the list every time the
            reader looks at Insights, and a remount replays everything that
            makes a first paint expensive: every row's entrance animation,
            every visible trace's sweep, the scroll position. Reported as
            "a little flicker until it all comes up, every time I go back
            to Studies" — and it was, literally, the screen being built
            again. `display: none` keeps both alive; Yoga drops a hidden
            pane from layout, so nothing is measured or drawn for it.

            Insights is still MOUNTED LAZILY. It runs the identity backfill,
            which is real DSP over the whole history; paying for that on a
            tab the reader has not opened would be the opposite trade. */}
        <View style={[styles.pane, activeTab !== 'studies' && styles.paneHidden]}>
          {list.isLoading ? (
          <View style={{ paddingHorizontal: padH, paddingTop: contentTop }}>
            <HistorySkeleton />
          </View>
        ) : list.isError ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: t.surface,
                borderColor: t.border,
                marginHorizontal: padH,
                marginTop: contentTop,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: t.textPrimary, textAlign: align }]}>
              {tr('histTitle')}
            </Text>
            <Text style={[styles.body, { color: t.textSecondary, textAlign: align }]}>
              {tr('histLoadError')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void list.refetch()}
              style={({ pressed }) => [
                styles.retry,
                { borderColor: t.border, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.retryText, { color: t.textPrimary }]}>{tr('viewerRetry')}</Text>
            </Pressable>
          </View>
        ) : empty ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: t.surface,
                borderColor: t.border,
                marginHorizontal: padH,
                marginTop: contentTop,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: t.textPrimary, textAlign: align }]}>
              {tr('histEmptyTitle')}
            </Text>
            <Text style={[styles.body, { color: t.textSecondary, textAlign: align }]}>
              {tr('histEmpty')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={list.data}
            keyExtractor={(item) => item.id}
            renderItem={renderCard}
            /* Rows read `digests` and `drawnIds` from the closure; without
               this, a row already rendered would keep its placeholder after
               its digest lands — and would never learn it had been seen. */
            extraData={`${Object.keys(digests).length}:${drawnCount}`}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingHorizontal: padH,
                /* The frosted header's clearance, on the CONTENT — so cards
                   pass behind the glass instead of starting below it. The
                   dock's clearance below does the same job (PatientShell). */
                paddingTop: contentTop,
                paddingBottom: dockFootprint(insets.bottom, screenH),
              },
            ]}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={32}
            onScroll={(e) => onContentScroll(e.nativeEvent.contentOffset.y)}
            accessibilityLabel={tr('histListLabel')}
            refreshControl={
              <RefreshControl
                /* Pull-to-refresh runs the SYNC, not a refetch of this
                   query. Refetching would re-read one page of the list;
                   a sync also carries the studies deleted elsewhere and
                   the notes added on the web, and it ends by invalidating
                   the tag — so this list updates as a consequence. When
                   there is no backend there is nothing to sync and the
                   old refetch is still the honest gesture. */
                refreshing={sync.phase === 'syncing' || (list.isFetching && !list.isLoading)}
                onRefresh={() => void (sync.enabled ? sync.refresh() : list.refetch())}
                tintColor={t.textSecondary}
                /* ★ THE SPINNER LIVES UNDER THE GLASS WITHOUT THIS.
                   A refresh indicator is positioned at the top of the
                   SCROLL VIEW, and since v0.58.0 the top of the scroll
                   view is behind a frosted header ~180 pt tall — so it
                   span there, perfectly, invisibly. Reported as "there's
                   no refresh circle, it just looks stuck at a height and
                   then releases": the pull was holding, the work was
                   running, and the only thing missing was the one part
                   that says so.
                   Offset by the header's own height, so it appears in the
                   space the pull opens up rather than beneath the bar. */
                progressViewOffset={headerH}
              />
            }
          />
        )}
        </View>

        {/* Mounted on first visit and kept alive from then on. */}
        {insightsSeen && (
          <View style={[styles.pane, activeTab !== 'insights' && styles.paneHidden]}>
            <EcgIdentityPanel
              patientId={subject}
              paddingHorizontal={padH}
              paddingTop={contentTop}
              onScroll={onContentScroll}
              onOpenStudy={(id) => navigation.navigate('StudyViewer', { id })}
            />
          </View>
        )}

        {/* ── The frosted header, over everything ──
            Same material and the same behaviour as the study viewer's:
            the page travels underneath it, and the hairline appears only
            once something is actually behind it. It is drawn LAST so it
            sits above the list without needing a zIndex argument. */}
        <GlassSurface
          dark={dark}
          tint={headerTint}
          style={[
            styles.header,
            {
              paddingTop: insets.top + 6,
              paddingLeft: Math.max(insets.left, 0),
              paddingRight: Math.max(insets.right, 0),
              borderBottomColor: scrolled ? t.border : 'transparent',
            },
          ]}
        >
          <View
            onLayout={(e) => {
              /* The measured View is INSIDE the glass, so the bar's own
                 padding has to be added back — without it the first card
                 sits under the tabs (the study viewer paid for this one). */
              const h = e.nativeEvent.layout.height + insets.top + 6 + HEADER_PAD_BOTTOM;
              setMeasuredHeaderH((prev) => (Math.abs(prev - h) < 0.5 ? prev : h));
            }}
          >
            <View style={[styles.head, { paddingHorizontal: padH }, rtl && styles.rowRtl]}>
              <View style={styles.headText}>
                <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>
                  {tr('histTitle')}
                </Text>
                {!empty && (
                  <Text style={[styles.count, { color: t.textSecondary, textAlign: align }]}>
                    {tr('histCount', { n: String(list.data?.length ?? 0) })}
                    {selfOnly ? ` · ${tr('histOwnOnly')}` : ''}
                    {/* A visible backfill is a screen doing work; a list
                        quietly filling with verdicts is a screen that might
                        be broken. */}
                    {digesting
                      ? ` · ${tr('histDigestProgress', {
                          done: String(digesting.done),
                          total: String(digesting.total),
                        })}`
                      : ''}
                  </Text>
                )}
              </View>

              {/* Import lives on the LIST, not inside a study: it CREATES a
                  study, and an action that adds a row belongs where the rows
                  are. Hidden on Insights — nothing there is a row. */}
              {features.has('exportRaw') && activeTab === 'studies' && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tr('histImport')}
                  disabled={importing}
                  onPress={() => void handleImport()}
                  style={({ pressed }) => [
                    styles.importBtn,
                    {
                      backgroundColor: t.surface,
                      borderColor: t.border,
                      opacity: importing ? 0.4 : pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <Ionicons name="add" size={22} color={t.textPrimary} />
                </Pressable>
              )}
            </View>

            {/* The switch appears only once there is a second view worth
                switching to. Offering "Insights" over an empty history would
                promise a baseline that cannot exist yet. */}
            {showTabs && (
              <View style={{ paddingHorizontal: padH, paddingTop: 10 }}>
                <SegmentedTabs
                  options={[
                    { value: 'studies', label: tr('insTabStudies') },
                    { value: 'insights', label: tr('insTabInsights') },
                  ]}
                  value={tab}
                  onChange={selectTab}
                  accessibilityLabel={tr('histTitle')}
                />
              </View>
            )}

            {/* ★ INSIDE the glass, not below it. As a sibling of the list it
                would be pushed down by the header's clearance and then the
                list would pad for the header AGAIN underneath it, leaving a
                header-sized hole. In here it is part of what `onLayout`
                measures, so the list simply starts lower while it shows —
                and it belongs to the Import button either way. */}
            {importError && (
              <Text
                style={[
                  styles.error,
                  {
                    color: t.danger,
                    backgroundColor: t.dangerSoft,
                    marginHorizontal: padH,
                    marginTop: 10,
                  },
                ]}
              >
                {importError}
              </Text>
            )}
          </View>
        </GlassSurface>
      </View>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  /* No `gap`: the header floats above this box rather than sitting in it,
     so the only children are full-bleed scrollers. */
  root: { flex: 1 },
  pane: { flex: 1 },
  /* Yoga drops a `display: none` subtree from layout entirely — it is not
     measured and not drawn — so the inactive tab costs nothing while
     keeping its state, its scroll position and its animations. */
  paneHidden: { display: 'none' },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: HEADER_PAD_BOTTOM,
    borderBottomWidth: StyleSheet.hairlineWidth,
    /* The material must clip to its own box or the blur bleeds past the
       bar on Android. */
    overflow: 'hidden',
  },
  rowRtl: { flexDirection: 'row-reverse' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headText: { flex: 1, flexShrink: 1, gap: 2 },
  title: { fontSize: 30, fontWeight: '800' },
  count: { fontSize: 13 },
  importBtn: {
    flexShrink: 0,
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { padding: 11, borderRadius: RADIUS.sm, fontSize: 12.5, lineHeight: 18 },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 24, gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 14.5, lineHeight: 21 },
  retry: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  retryText: { fontSize: 14, fontWeight: '700' },
  listContent: { gap: 10, paddingBottom: 8 },
});

// v1.6.0 — The header is a frosted bar the page scrolls UNDER: title, count
//          and tabs on GlassSurface, measured rather than assumed (it grows a
//          progress clause, a tab row and an error banner), with the hairline
//          earned only once something is behind it. Both tabs report their
//          scroll for that.
// v1.5.0 — Tracks which rows have been SEEN (FlatList viewability) so each
//          trace sweeps on as it is scrolled to, once per visit. Kept in a ref
//          with a counter rather than state, so a flick does not rebuild a Set
//          into state on every frame.
// v1.4.0 — Kardia-style rows: each card carries its verdict pill and a 4 s
//          preview from the study digest cache (computed once per study, off
//          the render path, with visible progress), a first-landing stagger,
//          and imported rows borrow the digest's measured bpm.
// v1.3.0 — Both tabs take the dock's clearance on their own content inset, so
//          the page passes BEHIND the frosted bar instead of ending on a bare
//          strip above it.
// v1.2.0 — Two tabs: the list, and INSIGHTS (the ECG ID). The switch appears
//          only once there are studies, and Import hides on the tab where
//          nothing is a row.
// v1.1.0 — Pull-to-refresh runs the SYNC rather than refetching this one query,
//          so it also picks up studies deleted and notes written elsewhere.
// v1.0.0 — The History list: cached summaries as cards, pull to refresh, CSV
//          import, and a tap into the study viewer.
