/* ==================================================================
   EcgIdentityPanel (organism) — the INSIGHTS half of History.

   Where the Studies tab answers "what do I have", this answers the
   question a list cannot: **has anything changed?**

     ECG ID
     ┌──────────────────────────────────────────┐
     │▒▒▒▒▒▒▒╱▔╲▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  ← paper: ground,
     │▒▒▒──╱──╮▒╭───────────────────────────▒▒▒▒│    hairline edge,
     │▒▒▒▒▒▒▒▒╰─╯▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│    soft shadow
     └──────────────────────────────────────────┘
      I  II  III  aVR  aVL  aVF                    ← ONE screenful,
                                                     ends here
     Your last recording looks like you
     22 of your 26 look like your usual ones
     ─────────────────────────────────────────────
     Match over time
      ▇▇▆▇▂▇▇▇▇▇▇
     7 Aug                              97 %    ›
     Heart rate     68        usually 66
     PR            189 ms     usually 128         ← amber: this moved
     QRS            94 ms     usually 96

   ══ ★ WHO THIS SCREEN IS FOR — CHANGED IN v0.42.0 ★ ══
   It was built for a clinician and it showed. The first thing on the
   page was "ECG ID / BASELINE ESTABLISHED · 24 STUDIES" in letterspaced
   small caps, then a ring reading 82, then a waveform, then percentages
   and Latin. Every one of those is addressed to someone who already
   knows what the feature is, and the person whose heart it describes was
   never answered at all.

   Reported as: *"add useful information for a patient who understands
   nothing about ECG"*. So the order inverted — the ANSWER comes first,
   in a sentence, then three figures anyone can place, then the curve,
   then what the curve is. Nothing was deleted: the ring, the state line,
   the coverage grid, the deviations and every clinical figure are all
   still here, further down, where someone looking for them will look.

   ⚠️ TWO THINGS THE PATIENT COPY MUST NEVER DO, both of which this
   codebase has already got wrong once:
     • It must not GRADE. "Looks like your usual ones" is a distance from
       their own baseline. "Looks healthy" is a diagnosis, and one word of
       reassurance would change what this product legally is.
     • It must not rest on the per-study deviation thresholds. Those fire
       on very nearly every recording — v0.41.0's alert banner was built
       on them and told a real user their heart differed on 26 studies out
       of 26. Every plain-language verdict here comes from
       `summariseIdentityPlainly`, which judges a study against THAT
       PATIENT'S OWN spread and therefore has a quiet state that is
       actually quiet.

   ══ THERE ARE NO CARDS ══
   Everything used to be a white rounded rectangle on a grey page, with
   white ECG paper inside it. Reported from the phone as looking like a
   drawing on the screen rather than information about a heart, and that
   reading was right: three nested rectangles announce a picture pasted
   into a layout. Web dashboards look like that. Instruments do not.

   So the chrome is gone. Sections are a small-caps label, their content,
   and a full-bleed hairline — the trace is drawn on the page itself and
   spans the whole screen. The rules a de-carded layout has to hold to:

     • the ECG BREAKS OUT of the text column. It is the subject; it gets
       the width — but it stops `SHEET_MARGIN` short of the display,
       because a rounded corner that ends flush against the screen edge
       does not read as a corner, it reads as the grid spilling off.
       ★ The SCREEN bleeds and this panel holds the padding
       (`paddingHorizontal`), which the sheet cancels with a negative
       margin. Doing it the other way round — narrow scroller, negative
       margin — does not work: RN clips a scroll view's children at its
       frame, so the trace and the lead label were being CUT at the edges.
     • one gain and one channel height for every lead and every step of
       the builder, chosen once — see `pickGain`. A box that resizes when
       you change lead reads as instability, because it is.
     • prose is one line or it is deleted. Long paragraphs behind a
       waveform are what a reader has to look past to see the thing they
       came for. What survives is what the screen cannot say without
       words: what a difference IS, and the disclaimer.
     • no section says what another section already said. "Latest study"
       used to be its own block above the timeline, repeating the last
       bar's date and match figure; it is now the timeline's DETAIL, and
       the chart became a picker.

   ══ THE ORDER IS THE ARGUMENT ══
   Signature first, because it is the thing that did not exist before.
   Then a study measured against it — the newest by default, any of them
   on a tap — with the beats that study left out. Then the baseline's own
   numbers, and the habit that produced all of it. Each block answers a
   question raised by the one above it.

   ══ WHAT WAS REMOVED, AND WHY IT WAS RIGHT TO ══
   "Early studies that disagree" had its own section. It was defensible
   in the abstract — the first studies weigh most, so a bad one bends the
   reference — but on a real screen it asked the reader to do something
   they had no way of doing: judge, from a date and a percentage, whether
   a recording from weeks ago was bad. Asked what it was for, there was
   no good answer.
   The MODEL still flags them (`flaggedAtEnrollment`), and the timeline
   still draws them in the attention colour, so a divergent early study
   remains findable exactly where every other study is looked at. What
   went is a section that repeated that in prose.

   ══ WHAT IT REFUSES TO SAY ══
   Nothing here interprets (`ecgIdentity.ts` header). Every difference is
   printed as an arithmetic statement — value, baseline, delta — and the
   footer says in plain words that this is a comparison with the patient's
   own past recordings and not a diagnosis. That sentence is part of the
   screen and must not be removed to save a line.
   ================================================================== */

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  buildBaselineSequence,
  CORRIDOR_BAND_SIGMA,
  plainVerdictOf,
  summariseIdentityPlainly,
  type DeviationKind,
  type EcgLeadName,
  type ExclusionReason,
  type IdentityDeviation,
  type IdentityMatch,
  type MeasurementStats,
} from '@cyphix/shared';
import BeatSignature, { pickGain, SHEET_MARGIN } from '@/components/molecules/BeatSignature';
import BeatBuilder from '@/components/molecules/BeatBuilder';
import CadenceStrip from '@/components/molecules/CadenceStrip';
import GoalWeek from '@/components/molecules/GoalWeek';
import LeadCoverageGrid from '@/components/molecules/LeadCoverageGrid';
import PlainVerdict from '@/components/molecules/PlainVerdict';
import RejectedBeats from '@/components/molecules/RejectedBeats';
import StudyReadout, { type ReadoutRow } from '@/components/molecules/StudyReadout';
import SimilarityTimeline from '@/components/molecules/SimilarityTimeline';
import { useEcgIdentity } from '@/features/insights/useEcgIdentity';
import { useReminders } from '@/features/reminders/useReminders';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/config';
import { dockFootprint } from '@/navigation/dockMetrics';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** Patient scope — the same argument History's list is fetched with. */
  patientId?: string;
  /**
   * The side margin, applied to this panel's own scroll CONTENT.
   *
   * The screen bleeds (`PatientShell.bleedHorizontal`) so the scroll view
   * spans the full width; the padding lives here instead, and the ECG
   * cancels most of it with a negative margin to break out of the column
   * (`SHEET_MARGIN` of page is deliberately left either side). Doing it
   * the other way round — a narrow scroller and a negative margin — is
   * what was CUTTING the trace and the lead label: RN clips a scroll
   * view's children at its frame.
   */
  paddingHorizontal: number;
  /**
   * Clearance for History's frosted header, applied to this panel's own
   * scroll CONTENT — the mirror of `paddingBottom`'s dock clearance below.
   * The panel passes BEHIND the glass; it does not start under it.
   */
  paddingTop?: number;
  /** Lets History know when this tab has been scrolled, so the header can
      earn its hairline the same way it does over the studies list. */
  onScroll?: (offsetY: number) => void;
  onOpenStudy: (recordingId: string) => void;
  /**
   * Whether this tab is the one on show.
   *
   * ★ History MOUNTS this panel on its first visit and never unmounts it,
   * so that returning to Insights is not a rebuild. The price is that
   * every control in here outlives its own screen, and the two that
   * VIBRATE — the builder and the caliper — must not fire into a tab the
   * reader has left. A buzz with nothing moving behind it reads as the
   * phone misbehaving, and that is exactly how it was reported.
   */
  active?: boolean;
}

/**
 * Row labels for `StudyReadout`, and the map that says which deviation
 * KIND each row corresponds to — that is what colours a row amber, so the
 * table and the model can never disagree about what moved.
 */
const DEVIATION_LABEL: Record<DeviationKind, TranslationKey> = {
  morphology: 'insDevShape',
  corridor: 'insDevBand',
  amplitude: 'insDevAmplitude',
  qrsDuration: 'insDevQrs',
  qtcInterval: 'insDevQtc',
  prInterval: 'insDevPr',
  axis: 'insDevAxis',
  rate: 'insDevRate',
};

/**
 * Everything on the first screen that is NOT the sized block: the panel's
 * own title line, the scroll padding above it, and the gap under the
 * block. Subtracted from the window so the trace plus the lead buttons
 * plus the plain reading land inside one screenful.
 *
 * A constant rather than an `onLayout` measurement on purpose: measuring
 * would make the block's height depend on a render that has already
 * happened, which is a frame of visible resize on every mount. This is
 * the one place a magic number is the calmer answer, and it is generous
 * — being 10 pt short shows a sliver of the next section, being 10 pt
 * long clips the reading the section exists for.
 */
const FIRST_SCREEN_CHROME = 96;

const EXCLUSION_LABEL: Record<ExclusionReason, TranslationKey> = {
  simulated: 'insExSimulated',
  tooFewBeats: 'insExFewBeats',
  lowQuality: 'insExLowQuality',
  outlier: 'insExOutlier',
};

export default function EcgIdentityPanel({
  patientId,
  paddingHorizontal,
  paddingTop = 0,
  onScroll,
  onOpenStudy,
  active = true,
}: Props) {
  const t = useTheme();
  const { t: tr, lang, rtl } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();
  const view = useEcgIdentity(patientId);
  const reminders = useReminders();

  const [lead, setLead] = useState<EcgLeadName>('II');
  /** How many studies the builder is averaging. null = all of them. */
  const [built, setBuilt] = useState<number | null>(null);
  /** Which study the timeline is showing detail for. null = the newest. */
  const [picked, setPicked] = useState<string | null>(null);

  const align = rtl ? ('right' as const) : ('left' as const);
  const identity = view.identity;

  const latest = useMemo(
    () => identity?.matches.find((m) => m.excluded === null || m.excluded === 'outlier') ?? null,
    [identity],
  );

  /** The study the detail block describes — the newest until one is tapped. */
  const selected = useMemo(() => {
    if (!identity) return null;
    return identity.matches.find((m) => m.recordingId === picked) ?? latest;
  }, [identity, picked, latest]);


  /* ★ ONE gain for the whole panel, from the tallest thing it will ever
     draw — every lead's baseline plus its corridor, and the study that
     may be laid over them. Derived here rather than inside the sheet so
     changing lead or dragging the builder cannot rescale the picture
     under the reader's hand. */
  const mmPerMv = useMemo(() => {
    if (!identity) return 10;
    let peak = 0;
    for (const l of Object.values(identity.leads)) {
      if (!l) continue;
      for (let i = 0; i < l.samples.length; i++) {
        peak = Math.max(peak, Math.abs(l.samples[i]) + (l.tolerance[i] ?? 0) * CORRIDOR_BAND_SIGMA);
      }
    }
    const overlaid = latest ? view.templateOf(latest.recordingId) : null;
    for (const template of Object.values(overlaid?.leads ?? {})) {
      if (!template) continue;
      for (let i = 0; i < template.samples.length; i++) {
        peak = Math.max(peak, Math.abs(template.samples[i]));
      }
    }
    return pickGain(peak);
  }, [identity, latest, view]);

  /* ★ RESTORED in v0.51.0 — the baseline as it stood after each study,
     which is what the builder scrubs through. Incremental, so the whole
     sequence costs about one extra pass over the templates rather than
     one full fusion per position. */
  const sequence = useMemo(() => {
    if (!identity) return [];
    const weights = new Map(identity.matches.map((m) => [m.recordingId, m.weight]));
    const templates = identity.matches
      .map((m) => view.templateOf(m.recordingId))
      .filter((x): x is NonNullable<typeof x> => x !== null);
    return buildBaselineSequence(templates, (x) => weights.get(x.recordingId) ?? 0, lead);
  }, [identity, view, lead]);

  /* Keyed on the LENGTH, not the array: the sequence is rebuilt whenever
     the identity or the lead changes, but its length is what this handler
     actually reads — so the callback survives those rebuilds. */
  const sequenceLen = sequence.length;
  const onBuiltChange = useCallback(
    (v: number) => setBuilt(v >= sequenceLen ? null : v),
    [sequenceLen],
  );

  /** The signature actually drawn: the finished baseline, or a partial one. */
  const shown = useMemo(() => {
    const full = identity?.leads[lead] ?? null;
    if (!full) return null;
    if (built === null || sequence.length === 0) return full;
    return sequence[Math.min(sequence.length, Math.max(1, built)) - 1] ?? full;
  }, [identity, lead, built, sequence]);

  const overlay = useMemo(() => {
    // A partial baseline is being explained, not compared — laying a study
    // over "the first three studies" invites a reading of a thing that is
    // not the patient's baseline.
    if (built !== null || !identity || !latest) return null;
    return view.templateOf(latest.recordingId)?.leads[lead]?.samples ?? null;
  }, [built, identity, latest, lead, view]);

  /** The SELECTED study's discarded beats — evidence about that study. */
  const rejected = useMemo(() => {
    if (!selected) return null;
    const template = view.templateOf(selected.recordingId);
    const onLead = template?.leads[lead] ?? template?.leads.II;
    if (!onLead || onLead.rejected.length === 0) return null;
    return { beats: onLead.rejected, accepted: onLead.samples, total: onLead.beatsRejected };
  }, [selected, view, lead]);

  /* The whole screen in patient language. Pure, so it is a memo rather
     than a hook, and it lives in `@cyphix/shared` so the web port inherits
     the wording logic instead of re-deriving it — including the part that
     matters, which is that every judgement is made against this patient's
     OWN spread of scores rather than any absolute threshold. */
  const plain = useMemo(() => summariseIdentityPlainly(identity), [identity]);

  /* Where the SELECTED study sits in this person's own distribution —
     not just the newest one, because the timeline is a picker and the
     sentence under it has to describe whatever bar was tapped. */
  const selectedPlain = useMemo(
    () => (selected ? plainVerdictOf(plain, selected.similarity) : null),
    [plain, selected],
  );

  /* ★ Every measurement of the selected study beside the baseline's own.
     Built here rather than in the component because deciding what counts
     as "moved" is a judgement about the DATA — a row is amber when the
     identity raised a deviation of that kind, which is the same test the
     chips used, so the colour and the model can never disagree. */
  const readoutRows = useMemo((): ReadoutRow[] => {
    if (!identity || !selected) return [];
    const template = view.templateOf(selected.recordingId);
    const iv = template?.intervals;
    const base = identity.intervals;
    const moved = new Set(selected.deviations.map((d) => d.kind));
    const usually = (v: number | null) =>
      v === null ? tr('insUsuallyUnknown') : tr('insUsually', { v: String(v) });

    const row = (
      key: ReadoutRow['key'],
      kind: DeviationKind,
      label: string,
      value: number | null | undefined,
      baseline: number | null,
      unit?: string,
    ): ReadoutRow => ({
      key,
      label,
      value: value === null || value === undefined ? '—' : String(Math.round(value)),
      unit,
      usually: usually(baseline),
      moved: moved.has(kind),
    });

    return [
      row('bpm', 'rate', tr('insRowRate'), iv?.bpm, base.bpm),
      row('pr', 'prInterval', tr('insDevPr'), iv?.prMs, base.prMs, ' ms'),
      row('qrs', 'qrsDuration', tr('insDevQrs'), iv?.qrsMs, base.qrsMs, ' ms'),
      row('qtc', 'qtcInterval', tr('insDevQtc'), iv?.qtcMs, base.qtcMs, ' ms'),
      row('axis', 'axis', tr('insDevAxis'), iv?.axisDegrees, base.axisDegrees, '°'),
    ];
  }, [identity, selected, view, tr]);

  /* ★ The goal is the patient's own reminder schedule — see `GoalWeek`.
     Deriving it rather than adding a setting is what stops the app ever
     telling someone they missed a target they never set. */
  const dailyGoal = reminders.schedule.enabled ? reminders.schedule.slots.length : 0;

  /* Recordings per day for the CURRENT week, Monday first, in the
     reader's own timezone — "I measured on Tuesday" is a statement about
     their Tuesday, the same rule `summariseMeasurementHistory` follows. */
  const weekCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - mondayFirstIndex(now));
    for (const r of view.studies) {
      const at = new Date(r.recordedAt);
      if (Number.isNaN(at.getTime()) || at < start) continue;
      const day = Math.floor((at.getTime() - start.getTime()) / 86_400_000);
      if (day >= 0 && day < 7) counts[day] += 1;
    }
    return counts;
  }, [view.studies]);

  /* ★ The height of the FIRST SCREEN, measured rather than guessed.
     The scroll view already reserves the dock's footprint at the bottom
     of its content; what this block needs is what is left of the window
     once the dock and the safe areas are out of it. A hard-coded number
     here would be right on one handset and wrong on every other. */
  const firstScreenHeight = Math.max(
    260,
    screenH - insets.top - dockFootprint(insets.bottom, screenH) - FIRST_SCREEN_CHROME,
  );

  const fmtDate = useCallback(
    (iso: string) =>
      iso ? new Date(iso).toLocaleDateString(lang, { day: '2-digit', month: 'short' }) : '—',
    [lang],
  );

  /* ── States before there is anything to draw ─────────────────── */

  if (view.isError) {
    return (
      <Empty title={tr('insTitle')} body={tr('histLoadError')} align={align} />
    );
  }

  const buildingNow = view.isLoading || view.isBuilding || view.progress !== null;

  if (!identity && buildingNow) {
    return (
      <Empty
        title={tr('insBuilding')}
        align={align}
        body={
          view.progress
            ? tr('insProgress', {
                done: String(view.progress.done),
                total: String(view.progress.total),
              })
            : tr('insBuildingBody')
        }
      />
    );
  }

  if (!identity || identity.maturity === 'none') {
    return (
      <Empty title={tr('insEmptyTitle')} body={tr('insEmptyBody')} align={align}>
        {/* Studies exist but none qualified — say WHICH rule they failed,
            or "no ECG ID yet" reads as the feature being broken. */}
        {identity && identity.considered > 0 && (
          <View style={styles.reasons}>
            {identity.matches.slice(0, 4).map((m) => (
              <Text
                key={m.recordingId}
                style={[styles.reason, { color: t.textTertiary, textAlign: align }]}
              >
                {fmtDate(m.recordedAt)} · {m.excluded ? tr(EXCLUSION_LABEL[m.excluded]) : '—'}
              </Text>
            ))}
          </View>
        )}
      </Empty>
    );
  }

  const established = identity.maturity === 'established';
  const remaining = Math.max(0, identity.enrollmentTarget - identity.enrolled);
  /* ★ The sheet breaks OUT of the text column, but stops `SHEET_MARGIN`
     short of the screen edge.

     Flush to the edge was the first version and it was wrong once the
     corners were rounded: a curve that ends against the display edge does
     not read as a corner, it reads as the grid spilling off the screen.
     Pulling it back 10 pt — half the page's own 20 pt margin — leaves the
     rounded rectangle visible as a rectangle while the sheet is still
     obviously wider than everything around it.

     The scroll view is full width (the screen bleeds), so the negative
     margin has somewhere to go; inside a narrow scroller it would just be
     clipped away. */
  const sheetInset = Math.max(0, paddingHorizontal - SHEET_MARGIN);
  const sheetWidth = Math.max(80, screenW - SHEET_MARGIN * 2);
  const bleedStyle = { marginHorizontal: -sheetInset };

  return (
    <ScrollView
      style={styles.scroll}
      /* ★ The dock's clearance lives HERE, not on the shell's padding, so
         the page travels behind the frosted bar instead of stopping on a
         bare strip above it (`PatientShell.scrollsUnderDock`). */
      contentContainerStyle={[
        styles.content,
        {
          paddingHorizontal,
          paddingTop,
          paddingBottom: dockFootprint(insets.bottom, screenH),
        },
      ]}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={32}
      onScroll={onScroll ? (e) => onScroll(e.nativeEvent.contentOffset.y) : undefined}
      /* The signature and the builder both own horizontal drags; without
         this the scroll view steals them the moment a finger slides. */
      directionalLockEnabled
    >
      {/* ══ 1. THE RECORDING, FIRST AND WHOLE ═══════════════════
          ★ v0.44.0. The screen opens on the ECG and nothing else, and
          everything down to the lead buttons is sized to ONE viewport —
          `firstScreen` below. Reported as "I don't like it, it feels like
          you just piled more information on me instead of minimalism".

          What went, and why each one was right to go:
            • THE CONFIDENCE RING. "82 · agree" — a patient does not know
              what agreement is and said so in as many words. It was the
              most prominent number on the screen and the least usable.
            • THE THREE FIGURES and THE THREE-LINE EXPLAINER. Added in
              v0.42.0 in good faith and they were the pile: a reader who
              opens this wants their heart, not a tutorial about it.
            • EVERY EXPLANATORY PARAGRAPH under the chart. Reported as
              "look how much this rambles, and it is stressful to look at".
              Prose that sits between a patient and their own trace is not
              neutral — it reads as the app hedging.
            • "CHANGES SINCE YOU STARTED". Correct, and not the goal.

          The rule this screen now holds to, and it is stricter than
          "prose is one line or it is deleted": if a line does not change
          what the reader does next, it is not on the screen. */}
      {/* The caliper readout ROW is gone — a fixed 30 pt strip of figures
          above the ECG, present whether or not anyone was measuring, is
          exactly the always-on instrumentation this screen was asked to
          stop being.
          ⚠️ v0.52.0: deleting the strip in v0.44.0 without moving the
          numbers left the caliper reporting into nothing — a line you
          could drag along your own ECG that told you no value at all.
          The reading now travels WITH the line, on the sheet, and both
          vanish when the finger lifts (`BeatSignature` v5.0.0). The
          panel no longer holds the reading in state: it was re-rendering
          this whole tree at gesture rate for a value nothing drew. */}
      {/* ★ ONE VIEWPORT. Everything from the trace to the plain reading
          is given exactly the height of the first screen, so the ECG is
          never half-visible and the reader never has to scroll to find
          out what it said. Measured from the window and the dock rather
          than guessed — see `firstScreen`. */}
      <View style={[styles.firstScreen, { minHeight: firstScreenHeight }]}>
      {shown && (
        <View style={bleedStyle}>
          <BeatSignature
            baseline={shown.samples}
            tolerance={shown.tolerance}
            sampleRate={identity.sampleRate}
            rIndex={identity.rIndex}
            overlay={overlay}
            width={sheetWidth}
            mmPerMv={mmPerMv}
            label={lead}
            /* Measurable only while this tab is the one on show — the
               caliper's tick is the strongest haptic in the app, and it
               must not reach a reader who is looking at something else. */
            measurable={active}
          />
        </View>
      )}

      {/* ══ ★ THE BUILDER — REMOVED IN v0.44.0, BACK IN v0.51.0 ═══════
          Reported as: "you took away the progress bar I could play with
          to see how my ID gets built over time, and that's a shame
          because it was cool with the vibration."

          v0.44.0 cut it with the legend row and the explainer, on the
          argument that both were explanations nobody had asked for and
          both put a control between the reader and the trace. Half of
          that was right and half of it was not, and the difference is
          worth writing down: the legend and the explainer TOLD the
          reader something. This one lets them DO something, and the
          thing they do is the only demonstration in the app of the claim
          the whole feature rests on — that averaging many recordings
          cancels what is not the heart. Nobody has to read that; they
          drag, and they watch it happen. That is the opposite of the
          pile-on the redesign was aimed at.

          It sits directly under the trace, not under the lead buttons: a
          control has to be adjacent to the thing it changes, and what it
          changes is the curve above it.

          ⚠️ While a partial baseline is drawn the latest-study overlay is
          suppressed (`overlay`) — laying one study over "the first three
          studies" invites reading a comparison against something that is
          not this person's baseline. */}
      {sequence.length > 1 && (
        <BeatBuilder
          total={sequence.length}
          value={built ?? sequence.length}
          /* Landing on the last notch IS "all of them", so it resolves
             back to null rather than to a number that happens to equal
             the total — one state for one situation, and the overlay
             comes back on its own.
             ⚠️ STABLE, not an inline arrow: every notch the finger
             crosses re-renders this panel, and a handler minted per
             render used to reach `GestureDetector` as a new gesture
             object mid-drag. `BeatBuilder` now defends itself against
             that too, but handing it churn on purpose is how the next
             control inherits the bug. */
          onChange={onBuiltChange}
          /* Muted while Studies is on show: this panel stays mounted, so
             a crossing still in flight when the tab changed would buzz
             into a screen with nothing moving on it. */
          enabled={active}
          caption={
            built === null
              ? tr('insBuiltAll', { n: String(sequence.length) })
              : tr('insBuiltPartial', { k: String(built), n: String(sequence.length) })
          }
          resetLabel={tr('insBuiltReset')}
          rtl={rtl}
        />
      )}

      {/* The legend row stays gone. It named two things the reader can
          see, on the screen that was asked to stop naming things. */}
      <LeadCoverageGrid
        coverage={identity.coverage}
        selected={lead}
        onSelect={(l) => setLead(l as EcgLeadName)}
        rtl={rtl}
      />

      {/* ★ The plain reading, UNDER the lead buttons — v0.44.0.
          It sat at the top with a green tick beside it, which was
          reported as feeling like an attendance system rather than
          something native. A tick is a PASS mark, and this layer does not
          get to pass anything; putting it under the trace also puts it
          where it belongs in the argument — the picture first, then what
          it says. No icon, no fill, no box: a sentence in the app's own
          voice, sized to be read across a room. */}
      <PlainVerdict
        verdict={plain.verdict}
        rtl={rtl}
        title={
          plain.verdict === 'learning'
            ? tr('insPlainLearning')
            : plain.verdict === 'consistent'
              ? tr('insPlainConsistent')
              : plain.verdict === 'slightlyDifferent'
                ? tr('insPlainSlightly')
                : tr('insPlainDifferent')
        }
        detail={
          plain.verdict === 'learning'
            ? remaining > 0
              ? tr('insPlainLearningMore', { n: String(remaining) })
              : tr('insPlainLearningSoon')
            : tr('insPlainTypical', { k: String(plain.typical), n: String(plain.scored) })
        }
      />
      </View>

      {/* ══ 2. Every study against the baseline — and the one picked ══
          ★ This used to be TWO sections: a "Latest study" card and a
          separate timeline. They said the same thing twice — the card's
          date and match figure are the last bar of the chart — and the
          duplication was reported as adding nothing.

          Merged, the timeline becomes a PICKER: tapping a bar selects
          that study and the detail below it changes, defaulting to the
          newest. The deviations are the part that exists nowhere else and
          are the actual answer to "has anything changed", so they stayed;
          what went is the second copy of the header. Tapping a bar no
          longer navigates — the detail row does — which also makes the
          older studies reachable instead of only openable. */}
      <Rule bleed={paddingHorizontal} />
      <View style={styles.block}>
        <Text style={[styles.sectionTitle, { color: t.textSecondary, textAlign: align }]}>
          {tr('insTimelineTitle')}
        </Text>
        <SimilarityTimeline
          matches={identity.matches}
          selectedId={selected?.recordingId ?? null}
          onSelect={setPicked}
          rtl={rtl}
          labels={{ excluded: tr('insExcludedShort') }}
        />

        {selected && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void Haptics.selectionAsync();
              onOpenStudy(selected.recordingId);
            }}
            style={({ pressed }) => [styles.detail, { opacity: pressed ? 0.6 : 1 }]}
          >
            <View style={[styles.rowBetween, rtl && styles.rowRtl]}>
              <Text style={[styles.detailDate, { color: t.textPrimary }]} numberOfLines={1}>
                {fmtDate(selected.recordedAt)}
                {/* Scored but NOT counted toward the baseline has to say
                    so, or the reader assumes it moved the reference. */}
                {selected.excluded ? ` · ${tr(EXCLUSION_LABEL[selected.excluded])}` : ''}
              </Text>
              <View style={[styles.scoreRow, rtl && styles.rowRtl]}>
                <Text style={[styles.score, { color: scoreColour(selected, t) }]}>
                  {tr('insMatch', { n: String(selected.similarity) })}
                </Text>
                <Ionicons
                  name={rtl ? 'chevron-back' : 'chevron-forward'}
                  size={15}
                  color={t.textTertiary}
                />
              </View>
            </View>

            {/* ★ EVERY MEASUREMENT, EVERY TIME — v0.44.0, at the user's
                request: "I always want to see that recording's averages
                against the current average, not only the ones that
                disagree, but tell them apart by colour."

                It also fixes a defect that was there from the start.
                Showing only the rows that MOVED made the screen's content
                depend on whether anything was wrong: a good recording
                showed empty space, a bad one showed chips, so the layout
                jumped and the eye could not learn where to look. And an
                empty space is ambiguous between "everything agreed" and
                "nothing could be measured", which are not the same claim.

                The prose that used to sit here is gone entirely. */}
            <StudyReadout rows={readoutRows} rtl={rtl} />
          </Pressable>
        )}

        {/* The beats that study left out — evidence about the SELECTED
            study, so it belongs with it rather than in a section of its
            own two scrolls away. */}
        {rejected && (
          <View style={styles.block}>
            <Text style={[styles.sectionTitle, { color: t.textSecondary, textAlign: align }]}>
              {tr('insRejectedTitle', { n: String(rejected.total) })}
            </Text>
            <View style={bleedStyle}>
              <RejectedBeats
                accepted={rejected.accepted}
                rejected={rejected.beats}
                sampleRate={identity.sampleRate}
                width={sheetWidth}
                mmPerMv={mmPerMv}
                rtl={rtl}
                labels={{
                  premature: tr('insRejPremature'),
                  dissimilar: tr('insRejDissimilar'),
                  truncated: tr('insRejTruncated'),
                  match: (pct) => tr('insRejMatch', { n: String(pct) }),
                }}
              />
            </View>
            <Text style={[styles.hint, { color: t.textTertiary, textAlign: align }]}>
              {tr('insRejectedBody')}
            </Text>
          </View>
        )}
      </View>

      {/* The standalone baseline row is gone: `StudyReadout` above now
          prints every baseline figure beside the study's own, so a
          separate list of the same numbers was the screen saying one
          thing twice.

          "Changes since you started" is gone at the user's request — the
          drift is still computed and still correct, it is simply not what
          this screen is for. */}
      {/* ══ 4. The habit that produced all of it ═════════════════ */}
      {view.stats && (
        <>
          <Rule bleed={paddingHorizontal} />
          <CadenceCard stats={view.stats} weekCounts={weekCounts} goal={dailyGoal} rtl={rtl} />
        </>
      )}

      <Rule bleed={paddingHorizontal} />
      <Text style={[styles.disclaimer, { color: t.textTertiary }]}>{tr('insDisclaimer')}</Text>
    </ScrollView>
  );
}

/* ── Presentational helpers ───────────────────────────────────────
   Defined at module scope, NOT inside the component. A function component
   declared in a render body is a new component TYPE on every render, so
   React unmounts and remounts its whole subtree each time — which here
   would tear down and rebuild the cadence chart every time the caliper
   moved. */

/**
 * Monday-first weekday index, 0–6.
 *
 * `getDay()` is Sunday-first, and a week drawn Sunday-first would put
 * today in the wrong column for most of the world. One line, but the kind
 * that is wrong in exactly one place until someone looks at a Monday.
 */
function mondayFirstIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** A full-bleed hairline. What used to be a card edge is now this. */
function Rule({ bleed }: { bleed: number }) {
  const t = useTheme();
  return <View style={[styles.rule, { backgroundColor: t.border, marginHorizontal: -bleed }]} />;
}

function Empty({
  title,
  body,
  align,
  children,
}: {
  title: string;
  body: string;
  align: 'left' | 'right';
  children?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>{title}</Text>
      <Text style={[styles.body, { color: t.textSecondary, textAlign: align }]}>{body}</Text>
      {children}
    </View>
  );
}

function Legend({ colour, label, rtl }: { colour: string; label: string; rtl: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.legendItem, rtl && styles.rowRtl]}>
      <View style={[styles.swatch, { backgroundColor: colour }]} />
      <Text style={[styles.legendText, { color: t.textTertiary }]}>{label}</Text>
    </View>
  );
}

/** One figure of the caliper readout — label above, tabular number below. */
function ReadoutCell({ label, value, tint }: { label: string; value: string; tint?: string }) {
  const t = useTheme();
  return (
    <View style={styles.readoutCell}>
      <Text style={[styles.readoutLabel, { color: t.textTertiary }]} allowFontScaling={false}>
        {label}
      </Text>
      <Text style={[styles.readoutValue, { color: tint ?? t.textPrimary }]} allowFontScaling={false}>
        {value}
      </Text>
    </View>
  );
}

/**
 * One baseline figure.
 *
 * A measurement that could not be made renders "—", never 0 and never
 * blank — the same rule `MetricTile` states: the difference between "the
 * QT is 0 ms" and "the QT could not be measured" is the difference between
 * a wrong number and an honest one.
 */
function Stat({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  const t = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: t.textTertiary }]} allowFontScaling={false}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: t.textPrimary }]} allowFontScaling={false}>
        {value === null ? '—' : value}
        {value !== null && unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </Text>
    </View>
  );
}

function CadenceCard({
  stats,
  weekCounts,
  goal,
  rtl,
}: {
  stats: MeasurementStats;
  /** Monday-first counts for the current week. */
  weekCounts: number[];
  /** Recordings a day the reminder schedule asks for. 0 = none set. */
  goal: number;
  rtl: boolean;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);

  /* Only the facts that SAY something. "0 weeks in a row" and "longest gap
     1 d" are noise dressed as data, and a row of them buries the two
     numbers that matter. */
  const facts: string[] = [
    tr('insCadenceStudies', { n: String(stats.total) }),
    stats.perWeek !== null ? tr('insCadencePerWeek', { n: stats.perWeek.toFixed(1) }) : '',
    stats.streakWeeks > 1 ? tr('insCadenceStreak', { n: String(stats.streakWeeks) }) : '',
    stats.longestGapDays !== null && stats.longestGapDays > 1
      ? tr('insCadenceGap', { n: String(stats.longestGapDays) })
      : '',
    stats.daysSinceLast !== null
      ? stats.daysSinceLast === 0
        ? tr('insCadenceToday')
        : tr('insCadenceLast', { n: String(stats.daysSinceLast) })
      : '',
  ].filter(Boolean);

  return (
    <View style={styles.block}>
      <Text style={[styles.sectionTitle, { color: t.textSecondary, textAlign: align }]}>
        {tr('insCadenceTitle')}
      </Text>
      <Text style={[styles.facts, { color: t.textSecondary, textAlign: align }]}>
        {facts.join(' · ')}
      </Text>
      {/* ★ The goal, above the hour histogram — v0.44.0.
          "How am I doing this week" is a question with an answer a
          patient can act on; "which hour do I usually measure at" is a
          fact about them that they already know. The actionable one goes
          first, and it is the only thing on this screen that looks
          forward rather than back. */}
      {goal > 0 ? (
        <GoalWeek
          counts={weekCounts}
          goal={goal}
          todayIndex={mondayFirstIndex(new Date())}
          dayLetters={[
            tr('insGoalMon'),
            tr('insGoalTue'),
            tr('insGoalWed'),
            tr('insGoalThu'),
            tr('insGoalFri'),
            tr('insGoalSat'),
            tr('insGoalSun'),
          ]}
          rtl={rtl}
        />
      ) : (
        /* No schedule, no goal — and no invented default. A target the
           patient never set is the app deciding how often someone should
           measure their own heart, which is advice. */
        <Text style={[styles.hint, { color: t.textTertiary, textAlign: align }]}>
          {tr('insGoalNone')}
        </Text>
      )}

      <CadenceStrip
        byHour={stats.byHour}
        highlight={stats.busiestBlock}
        rtl={rtl}
        accessibilityLabel={tr('insCadenceTitle')}
      />
      {stats.busiestBlock && (
        <Text style={[styles.hint, { color: t.textTertiary, textAlign: align }]}>
          {tr('insCadenceBusiest', {
            from: String(stats.busiestBlock[0]).padStart(2, '0'),
            to: String(stats.busiestBlock[1]).padStart(2, '0'),
          })}
        </Text>
      )}
    </View>
  );
}

/**
 * The match figure's colour.
 *
 * Amber when something is marked, and otherwise NEUTRAL — not green. A
 * high match is the ordinary case, and painting the ordinary case as a
 * pass implies the other case is a fail, which is a verdict this layer
 * does not get to reach.
 */
function scoreColour(match: IdentityMatch, t: { attention: string; textPrimary: string }): string {
  return match.deviations.some((d) => d.severity === 'marked') ? t.attention : t.textPrimary;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  /* Roomier than it was (10). The de-carded layout removed every box,
     which was right, but boxes had been doing the SPACING as well as the
     framing — strip them and leave the old gaps and the page reads as one
     undifferentiated column of grey. Air is what does that job now. */
  content: { gap: 14 },
  rowRtl: { flexDirection: 'row-reverse' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  /* A section is a label, its content, and a rule. There is no box. */
  block: { gap: 8 },
  /* The sized first screen. `justifyContent: 'center'` so that on a tall
     handset the extra room is shared above and below the trace instead
     of pooling under it — a block pinned to the top of a screenful reads
     as a short page, not as a full one. */
  firstScreen: { justifyContent: 'center', gap: 12 },
  rule: { height: StyleSheet.hairlineWidth, marginTop: 8 },
  empty: { gap: 8, paddingVertical: 20 },

  /* ★ NOT small-caps tertiary any more — v0.42.0.
     It was 11 px, letterspaced, uppercase, in the FAINTEST text colour:
     the register an instrument labels its panels in, which was the
     intent. On a phone, six of them down one grey column is the single
     thing that made this screen read as dated — the labels were quiet to
     the point of being unreadable, so the eye got no structure at all and
     the page became a wall.

     A section header is now a plain, legible sentence-case line in the
     secondary colour. It is still quieter than the data it introduces,
     which was the real requirement; it is no longer quieter than the
     background. */
  /* ★ 15 pt, not 13.5 — v0.44.0. This app is aimed at an older reader
     and the brief is explicit: no small text anywhere. A section header
     that needs good eyes is a header that does not organise the page for
     the person it was organised for. */
  sectionTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1 },
  body: { fontSize: 16, lineHeight: 22 },
  meta: { fontSize: 12.5, flexShrink: 1 },
  hint: { fontSize: 13.5, lineHeight: 19 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 2 },
  headText: { flex: 1, flexShrink: 1, minWidth: 0, gap: 3 },
  title: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
  /* The state line keeps its small caps, and it is the ONE place they
     still earn their keep: it is provenance about the instrument
     ("established, 24 studies"), not a label the reader navigates by. */
  state: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },

  readout: { flexDirection: 'row', alignItems: 'center', gap: 18, height: 30 },
  readoutCell: { gap: 1 },
  readoutLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
  readoutValue: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },

  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  legend: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', flexShrink: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 14, height: 3, borderRadius: 2 },
  legendText: { fontSize: 11 },

  /* Borderless: it is a visibility toggle for the trace beside it, not a
     button competing with the trace. */
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  toggleText: { fontSize: 12, fontWeight: '700' },

  /* The picked study's detail: a row of its own under the chart, with a
     little air above it so it reads as belonging to the bar that is lit
     rather than as the next section. */
  detail: { gap: 8, paddingTop: 4 },
  /* The patient's reading of the selected study. Sized between the date
     row and the body text: it is the sentence, not a caption on one. */
  plainLine: { fontSize: 14.5, fontWeight: '700', lineHeight: 20 },
  detailDate: { fontSize: 16.5, fontWeight: '700', flexShrink: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  score: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 8,
  },
  flagDate: { fontSize: 13.5, fontWeight: '700' },

  driftLabel: { fontSize: 12.5, flexShrink: 1 },
  driftValue: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  driftRate: { fontSize: 11.5, fontWeight: '600' },

  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, rowGap: 10 },
  stat: { gap: 1 },
  statLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
  statValue: { fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statUnit: { fontSize: 11, fontWeight: '600' },

  facts: { fontSize: 14.5, lineHeight: 20 },

  reasons: { gap: 3, marginTop: 4 },
  reason: { fontSize: 13.5, fontVariant: ['tabular-nums'] },

  disclaimer: { fontSize: 12.5, lineHeight: 17, paddingTop: 2, textAlign: 'center' },
});

// v6.3.0 — An `active` prop, because this panel outlives its own tab: History
//          mounts it once and hides it rather than unmounting it, so both
//          controls that vibrate — the builder and the caliper — could fire
//          into a screen the reader had already left. Reported as still
//          feeling the Insights vibration from the Studies tab. `active`
//          mutes them; it does not unmount anything.
// v6.2.0 — The caliper reading no longer passes through this component. It was
//          held in a `caliper` state that nothing has rendered since v0.44.0
//          deleted the readout strip — so every millimetre the finger moved
//          re-rendered the entire Insights tree for a value that was thrown
//          away. `BeatSignature` draws it on the sheet now (`measurable`).
// v6.1.0 — The builder is back, under the trace. v6.0.0 cut it with the legend
//          row and the explainer as "an explanation nobody asked for", and that
//          was half right: the legend TOLD the reader something, this one lets
//          them DO something — and what they do is the only demonstration in
//          the app of the claim the feature rests on, that averaging many
//          recordings cancels what is not the heart. Reported as "a shame, I
//          could play with it to watch my ID get built". The latest-study
//          overlay still hides while a partial baseline is drawn.
// v6.0.0 — The ECG first, and almost nothing else. Reported as "it feels like
//          you just piled more information on me instead of minimalism, and a
//          patient doesn't know what that 'agree' in the green circle is" —
//          which v5.0.0 earned by answering "make it useful for a patient" with
//          ADDITIONS. Gone: the confidence ring, the three figures, the
//          explainer, the caliper readout strip, the builder, the legend, the
//          standalone baseline numbers, every explanatory paragraph, and
//          "Changes since you started". The trace and the lead buttons are
//          sized to ONE viewport. Under the chart, every measurement is now
//          printed every time with colour as the only difference — showing
//          only what moved made the content depend on whether anything was
//          wrong, so the layout jumped and an empty space was ambiguous.
//          The rule this screen holds to now: if a line does not change what
//          the reader does next, it is not on the screen.
// v5.0.0 — ★ THE PATIENT'S HALF. Reported as "it feels dated, the colours are
//          old, and it isn't very practical — add useful information for a
//          patient who understands nothing about ECG." All three were the same
//          defect: the screen was built for a clinician and opened with
//          letterspaced small caps, a ring reading 82, and percentages.
//          • THE ORDER INVERTED. The answer comes first, in a sentence
//            (`PlainVerdict`), then three figures anyone can place
//            (`PatientFacts`), then the curve, then what the curve is
//            (`HowItWorks`). Nothing was deleted — every clinical figure is
//            still here, lower, where someone looking for it will look.
//          • THE SECTION HEADERS WERE THE "DATED" FEELING. 11 px letterspaced
//            uppercase in the FAINTEST text colour, six of them down one grey
//            column: quiet to the point of unreadable, so the eye got no
//            structure and the page read as a wall. Now legible sentence-case
//            in the secondary colour — still quieter than the data, no longer
//            quieter than the background. Gaps went 10 → 14 for the same
//            reason: removing every box also removed the spacing the boxes
//            had been doing.
//          • The palette did not change. It was barely being SPENT: almost
//            everything was one of three greys. The tints that carry meaning
//            (`signalSoft`, `attentionSoft`) now actually appear.
//          ⚠️ The plain-language verdicts come from `summariseIdentityPlainly`,
//          never from the per-study deviation thresholds. Those fire on nearly
//          every recording — the v0.41.0 alert banner was built on them and
//          told a real user their heart differed on 26 studies out of 26.
// v4.0.1 — The alert line is gone. On a real history it said "the same
//          difference on 26 studies in a row", which is not a finding about a
//          heart — the persistence rule behind it counted backwards while the
//          same deviation KIND recurred, and morphology/amplitude recur on
//          nearly every study, so it had been true since the first recording.
//          A comment stands where it was, stating what may and may not be put
//          back there.
// v4.0.0 — Surfaces the ECG ID's second generation, and the three additions are
//          each here to stop the screen being quietly optimistic:
//          • `nEff` beside the study count, but ONLY when they materially
//            disagree. "24 studies" is a comfortable number and it can be a
//            lie; printing the effective count unconditionally would be a
//            second number saying the same thing on a healthy identity, and
//            printing it on divergence is the only warning a reader ever gets
//            that their baseline is thinner than its row count.
//          • ONE alert line, above the trace, or nothing. Never red, never a
//            cause, and no "all clear" strip — a reader who has skipped the
//            same reassuring line forty times does not read the forty-first.
//          • A DRIFT section that shares no ink with the deviation chips,
//            because the two mean opposite things: a deviation is an event, a
//            drift is the expected behaviour of a person who is ageing. Every
//            row carries a per-year rate; "+14 ms" without a duration invites
//            the reader to supply the wrong one.
//          Also states, on any study whose electrode geometry was corrected
//          for, what that correction touched and what it deliberately did not.
//          A corrected number handed over silently is worse than an
//          uncorrected one.
// v3.2.0 — Insights is drawn in the brand TEAL rather than `accentLive`, a
//          generic UI blue meaning "live" that was doing a job it was never
//          chosen for. "Early studies that disagree" is gone: it asked the
//          reader to judge, from a date and a percentage, whether a weeks-old
//          recording was bad — the model still flags them and the timeline
//          still draws them in the attention colour.
// v3.1.1 — The sheet stops 10 pt short of the display instead of running flush
//          to it. Flush was fine while the corners were square; once they were
//          rounded, a curve ending against the screen edge stopped reading as a
//          corner and started reading as the grid spilling off the screen.
// v3.1.0 — Two fixes from device feedback:
//          • the full-bleed ECG was being CUT at both edges, taking the lead
//            label with it. A negative margin cannot escape a ScrollView — RN
//            clips children at the scroller's frame. The screen now bleeds
//            (`PatientShell.bleedHorizontal`) and this panel owns the padding,
//            so the negative margin finally has somewhere to go.
//          • "Latest study" is gone as a section. It repeated the timeline's
//            last bar — same date, same figure — so the chart became a PICKER
//            and that content became its detail. The deviations survived, since
//            they are the only place the actual answer lives; the beats that
//            study left out moved in beside them, where they belong.
// v3.0.0 — De-carded, at the user's report that it still read as a drawing
//          rather than as data. There are no white rectangles left: sections
//          are a small-caps label, their content and a full-bleed hairline, and
//          the ECG is drawn on the page itself, edge to edge. The bleed is
//          MEASURED (screen width − content width) so it cannot drift from the
//          shell's padding. One gain and one channel height for the whole panel
//          — a box that resizes when you change lead reads as instability,
//          because it is. Prose cut to one line per section; what survived is
//          what the screen cannot say without words.
// v2.0.0 — Instrument header, caliper, builder, rejected beats, amber not red.
// v1.0.0 — The Insights tab.
