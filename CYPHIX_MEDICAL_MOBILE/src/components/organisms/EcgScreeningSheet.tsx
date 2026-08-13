/* ==================================================================
   EcgScreeningSheet (organism) — page 3 of the report: the reading.

     page 1  the waveform      what was recorded
     page 2  the measurements  what can be measured from it
     page 3  THIS              what those measurements look like

   ══ THE ORDER IS THE DESIGN ══
   Answer, findings, limits, numbers — deliberately the reverse of how a
   clinical report is built. A report earns its conclusion; a patient screen
   states the conclusion and then earns it, because the reader has one
   question and will not scroll past three sections of context to reach it.

   ══ EVERY FINDING IS TAPPABLE, AND THAT IS THE POINT ══
   The first version showed a name, a line, and two raw numbers. Reported as
   *"what is this? it is not informative. why did it decide that?"* — so
   each card now opens `WhyFindingSheet`, which draws the measurement on the
   patient's OWN waveform and says in ordinary words why it happens.

   ══ "WHAT THIS TEST CANNOT SEE" IS NOT A FOOTNOTE ══
   It renders on a `clear` result too, most importantly there. Six limb
   leads cannot observe the anterior wall of the left ventricle at all, so a
   green mark with nothing beside it would be read as "my heart is fine"
   when what it says is "nothing these leads can see is wrong". Those are
   different sentences and only one of them is true.

   ══ A SIMULATED RECORDING GETS NO VERDICT ══
   `useScreening` returns null for it and this sheet says what the recording
   IS instead. Not a caveat under a verdict — no verdict (CLAUDE.md §4).
   ================================================================== */

import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { BlindSpotId, EcgAnalysis, EcgScreening, ScreeningFinding } from '@cyphix/shared';
import FadeUpView from '@/components/atoms/Auth/FadeUpView';
import FindingCard from '@/components/molecules/FindingCard';
import ScreeningVerdict from '@/components/molecules/ScreeningVerdict';
import StatCard from '@/components/molecules/StatCard';
import WhyFindingSheet from '@/components/organisms/WhyFindingSheet';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** null when the recording is simulated — see the header. */
  screening: EcgScreening | null;
  isSimulated: boolean;
  /** Lead II and the measurements, for the Why sheet's waveform. */
  signal: Float32Array | null;
  analysis: EcgAnalysis | null;
}

const BLIND_KEY: Record<BlindSpotId, TranslationKey> = {
  anteriorSeptal: 'scrBlindAnteriorSeptal',
  posterior: 'scrBlindPosterior',
  chamberPrecordial: 'scrBlindChamberPrecordial',
  paroxysmal: 'scrBlindParoxysmal',
  singleTimepoint: 'scrBlindSingleTimepoint',
};

/** Stagger between finding cards. Long enough to read as a sequence, short
    enough that the fourth is not still arriving when the eye gets there. */
const CARD_STAGGER = 70;
const CARDS_START = 200;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  const { rtl } = useTranslation();
  return (
    <View style={styles.section}>
      <Text
        style={[styles.sectionTitle, { color: t.textPrimary, textAlign: rtl ? 'right' : 'left' }]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function EcgScreeningSheet({ screening, isSimulated, signal, analysis }: Props) {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);
  const [explaining, setExplaining] = useState<ScreeningFinding | null>(null);

  /* ── No verdict at all for a synthetic signal ── */
  if (!screening) {
    return (
      <View style={styles.sheet}>
        <View style={[styles.simCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Ionicons name="flask-outline" size={34} color={t.textTertiary} />
          <Text style={[styles.simTitle, { color: t.textPrimary }]}>
            {isSimulated ? tr('scrSimTitle') : tr('scrLevelInconclusive')}
          </Text>
          <Text style={[styles.simBody, { color: t.textSecondary }]}>
            {isSimulated ? tr('scrSimBody') : tr('scrActInconclusive')}
          </Text>
        </View>
      </View>
    );
  }

  const { level, findings, blindSpots, stats } = screening;
  const checksLine = tr('scrChecksLine', {
    done: String(stats.rulesEvaluated),
    total: String(stats.rulesTotal),
  });
  const checksRatio = stats.rulesTotal > 0 ? stats.rulesEvaluated / stats.rulesTotal : 0;

  return (
    <View style={styles.sheet}>
      <ScreeningVerdict level={level} checksLine={checksLine} />

      {findings.length > 0 && (
        <Section title={tr('scrFindingsTitle')}>
          <View style={styles.cards}>
            {findings.map((f, i) => (
              <FadeUpView key={f.id} delay={CARDS_START + i * CARD_STAGGER} distance={12}>
                <FindingCard finding={f} onExplain={setExplaining} />
              </FadeUpView>
            ))}
          </View>
        </Section>
      )}

      {/* ── The numbers ──
          `signalQuality` and the checks ratio carry the instrument green
          because they describe how well the DEVICE did, which is exactly
          what that token means. The rest stay plain: a heart rate is not
          good or bad and colouring it would say it was. */}
      <Section title={tr('scrStatsTitle')}>
        <View style={styles.grid}>
          <StatCard
            label={tr('scrStatChecks')}
            value={`${stats.rulesEvaluated}/${stats.rulesTotal}`}
            accent={t.signalInk}
            progress={checksRatio}
          />
          <StatCard
            label={tr('scrStatQuality')}
            value={stats.signalQuality}
            unit="%"
            accent={t.signalInk}
            progress={stats.signalQuality / 100}
          />
          <StatCard label={tr('scrStatRate')} value={analysis?.rate.bpm ?? null} unit="BPM" />
          <StatCard label={tr('scrStatBeats')} value={stats.beatsAnalyzed} />
          <StatCard label={tr('scrStatEctopy')} value={stats.ectopyBurdenPct} unit="%" />
          <StatCard label={tr('scrStatDuration')} value={stats.analysedSeconds} unit="s" />
        </View>
      </Section>

      {/* ── What this test cannot see. ALWAYS, including on a clear result. ── */}
      <Section title={tr('scrBlindTitle')}>
        <View style={[styles.blindCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          {blindSpots.map((id, i) => (
            <View
              key={id}
              style={[
                styles.blindRow,
                rtl && styles.rowRtl,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
              ]}
            >
              <Ionicons name="remove-outline" size={16} color={t.textTertiary} />
              <Text style={[styles.blindText, { color: t.textSecondary, textAlign: align }]}>
                {tr(BLIND_KEY[id])}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Text style={[styles.disclaimer, { color: t.textTertiary, textAlign: align }]}>
        {tr('scrDisclaimer')}
      </Text>

      <WhyFindingSheet
        finding={explaining}
        onClose={() => setExplaining(null)}
        signal={signal}
        analysis={analysis}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: 26 },
  section: { gap: 12 },
  /* Sentence case at 19 pt in the PRIMARY colour — Apple Health's section
     heading. v0.42.0 already established that 11 px letterspaced caps in
     the faintest colour reads as a wall and gives the eye no structure;
     this goes one step further, because these sections are the page's
     skeleton rather than labels on a table. */
  sectionTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  cards: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  blindCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingHorizontal: 18,
  },
  blindRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 13 },
  rowRtl: { flexDirection: 'row-reverse' },
  blindText: { flex: 1, fontSize: 14.5, lineHeight: 20 },
  disclaimer: { fontSize: 12, lineHeight: 17 },
  simCard: {
    alignItems: 'center',
    gap: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingVertical: 34,
    paddingHorizontal: 22,
  },
  simTitle: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  simBody: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
});

// v2.0.0 — Rebuilt at patient scale after "it looks dated and not native".
//          Every finding is now a tappable card that opens the Why sheet; the
//          statistics are 30 pt StatCards rather than the report's dense table
//          atom; sections are 19 pt headings; the blind spots became an inset
//          grouped list. The order (answer, findings, numbers, limits) is
//          unchanged — it was never the problem.
