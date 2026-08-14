/* ==================================================================
   StudyCard (molecule) — one recording in the History list.

   ══ v2: THE ROW ANSWERS THE PATIENT'S QUESTION ══
   v1 showed the cached summary — date, rate, duration, flags — and argued
   in this header that a waveform thumbnail would be "an unreadable
   squiggle that looks like clinical information". Half of that argument
   held and half did not:

   * The half that held: 10 seconds in 40 pt IS unreadable, and the row's
     clinical statement should never be a squiggle. So the statement is a
     VERDICT PILL — the same `ScreeningLevel`, palette and honesty rules
     as the Findings tab (computed by the full 43-rule engine via the
     study digest cache, never a shortcut), so the row and the detail
     screen cannot disagree. A simulated study shows the SIMULATION chip
     where the verdict would go, because synthetic data is never screened.
   * The half that did not: a FOUR-second window at a fixed time scale is
     not a squiggle — it is the preview Kardia ships on every row, and it
     lets a reader recognise a recording ("the noisy one", "the fast one")
     before opening it. `EcgMiniPreview`'s header carries the full
     argument.

   The digest arrives asynchronously (computed once per study, cached on
   device). Until it does, the pill slot and the preview render fixed-size
   placeholders — the card must not change height as knowledge arrives.

   Purely presentational: it is handed a `RecordingListItem` view, the
   row's digest-derived facts, and a press handler.
   ================================================================== */

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ScreeningLevel } from '@cyphix/shared';
import EcgMiniPreview from '@/components/molecules/EcgMiniPreview';
import { verdictPalette } from '@/components/molecules/ScreeningVerdict';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export interface StudyCardLabels {
  bpm: string;
  simulated: string;
  lowQuality: string;
  notes: string;
  hasNote: string;
  leadSet: string;
  /** Short verdict forms — compressed labels for the LONG `scrLevel*`
      verdicts. Same level, same palette; only the word count differs. */
  verdictClear: string;
  verdictAttention: string;
  verdictUrgent: string;
  verdictInconclusive: string;
  previewA11y: string;
}

interface Props {
  when: string;
  bpm: number | null;
  durationSec: number;
  sampleRate: number;
  isSimulated: boolean;
  insufficient: boolean;
  annotationCount: number;
  hasNote: boolean;
  /** `undefined` = digest not built yet (placeholder); `null` = simulated
      (never screened — the SIMULATION chip renders instead). */
  verdict: ScreeningLevel | null | undefined;
  /** The 4 s lead II preview, when the digest has one. */
  preview: { samples: Float32Array; sampleRate: number } | null;
  selected?: boolean;
  rtl: boolean;
  labels: StudyCardLabels;
  onPress: () => void;
}

/** The preview strip's height — enough for a QRS to be a shape, small
    enough that ~4 rows still fit a phone screen. */
const PREVIEW_H = 44;

export default function StudyCard({
  when,
  bpm,
  durationSec,
  sampleRate,
  isSimulated,
  insufficient,
  annotationCount,
  hasNote,
  verdict,
  preview,
  selected,
  rtl,
  labels,
  onPress,
}: Props) {
  const t = useTheme();
  const align = rtl ? ('right' as const) : ('left' as const);

  const verdictLabel: Record<ScreeningLevel, string> = {
    clear: labels.verdictClear,
    attention: labels.verdictAttention,
    urgent: labels.verdictUrgent,
    inconclusive: labels.verdictInconclusive,
  };

  const pill = verdict != null ? verdictPalette(verdict, t) : null;
  const a11yVerdict = isSimulated
    ? labels.simulated
    : verdict != null
      ? verdictLabel[verdict]
      : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${when} · ${a11yVerdict} · ${bpm ?? '—'} ${labels.bpm}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? t.surfaceHover : t.surface,
          borderColor: selected ? t.brandNavy : t.border,
          borderWidth: selected ? 1.5 : 1,
        },
      ]}
    >
      {/* ── Row 1: the claim (verdict / SIMULATION) and the rate ── */}
      <View style={[styles.headRow, rtl && styles.rowRtl]}>
        {isSimulated ? (
          <View style={[styles.pill, { backgroundColor: t.dangerSoft }]}>
            <Text style={[styles.pillText, { color: t.danger }]}>{labels.simulated}</Text>
          </View>
        ) : pill && verdict != null ? (
          <View style={[styles.pill, styles.pillRow, rtl && styles.rowRtl, { backgroundColor: pill.soft }]}>
            <View style={[styles.pillDot, { backgroundColor: pill.accent }]} />
            <Text style={[styles.pillText, { color: pill.ink }]}>{verdictLabel[verdict]}</Text>
          </View>
        ) : (
          /* Digest still computing: a quiet slot of the same height, so the
             pill's arrival never reflows the card. */
          <View style={[styles.pill, styles.pillGhost, { backgroundColor: t.surfaceHover }]} />
        )}

        <View style={styles.spacer} />

        <View style={[styles.rate, rtl && styles.rowRtl]}>
          <Text style={[styles.bpm, { color: t.textPrimary }]} allowFontScaling={false}>
            {bpm ?? '—'}
          </Text>
          <Text style={[styles.bpmUnit, { color: t.textTertiary }]} allowFontScaling={false}>
            {labels.bpm}
          </Text>
        </View>

        <Ionicons
          name={rtl ? 'chevron-back' : 'chevron-forward'}
          size={17}
          color={t.textTertiary}
        />
      </View>

      {/* ── Row 2: what the recording looks like ── */}
      {preview ? (
        <EcgMiniPreview
          samples={preview.samples}
          sampleRate={preview.sampleRate}
          height={PREVIEW_H}
          stroke={t.accentLive}
          gridColor={t.border}
          accessibilityLabel={labels.previewA11y}
        />
      ) : (
        <View style={[styles.previewGhost, { backgroundColor: t.bgSoft }]} />
      )}

      {/* ── Row 3: when, and the recording's shape ── */}
      <View style={styles.metaBlock}>
        <Text style={[styles.when, { color: t.textPrimary, textAlign: align }]} numberOfLines={1}>
          {when}
        </Text>
        <Text style={[styles.meta, { color: t.textSecondary, textAlign: align }]} numberOfLines={1}>
          {labels.leadSet} · {durationSec.toFixed(1)}s · {sampleRate} Hz
        </Text>
      </View>

      {/* ── Row 4: the remaining flags (SIMULATION moved to the pill slot) ── */}
      {(insufficient || annotationCount > 0 || hasNote) && (
        <View style={[styles.flags, rtl && styles.rowRtl]}>
          {insufficient && (
            <Text style={[styles.flag, { color: t.textSecondary, backgroundColor: t.accentSoft }]}>
              {labels.lowQuality}
            </Text>
          )}
          {annotationCount > 0 && (
            <Text style={[styles.flag, { color: t.textSecondary, backgroundColor: t.accentSoft }]}>
              {labels.notes.replace('{n}', String(annotationCount))}
            </Text>
          )}
          {hasNote && (
            <Text style={[styles.flag, { color: t.textSecondary, backgroundColor: t.accentSoft }]}>
              {labels.hasNote}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, padding: 15, gap: 9 },
  rowRtl: { flexDirection: 'row-reverse' },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spacer: { flex: 1 },
  /* The pill is a VIEW that owns radius + padding, never a bare Text with
     `overflow: hidden` — a stadium radius on a text node clips glyphs. */
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 26,
    justifyContent: 'center',
  },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillGhost: { width: 96 },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  rate: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bpm: { fontSize: 21, fontWeight: '800', fontVariant: ['tabular-nums'], lineHeight: 24 },
  bpmUnit: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  previewGhost: { height: 44, borderRadius: RADIUS.sm },
  metaBlock: { gap: 2 },
  when: { fontSize: 14.5, fontWeight: '700' },
  meta: { fontSize: 12, fontVariant: ['tabular-nums'] },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  flag: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
});

// v2.0.0 — Kardia-style row: verdict pill (full 43-rule level, via the study
//          digest cache) or SIMULATION where the verdict would go, a real 4 s
//          lead II preview at fixed time scale, then date · meta · flags.
//          Placeholders reserve both slots so the card never reflows as the
//          digest arrives.
// v1.0.0 — History list row: the cached summary in words, flags as labels not
//          coloured dots, and deliberately no waveform thumbnail.
