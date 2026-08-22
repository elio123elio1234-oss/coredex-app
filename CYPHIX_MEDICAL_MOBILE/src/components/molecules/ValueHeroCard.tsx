/* ==================================================================
   ValueHeroCard (molecule) — the heart rate, the trace, and the three
   facts that qualify them.

   The top card of the redesigned Values screen: the one number a patient
   came to see, the recording it was measured from, and the chips that say
   what kind of recording that was — how steady, how long, at what rate.

   ══ THE CHIPS ARE NOT A VERDICT ══
   The rhythm chip is amber because the RHYTHM SECTION is amber, in every
   state including "Regular". It does not turn amber when the rhythm is
   variable and it does not turn green when it is not — a chip that
   changed colour with the measurement would be a grade, and this app does
   not grade (root CLAUDE.md §2.3).

   ══ THE BIG NUMBER IS A FLAT COLOUR, AND THE HANDOFF'S IS A GRADIENT ══
   The handoff fills "82" with `linear-gradient(160deg,#13161f,#e0325b)`
   using `background-clip: text`, which React Native has no equivalent
   for. The only ways to get it are a masked view — a native dependency,
   which would turn this release from a JS update into a 40-minute
   rebuild — or SVG text, which gives up `tabular-nums` and the font
   metrics that keep "82" and "BPM" on one baseline. Neither is worth it
   for a two-stop gradient that ends up ~90 % crimson anyway, so the
   number takes the crimson and the card keeps the gradient. Recorded in
   PARITY.md as a deliberate divergence.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import ValueSparkline from '@/components/atoms/ValueSparkline';
import ValueSurface from '@/components/atoms/ValueSurface';
import { useTranslation } from '@/i18n/useTranslation';
import { VALUE_RADIUS, type ValuesPalette } from '@/theme/valuesPalette';

interface Props {
  palette: ValuesPalette;
  bpm: number | null;
  bpmUnit: string;
  /** Lead II, filtered — the trace under the number. */
  signal: Float32Array | null;
  /** Width available to the trace, measured by the caller. */
  traceWidth: number;
  /** The rhythm class, in the reader's language. */
  rhythmLabel: string;
  /** "9.9 s" and "320 Hz", already formatted. */
  durationLabel: string;
  sampleRateLabel: string;
  /** Shown instead of the chips when the recording is a simulation. */
  simulatedLabel?: string | null;
}

const TRACE_H = 56;

export default function ValueHeroCard({
  palette,
  bpm,
  bpmUnit,
  signal,
  traceWidth,
  rhythmLabel,
  durationLabel,
  sampleRateLabel,
  simulatedLabel,
}: Props) {
  const { rtl } = useTranslation();

  return (
    <ValueSurface
      colors={palette.cardBg}
      border={palette.cardBd}
      radius={VALUE_RADIUS.hero}
      style={styles.card}
    >
      <View style={[styles.head, rtl && styles.rowRtl]}>
        {/* The pulse dot: a mark, not a status light. It is the section's
            red at all times and never reports anything. */}
        <View style={[styles.dot, { backgroundColor: palette.red }]} />
        <Text style={[styles.bpm, { color: bpm === null ? palette.dim : palette.red }]}>
          {bpm === null ? '—' : String(bpm)}
        </Text>
        <Text style={[styles.bpmUnit, { color: palette.muted }]}>{bpmUnit}</Text>
      </View>

      {/* Nothing is drawn until the card has been measured — a trace built
          against a zero width is a vertical line at x = 0. */}
      <View style={[styles.trace, { height: TRACE_H }]}>
        <ValueSparkline
          samples={signal}
          width={traceWidth}
          height={TRACE_H}
          stroke={palette.red}
        />
      </View>

      <View style={[styles.chips, rtl && styles.rowRtl]}>
        {simulatedLabel ? (
          <Text
            style={[
              styles.chip,
              { color: palette.amber, backgroundColor: palette.amberChip, borderColor: palette.amberBd },
            ]}
          >
            {simulatedLabel}
          </Text>
        ) : null}
        <Text
          style={[
            styles.chip,
            { color: palette.amber, backgroundColor: palette.amberChip, borderColor: palette.amberBd },
          ]}
        >
          {rhythmLabel}
        </Text>
        <Text
          style={[
            styles.chip,
            { color: palette.muted, backgroundColor: palette.chip, borderColor: palette.hair },
          ]}
        >
          {durationLabel}
        </Text>
        <Text
          style={[
            styles.chip,
            { color: palette.muted, backgroundColor: palette.chip, borderColor: palette.hair },
          ]}
        >
          {sampleRateLabel}
        </Text>
      </View>
    </ValueSurface>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18 },
  rowRtl: { flexDirection: 'row-reverse' },
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  dot: { width: 9, height: 9, borderRadius: 5, marginBottom: 16 },
  bpm: {
    fontSize: 68,
    lineHeight: 68,
    fontWeight: '700',
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  bpmUnit: { fontSize: 15, fontWeight: '600', letterSpacing: 0.5, marginBottom: 11 },
  trace: { marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  chip: {
    fontSize: 12.5,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: VALUE_RADIUS.chip,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

// v0.59.0 — The Values hero: the rate, the study's own lead II under it, and
//           chips whose colours section the card rather than grade it.
