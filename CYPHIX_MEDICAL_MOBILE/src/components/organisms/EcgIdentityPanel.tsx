/* ==================================================================
   EcgIdentityPanel (organism) — the INSIGHTS half of History.

   Where the Studies tab answers "what do I have", this answers the
   question a list cannot: **has anything changed?**

     ┌ ECG ID ─────────────────────── ◍ 5/5 ┐
     │        the signature beat, on paper,  │
     │        inside its tolerance corridor  │
     │  I  II  III  aVR aVL aVF              │
     │  V1 V2 V3 V4 V5 V6   (not yet)        │
     └───────────────────────────────────────┘
       Latest study · 97 %      [QRS +14 ms]
       Match over time    ▇▇▇▇▂▇▇▇
       Your baseline      PR QRS QTc Axis Rate
       When you measure   ▁▃▇▅▁▁▂▅▃▁

   ══ THE ORDER IS THE ARGUMENT ══
   Signature first, because it is the thing that did not exist before.
   Then the newest study measured against it — the only study anyone is
   actually asking about. Then the history of those measurements, then
   the numbers behind them, and finally the habit that produced them all.
   Each block answers a question raised by the one above it.

   ══ WHAT IT REFUSES TO SAY ══
   Nothing here interprets (`ecgIdentity.ts` header). Every difference is
   printed as an arithmetic statement — value, baseline, delta — and the
   footer says in plain words that this is a comparison with the patient's
   own past recordings and not a diagnosis. That sentence is not boilerplate
   and must not be removed to save a line.

   This screen is doctor-dense and scrolls, which is deliberate: History is
   the one patient-facing tab the UX direction exempts from "must fit
   without scrolling".
   ================================================================== */

import { useMemo, useState, type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type {
  DeviationKind,
  EcgLeadName,
  ExclusionReason,
  IdentityDeviation,
  IdentityMatch,
  MeasurementStats,
} from '@cyphix/shared';
import MetricTile from '@/components/atoms/MetricTile';
import BeatSignature from '@/components/molecules/BeatSignature';
import CadenceStrip from '@/components/molecules/CadenceStrip';
import DeviationChip from '@/components/molecules/DeviationChip';
import IdentityRing from '@/components/molecules/IdentityRing';
import LeadCoverageGrid from '@/components/molecules/LeadCoverageGrid';
import SimilarityTimeline from '@/components/molecules/SimilarityTimeline';
import { useEcgIdentity } from '@/features/insights/useEcgIdentity';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/config';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** Patient scope — the same argument History's list is fetched with. */
  patientId?: string;
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

/** Card padding, in one place: the signature is sized by subtracting it. */
const CARD_PAD = 14;

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
 * saying one thing. Grouped it is three: "Shape · 6 leads", "Outside range
 * · 6 leads", "Amplitude · 3 leads". Nothing is hidden, because the chip
 * still carries the WORST member's arithmetic and the lead count says how
 * widespread it was; what is removed is thirteen repetitions of the same
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
  // Most severe first, then largest — the reader's eye stops at the top.
  return [...groups.values()].sort((a, b) => {
    if (a.worst.severity !== b.worst.severity) return a.worst.severity === 'marked' ? -1 : 1;
    return b.leads.length - a.leads.length;
  });
}

export default function EcgIdentityPanel({ patientId, onOpenStudy }: Props) {
  const t = useTheme();
  const { t: tr, lang, rtl } = useTranslation();
  const view = useEcgIdentity(patientId);

  const [lead, setLead] = useState<EcgLeadName>('II');
  const [compare, setCompare] = useState(true);
  const [cardWidth, setCardWidth] = useState(0);

  const align = rtl ? ('right' as const) : ('left' as const);

  const identity = view.identity;

  /* ★ The newest study that was SCORED — which includes one excluded as an
     `outlier`.

     Showing only `excluded === null` here was a bug worth naming: a new
     study that does not match is barred from shaping the baseline (rightly
     — a stranger may not redefine you), and the card would then skip past
     it to the last study that DID match. The single most interesting
     result in the whole feature would have been the one it hid. The other
     exclusions genuinely have nothing to show: a simulator run and a strip
     with two clean beats were never measured against anything. */
  const latest = useMemo(
    () =>
      identity?.matches.find((m) => m.excluded === null || m.excluded === 'outlier') ?? null,
    [identity],
  );

  const flagged = useMemo(
    () => identity?.matches.filter((m) => m.flaggedAtEnrollment) ?? [],
    [identity],
  );

  /* The overlay: the newest study's own beat for the selected lead, drawn
     over the baseline. Loaded from nothing extra — the identity already
     holds every template it was built from. */
  const overlay = useMemo(() => {
    if (!compare || !identity || !latest) return null;
    return view.templateOf(latest.recordingId)?.leads[lead]?.samples ?? null;
  }, [compare, identity, latest, lead, view]);

  const fmtDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString(lang, { day: '2-digit', month: 'short' }) : '—';

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

  const selected = identity.leads[lead];

  const maturityLabel =
    identity.maturity === 'established' ? tr('insMatEstablished') : tr('insMatEnrolling');
  const remaining = Math.max(0, identity.enrollmentTarget - identity.enrolled);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ══ 1. The signature ══════════════════════════════════════ */}
      <View
        style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}
        onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
      >
        <View style={[styles.heroHead, rtl && styles.rowRtl]}>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: t.textPrimary, textAlign: align }]}>
              {tr('insTitle')}
            </Text>
            <View style={[styles.pillRow, rtl && styles.rowRtl]}>
              <View
                style={[
                  styles.pill,
                  {
                    backgroundColor:
                      identity.maturity === 'established' ? t.successSoft : t.accentSoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: identity.maturity === 'established' ? t.success : t.accentLive },
                  ]}
                >
                  {maturityLabel}
                </Text>
              </View>
              <Text style={[styles.meta, { color: t.textTertiary }]}>
                {tr('insConfidence', { n: String(identity.confidence) })}
              </Text>
            </View>
            <Text style={[styles.meta, { color: t.textSecondary, textAlign: align }]}>
              {tr('insBuiltFrom', { n: String(identity.enrolled) })}
              {identity.updatedAt ? ` · ${fmtDate(identity.updatedAt)}` : ''}
            </Text>
          </View>

          <IdentityRing
            enrolled={identity.enrolled}
            target={identity.enrollmentTarget}
            confidence={identity.confidence}
            accessibilityLabel={tr('insEnrollLabel')}
          />
        </View>

        {remaining > 0 && (
          <Text style={[styles.hint, { color: t.textSecondary, textAlign: align }]}>
            {tr('insEnrollHint', { n: String(remaining) })}
          </Text>
        )}

        {selected && cardWidth > 0 && (
          <BeatSignature
            baseline={selected.samples}
            tolerance={selected.tolerance}
            sampleRate={identity.sampleRate}
            rIndex={identity.rIndex}
            overlay={overlay}
            /* `onLayout` reports the card's OUTER width — padding and border
               included. Handing that straight to a fixed-width sheet puts
               30 pt of paper outside the card, which `overflow` then clips
               rather than reveals: the trace would simply lose its last
               60 ms with nothing on screen to say so. */
            width={Math.max(80, cardWidth - CARD_PAD * 2 - 2)}
            label={lead}
          />
        )}

        {/* Legend — a shaded region and a second trace mean nothing unless
            they are named. */}
        <View style={[styles.legend, rtl && styles.rowRtl]}>
          <Legend colour={t.textTertiary} label={tr('insLegendBand')} rtl={rtl} />
          {overlay && <Legend colour={t.accentLive} label={tr('insLegendLatest')} rtl={rtl} />}
        </View>

        {latest && (
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
            <Text style={[styles.cardTitle, { color: t.textPrimary }]}>{tr('insLatestTitle')}</Text>
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
          )}
        </Pressable>
      )}

      {/* ══ 3. Early studies that disagree with their own cohort ══ */}
      {flagged.length > 0 && (
        <View style={[styles.card, { backgroundColor: t.dangerSoft, borderColor: t.danger }]}>
          <Text style={[styles.cardTitle, { color: t.danger, textAlign: align }]}>
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
              <Text style={[styles.meta, { color: t.textSecondary }]}>
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

      {/* ══ 4. Every study against the baseline, over time ════════ */}
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Text style={[styles.cardTitle, { color: t.textPrimary, textAlign: align }]}>
          {tr('insTimelineTitle')}
        </Text>
        <SimilarityTimeline
          matches={identity.matches}
          onSelect={onOpenStudy}
          rtl={rtl}
          labels={{ top: '100', floor: '80', excluded: tr('insExcludedShort') }}
        />
      </View>

      {/* ══ 5. The numbers the baseline holds ════════════════════ */}
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Text style={[styles.cardTitle, { color: t.textPrimary, textAlign: align }]}>
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

      {/* ══ 6. The habit that produced all of it ═════════════════ */}
      {view.stats && <CadenceCard stats={view.stats} rtl={rtl} />}

      <Text style={[styles.disclaimer, { color: t.textTertiary }]}>{tr('insDisclaimer')}</Text>
    </ScrollView>
  );
}

/* ── Presentational helpers ───────────────────────────────────────
   Defined at module scope, NOT inside the component. A function
   component declared in a render body is a new component TYPE on every
   render, so React unmounts and remounts its whole subtree each time —
   which here would tear down and rebuild the cadence chart on every
   state change in the panel above it. */

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
      <Text style={[styles.cardTitle, { color: t.textPrimary, textAlign: align }]}>
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
function leadSuffix(g: DeviationGroup, tr: (k: TranslationKey, v?: Record<string, string>) => string): string {
  if (g.leads.length === 0) return '';
  if (g.leads.length === 1) return ` · ${g.leads[0]}`;
  return ` · ${tr('insDevLeads', { n: String(g.leads.length) })}`;
}

/** Green only when nothing is marked — colour must agree with the chips. */
function scoreColour(match: IdentityMatch, t: { success: string; danger: string; textPrimary: string }): string {
  if (match.deviations.some((d) => d.severity === 'marked')) return t.danger;
  if (match.similarity >= 90) return t.success;
  return t.textPrimary;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 10, paddingBottom: 16 },
  rowRtl: { flexDirection: 'row-reverse' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },

  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: CARD_PAD, gap: 10 },
  standalone: { padding: 24, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 12.5 },
  hint: { fontSize: 11.5, lineHeight: 16 },

  heroHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroText: { flex: 1, gap: 4 },
  heroTitle: { fontSize: 24, fontWeight: '800', letterSpacing: 0.2 },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

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
    borderWidth: 1,
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
  fact: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: RADIUS.sm, borderWidth: 1 },
  factText: { fontSize: 11.5, fontWeight: '600' },

  reasons: { gap: 3, marginTop: 4 },
  reason: { fontSize: 11.5, fontVariant: ['tabular-nums'] },

  disclaimer: { fontSize: 11, lineHeight: 16, paddingHorizontal: 4, textAlign: 'center' },
});

// v1.0.0 — The Insights tab: the ECG ID on paper inside its own corridor, the
//          newest study measured against it, the enrollment studies that
//          disagree, the match history, the baseline numbers and the
//          measurement habit — with the "not a diagnosis" line as part of the
//          screen rather than an afterthought.
