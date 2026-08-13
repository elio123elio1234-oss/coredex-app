/* ==================================================================
   RangeBar (atom) — "your number sits HERE, and this is where typical is".

   ══ WHY THIS EXISTS ══
   The screen used to say `Largest QRS +0.48 mV · Threshold 0.50 mV` and
   nothing else. A clinician reads that instantly; the person whose heart it
   is reads two numbers they cannot place and concludes something is wrong,
   because the row is coloured and they have nothing else to go on.

   A number becomes information the moment it has a scale under it. Seeing
   0.48 sitting one pixel outside a green band is a completely different
   experience from reading "0.48 vs 0.50" — it says "barely" without anyone
   having to write the word.

   ══ THE BAND IS THE SUBJECT, NOT THE MARKER ══
   The typical range is drawn as a filled region and the reading as a thin
   line through it. That way the eye lands on the CONTEXT first and the
   value second, which is the order that produces "oh, I'm just outside"
   rather than "there is a mark on a bar".
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '@/i18n/useTranslation';
import { useTheme } from '@/theme/useTheme';

interface Props {
  value: number;
  unit: string;
  min: number;
  max: number;
  normalLow: number;
  normalHigh: number;
  /** The finding's colour — the marker and the value label take it. */
  accent: string;
  /** Fill for the typical band. */
  bandColor: string;
  labels: { yours: string; normal: string };
}

const TRACK_H = 34;
const MARKER_W = 3;

/** Position on the track, 0…1, clamped so an out-of-range value still shows. */
function place(v: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

export default function RangeBar({
  value,
  unit,
  min,
  max,
  normalLow,
  normalHigh,
  accent,
  bandColor,
  labels,
}: Props) {
  const t = useTheme();
  const { rtl } = useTranslation();

  const bandFrom = place(normalLow, min, max);
  const bandTo = place(normalHigh, min, max);
  const at = place(value, min, max);

  /* Percentages, not measured pixels: the bar has to be right on the first
     frame, and a layout pass to find its own width would render it once at
     the wrong position first.

     The return type is the template-literal `${number}%` rather than
     `string`, because that is what RN's `DimensionValue` accepts — a plain
     string is a type error, which is the compiler correctly refusing a
     value that could have been "12px" or "auto". */
  const pct = (n: number): `${number}%` => `${Number((n * 100).toFixed(2))}%`;

  /* The value label follows the marker but must not fall off either end, so
     it flips its anchor near the edges instead of being clipped. */
  const nearStart = at < 0.16;
  const nearEnd = at > 0.84;

  return (
    <View style={styles.wrap}>
      <View style={[styles.track, { backgroundColor: t.surfaceHover }]}>
        {/* The typical band. */}
        <View
          style={[
            styles.band,
            {
              backgroundColor: bandColor,
              left: pct(bandFrom),
              width: pct(Math.max(0, bandTo - bandFrom)),
            },
          ]}
        />
        {/* The reading. */}
        <View
          style={[
            styles.marker,
            { backgroundColor: accent, left: pct(at), marginLeft: -MARKER_W / 2 },
          ]}
        />
      </View>

      <View style={styles.captions}>
        <Text
          style={[
            styles.value,
            { color: accent },
            nearStart && styles.anchorStart,
            nearEnd && styles.anchorEnd,
            !nearStart && !nearEnd && { left: pct(at), transform: [{ translateX: -28 }] },
          ]}
          numberOfLines={1}
          /* Digits read left-to-right in Hebrew too — only the surrounding
             layout mirrors, never the number itself. */
          allowFontScaling={false}
        >
          {value.toFixed(unit === 'ms' || unit === 'BPM' || unit === 'deg' ? 0 : 2)}
        </Text>
      </View>

      <View style={[styles.legend, rtl && styles.legendRtl]}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: bandColor }]} />
          <Text style={[styles.legendText, { color: t.textTertiary }]}>
            {labels.normal} {normalLow.toFixed(unit === 'mV' ? 2 : 0)}–
            {normalHigh.toFixed(unit === 'mV' ? 2 : 0)} {unit}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, styles.swatchLine, { backgroundColor: accent }]} />
          <Text style={[styles.legendText, { color: t.textTertiary }]}>{labels.yours}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  track: { height: TRACK_H, borderRadius: TRACK_H / 2, overflow: 'hidden' },
  band: { position: 'absolute', top: 0, bottom: 0 },
  marker: { position: 'absolute', top: 0, bottom: 0, width: MARKER_W, borderRadius: MARKER_W },
  captions: { height: 18 },
  value: { position: 'absolute', width: 56, textAlign: 'center', fontSize: 13, fontWeight: '800' },
  anchorStart: { left: 0, textAlign: 'left' },
  anchorEnd: { right: 0, textAlign: 'right' },
  legend: { flexDirection: 'row', gap: 14, marginTop: 2 },
  legendRtl: { flexDirection: 'row-reverse' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 12, height: 10, borderRadius: 3 },
  swatchLine: { width: 3, height: 12, borderRadius: 2 },
  legendText: { fontSize: 11.5, fontWeight: '600' },
});

// v1.0.0 — A reading placed against its typical band. Exists because two bare
//          numbers ("0.48 vs 0.50") cannot say "barely" and a picture can.
