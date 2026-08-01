/* ==================================================================
   StudyCard (molecule) — one recording in the History list.

   ══ WHAT THE WEB LIST SHOWS, AND WHY THE PHONE SHOWS IT DIFFERENTLY ══
   The web picks studies from a dropdown of one-line rows: date · bpm · two
   coloured dots for "simulated" and "low quality". Two 8 px dots
   distinguished only by hue is a hover-tooltip design — there is nothing to
   hover on a phone, and the difference between a real recording and a
   simulated one is the single most consequential fact in this list.

   So the flags are WORDS here, in their own colour, and the card carries
   the whole of the cached summary the list already has (`RecordingSummary`)
   rather than making the reader open a study to find out whether it is
   worth opening: rate, duration, and whether anyone has written on it.

   No waveform thumbnail, deliberately. A 40 pt sparkline of a 10 s ECG is
   an unreadable squiggle that nonetheless looks like clinical information,
   and a reader who thinks they can see the rhythm in it is being misled by
   the UI. The numbers are the honest preview.

   Purely presentational: it is handed a `RecordingListItem` view and a
   press handler.
   ================================================================== */

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export interface StudyCardLabels {
  bpm: string;
  simulated: string;
  lowQuality: string;
  notes: string;
  hasNote: string;
  leadSet: string;
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
  selected?: boolean;
  rtl: boolean;
  labels: StudyCardLabels;
  onPress: () => void;
}

export default function StudyCard({
  when,
  bpm,
  durationSec,
  sampleRate,
  isSimulated,
  insufficient,
  annotationCount,
  hasNote,
  selected,
  rtl,
  labels,
  onPress,
}: Props) {
  const t = useTheme();
  const align = rtl ? ('right' as const) : ('left' as const);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${when} · ${bpm ?? '—'} ${labels.bpm}`}
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
      <View style={[styles.row, rtl && styles.rowRtl]}>
        <View style={styles.main}>
          <Text style={[styles.when, { color: t.textPrimary, textAlign: align }]} numberOfLines={1}>
            {when}
          </Text>
          <Text style={[styles.meta, { color: t.textSecondary, textAlign: align }]} numberOfLines={1}>
            {labels.leadSet} · {durationSec.toFixed(1)}s · {sampleRate} Hz
          </Text>

          {(isSimulated || insufficient || annotationCount > 0 || hasNote) && (
            <View style={[styles.flags, rtl && styles.rowRtl]}>
              {isSimulated && (
                <Text style={[styles.flag, { color: t.danger, backgroundColor: t.dangerSoft }]}>
                  {labels.simulated}
                </Text>
              )}
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
        </View>

        {/* The rate, sized like the number it is. `—` when no rate could be
            measured — never 0, which reads as a finding. */}
        <View style={styles.rate}>
          <Text style={[styles.bpm, { color: t.textPrimary }]} allowFontScaling={false}>
            {bpm ?? '—'}
          </Text>
          <Text style={[styles.bpmUnit, { color: t.textTertiary }]} allowFontScaling={false}>
            {labels.bpm}
          </Text>
        </View>

        <Ionicons
          name={rtl ? 'chevron-back' : 'chevron-forward'}
          size={18}
          color={t.textTertiary}
          style={styles.chevron}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, padding: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowRtl: { flexDirection: 'row-reverse' },
  // `flexShrink: 1` is not optional here: a long localised flag label inside
  // a row does not wrap, it overflows through the card's border.
  main: { flex: 1, flexShrink: 1, gap: 3 },
  when: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 12.5, fontVariant: ['tabular-nums'] },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  flag: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  rate: { flexShrink: 0, alignItems: 'center' },
  bpm: { fontSize: 27, fontWeight: '800', fontVariant: ['tabular-nums'], lineHeight: 30 },
  bpmUnit: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6 },
  chevron: { flexShrink: 0 },
});

// v1.0.0 — History list row: the cached summary in words, flags as labels not
//          coloured dots, and deliberately no waveform thumbnail.
