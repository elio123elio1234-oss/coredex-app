/* ==================================================================
   EcgIdentityPanel (organism) — the INSIGHTS half of History.

   Where the Studies tab answers "what do I have", this answers the
   question a list cannot: **has anything changed?**

     ┌───────────────────────────────────────┐
     │ ECG ID                          ╭───╮ │
     │ BASELINE ESTABLISHED · 11 STUDIES│ 71│ │
     │ Updated 7 Aug                    ╰───╯ │
     │                                        │
     │   ‹ the signature beat, on paper,      │
     │     inside its own tolerance corridor › │
     │   ▌▌▌▌▌▌▌▌│░░░  Averaging 8 of 11      │
     │   I II III aVR aVL aVF                 │
     │   V1 V2 V3 V4 V5 V6                    │
     └───────────────────────────────────────┘

   ══ THE ORDER IS THE ARGUMENT ══
   Signature first, because it is the thing that did not exist before.
   Then the newest study measured against it — the only study anyone is
   actually asking about. Then the history of those measurements, then the
   numbers behind them, and finally the habit that produced them all. Each
   block answers a question raised by the one above it.

   ══ IT READS AS AN INSTRUMENT, NOT AS A POSTER ══
   The first version put a green ESTABLISHED capsule next to a 24 pt
   headline and was told, correctly, that it looked like a landing page
   rather than an ECG system. Green means "pass"; a baseline existing is
   not a pass, and the app is not allowed to grade anything. State is now a
   letterspaced small-caps line — the register a clinical instrument
   labels itself in — every number is tabular, and rules are hairlines.
   No status colour anywhere except amber, which means "look at this".

   ══ WHAT IT REFUSES TO SAY ══
   Nothing here interprets (`ecgIdentity.ts` header). Every difference is
   printed as an arithmetic statement — value, baseline, delta — and the
   footer says in plain words that this is a comparison with the patient's
   own past recordings and not a diagnosis. That sentence is part of the
   screen and must not be removed to save a line.

   This screen is doctor-dense and scrolls, which is deliberate: History is
   the one patient-facing tab the UX direction exempts from "must fit
   without scrolling". It scrolls UNDER the glass dock — see the content
   inset below.
   ================================================================== */

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  buildBaselineSequence,
  type DeviationKind,
  type EcgLeadName,
  type ExclusionReason,
  type IdentityDeviation,
  type IdentityMatch,
  type MeasurementStats,
} from '@cyphix/shared';
import MetricTile from '@/components/atoms/MetricTile';
import BeatBuilder from '@/components/molecules/BeatBuilder';
import BeatSignature, { type CaliperReading } from '@/components/molecules/BeatSignature';
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
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** Patient scope — the same argument History's list is fetched with. */
  patientId?: string;
  onOpenStudy: (recordingId: string) => void;
}

/** Card padding, in one place: the signature is sized by subtracting it. */
const CARD_PAD = 14;

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
 * widespread it was. What is removed is thirteen repetitions of the same
 * sentence, which is what made the real signal unreadable.
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

export default function EcgIdentityPanel({ patientId, onOpenStudy }: Props) {
  const t = useTheme();
  const { t: tr, lang, rtl } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const view = useEcgIdentity(patientId);

  const [lead, setLead] = useState<EcgLeadName>('II');
  const [compare, setCompare] = useState(true);
  const [cardWidth, setCardWidth] = useState(0);
  const [caliper, setCaliper] = useState<CaliperReading | null>(null);
  /** How many studies the builder is averaging. null = all of them. */
  const [built, setBuilt] = useState<number | null>(null);

  const align = rtl ? ('right' as const) : ('left' as const);
  const identity = view.identity;

  /* ★ The newest study that was SCORED — which includes one excluded as an
     `outlier`.

     Showing only `excluded === null` here was a bug worth naming: a new
     study that does not match is barred from shaping the baseline (rightly
     — a stranger may not redefine you), and the card would then skip past
     it to the last study that DID match. The single most interesting
     result in the whole feature would have been the one it hid. The other
     exclusions genuinely have nothing to show. */
  const latest = useMemo(
    () => identity?.matches.find((m) => m.excluded === null || m.excluded === 'outlier') ?? null,
    [identity],
  );

  const flagged = useMemo(
    () => identity?.matches.filter((m) => m.flaggedAtEnrollment) ?? [],
    [identity],
  );

  /* The baseline as it stood after each study — what the builder scrubs
     through. Computed per lead, once, and only for the leads that have
     one; the sequence is an incremental accumulation, so it costs about
     the same as building the baseline once. */
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

  /** The latest study's discarded beats, for the evidence card. */
  const rejected = useMemo(() => {
    if (!latest) return null;
    const template = view.templateOf(latest.recordingId);
    const onLead = template?.leads[lead] ?? template?.leads.II;
    if (!onLead || onLead.rejected.length === 0) return null;
    return { beats: onLead.rejected, accepted: onLead.samples, total: onLead.beatsRejected };
  }, [latest, view, lead]);

  const fmtDate = useCallback(
    (iso: string) =>
      iso ? new Date(iso).toLocaleDateString(lang, { day: '2-digit', month: 'short' }) : '—',
    [lang],
  );

  /* ── States before there is anything to draw ─────────────────── */

  if (view.isError) {
    return (
      <Card>
        <Text style={[styles.cardTitle, { color: t.textPrimary, textAlign: align }]}>
          {tr('insTitle')}
        </Text>
        <Text style={[styles.body, { color: t.textSecondary, textAlign: align }]}>
          {tr('histLoadError')}
        </Text>
      </Card>
    );
  }

  const building = view.isLoading || view.isBuilding || view.progress !== null;

  if (!identity && building) {
    return (
      <Card>
        <Text style={[styles.cardTitle, { color: t.textPrimary, textAlign: align }]}>
          {tr('insBuilding')}
        </Text>
        <Text style={[styles.body, { color: t.textSecondary, textAlign: align }]}>
          {view.progress
            ? tr('insProgress', {
                done: String(view.progress.done),
                total: String(view.progress.total),
              })
            : tr('insBuildingBody')}
        </Text>
      </Card>
    );
  }

  if (!identity || identity.maturity === 'none') {
    return (
      <Card>
        <Text style={[styles.cardTitle, { color: t.textPrimary, textAlign: align }]}>
          {tr('insEmptyTitle')}
        </Text>
        <Text style={[styles.body, { color: t.textSecondary, textAlign: align }]}>
          {tr('insEmptyBody')}
        </Text>
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
      </Card>
    );
  }

  const established = identity.maturity === 'established';
  const remaining = Math.max(0, identity.enrollmentTarget - identity.enrolled);
  const sheetWidth = Math.max(80, cardWidth - CARD_PAD * 2 - 2);

  return (
    <ScrollView
      style={styles.scroll}
      /* ★ The dock's clearance lives HERE, not on the shell's padding, so
         the page travels behind the frosted bar instead of stopping on a
         bare strip above it (`PatientShell.scrollsUnderDock`). */
      contentContainerStyle={[
        styles.content,
        { paddingBottom: dockFootprint(insets.bottom, screenH) },
      ]}
      showsVerticalScrollIndicator={false}
      /* The signature and the builder both own horizontal drags; without
         this the scroll view steals them the moment a finger slides. */
      directionalLockEnabled
    >
      {/* ══ 1. The signature ══════════════════════════════════════ */}
      <View
        style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}
        onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
      >
        {/* The header is a two-column row where the LEFT column shrinks.
            Without `flexShrink` a Text in a row does not wrap — it runs
            straight under the ring, which is exactly what it did. */}
        <View style={[styles.head, rtl && styles.rowRtl]}>
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
            {identity.updatedAt && (
              <Text
                style={[styles.meta, { color: t.textTertiary, textAlign: align }]}
                numberOfLines={1}
              >
                {tr('insUpdated', { date: fmtDate(identity.updatedAt) })}
              </Text>
            )}
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

        {/* The caliper readout, in the CHROME. On the paper it would cover
            the deflections whose position it reports — History's calipers
            learned this in v0.16.0. Reserved height, so landing the
            caliper does not shift the sheet under the finger. */}
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

        {shown && cardWidth > 0 && (
          <BeatSignature
            baseline={shown.samples}
            tolerance={shown.tolerance}
            sampleRate={identity.sampleRate}
            rIndex={identity.rIndex}
            overlay={overlay}
            width={sheetWidth}
            label={lead}
            onCaliper={setCaliper}
          />
        )}

        {/* Drag to build the average study by study. It is the one control
            that EXPLAINS what an ECG ID is instead of describing it. */}
        {sequence.length > 1 && (
          <>
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
            {/* Only once they have actually pulled it back — the sentence
                explains something they are looking at, and printed up
                front it is a paragraph about a control nobody has used. */}
            {built !== null && (
              <Text style={[styles.hint, { color: t.textTertiary, textAlign: align }]}>
                {tr('insBuiltMeaning')}
              </Text>
            )}
          </>
        )}

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
            style={({ pressed }) => [
              styles.toggle,
              { borderColor: compare ? t.accent : t.border, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Ionicons
              name={compare ? 'eye' : 'eye-off-outline'}
              size={15}
              color={compare ? t.accentLive : t.textSecondary}
            />
            <Text style={[styles.toggleText, { color: compare ? t.accentLive : t.textSecondary }]}>
              {tr('insCompareLatest')}
            </Text>
          </Pressable>
        )}

        <View style={[styles.rule, { backgroundColor: t.border }]} />

        <LeadCoverageGrid
          coverage={identity.coverage}
          selected={lead}
          onSelect={(l) => setLead(l as EcgLeadName)}
          rtl={rtl}
        />
        <Text style={[styles.hint, { color: t.textTertiary, textAlign: align }]}>
          {tr('insCoverageBody')}
        </Text>
      </View>

      {/* ══ 2. The newest study, measured ═════════════════════════ */}
      {latest && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void Haptics.selectionAsync();
            onOpenStudy(latest.recordingId);
          }}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: t.surface, borderColor: t.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={[styles.rowBetween, rtl && styles.rowRtl]}>
            <Text style={[styles.sectionTitle, { color: t.textTertiary }]}>
              {tr('insLatestTitle')}
            </Text>
            <Text style={[styles.score, { color: scoreColour(latest, t) }]}>
              {tr('insMatch', { n: String(latest.similarity) })}
            </Text>
          </View>
          <Text style={[styles.meta, { color: t.textSecondary, textAlign: align }]}>
            {fmtDate(latest.recordedAt)}
            {/* A study scored but NOT counted toward the baseline has to say
                so here, or the reader assumes it moved the reference. */}
            {latest.excluded ? ` · ${tr(EXCLUSION_LABEL[latest.excluded])}` : ''}
          </Text>

          {latest.deviations.length === 0 ? (
            <Text style={[styles.body, { color: t.textSecondary, textAlign: align }]}>
              {tr('insNoDeviations')}
            </Text>
          ) : (
            <>
              <View style={[styles.chips, rtl && styles.rowRtl]}>
                {groupDeviations(latest.deviations).map((g) => (
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
              {/* ★ What a difference IS, in one sentence. The chips were
                  reported as unclear — and a number nobody can interpret
                  is worse than no number, because it worries without
                  informing. */}
              <Text style={[styles.hint, { color: t.textTertiary, textAlign: align }]}>
                {tr('insDeviationMeaning')}
              </Text>
            </>
          )}
        </Pressable>
      )}

      {/* ══ 3. The beats that were not used ══════════════════════ */}
      {rejected && cardWidth > 0 && (
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.sectionTitle, { color: t.textTertiary, textAlign: align }]}>
            {tr('insRejectedTitle', { n: String(rejected.total) })}
          </Text>
          <Text style={[styles.hint, { color: t.textSecondary, textAlign: align }]}>
            {tr('insRejectedBody')}
          </Text>
          <RejectedBeats
            accepted={rejected.accepted}
            rejected={rejected.beats}
            sampleRate={identity.sampleRate}
            width={sheetWidth}
            rtl={rtl}
            labels={{
              premature: tr('insRejPremature'),
              dissimilar: tr('insRejDissimilar'),
              truncated: tr('insRejTruncated'),
              match: (pct) => tr('insRejMatch', { n: String(pct) }),
            }}
          />
        </View>
      )}

      {/* ══ 4. Early studies that disagree with their own cohort ══ */}
      {flagged.length > 0 && (
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.attention }]}>
          <Text style={[styles.sectionTitle, { color: t.attention, textAlign: align }]}>
            {tr('insFlaggedTitle')}
          </Text>
          <Text style={[styles.body, { color: t.textSecondary, textAlign: align }]}>
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
                { borderColor: t.border, opacity: pressed ? 0.6 : 1 },
                rtl && styles.rowRtl,
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
      )}

      {/* ══ 5. Every study against the baseline, over time ════════ */}
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Text style={[styles.sectionTitle, { color: t.textTertiary, textAlign: align }]}>
          {tr('insTimelineTitle')}
        </Text>
        <SimilarityTimeline
          matches={identity.matches}
          onSelect={onOpenStudy}
          rtl={rtl}
          labels={{ top: '100', floor: '80', excluded: tr('insExcludedShort') }}
        />
      </View>

      {/* ══ 6. The numbers the baseline holds ════════════════════ */}
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Text style={[styles.sectionTitle, { color: t.textTertiary, textAlign: align }]}>
          {tr('insBaselineTitle')}
        </Text>
        <View style={styles.tiles}>
          <View style={styles.tile}>
            <MetricTile label={tr('mBpm')} value={identity.intervals.bpm} unit={tr('bpm')} />
          </View>
          <View style={styles.tile}>
            <MetricTile label={tr('iPR')} value={identity.intervals.prMs} unit="ms" />
          </View>
          <View style={styles.tile}>
            <MetricTile label={tr('iQRS')} value={identity.intervals.qrsMs} unit="ms" />
          </View>
          <View style={styles.tile}>
            <MetricTile label={tr('iQTcB')} value={identity.intervals.qtcMs} unit="ms" />
          </View>
          <View style={styles.tile}>
            <MetricTile label={tr('secAxis')} value={identity.intervals.axisDegrees} unit="°" />
          </View>
        </View>
      </View>

      {/* ══ 7. The habit that produced all of it ═════════════════ */}
      {view.stats && <CadenceCard stats={view.stats} rtl={rtl} />}

      <Text style={[styles.disclaimer, { color: t.textTertiary }]}>{tr('insDisclaimer')}</Text>
    </ScrollView>
  );
}

/* ── Presentational helpers ───────────────────────────────────────
   Defined at module scope, NOT inside the component. A function
   component declared in a render body is a new component TYPE on every
   render, so React unmounts and remounts its whole subtree each time —
   which here would tear down and rebuild the cadence chart every time the
   caliper moved. */

function Card({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={[styles.card, styles.standalone, { backgroundColor: t.surface, borderColor: t.border }]}
    >
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
      <Text
        style={[styles.readoutValue, { color: tint ?? t.textPrimary }]}
        allowFontScaling={false}
      >
        {value}
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
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Text style={[styles.sectionTitle, { color: t.textTertiary, textAlign: align }]}>
        {tr('insCadenceTitle')}
      </Text>
      <View style={[styles.factRow, rtl && styles.rowRtl]}>
        {facts.map((f) => (
          <View key={f} style={[styles.fact, { backgroundColor: t.bgSoft, borderColor: t.border }]}>
            <Text style={[styles.factText, { color: t.textSecondary }]}>{f}</Text>
          </View>
        ))}
      </View>
      <CadenceStrip
        byHour={stats.byHour}
        highlight={stats.busiestBlock}
        rtl={rtl}
        accessibilityLabel={tr('insCadenceTitle')}
      />
      {stats.busiestBlock && (
        <Text style={[styles.hint, { color: t.textSecondary, textAlign: align }]}>
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
function scoreColour(
  match: IdentityMatch,
  t: { attention: string; textPrimary: string },
): string {
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

  card: {
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: CARD_PAD,
    gap: 10,
  },
  standalone: { padding: 24, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  /* Small-caps, letterspaced, tertiary — the register an instrument labels
     its own panels in, and quiet enough that the DATA is the loud thing. */
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  body: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 12.5, flexShrink: 1 },
  hint: { fontSize: 11.5, lineHeight: 16 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  /* ★ `flexShrink` + `minWidth: 0` is what keeps this column out from
     under the ring. A Text in a row does not wrap by default — it
     overflows its parent and prints straight through whatever is beside
     it, which is precisely what "Confidence 48%" did. */
  headText: { flex: 1, flexShrink: 1, minWidth: 0, gap: 3 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  state: { fontSize: 11, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase' },

  readout: { flexDirection: 'row', alignItems: 'center', gap: 18, minHeight: 30 },
  readoutCell: { gap: 1 },
  readoutLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
  readoutValue: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },

  rule: { height: StyleSheet.hairlineWidth, marginVertical: 2 },

  legend: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 14, height: 3, borderRadius: 2 },
  legendText: { fontSize: 11 },

  toggle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleText: { fontSize: 12.5, fontWeight: '700' },

  score: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flagDate: { fontSize: 13.5, fontWeight: '700' },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  /* Two per row at any phone width: `MetricTile` prints words as well as
     numbers ("Slightly variable"), and a third column clips them. */
  tile: { flexGrow: 1, flexBasis: '46%' },

  factRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fact: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  factText: { fontSize: 11.5, fontWeight: '600' },

  reasons: { gap: 3, marginTop: 4 },
  reason: { fontSize: 11.5, fontVariant: ['tabular-nums'] },

  disclaimer: { fontSize: 11, lineHeight: 16, paddingHorizontal: 4, textAlign: 'center' },
});

// v2.0.0 — Reworked after device feedback that it read as a landing page rather
//          than an instrument:
//            • the green ESTABLISHED capsule is gone — state is a letterspaced
//              small-caps line, because green means "pass" and a baseline
//              existing is not a pass;
//            • the header column now shrinks, so it no longer prints under the
//              ring (a Text in a row does not wrap — it overflows);
//            • red is gone from every routine surface in favour of amber, and
//              the deviation chips gained a sentence saying what a difference
//              actually is;
//            • hairline rules and tabular figures throughout;
//            • a draggable CALIPER on the signature, reading out in the chrome;
//            • a BUILDER that assembles the baseline study by study under the
//              finger — the one control that explains the feature rather than
//              describing it;
//            • the discarded beats are drawn against the accepted one;
//            • the dock's clearance moved onto this scroll view's content
//              inset, so the page passes BEHIND the glass instead of stopping
//              on a bare grey strip above it.
// v1.0.0 — The Insights tab.
