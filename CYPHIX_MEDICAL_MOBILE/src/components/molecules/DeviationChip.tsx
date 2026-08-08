/* ==================================================================
   DeviationChip (molecule) — one difference from the baseline, stated so
   it can be checked.

        ┌──────────────────────────────┐
        │ QRS  +14 ms      98 → 112 ms │
        └──────────────────────────────┘
          what     how far    from → to

   ══ THE ARITHMETIC IS ON THE CHIP, ON PURPOSE ══
   "QRS wider" is a claim a reader has to take on trust. "+14 ms, 98 →
   112" is the same claim with its working shown: a clinician can see the
   baseline it was measured against, and can disagree with it. That
   difference is what makes this a measurement rather than an opinion, and
   it is the same rule the whole analysis stack runs on (`ecgIdentity.ts`
   header — nothing here interprets).

   ══ AMBER, NEVER RED ══
   Red on a medical device means alarm: something is wrong, act now. This
   is a distance from a personal baseline — the app is not permitted to say
   whether it is wrong, and it does not know. Reported from the phone that
   the red made people tense before they had read what it referred to,
   which is exactly the failure mode: a colour that interprets, on a layer
   forbidden from interpreting. Amber says "look at this" and stops there.

   Colour is never the only carrier either: `marked` and `watch` differ in
   fill, in border AND in the label, so the chip survives a colour-blind
   reader and a greyscale screenshot.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import type { IdentityDeviation } from '@cyphix/shared';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  deviation: IdentityDeviation;
  /** Already-localised name of the measurement, e.g. "QRS" or "Shape · II". */
  label: string;
  /** Localised severity word — never the only signal, see the header. */
  severityLabel: string;
  rtl?: boolean;
}

/** Digits a unit is worth showing. mV needs two; nobody reads 0.42 ms. */
const DECIMALS: Record<IdentityDeviation['unit'], number> = {
  ms: 0,
  mV: 2,
  deg: 0,
  bpm: 0,
  ratio: 2,
  '%': 0,
};

function format(value: number, unit: IdentityDeviation['unit']): string {
  return value.toFixed(DECIMALS[unit]);
}

export default function DeviationChip({ deviation, label, severityLabel, rtl }: Props) {
  const t = useTheme();
  const marked = deviation.severity === 'marked';

  const tint = marked ? t.attention : t.textSecondary;
  const fill = marked ? t.attentionSoft : t.bgSoft;
  const border = marked ? t.attention : t.border;

  const unit = deviation.unit === 'ratio' ? '' : ` ${deviation.unit}`;
  const sign = deviation.delta > 0 ? '+' : '';

  return (
    <View
      style={[styles.chip, rtl && styles.chipRtl, { backgroundColor: fill, borderColor: border }]}
      accessibilityRole="text"
      accessibilityLabel={`${label}, ${severityLabel}, ${sign}${format(deviation.delta, deviation.unit)}${unit}`}
    >
      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.delta, { color: tint }]} allowFontScaling={false}>
        {sign}
        {format(deviation.delta, deviation.unit)}
        {unit}
      </Text>
      {/* The pair it came from. Small, quiet, and never omitted. */}
      <Text style={[styles.from, { color: t.textTertiary }]} allowFontScaling={false}>
        {format(deviation.baseline, deviation.unit)} → {format(deviation.value, deviation.unit)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipRtl: { flexDirection: 'row-reverse' },
  label: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  delta: { fontSize: 12.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  from: { fontSize: 10.5, fontVariant: ['tabular-nums'] },
});

// v1.1.0 — Amber, not red: red is an alarm, and a distance from your own
//          baseline is a measurement. Hairline border.
// v1.0.0 — One deviation with its own arithmetic on it (delta, and the
//          baseline → value pair it came from), graded by fill, border and word
//          rather than by colour alone.
