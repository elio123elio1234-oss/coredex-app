/* ==================================================================
   ChatScreen — OPEN A REQUEST with the care team.

   ══ ★ THIS IS NOT A CHAT, AND THAT IS THE POINT ══
   Said plainly: *"nobody chats with their doctor like it is WhatsApp —
   it should really be opening a request, for a review of a recording."*
   That is right, and it is also what the rest of the platform already
   models: the server's `POST /patients/:id/messages/:mode` turns a
   message into `kind: 'request'` the moment it carries a coded `reason`,
   and it takes an `attachment: { recordingId, label }` — a request to
   look at a specific study. The web has carried `CONSULT_REASONS` with
   SNOMED codes for the same purpose.

   So the tab is a FORM:

       Recording   21 Sep · 6 Limb Leads              ›
       Reason      Question about my results          ›
       Details     (optional)
                   ……………………………………………………
                              [  Send request  ]

   and under it, the requests already sent and where they got to.

   ⚠️ What that rules out, deliberately: a message bubble, a "reply", a
   typing indicator, anything that promises a back-and-forth nobody
   staffs. A request has a state — sent, seen, answered — and that is a
   different and more honest thing to show a patient than a chat that may
   sit unanswered for a day.

   ══ ⚠️ WHAT IS REAL TODAY AND WHAT IS NOT ══
   **The form is real.** The recordings in the picker are this patient's
   actual studies from `recordingApi`; the reasons are the platform's
   coded list; the details field types; validation decides when the button
   lights.

   **The delivery is not.** This app has no `messageApi` —
   `services/api/endpoints/` holds photo, profile, recording and sync and
   nothing else — so the request has nowhere to go, and this round was
   asked for as appearance first. Pressing Send therefore runs the real
   sending state (which is where the border beam lives) and then says, in
   words, that nothing was sent.

   ⚠️ It must NOT be made to look successful. A patient who believes they
   have asked a clinician to look at their heart, and has not, is the
   worst outcome this screen can produce — worse than a screen that
   plainly says it is not connected. When `messageApi` lands, `submit()`
   becomes the mutation and `SENT_NOTICE` goes.
   ================================================================== */

import { useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ChoiceSheet, { type Choice } from '@/components/molecules/ChoiceSheet';
import FieldRow from '@/components/molecules/FieldRow';
import SendRequestButton from '@/components/molecules/SendRequestButton';
import PatientShell from '@/components/templates/PatientShell';
import { CONSULT_REASONS } from '@/config/consultReasons';
import { useActivePatientId } from '@/features/auth/useActivePatientId';
import { HISTORY_PAGE_SIZE, useListRecordingsQuery } from '@/services/api/endpoints/recordingApi';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/config';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** How long the sending state is held before the notice. See the header. */
const FAKE_SEND_MS = 1100;

/** One line of the field, and the ceiling it grows to before scrolling. */
const MIN_DETAILS = 24;
const MAX_DETAILS = 96;

const TYPE_LABEL: Record<string, TranslationKey> = {
  limb: 'measureLimbTitle',
  chest: 'measureChestTitle',
  '12lead': 'measure12Title',
};

export default function ChatScreen() {
  const t = useTheme();
  const { t: tr, lang, rtl } = useTranslation();
  const patientId = useActivePatientId();

  /* The patient's own studies — a bounded page, the same one History
     loads, so both hit one cache entry. */
  const list = useListRecordingsQuery(
    { patientId: patientId ?? undefined, limit: HISTORY_PAGE_SIZE },
    { skip: !patientId },
  );

  const [studyId, setStudyId] = useState<string | null>(null);
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [detailsH, setDetailsH] = useState(MIN_DETAILS);
  const [picking, setPicking] = useState<'study' | 'reason' | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const detailsRef = useRef<TextInput>(null);
  /** What the send came back with, held until the beam has finished. */
  const outcome = useRef<string | null>(null);

  const align = rtl ? ('right' as const) : ('left' as const);

  /* ⚠️ THE TIME IS PART OF THE LABEL, not decoration. Three studies
     recorded the same afternoon all read "Jul 30 · 6 Limb Leads" without
     it — a list of identical rows, and no way for a patient to say which
     one they meant. Naming a recording is the one thing this form has to
     get right, because the whole request is about that recording. */
  const fmtWhen = (iso: string) =>
    iso
      ? new Date(iso).toLocaleString(lang, {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  const studies: Choice[] = useMemo(
    () =>
      (list.data ?? []).map((r) => ({
        id: r.id,
        label: `${fmtWhen(r.recordedAt)} · ${tr(TYPE_LABEL[r.type] ?? 'measureLimbTitle')}`,
        /* The simulator badge travels with the row, because a request to
           review synthetic data has to be recognisable as one before it
           reaches a clinician, not after (mobile CLAUDE.md §4). */
        sub: r.isSimulated ? 'SIMULATION' : undefined,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.data, lang, tr],
  );

  const reasons: Choice[] = useMemo(
    () =>
      CONSULT_REASONS.map((r) => ({
        id: r.id,
        label: tr(r.labelKey),
        /* The coding system is shown, not the code: "SNOMED CT" tells a
           patient this went somewhere structured, while "80313002" tells
           them nothing and looks like an error. */
        sub: r.systemLabel,
      })),
    [tr],
  );

  const study = studies.find((s) => s.id === studyId);
  const studyLabel = study?.label ?? null;
  const reasonLabel = reasons.find((r) => r.id === reasonId)?.label ?? null;

  /* A request needs the two things that make it a request: which recording,
     and what for. Details are genuinely optional. */
  const canSend = studyId !== null && reasonId !== null && !sending;

  const submit = () => {
    setNotice(null);
    setSending(true);
    Keyboard.dismiss();
    /* ⚠️ NOT a simulated success. The sending state is real — it is what
       the button's beam is for — and what follows is the truth. */
    setTimeout(() => {
      /* ★ The outcome is PARKED, not shown. The button reports `onSettled`
         once its light has travelled home, and the answer appears then —
         so the result and the button's own state change together instead
         of "not sent" landing under a button still reading "Sending…".
         The wait is bounded by one lap (~2 s) and it never changes WHAT is
         reported, only when. */
      outcome.current = tr('reqNotConnected');
      setSending(false);
    }, FAKE_SEND_MS);
  };

  const settled = () => {
    if (outcome.current === null) return;
    setNotice(outcome.current);
    outcome.current = null;
  };

  return (
    <PatientShell>
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          /* Tapping anywhere off the field puts the keyboard away, and a
             drag does too — the way out of typing mode that the composer
             this screen replaced never had. */
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* ⚠️ Aligned to the side, not centred — every other screen's title
              is (`PageTitle` on Insights and History, Settings, Personal
              details), and a centred one here read as a different app. It
              follows the writing direction, so it sits right in Hebrew. */}
          <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>
            {tr('reqTitle')}
          </Text>
          <Text style={[styles.intro, { color: t.textSecondary, textAlign: align }]}>
            {tr('reqIntro')}
          </Text>

          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <FieldRow
              label={tr('reqStudyLabel')}
              value={studyLabel}
              note={study?.sub}
              placeholder={tr('reqStudyPlaceholder')}
              onPress={() => setPicking('study')}
              rtl={rtl}
            />
            <View style={[styles.rule, { backgroundColor: t.border }]} />
            <FieldRow
              label={tr('consultReasonLabel')}
              value={reasonLabel}
              placeholder={tr('consultReasonPlaceholder')}
              onPress={() => setPicking('reason')}
              rtl={rtl}
            />
            <View style={[styles.rule, { backgroundColor: t.border }]} />

            {/* ⚠️ The whole row focuses the field, not just the text. That
                is the "I press on it and nothing happens" fix: a hit area
                has to be the thing that LOOKS like the control. */}
            <Pressable onPress={() => detailsRef.current?.focus()} accessible={false}>
              <FieldRow label={tr('reqDetailsLabel')} hint={tr('reqOptional')} rtl={rtl}>
                <TextInput
                  ref={detailsRef}
                  style={[
                    styles.details,
                    { color: t.textPrimary, textAlign: align, height: detailsH },
                  ]}
                  value={details}
                  onChangeText={setDetails}
                  onContentSizeChange={(e) => {
                    const h = Math.min(
                      MAX_DETAILS,
                      Math.max(MIN_DETAILS, Math.ceil(e.nativeEvent.contentSize.height)),
                    );
                    setDetailsH((prev) => (prev === h ? prev : h));
                  }}
                  placeholder={tr('reqDetailsPlaceholder')}
                  placeholderTextColor={t.textTertiary}
                  multiline
                  editable={!sending}
                  accessibilityLabel={tr('reqDetailsLabel')}
                />
              </FieldRow>
            </Pressable>
          </View>

          {notice && (
            <Text style={[styles.notice, { color: t.attention, textAlign: align }]}>{notice}</Text>
          )}

          <SendRequestButton
            label={tr('reqSend')}
            sendingLabel={tr('reqSending')}
            disabled={!canSend}
            sending={sending}
            onSettled={settled}
            onPress={submit}
          />

          <View style={[styles.rule, styles.sectionRule, { backgroundColor: t.border }]} />
          <Text style={[styles.section, { color: t.textSecondary, textAlign: align }]}>
            {tr('reqYours')}
          </Text>
          <Text style={[styles.empty, { color: t.textTertiary, textAlign: align }]}>
            {tr('reqYoursEmpty')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <ChoiceSheet
        visible={picking === 'study'}
        title={tr('reqStudyLabel')}
        closeLabel={tr('close')}
        options={studies}
        selectedId={studyId}
        onSelect={setStudyId}
        onClose={() => setPicking(null)}
        emptyBody={list.isError ? tr('histLoadError') : tr('reqStudyNone')}
        rtl={rtl}
      />
      <ChoiceSheet
        visible={picking === 'reason'}
        title={tr('consultReasonLabel')}
        closeLabel={tr('close')}
        options={reasons}
        selectedId={reasonId}
        onSelect={setReasonId}
        onClose={() => setPicking(null)}
        rtl={rtl}
      />
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 12, paddingBottom: 8 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.4 },
  intro: { fontSize: 14.5, lineHeight: 21, marginBottom: 2 },
  /* One surface holding the three rows, with hairlines between them —
     the native form idiom, and the reason the rows can be different kinds
     of control without the layout showing it. */
  card: { borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: 16 },
  rule: { height: StyleSheet.hairlineWidth },
  sectionRule: { marginTop: 10 },
  details: {
    fontSize: 16.5,
    lineHeight: 22,
    /* ⚠️ All four, explicitly. Android gives a `multiline` TextInput its
       own horizontal padding, which set the details text a few points in
       from every label and value above it — small, and exactly the kind
       of misalignment that reads as "not clean". */
    padding: 0,
    textAlignVertical: 'top',
  },
  notice: { fontSize: 13.5, lineHeight: 19 },
  section: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  empty: { fontSize: 13.5, lineHeight: 19 },
});

// v2.1.0 — Two things that grated: the title sits to the SIDE like every other
//          screen's (a centred one read as a different app), and the outcome now
//          waits for the send button's light to finish its lap, so the answer
//          and the button's own state change together.
// v2.0.1 — Three fixes from driving it on the emulator: the recording labels
//          carry the TIME (three studies from one afternoon were three identical
//          rows), the chosen recording keeps its SIMULATION badge on the form,
//          and the details field lost Android's own TextInput padding, which had
//          it sitting a few points right of every label above it.
// v2.0.0 — THE TAB IS A REQUEST FORM, NOT A CHAT. "Nobody chats with their
//          doctor like it is WhatsApp — it should really be opening a request
//          for a review of a recording." That is also what the platform already
//          models: the server makes a message a `request` the moment it carries
//          a coded reason, and takes a recording as the attachment. So: pick the
//          recording (the patient's real ones), pick a coded reason, add
//          optional details, send. The beam moved to the send button and only
//          while sending. ⚠️ Delivery is still not wired — pressing Send runs
//          the real sending state and then says so in words. It must never be
//          made to look successful.
