/* ==================================================================
   ValueIntervalRow (molecule) — one interval against its reference band.

   The redesign's replacement for `IntervalBar`. The geometry is the same
   idea and is what makes this readable at all: a fixed scale, the typical
   adult band shaded on it, and a marker where THIS recording landed.

   ══ THE BAND IS CONTEXT, AND SAYS SO ══
   Every hospital ECG form prints these ranges; leaving them off would
   make the number less useful, not more careful. What is not allowed is
   letting the band GRADE the value — no red-outside/green-inside, no
   colour that changes with the measurement. The band is one flat tint,
   the marker is one flat accent, and the caption under every row says the
   range is typical-adult context and not a finding. A value outside the
   band is simply drawn outside the band, which is the honest picture.

   ══ THE MARKER IS CLAMPED, THE VALUE IS NOT ══
   A 700 ms QT on a 200–600 scale would sit past the end of the track and
   be invisible, so the marker is clamped into it. The printed number is
   always the measured one — the clamp moves a dot, never a measurement.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { useTranslation } from '@/i18n/useTranslation';
import type { ValuesPalette } from '@/theme/valuesPalette';

interface Props {
  palette: ValuesPalette;
  label: string;
  value: number | null;
  unit: string;
  /** The typical adult band, in the same unit. */
  refLow: number;
  refHigh: number;
  /** The full track, wide enough that a band is a band and not the whole bar. */
  scaleMin: number;
  scaleMax: number;
  /** "Typical adult range 120–200 ms", already composed by the caller. */
  caption: string;
  /** Accent for the marker. The section blue, unless the caller says otherwise. */
  markerColor?: string;
  onPress?: () => void;
  a11yHint?: string;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
/** RN's `DimensionValue` accepts a percentage, but only as a literal type —
    a computed template string needs the cast to be accepted. */
const pct = (fraction: number): DimensionValue => `${fraction * 100}%` as DimensionValue;

export default function ValueIntervalRow({
  palette,
  label,
  value,
  unit,
  refLow,
  refHigh,
  scaleMin,
  scaleMax,
  caption,
  markerColor,
  onPress,
  a11yHint,
}: Props) {
  const { rtl } = useTranslation();
  const span = scaleMax - scaleMin || 1;
  const bandFrom = clamp01((refLow - scaleMin) / span);
  const bandTo = clamp01((refHigh - scaleMin) / span);
  const markAt = value === null ? null : clamp01((value - scaleMin) / span);

  /* RTL mirrors the ROW, never the scale: a time axis running right-to-left
     in Hebrew and left-to-right in English would put the same measurement on
     opposite sides of the same band. So the track is always drawn from the
     left; only the label/value row and the text alignment flip. */
  const align = rtl ? ('right' as const) : ('left' as const);

  const content = (
    <View>
      <View style={[styles.head, rtl && styles.rowRtl]}>
        <Text style={[styles.label, { color: palette.txt }]}>{label}</Text>
        <View style={[styles.valueRow, rtl && styles.rowRtl]}>
          <Text style={[styles.value, { color: value === null ? palette.dim : palette.txt }]}>
            {value === null ? '—' : String(value)}
          </Text>
          {value !== null && (
            <Text
              style={[
                styles.unit,
                { color: palette.muted },
                rtl ? { marginRight: 3 } : { marginLeft: 3 },
              ]}
            >
              {unit}
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: palette.track }]}>
        <View
          style={[
            styles.band,
            {
              left: pct(bandFrom),
              width: pct(Math.max(0, bandTo - bandFrom)),
              backgroundColor: palette.band,
            },
          ]}
        />
        {markAt !== null && (
          /* Half the marker's width back, so the dot is centred ON the value
             rather than starting at it. */
          <View
            style={[
              styles.marker,
              { left: pct(markAt), marginLeft: -2, backgroundColor: markerColor ?? palette.blue },
            ]}
          />
        )}
      </View>

      <Text style={[styles.caption, { color: palette.dim, textAlign: align }]}>{caption}</Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value === null ? '—' : `${value} ${unit}`}`}
      accessibilityHint={a11yHint}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: 'row-reverse' },
  pressed: { opacity: 0.62 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  label: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', flexShrink: 0 },
  value: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 12, fontWeight: '600' },
  track: { position: 'relative', height: 8, borderRadius: 99, marginTop: 9 },
  band: { position: 'absolute', top: 0, bottom: 0, borderRadius: 99 },
  marker: { position: 'absolute', top: -3, width: 4, height: 14, borderRadius: 99 },
  caption: { fontSize: 11.5, marginTop: 7 },
});

// v0.59.0 — The redesigned interval row. The reference band is one flat tint
//           and never changes with the measurement: context, not a grade.
