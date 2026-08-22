/* ==================================================================
   ValueTile (molecule) — one measured number on the Values screen.

   The redesign's replacement for `MetricTile`. Same contract on the one
   thing that matters — a measurement that could not be made renders "—",
   never 0 and never blank — and everything else is different: the tile is
   a translucent card, it can carry a tint that says which section it
   belongs to, it can hold a small figure under the number (a range meter,
   a beat count), and it is TAPPABLE.

   ══ WHY IT IS TAPPABLE ══
   "SDNN 56.6 ms" is a complete measurement and, to the patient this
   screen was redesigned for, no information at all. The tap opens one
   sentence saying what the quantity IS. It deliberately does not say
   whether the value is good: that is the line this app does not cross
   (root CLAUDE.md §2.3), and it is the same line the reference bands
   below are captioned with.

   The whole tile is the target — a 130 × 88 pt card, well past the 44 pt
   minimum, because the reader this is for does not aim precisely.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ValueSurface from '@/components/atoms/ValueSurface';
import { useTranslation } from '@/i18n/useTranslation';
import { VALUE_RADIUS, type ValuesPalette } from '@/theme/valuesPalette';

interface Props {
  palette: ValuesPalette;
  label: string;
  value: number | string | null;
  unit?: string;
  /** Small explanatory line under the number. */
  hint?: string;
  /** Section tint. Defaults to the neutral tile fill. */
  fill?: readonly [string, string];
  /** Colour of the number itself — the section accent, or the text colour. */
  valueColor?: string;
  /** Type size of the number. Long word-values (a rhythm class) take less. */
  valueSize?: number;
  /** A meter, a bar row — anything drawn under the number. */
  children?: ReactNode;
  onPress?: () => void;
  /** Read out with the label by a screen reader — the explainer sentence. */
  a11yHint?: string;
}

export default function ValueTile({
  palette,
  label,
  value,
  unit,
  hint,
  fill,
  valueColor,
  valueSize = 32,
  children,
  onPress,
  a11yHint,
}: Props) {
  const { rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);
  const missing = value === null || value === undefined || value === '';

  const body = (
    <ValueSurface
      colors={fill ?? palette.tile}
      border={palette.cardBd}
      radius={VALUE_RADIUS.tile}
      style={styles.surface}
    >
      <Text style={[styles.label, { color: palette.dim, textAlign: align }]} numberOfLines={2}>
        {label.toUpperCase()}
      </Text>

      {/* The number is never mirrored — digits read left-to-right in Hebrew
          too. Only which edge the pair starts from changes, and the unit
          keeps following the number rather than leading it. */}
      <View style={[styles.valueRow, rtl && styles.valueRowRtl]}>
        <Text
          style={[
            styles.value,
            { fontSize: valueSize, lineHeight: valueSize * 1.06 },
            { color: missing ? palette.dim : (valueColor ?? palette.txt) },
          ]}
        >
          {missing ? '—' : String(value)}
        </Text>
        {!missing && unit != null && (
          <Text
            style={[
              styles.unit,
              { color: palette.muted },
              rtl ? { marginRight: 4 } : { marginLeft: 4 },
            ]}
          >
            {unit}
          </Text>
        )}
      </View>

      {hint != null && (
        <Text style={[styles.hint, { color: palette.dim, textAlign: align }]}>{hint}</Text>
      )}
      {children}
    </ValueSurface>
  );

  if (!onPress) return <View style={styles.cell}>{body}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${missing ? '—' : String(value)}${unit ? ` ${unit}` : ''}`}
      accessibilityHint={a11yHint}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /* Two per row, and only two: `46%` cannot fit three, and `flexGrow`
     then shares the remainder so a row of two ends flush rather than
     ragged. Same arithmetic `MetricTile` uses — the grid did not change,
     only what sits in it. */
  cell: { flexGrow: 1, flexBasis: '46%', minWidth: 130 },
  /* The press state is a scale in the handoff; on RN a transform on a
     gradient view is the one thing that can flicker mid-press, so the
     feedback is opacity plus the haptic. */
  pressed: { opacity: 0.62 },
  surface: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 13 },
  label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 7 },
  valueRowRtl: { flexDirection: 'row-reverse', justifyContent: 'flex-start' },
  /* `flexShrink` is what keeps a word-valued measurement inside the tile:
     a Text in a row does not wrap, it overflows and prints through the
     border ("Slightly variable" is 17 characters). */
  value: { flexShrink: 1, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  /* The unit never shrinks — "ms" broken over two lines is worse than a
     slightly narrower number. */
  unit: { flexShrink: 0, fontSize: 12, fontWeight: '600' },
  hint: { fontSize: 11.5, lineHeight: 15.5, marginTop: 5 },
});

// v0.59.0 — The redesigned measurement tile: translucent, section-tinted, and
//           tappable for one sentence saying what the quantity is.
