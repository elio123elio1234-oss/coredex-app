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

   ⚠️ THIS FILE USED TO DESCRIBE TWO TABS (`Studies | Insights`) and argue
   at length for why they were a segmented control rather than two dock
   destinations. That argument lost in v0.59.0 — Insights became
   `InsightsScreen`, its own dock tab — and the paragraph describing it
   outlived it by eleven versions. It is deleted here rather than left to
   mislead the next reader; History is one list and has no sub-tab.

   ══ ★ v0.70.0 — THE HEADER IS NOT A BAR ANY MORE ══
   The title, the count and the Import button rode a frosted `GlassSurface`
   pinned to the top, with the list scrolling behind it. They are now the
   list's `ListHeaderComponent` — real content — and fade out as the page
   moves (`PageTitle`). Asked for as *"in Insights and History there is no
   need for a top bar; it can be part of the page and fade out as you
   scroll down."*

   The bar cost more than it gave. Because it was absolutely positioned,
   its height was not part of the layout, so it had to be MEASURED — it
   grows a count line, a progress clause and an error banner — and that
   measurement had to be carried on every scroller's content inset, with an
   `estimateHeaderH()` covering the first frame before any measurement
   existed and an `onLayout` adding the bar's own padding back by hand.
   Three numbers that had to agree, with no way of failing loudly when they
   did not, in service of restating the name of the tab the dock already
   highlights. All of it is gone, and so is the rule that anything sitting
   "between the header and the list" had to be moved INSIDE the glass.

   `bleedTop` stays: the shell must still not add top padding, because the
   title now carries the safe area itself.

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
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import { parseEcgCsv, type RecordingListItem } from '@cyphix/shared';
import FadeUpView from '@/components/atoms/Auth/FadeUpView';
import FailSoft from '@/components/atoms/FailSoft';
import ThinkingOrb from '@/components/atoms/ThinkingOrb';
import HistorySkeleton from '@/components/molecules/HistorySkeleton';
import PageTitle, { TITLE_FADE_DISTANCE } from '@/components/molecules/PageTitle';
import StudyCard from '@/components/molecules/StudyCard';
import PatientShell, { shellPaddingH } from '@/components/templates/PatientShell';
import { usePermissions, useCurrentUser } from '@/features/auth/useCurrentUser';
import { SELF_SUBJECT } from '@/features/history/hooks/useSaveRecording';
import { useStudyDigests } from '@/features/history/hooks/useStudyDigests';
import { useViewerFeatures } from '@/features/history/useViewerFeatures';
import { useSync } from '@/features/sync/useSync';
import { useReplayOnFocus } from '@/hooks/useReplayOnFocus';
import { useTranslation } from '@/i18n/useTranslation';
import { logAudit } from '@/services/audit/auditLogger';
import {
  HISTORY_PAGE_SIZE,
  useCreateRecordingMutation,
  useListRecordingsQuery,
} from '@/services/api/endpoints/recordingApi';
import { INTERPRETATION_ENABLED } from '@/config/featureFlags';
import { dockFootprint } from '@/navigation/dockMetrics';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * ★ Air between the title block and the first card.
 *
 * `paddingTop: headerH` alone used to park the newest study hard against
 * the bar — reported, and right: the one row a reader looks at first was
 * the one row with no room to breathe. It survives the bar's removal as the
 * title block's own bottom margin.
 */
const CONTENT_TOP_GAP = 14;

/** `styles.listContent`'s own `gap`. Named because the title block is one of
    the list's children and must subtract it rather than add a second gap. */
const LIST_GAP = 10;

export default function HistoryScreen() {
  const t = useTheme();
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
  /* A patient sees only their own studies — as the QUERY ARGUMENT, never as
     client-side filtering, so the server can enforce it unchanged. */
  const selfOnly = !can('history:read') && can('history:read:self');
  const subject = selfOnly ? (user?.linkedPatientId ?? 'MOCK-SELF') : undefined;
  const list = useListRecordingsQuery({ patientId: subject, limit: HISTORY_PAGE_SIZE });
  const [createRecording] = useCreateRecordingMutation();

  /* Verdicts + previews, computed once per study and cached on device —
     the list itself still never decodes a waveform. */
  const { digests, progress: digesting } = useStudyDigests(list.data);

  /* Rows cascade on ARRIVAL. Digest updates and refetches re-render the same
     mounted rows (same keys), so they never re-stagger; rows mounted later by
     scrolling animate briefly, capped.

     ★ v0.84.0 — "arrival" now means every visit, not the one mount. This was
     `useRef(Date.now())`, which is the same mistake `FadeUpView` had one level
     down: a tab screen mounts once and stays mounted, so the 900 ms window
     closed forever a second after the first landing and every later visit
     computed a stagger of 0. The rows would still have replayed — all at the
     same instant, which is the cheap version of the effect.

     STATE, not a ref, and that is the whole difficulty: `renderCard` is
     memoised, so unless something it depends on CHANGES, FlatList short-
     circuits and re-renders no rows at all — the new delays would never reach
     them. A ref mutated in an effect is invisible to that machinery.

     ⚠️ This one IS a render behind the focus, unlike `FadeUpView`'s own
     replay, which writes its shared value straight from the listener. So on a
     return visit each row starts its entrance with `delay: 0` and is restarted
     a frame later with its real stagger. Both restarts happen while the row is
     still at opacity 0, so the seam is invisible — and the alternative is
     computing the cascade before the screen knows it has been re-entered. */
  const [arrivedAt, setArrivedAt] = useState(() => Date.now());
  const markArrival = useCallback(() => setArrivedAt(Date.now()), []);
  useReplayOnFocus(markArrival);

  /* ── What the title block fades against ──
     A shared value, not state: it is written on every scroll event and read
     on the UI thread, so putting it in React would re-render the whole list
     per frame — which is exactly what the old `scrolled` threshold existed
     to avoid. */
  const scrollY = useSharedValue(0);
  /* The one thing that DOES need a re-render, and only twice per scroll, at
     the threshold: a faded-out Import button must stop being a target, and
     pointer events are not an animatable property. */
  const [titleGone, setTitleGone] = useState(false);

  const onContentScroll = useCallback(
    (offsetY: number) => {
      scrollY.value = offsetY;
      const gone = offsetY >= TITLE_FADE_DISTANCE;
      setTitleGone((was) => (was === gone ? was : gone));
    },
    [scrollY],
  );

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

  const empty = !list.data || list.data.length === 0;
  /** Where the title block starts: the safe area, which the shell no longer
      applies (`bleedTop`) because the title now owns it. */
  const contentTop = insets.top + 6;
  /* ══ TWO DIFFERENT FACTS, AND CONFLATING THEM WAS THE BUG ══
     "Work is happening" and "the patient ASKED for work to happen, with
     their finger, just now" used to be one expression, handed to both the
     RefreshControl and the badge. That is what put a gap at the top of
     this screen, and it is why only one of them survives.

     Why it matters so much on iOS: setting `refreshing` on a
     UIRefreshControl is not a request to draw a spinner, it is a request
     to ENTER the refreshing state — the scroll view's top inset grows by
     ~80 pt and the control draws its own indicator in the space that
     opens. During a real pull that is exactly right; the content is
     already held down by the finger. Off the back of a BACKGROUND sync it
     is a page that shoves itself down for no reason anyone can see, the
     title ends up 80 pt lower than it was, and it does not always come
     back — all three of which are in the report, with screenshots.

     So the control is driven by the gesture ALONE, and background work is
     silent on this screen. Silent is not unreported: the boot sync now
     runs inside the splash (`useBootWarmup`) where it is the thing the
     orb is for, and `ConnectionStrip` covers a session that cannot reach
     the server. What is gone is only the announcement of routine work
     over a page the patient is already reading. */
  const [pulling, setPulling] = useState(false);
  const onPull = useCallback(() => {
    setPulling(true);
    /* `Promise.resolve` because the two branches do not agree on a type:
       `sync.refresh()` is a promise and `list.refetch()` is a QueryAction
       thenable. Wrapping is what lets the badge end when the WORK ends
       rather than on a timer. */
    void Promise.resolve(sync.enabled ? sync.refresh() : list.refetch()).finally(() =>
      setPulling(false),
    );
  }, [sync, list]);
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
      /* On-arrival stagger only (see `arrivedAt`). Capped so a row far
         down a fast scroll never waits noticeably. */
      const stagger = Date.now() - arrivedAt < 900 ? Math.min(index, 8) * 45 : 0;
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
            /* ★ v0.59.0 — no verdict on a row. It was the same screening
               engine the Findings tab used, so a build that "only shows
               measurements" cannot go on printing "Clear" beside every
               study. `undefined` is the shape the card already had for a
               study whose digest has not been computed yet, so nothing
               downstream changes. */
            verdict={INTERPRETATION_ENABLED && digest ? digest.screeningLevel : undefined}
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
    /* ★ `arrivedAt` is load-bearing here even though it only feeds a number:
       it is what changes this callback's identity on a return visit, which is
       what makes FlatList re-render the rows with their new delays. */
    [digests, fmtWhen, rtl, cardLabels, openStudy, arrivedAt],
  );

  /* ── The title block, as CONTENT ──
     Built once here and rendered by whichever branch is on screen, so the
     skeleton, the error card, the empty card and the list cannot drift into
     four slightly different headings. In the list branch it is the
     `ListHeaderComponent`, which is what makes it scroll and fade; in the
     other three there is nothing to scroll, so it simply sits at the top at
     full opacity. */
  const renderTitle = (paddingHorizontal: number, marginBottom: number) => (
    <PageTitle
      title={tr('histTitle')}
      scrollY={scrollY}
      interactive={!titleGone}
      align={align}
      rtl={rtl}
      color={t.textPrimary}
      paddingTop={contentTop}
      paddingHorizontal={paddingHorizontal}
      marginBottom={marginBottom}
      subtitle={
        !empty ? (
          <Text style={[styles.count, { color: t.textSecondary, textAlign: align }]}>
            {tr('histCount', { n: String(list.data?.length ?? 0) })}
            {selfOnly ? ` · ${tr('histOwnOnly')}` : ''}
            {/* A visible backfill is a screen doing work; a list quietly
                filling with verdicts is a screen that might be broken. */}
            {digesting
              ? ` · ${tr('histDigestProgress', {
                  done: String(digesting.done),
                  total: String(digesting.total),
                })}`
              : ''}
          </Text>
        ) : null
      }
      /* Import lives on the LIST, not inside a study: it CREATES a study,
         and an action that adds a row belongs where the rows are. */
      accessory={
        features.has('exportRaw') ? (
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
        ) : null
      }
      /* Belongs to the Import button, so it travels with it. As a sibling of
         the list it used to be pushed down by the old header's clearance and
         then the list padded for the header AGAIN underneath it, leaving a
         header-sized hole — which is why it had to live inside the glass. */
      below={
        importError ? (
          <Text
            style={[
              styles.error,
              { color: t.danger, backgroundColor: t.dangerSoft, marginTop: 10 },
            ]}
          >
            {importError}
          </Text>
        ) : null
      }
    />
  );

  /* The list's content container already carries `padH` and a 10 pt `gap`
     between children, and the header is one of those children — so it asks
     for neither again. The other three branches are plain Views with no gap
     and no padding of their own, so they ask for both. Two call sites, one
     component: the numbers are stated where they differ rather than being
     cancelled out somewhere else. */
  const titleInList = renderTitle(0, CONTENT_TOP_GAP - LIST_GAP);
  const titleStandalone = renderTitle(padH, CONTENT_TOP_GAP);

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
    /* `bleedTop`: the title owns the safe area (it is the first thing in the
       page, not a bar floating over it), so the shell must not also push the
       content down. */
    <PatientShell scrollsUnderDock bleedHorizontal bleedTop>
      <View style={styles.root}>
        {/* ★ v0.59.0 — ONE pane. The Insights half of this screen became a
            dock tab of its own (InsightsScreen), so the hide-don't-unmount
            machinery that kept both alive went with it. The wrapper stays
            because the refresh badge is absolutely positioned over it. */}
        <View style={styles.pane}>
          {list.isLoading ? (
          <View>
            {titleStandalone}
            {/* Same entrance the cards and the Insights body use, so the
                three states of this screen arrive the same way. */}
            <FadeUpView delay={90} duration={420} distance={10}>
              <View style={{ paddingHorizontal: padH }}>
                <HistorySkeleton />
              </View>
            </FadeUpView>
          </View>
        ) : list.isError ? (
          <View>
            {titleStandalone}
            <FadeUpView delay={90} duration={420} distance={10}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: t.surface,
                  borderColor: t.border,
                  marginHorizontal: padH,
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
            </FadeUpView>
          </View>
        ) : empty ? (
          <View>
            {titleStandalone}
            <FadeUpView delay={90} duration={420} distance={10}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: t.surface,
                  borderColor: t.border,
                  marginHorizontal: padH,
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
            </FadeUpView>
          </View>
        ) : (
          <FlatList
            data={list.data}
            keyExtractor={(item) => item.id}
            renderItem={renderCard}
            /* ★ The title, as the list's own first row — which is what makes
               it travel with the cards at the scroller's frame rate instead
               of being animated after them. */
            ListHeaderComponent={titleInList}
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
                /* 0: the header row carries the safe area itself, the way
                   every other row carries its own height. The dock's
                   clearance below still belongs here (PatientShell). */
                paddingTop: 0,
                paddingBottom: dockFootprint(insets.bottom, screenH),
              },
            ]}
            showsVerticalScrollIndicator={false}
            /* 16, not 32: this offset now drives a fade rather than a
               one-shot hairline threshold. */
            scrollEventThrottle={16}
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
                /* ⚠️ THE GESTURE, NEVER A BACKGROUND SYNC — see above.
                   A programmatic `refreshing` grows the scroll view's top
                   inset, which is a page that moves on its own. */
                refreshing={pulling}
                onRefresh={onPull}
                /* ⚠️ THE NATIVE INDICATOR IS SUPPRESSED, AND A VISIBLE ONE
                   IS DRAWN OURSELVES.
                   A refresh indicator is positioned at the top of the
                   SCROLL VIEW — not at the top of the CONTENT, which on
                   this screen starts a safe area lower because the title
                   is the list's first row. So it draws under the notch.
                   ⚠️ This paragraph used to say the ring "spun there
                   invisibly, behind a frosted header ~180 pt tall". That
                   stopped being true in v0.70.0, when the header stopped
                   being a bar, and the note outlived it by a dozen
                   releases: the ring has been perfectly visible since,
                   half-clipped by the status bar, which is why the report
                   says it is only ever caught in a screenshot.
                   `progressViewOffset` was the obvious fix and it is NOT
                   dependable on iOS: RN implements it by rewriting the
                   UIRefreshControl's frame from `layoutSubviews`, through
                   a converging coordinate conversion, and its own source
                   warns that "setting the frame breaks integration with
                   ContentInset". It shipped in v0.58.3 and changed
                   nothing on the phone.
                   So this control keeps only the JOB IT IS GOOD AT — the
                   pull gesture and the refreshing state — and the thing
                   the reader actually looks at is `styles.refreshBadge`
                   below, at a position this screen owns. One indicator,
                   both platforms, no native quirk in the path. */
                tintColor="transparent"
                colors={['transparent']}
                /* Android draws a white DISC behind the arrow, so colouring
                   the arrow alone leaves an empty plate hanging off the top
                   of the page. iOS has no equivalent and ignores it. */
                progressBackgroundColor="transparent"
              />
            }
          />
        )}
        </View>

        {/* ── The refresh indicator this screen draws itself ──
            Placed by us, at a position we own, so no platform's idea of "the
            top of the scroll view" is involved. Non-interactive: it reports,
            it is not a button.

            ★ WHY IT IS SAFE TO PUT IT AT THE VERY TOP NOW, AND WAS NOT
            BEFORE. The previous version sat level with the title row and
            centred, on the argument that the middle of that line is empty
            — the heading hugs the leading edge, Import is a square on the
            trailing one. The argument was wrong on the phone: "Scan
            History" is a 30 pt heading and it runs straight through the
            middle, so the badge landed on the word. It is in the report,
            and it is in the screenshot.
            It sat there because it had to hold for a badge shown while
            the page was AT REST — a background sync had not moved the
            content, so there was no revealed strip to sit in. That is no
            longer a case this draws: it is shown only while `pulling`,
            and a pull is precisely when the content IS held down, by the
            refresh inset, leaving the top strip empty. So the indicator
            goes where a refresh indicator belongs — above the content it
            is refreshing — and nothing is ever drawn over the title. */}
        {pulling && (
          <View
            pointerEvents="none"
            style={[styles.refreshBadgeRow, { top: contentTop }]}
          >
            <View
              style={[
                styles.refreshBadge,
                { backgroundColor: t.surface, borderColor: t.border },
              ]}
            >
              {/* ★ The same orb as the boot splash, at the package's SMALL
                  design. `design={20}` is not a preference — the two sizes
                  are separate designs, and the 64 one scaled into a 36 pt
                  badge puts its ~566 dots at a fraction of a pixel each and
                  reads as a smudge. The 20 design is drawn sparser and
                  fatter so it survives being small. See `OrbDesign`.

                  Bounded like the splash's: a fault in a refresh spinner
                  must not take down the History tab, and the fallback is
                  the `ActivityIndicator` that was here before — so the
                  worst case is the previous release, and a ring appearing
                  here is itself the failure signal. */}
              <FailSoft
                label="history refresh orb"
                fallback={<ActivityIndicator size="small" color={t.textSecondary} />}
              >
                <ThinkingOrb
                  state="composing"
                  size={26}
                  design={20}
                  ink={t.textPrimary}
                  paper={t.surface}
                />
              </FailSoft>
            </View>
          </View>
        )}

      </View>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  /* No `gap`: the only children are the full-bleed scroller and the
     absolutely-positioned refresh badge. */
  root: { flex: 1 },
  pane: { flex: 1 },
  /* Absolutely placed by this screen — see the badge's comment. `left/right`
     rather than a width, so it centres without measuring anything. */
  refreshBadgeRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  refreshBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* `header`, `head`, `headText`, `title` and `rowRtl` went with the frosted
     bar in v0.70.0 — the row layout and the 30 pt heading now belong to
     `PageTitle`, which History and Insights share so the two tabs cannot
     drift apart by a font weight. */
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

// v2.3.0 — The refresh state is the GESTURE, not the work. Feeding a background
//           sync into `refreshing` made iOS enter its refreshing state — top
//           inset +80 pt — so the list dropped away from the title on its own
//           and did not reliably come back. The native ring is suppressed on
//           both platforms (it draws under the notch now that the header is not
//           a bar), and the orb is shown only during a pull, at the top, where
//           the pull has cleared room — it used to land on the heading.
// v2.2.0 — The skeleton, the error card and the empty card rise in the same
//          way the rows and the Insights body do, so the screen has one
//          entrance rather than three arrivals.
// v2.1.0 — No top bar. The title, the count and Import are the list's
//          ListHeaderComponent and fade out as the page moves (`PageTitle`),
//          which deletes the measured header height, `estimateHeaderH`, the
//          `onLayout` that added the bar's padding back by hand, the
//          `scrolled` hairline state and the tint pair. The refresh badge is
//          anchored to the title row's empty middle instead of to a measured
//          bar. `scrollEventThrottle` 32 → 16: the offset drives a fade now,
//          not a one-shot threshold.
// v1.7.0 — The hidden Insights pane is told it is hidden (`active`). Keeping it
//          mounted is still right — it is what stopped the flicker — but a
//          mounted pane's controls outlive the tab, and the builder's haptics
//          were arriving on the Studies list. Hiding a view stops touches; it
//          does not stop work already in flight.
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
// v2.0.0 — ONE list again. Insights left for a dock tab of its own, so the
//          sub-tab, the hide-don't-unmount pane machinery and the header's
//          tab-row height term all went with it. The verdict pill is off with
//          the rest of the interpretation (INTERPRETATION_ENABLED): the row
//          shows what was measured, not what was concluded.
// v1.1.0 — Pull-to-refresh runs the SYNC rather than refetching this one query,
//          so it also picks up studies deleted and notes written elsewhere.
// v1.0.0 — The History list: cached summaries as cards, pull to refresh, CSV
//          import, and a tap into the study viewer.
