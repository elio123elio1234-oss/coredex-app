/* ==================================================================
   EcgIdentityPanel (organism) — the INSIGHTS half of History.

   Where the Studies tab answers "what do I have", this answers the
   question a list cannot: **has anything changed?**

     ECG ID                                        ╭───╮
     BASELINE ESTABLISHED · 11 STUDIES             │ 71│
     ───────────────────────────────────────────── ╰───╯
      II                                    ⌇
      ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌   ← full bleed,
      ────────╱▔╲──╮   ╭──────────────────────────       fixed box
                    ╰───╯          50 mm/s · 10 mm/mV
      ▌▌▌▌▌▌▌▌▌▌▌   I  II  III  aVR aVL aVF
     ─────────────────────────────────────────────
     MATCH OVER TIME
      ▇▇▇▇▂▇▇▇▇▇▇        ← tap a bar to pick a study
     7 Aug                              97 %    ›

   ══ THERE ARE NO CARDS ══
   Everything used to be a white rounded rectangle on a grey page, with
   white ECG paper inside it. Reported from the phone as looking like a
   drawing on the screen rather than information about a heart, and that
   reading was right: three nested rectangles announce a picture pasted
   into a layout. Web dashboards look like that. Instruments do not.

   So the chrome is gone. Sections are a small-caps label, their content,
   and a full-bleed hairline — the trace is drawn on the page itself and
   spans the whole screen. The rules a de-carded layout has to hold to:

     • the ECG runs EDGE TO EDGE. It is the subject; it gets the width.
       ★ The SCREEN bleeds and this panel holds the padding
       (`paddingHorizontal`), which the ECG cancels with a negative
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
   Then anything wrong with the studies that BUILT it. Then a study
   measured against it — the newest by default, any of them on a tap —
   with the beats that study left out. Then the baseline's own numbers,
   and the habit that produced all of it. Each block answers a question
   raised by the one above it.

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
  type DeviationKind,
  type EcgLeadName,
  type ExclusionReason,
  type IdentityDeviation,
  type IdentityMatch,
  type MeasurementStats,
} from '@cyphix/shared';
import BeatBuilder from '@/components/molecules/BeatBuilder';
import BeatSignature, {
  pickGain,
  type CaliperReading,
} from '@/components/molecules/BeatSignature';
import CadenceStrip from '@/components/molecules/CadenceStrip';
import DeviationChip from '@/components/molecules/DeviationChip';
import IdentityRing from '@/components/molecules/IdentityRing';
import LeadCoverageGrid from '@/components/molecules/LeadCoverageGrid';
import RejectedBeats from '@/components/molecules/RejectedBeats';
import SimilarityTimeline from '@/components/molecules/SimilarityTimeline';
import { useEcgIdentity } from '@/features/insights/useEcgIdentity';
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
   * cancels it with `-paddingHorizontal` to reach the screen edge. Doing
   * it the other way round — a narrow scroller and a negative margin —
   * is what was CUTTING the trace and the lead label: RN clips a scroll
   * view's children at its frame.
   */
  paddingHorizontal: number;
  onOpenStudy: (recordingId: string) => void;
}

/** Short chip labels. Full names (`iQRS` etc.) are too long for a chip row. */
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

const EXCLUSION_LABEL: Record<ExclusionReason, TranslationKey> = {
  simulated: 'insExSimulated',
  tooFewBeats: 'insExFewBeats',
  lowQuality: 'insExLowQuality',
  outlier: 'insExOutlier',
};

interface DeviationGroup {
  key: string;
  /** The largest of the group — same kind means same unit, so |delta| sorts. */
  worst: IdentityDeviation;
  /** Which leads it fired on. Empty for whole-study numbers. */
  leads: string[];
}

/**
 * Collapse per-lead deviations of the same kind into one chip.
 *
 * A study whose axis has genuinely moved produces `morphology` on all six
 * leads, `corridor` on all six and `amplitude` on three — fourteen chips
 * saying one thing. Grouped it is three. Nothing is hidden: the chip still
 * carries the WORST member's arithmetic and the lead count says how
 * widespread it was.
 */
function groupDeviations(deviations: readonly IdentityDeviation[]): DeviationGroup[] {
  const groups = new Map<string, DeviationGroup>();
  for (const d of deviations) {
    const existing = groups.get(d.kind);
    if (!existing) {
      groups.set(d.kind, { key: d.kind, worst: d, leads: d.lead ? [d.lead] : [] });
      continue;
    }
    if (d.lead) existing.leads.push(d.lead);
    if (Math.abs(d.delta) > Math.abs(existing.worst.delta)) existing.worst = d;
    if (d.severity === 'marked') existing.worst = { ...existing.worst, severity: 'marked' };
  }
  return [...groups.values()].sort((a, b) => {
    if (a.worst.severity !== b.worst.severity) return a.worst.severity === 'marked' ? -1 : 1;
    return b.leads.length - a.leads.length;
  });
}

export default function EcgIdentityPanel({ patientId, paddingHorizontal, onOpenStudy }: Props) {
  const t = useTheme();
  const { t: tr, lang, rtl } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();
  const view = useEcgIdentity(patientId);

  const [lead, setLead] = useState<EcgLeadName>('II');
  const [compare, setCompare] = useState(true);
  const [caliper, setCaliper] = useState<CaliperReading | null>(null);
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

  const flagged = useMemo(
    () => identity?.matches.filter((m) => m.flaggedAtEnrollment) ?? [],
    [identity],
  );

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

  /* The baseline as it stood after each study — what the builder scrubs
     through. Incremental, so it costs about one extra pass. */
  const sequence = useMemo(() => {
    if (!identity) return [];
    const weights = new Map(identity.matches.map((m) => [m.recordingId, m.weight]));
    const templates = identity.matches
      .map((m) => view.templateOf(m.recordingId))
      .filter((x): x is NonNullable<typeof x> => x !== null);
    return buildBaselineSequence(templates, (x) => weights.get(x.recordingId) ?? 0, lead);
  }, [identity, view, lead]);

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
    if (!compare || built !== null || !identity || !latest) return null;
    return view.templateOf(latest.recordingId)?.leads[lead]?.samples ?? null;
  }, [compare, built, identity, latest, lead, view]);

  /** The SELECTED study's discarded beats — evidence about that study. */
  const rejected = useMemo(() => {
    if (!selected) return null;
    const template = view.templateOf(selected.recordingId);
    const onLead = template?.leads[lead] ?? template?.leads.II;
    if (!onLead || onLead.rejected.length === 0) return null;
    return { beats: onLead.rejected, accepted: onLead.samples, total: onLead.beatsRejected };
  }, [selected, view, lead]);

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
  /* Cancels the content padding exactly, so a full-bleed child lands on
     the screen's own edges. The scroll view is full width (the screen
     bleeds), so there is nothing here to clip it. */
  const bleedStyle = { marginHorizontal: -paddingHorizontal };

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
          paddingBottom: dockFootprint(insets.bottom, screenH),
        },
      ]}
      showsVerticalScrollIndicator={false}
      /* The signature and the builder both own horizontal drags; without
         this the scroll view steals them the moment a finger slides. */
      directionalLockEnabled
    >
      {/* ══ 1. The signature ══════════════════════════════════════ */}
      <View style={[styles.head, rtl && styles.rowRtl]}>
        {/* `flexShrink` + `minWidth: 0` is what keeps this column out from
            under the ring. A Text in a row does not wrap — it overflows
            its parent and prints straight through whatever is beside it,
            which is precisely what "Confidence 48 %" did. */}
        <View style={styles.headText}>
          <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>
            {tr('insTitle')}
          </Text>
          <Text
            style={[styles.state, { color: t.textSecondary, textAlign: align }]}
            numberOfLines={2}
          >
            {established ? tr('insMatEstablished') : tr('insMatEnrolling')}
            {' · '}
            {tr('insBuiltFrom', { n: String(identity.enrolled) })}
          </Text>
        </View>

        <IdentityRing
          enrolled={identity.enrolled}
          target={identity.enrollmentTarget}
          confidence={identity.confidence}
          established={established}
          caption={established ? tr('insRingAgreement') : tr('insRingStudies')}
          accessibilityLabel={tr('insEnrollLabel')}
        />
      </View>

      {remaining > 0 && (
        <Text style={[styles.hint, { color: t.textSecondary, textAlign: align }]}>
          {tr('insEnrollHint', { n: String(remaining) })}
        </Text>
      )}

      {/* The caliper readout, above the trace and never on it: a readout
          floating on the waveform covers the deflections whose position it
          reports (History's calipers, v0.16.0). Fixed height, so landing
          the caliper does not shift the sheet under the finger. */}
      <View style={[styles.readout, rtl && styles.rowRtl]}>
        {caliper ? (
          <>
            <ReadoutCell
              label={tr('insCalMs')}
              value={`${caliper.msFromR > 0 ? '+' : ''}${Math.round(caliper.msFromR)}`}
            />
            <ReadoutCell label={tr('insCalMv')} value={caliper.baselineMv.toFixed(2)} />
            <ReadoutCell label={tr('insCalBand')} value={`±${caliper.toleranceMv.toFixed(2)}`} />
            {caliper.overlayMv !== null && (
              <ReadoutCell
                label={tr('insCalLatest')}
                value={caliper.overlayMv.toFixed(2)}
                tint={t.accentLive}
              />
            )}
          </>
        ) : (
          <Text style={[styles.hint, { color: t.textTertiary }]} numberOfLines={1}>
            {tr('insCalHint')}
          </Text>
        )}
      </View>

      {shown && (
        <View style={bleedStyle}>
          <BeatSignature
            baseline={shown.samples}
            tolerance={shown.tolerance}
            sampleRate={identity.sampleRate}
            rIndex={identity.rIndex}
            overlay={overlay}
            width={screenW}
            mmPerMv={mmPerMv}
            label={lead}
            onCaliper={setCaliper}
          />
        </View>
      )}

      {/* Drag to build the average study by study. It is the one control
          that EXPLAINS what an ECG ID is instead of describing it. */}
      {sequence.length > 1 && (
        <BeatBuilder
          total={sequence.length}
          value={built ?? sequence.length}
          onChange={(v) => setBuilt(v >= sequence.length ? null : v)}
          rtl={rtl}
          caption={
            built === null
              ? tr('insBuiltAll', { n: String(sequence.length) })
              : tr('insBuiltPartial', { k: String(built), n: String(sequence.length) })
          }
          resetLabel={tr('insBuiltReset')}
        />
      )}

      {/* Explained only once the control has actually been pulled back —
          printed up front it is a paragraph about a thing nobody has
          touched, which is exactly the background text that was in the
          way. */}
      {built !== null && (
        <Text style={[styles.hint, { color: t.textTertiary, textAlign: align }]}>
          {tr('insBuiltMeaning')}
        </Text>
      )}

      <View style={[styles.legendRow, rtl && styles.rowRtl]}>
        <View style={[styles.legend, rtl && styles.rowRtl]}>
          <Legend colour={t.textTertiary} label={tr('insLegendBand')} rtl={rtl} />
          {overlay && <Legend colour={t.accentLive} label={tr('insLegendLatest')} rtl={rtl} />}
        </View>
        {latest && built === null && (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: compare }}
            onPress={() => {
              void Haptics.selectionAsync();
              setCompare((v) => !v);
            }}
            hitSlop={10}
            style={({ pressed }) => [styles.toggle, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons
              name={compare ? 'eye' : 'eye-off-outline'}
              size={15}
              color={compare ? t.accentLive : t.textTertiary}
            />
            <Text style={[styles.toggleText, { color: compare ? t.accentLive : t.textTertiary }]}>
              {tr('insCompareLatest')}
            </Text>
          </Pressable>
        )}
      </View>

      <LeadCoverageGrid
        coverage={identity.coverage}
        selected={lead}
        onSelect={(l) => setLead(l as EcgLeadName)}
        rtl={rtl}
      />

      {/* ══ 2. Early studies that disagree with their own cohort ══ */}
      {flagged.length > 0 && (
        <>
          <Rule bleed={paddingHorizontal} />
          <View style={styles.block}>
            <Text style={[styles.sectionTitle, { color: t.attention, textAlign: align }]}>
              {tr('insFlaggedTitle')}
            </Text>
            <Text style={[styles.hint, { color: t.textSecondary, textAlign: align }]}>
              {tr('insFlaggedBody')}
            </Text>
            {flagged.map((m) => (
              <Pressable
                key={m.recordingId}
                accessibilityRole="button"
                onPress={() => {
                  void Haptics.selectionAsync();
                  onOpenStudy(m.recordingId);
                }}
                style={({ pressed }) => [
                  styles.flagRow,
                  rtl && styles.rowRtl,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.flagDate, { color: t.textPrimary }]}>
                  {fmtDate(m.recordedAt)}
                </Text>
                <Text style={[styles.meta, { color: t.textSecondary }]} numberOfLines={1}>
                  {m.excluded
                    ? tr(EXCLUSION_LABEL[m.excluded])
                    : tr('insMatch', { n: String(m.similarity) })}
                </Text>
                <Ionicons
                  name={rtl ? 'chevron-back' : 'chevron-forward'}
                  size={15}
                  color={t.textTertiary}
                />
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* ══ 3. Every study against the baseline — and the one picked ══
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
        <Text style={[styles.sectionTitle, { color: t.textTertiary, textAlign: align }]}>
          {tr('insTimelineTitle')}
        </Text>
        <SimilarityTimeline
          matches={identity.matches}
          selectedId={selected?.recordingId ?? null}
          onSelect={setPicked}
          rtl={rtl}
          labels={{ top: '100', floor: '80', excluded: tr('insExcludedShort') }}
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

            {selected.deviations.length === 0 ? (
              <Text style={[styles.body, { color: t.textSecondary, textAlign: align }]}>
                {tr('insNoDeviations')}
              </Text>
            ) : (
              <>
                <View style={[styles.chips, rtl && styles.rowRtl]}>
                  {groupDeviations(selected.deviations).map((g) => (
                    <DeviationChip
                      key={g.key}
                      deviation={g.worst}
                      rtl={rtl}
                      label={`${tr(DEVIATION_LABEL[g.worst.kind])}${leadSuffix(g, tr)}`}
                      severityLabel={
                        g.worst.severity === 'marked' ? tr('insSevMarked') : tr('insSevWatch')
                      }
                    />
                  ))}
                </View>
                {/* ★ Kept when almost everything else was cut. A number
                    nobody can interpret is worse than no number — it
                    worries without informing. */}
                <Text style={[styles.hint, { color: t.textTertiary, textAlign: align }]}>
                  {tr('insDeviationMeaning')}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {/* The beats that study left out — evidence about the SELECTED
            study, so it belongs with it rather than in a section of its
            own two scrolls away. */}
        {rejected && (
          <View style={styles.block}>
            <Text style={[styles.sectionTitle, { color: t.textTertiary, textAlign: align }]}>
              {tr('insRejectedTitle', { n: String(rejected.total) })}
            </Text>
            <View style={bleedStyle}>
              <RejectedBeats
                accepted={rejected.accepted}
                rejected={rejected.beats}
                sampleRate={identity.sampleRate}
                width={screenW}
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

      {/* ══ 4. The numbers the baseline holds ════════════════════ */}
      <Rule bleed={paddingHorizontal} />
      <View style={styles.block}>
        <Text style={[styles.sectionTitle, { color: t.textTertiary, textAlign: align }]}>
          {tr('insBaselineTitle')}
        </Text>
        {/* A plain row of figures, not bordered tiles. Twelve boxes in a
            grid was the same "everything is a rectangle" problem one level
            down, and these are five numbers, not five controls. */}
        <View style={[styles.stats, rtl && styles.rowRtl]}>
          <Stat label={tr('mBpm')} value={identity.intervals.bpm} unit={tr('bpm')} />
          <Stat label={tr('insDevPr')} value={identity.intervals.prMs} unit="ms" />
          <Stat label={tr('insDevQrs')} value={identity.intervals.qrsMs} unit="ms" />
          <Stat label={tr('insDevQtc')} value={identity.intervals.qtcMs} unit="ms" />
          <Stat label={tr('insDevAxis')} value={identity.intervals.axisDegrees} unit="°" />
        </View>
      </View>

      {/* ══ 5. The habit that produced all of it ═════════════════ */}
      {view.stats && (
        <>
          <Rule bleed={paddingHorizontal} />
          <CadenceCard stats={view.stats} rtl={rtl} />
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

function CadenceCard({ stats, rtl }: { stats: MeasurementStats; rtl: boolean }) {
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
      <Text style={[styles.sectionTitle, { color: t.textTertiary, textAlign: align }]}>
        {tr('insCadenceTitle')}
      </Text>
      <Text style={[styles.facts, { color: t.textSecondary, textAlign: align }]}>
        {facts.join(' · ')}
      </Text>
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

/** " · II" for one lead, " · 6 leads" for many, nothing for a study-wide number. */
function leadSuffix(
  g: DeviationGroup,
  tr: (k: TranslationKey, v?: Record<string, string>) => string,
): string {
  if (g.leads.length === 0) return '';
  if (g.leads.length === 1) return ` · ${g.leads[0]}`;
  return ` · ${tr('insDevLeads', { n: String(g.leads.length) })}`;
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
  content: { gap: 10 },
  rowRtl: { flexDirection: 'row-reverse' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  /* A section is a label, its content, and a rule. There is no box. */
  block: { gap: 8 },
  rule: { height: StyleSheet.hairlineWidth, marginTop: 6 },
  empty: { gap: 8, paddingVertical: 20 },

  /* Small-caps, letterspaced, tertiary — the register an instrument labels
     its own panels in, and quiet enough that the DATA is the loud thing. */
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  body: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 12.5, flexShrink: 1 },
  hint: { fontSize: 11.5, lineHeight: 16 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 2 },
  headText: { flex: 1, flexShrink: 1, minWidth: 0, gap: 3 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  state: { fontSize: 11, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase' },

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
  detailDate: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  score: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 8,
  },
  flagDate: { fontSize: 13.5, fontWeight: '700' },

  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, rowGap: 10 },
  stat: { gap: 1 },
  statLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
  statValue: { fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statUnit: { fontSize: 11, fontWeight: '600' },

  facts: { fontSize: 12, lineHeight: 17 },

  reasons: { gap: 3, marginTop: 4 },
  reason: { fontSize: 11.5, fontVariant: ['tabular-nums'] },

  disclaimer: { fontSize: 10.5, lineHeight: 15, paddingTop: 2, textAlign: 'center' },
});

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
