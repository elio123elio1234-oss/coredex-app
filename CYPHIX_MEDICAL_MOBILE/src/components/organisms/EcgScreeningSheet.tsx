/* ==================================================================
   EcgScreeningSheet (organism) — page 3 of the report: the reading.

     page 1  the waveform      what was recorded
     page 2  the measurements  what can be measured from it
     page 3  THIS              what those measurements look like

   ══ THE ORDER IS THE DESIGN ══
   Answer, findings, limits, numbers, disclaimer — and it is deliberately
   the reverse of how a clinical report is built. A report earns its
   conclusion; a patient screen states the conclusion and then earns it,
   because the person reading has one question and will not scroll past
   three sections of context to reach it.

   ══ "WHAT THIS TEST CANNOT SEE" IS NOT A FOOTNOTE ══
   It sits ABOVE the numbers and it renders on a `clear` result too — most
   importantly there. Six limb leads cannot observe the anterior wall of
   the left ventricle at all, so a green mark with nothing next to it would
   be read as "my heart is fine" when what it says is "nothing the leads
   can see is wrong". Those are different sentences and only one of them is
   true. Putting the limits where they cannot be missed is the price of
   being allowed to show the green mark at all.

   ══ A SIMULATED RECORDING GETS NO VERDICT ══
   `useScreening` returns null for it and this sheet says what the
   recording IS instead. Not a caveat under a verdict — no verdict.
   (Mobile CLAUDE.md §4.)

   Purely presentational: handed an `EcgScreening`, it lays it out.
   ================================================================== */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { BlindSpotId, EcgScreening } from '@cyphix/shared';
import FadeUpView from '@/components/atoms/Auth/FadeUpView';
import MetricTile from '@/components/atoms/MetricTile';
import FindingCard from '@/components/molecules/FindingCard';
import ScreeningVerdict from '@/components/molecules/ScreeningVerdict';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** null when the recording is simulated — see the header. */
  screening: EcgScreening | null;
  /** True when there is no screening BECAUSE the signal was synthetic. */
  isSimulated: boolean;
  /** Heart rate from the measurement pass, shown among the statistics. */
  bpm: number | null;
}

const BLIND_KEY: Record<BlindSpotId, TranslationKey> = {
  anteriorSeptal: 'scrBlindAnteriorSeptal',
  posterior: 'scrBlindPosterior',
  chamberPrecordial: 'scrBlindChamberPrecordial',
  paroxysmal: 'scrBlindParoxysmal',
  singleTimepoint: 'scrBlindSingleTimepoint',
};

/** Stagger between finding cards. Long enough to read as a sequence, short
    enough that the fourth card is not still arriving when the eye gets there. */
const CARD_STAGGER = 70;
const CARDS_START = 220;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  const { rtl } = useTranslation();
  return (
    <View style={styles.section}>
      <Text
        style={[styles.sectionTitle, { color: t.textSecondary, textAlign: rtl ? 'right' : 'left' }]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function EcgScreeningSheet({ screening, isSimulated, bpm }: Props) {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);

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

  return (
    <View style={styles.sheet}>
      <ScreeningVerdict level={level} checksLine={checksLine} />

      {/* ── What was found ── */}
      {findings.length > 0 && (
        <Section title={tr('scrFindingsTitle')}>
          <View style={styles.cards}>
            {findings.map((f, i) => (
              <FadeUpView key={f.id} delay={CARDS_START + i * CARD_STAGGER} distance={12}>
                <FindingCard finding={f} />
              </FadeUpView>
            ))}
          </View>
        </Section>
      )}

      {/* ── What this test cannot see. ALWAYS, and above the numbers. ── */}
      <Section title={tr('scrBlindTitle')}>
        <View style={[styles.blindCard, { backgroundColor: t.bgSoft, borderColor: t.border }]}>
          {blindSpots.map((id) => (
            <View key={id} style={[styles.blindRow, rtl && styles.rowRtl]}>
              <Ionicons
                name="ellipse-outline"
                size={13}
                color={t.textTertiary}
                style={styles.blindDot}
              />
              <Text style={[styles.blindText, { color: t.textSecondary, textAlign: align }]}>
                {tr(BLIND_KEY[id])}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      {/* ── The numbers ── */}
      <Section title={tr('scrStatsTitle')}>
        <View style={styles.grid}>
          <MetricTile label={tr('scrStatRate')} value={bpm} unit="BPM" />
          <MetricTile
            label={tr('scrStatChecks')}
            value={`${stats.rulesEvaluated}/${stats.rulesTotal}`}
          />
          <MetricTile label={tr('scrStatBeats')} value={stats.beatsAnalyzed} />
          <MetricTile label={tr('scrStatEctopy')} value={stats.ectopyBurdenPct} unit="%" />
          <MetricTile label={tr('scrStatQuality')} value={stats.signalQuality} unit="%" />
          <MetricTile label={tr('scrStatDuration')} value={stats.analysedSeconds} unit="s" />
        </View>
      </Section>

      <Text style={[styles.disclaimer, { color: t.textTertiary, textAlign: align }]}>
        {tr('scrDisclaimer')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: 22 },
  section: { gap: 10 },
  /* Sentence case in the secondary colour, not 11 px letterspaced caps in the
     faintest one — v0.42.0 established that the quiet version reads as a wall
     and gives the eye no structure. */
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  cards: { gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  blindCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 9,
  },
  blindRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  rowRtl: { flexDirection: 'row-reverse' },
  /* Nudged down to sit on the first line's baseline rather than its cap. */
  blindDot: { marginTop: 3 },
  blindText: { flex: 1, fontSize: 13.5, lineHeight: 19 },
  disclaimer: { fontSize: 11.5, lineHeight: 16.5 },
  simCard: {
    alignItems: 'center',
    gap: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.lg,
    paddingVertical: 30,
    paddingHorizontal: 22,
  },
  simTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  simBody: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});

// v1.0.0 — The Interpretation tab: verdict, findings with their evidence, the
//          blind spots six limb leads structurally cannot cover, the statistics,
//          and the screening disclaimer. No verdict at all for a simulated study.
