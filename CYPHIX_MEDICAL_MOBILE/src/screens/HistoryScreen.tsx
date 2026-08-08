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

   ══ THIS SCREEN OWNS FETCHING ══
   Cards take data as props. Storage, RBAC and audit live behind hooks.
   `EcgIdentityPanel` owns its own — it needs the WAVEFORMS, which this
   list deliberately never loads.
   ================================================================== */

import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { parseEcgCsv, type RecordingListItem } from '@cyphix/shared';
import HistorySkeleton from '@/components/molecules/HistorySkeleton';
import SegmentedTabs from '@/components/molecules/SegmentedTabs';
import StudyCard from '@/components/molecules/StudyCard';
import EcgIdentityPanel from '@/components/organisms/EcgIdentityPanel';
import PatientShell from '@/components/templates/PatientShell';
import { usePermissions, useCurrentUser } from '@/features/auth/useCurrentUser';
import { SELF_SUBJECT } from '@/features/history/hooks/useSaveRecording';
import { useViewerFeatures } from '@/features/history/useViewerFeatures';
import { useSync } from '@/features/sync/useSync';
import { useTranslation } from '@/i18n/useTranslation';
import { logAudit } from '@/services/audit/auditLogger';
import {
  HISTORY_PAGE_SIZE,
  useCreateRecordingMutation,
  useListRecordingsQuery,
} from '@/services/api/endpoints/recordingApi';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function HistoryScreen() {
  const t = useTheme();
  const { t: tr, lang, rtl } = useTranslation();
  const navigation = useNavigation<{ navigate: (screen: string, params: object) => void }>();
  const user = useCurrentUser();
  const { can } = usePermissions();
  const features = useViewerFeatures();
  const sync = useSync();
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [tab, setTab] = useState<'studies' | 'insights'>('studies');

  /* A patient sees only their own studies — as the QUERY ARGUMENT, never as
     client-side filtering, so the server can enforce it unchanged. */
  const selfOnly = !can('history:read') && can('history:read:self');
  const subject = selfOnly ? (user?.linkedPatientId ?? 'MOCK-SELF') : undefined;
  const list = useListRecordingsQuery({ patientId: subject, limit: HISTORY_PAGE_SIZE });
  const [createRecording] = useCreateRecordingMutation();

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
  const showTabs = !list.isLoading && !list.isError && !empty;

  const cardLabels = {
    bpm: tr('bpm'),
    simulated: tr('histSimulated'),
    lowQuality: tr('histLowQuality'),
    notes: tr('histNotes'),
    hasNote: tr('noteTitle'),
    leadSet: tr('reportLeadSetShort'),
  };

  const renderCard = ({ item }: { item: RecordingListItem }) => (
    <StudyCard
      when={fmtWhen(item.recordedAt)}
      bpm={item.summary.bpm}
      durationSec={item.durationSec}
      sampleRate={item.sampleRate}
      isSimulated={item.isSimulated}
      insufficient={item.summary.insufficient}
      annotationCount={item.annotations.length}
      hasNote={Boolean(item.note && item.note.trim() !== '')}
      rtl={rtl}
      labels={cardLabels}
      onPress={() => {
        void Haptics.selectionAsync();
        navigation.navigate('StudyViewer', { id: item.id });
      }}
    />
  );

  return (
    <PatientShell>
      <View style={styles.root}>
        <View style={[styles.head, rtl && styles.rowRtl]}>
          <View style={styles.headText}>
            <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>
              {tr('histTitle')}
            </Text>
            {!empty && (
              <Text style={[styles.count, { color: t.textSecondary, textAlign: align }]}>
                {tr('histCount', { n: String(list.data?.length ?? 0) })}
                {selfOnly ? ` · ${tr('histOwnOnly')}` : ''}
              </Text>
            )}
          </View>

          {/* Import lives on the LIST, not inside a study: it CREATES a study,
              and an action that adds a row belongs where the rows are. It is
              hidden on Insights for the same reason — nothing there is a row. */}
          {features.has('exportRaw') && tab === 'studies' && (
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
          <SegmentedTabs
            options={[
              { value: 'studies', label: tr('insTabStudies') },
              { value: 'insights', label: tr('insTabInsights') },
            ]}
            value={tab}
            onChange={setTab}
            accessibilityLabel={tr('histTitle')}
          />
        )}

        {importError && (
          <Text style={[styles.error, { color: t.danger, backgroundColor: t.dangerSoft }]}>
            {importError}
          </Text>
        )}

        {showTabs && tab === 'insights' ? (
          <EcgIdentityPanel
            patientId={subject}
            onOpenStudy={(id) => navigation.navigate('StudyViewer', { id })}
          />
        ) : list.isLoading ? (
          <HistorySkeleton />
        ) : list.isError ? (
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
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
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
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
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
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
              />
            }
          />
        )}
      </View>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12 },
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

// v1.2.0 — Two tabs: the list, and INSIGHTS (the ECG ID). The switch appears
//          only once there are studies, and Import hides on the tab where
//          nothing is a row.
// v1.1.0 — Pull-to-refresh runs the SYNC rather than refetching this one query,
//          so it also picks up studies deleted and notes written elsewhere.
// v1.0.0 — The History list: cached summaries as cards, pull to refresh, CSV
//          import, and a tap into the study viewer.
