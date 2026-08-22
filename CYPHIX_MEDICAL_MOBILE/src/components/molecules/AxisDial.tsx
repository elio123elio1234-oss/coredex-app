/* ==================================================================
   AxisDial (molecule) — the frontal-plane QRS axis on a hexaxial dial.
   Ported from the web molecule.

   ══ WHY A DIAL AND NOT A NUMBER ══
   "+62°" means nothing without the reference frame. The hexaxial diagram
   IS how this measurement is taught and read: six lead axes 30° apart,
   the arrow showing where the heart's mean electrical vector points.
   Drawing it turns a bare number into something a reader interprets in
   one glance — which is the entire reason the axis is worth reporting.

   ══ THE COORDINATE CONVENTION (easy to get backwards) ══
   In ECG convention POSITIVE angles point DOWN toward the patient's feet:
   lead I is 0° (patient's left), aVF is +90° (down), aVL is −30°
   (up-left). SVG's y-axis also grows downward, so screen coordinates are
   a direct (cos θ, sin θ) — no flip. Flipping it would mirror every axis
   reported.

   Purely presentational.
   ================================================================== */

import { useState } from 'react';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

/**
 * What the dial is drawn IN.
 *
 * Added in v0.59.0 for the redesigned Values screen, which sits on a
 * coloured glass field where the report's greys disappear. The dial is
 * the same drawing either way — the same geometry, the same convention,
 * the same reference sector — so it is skinned rather than forked. A
 * second copy of this file with different colours is how the axis
 * convention eventually gets flipped in one of them and not the other.
 */
export interface AxisDialPalette {
  /** The −30°…+90° reference wedge. */
  sector: string;
  /** Face circles and the six lead axes. */
  grid: string;
  /** The measured vector and its tip. */
  needle: string;
  /** The pin at the centre. */
  hub: string;
  /** The six lead names around the rim. */
  leadLabel: string;
}

interface Props {
  /** Measured axis in degrees (−180…+180), or null when indeterminate. */
  degrees: number | null;
  /** Name of the axis class, shown under the dial. */
  classLabel: string;
  /** Caption for the shaded reference sector. */
  normalRangeLabel: string;
  /**
   * Ceiling on the dial's diameter. It otherwise takes the full width it is
   * given: this diagram is the only thing on the measurement sheet that is
   * READ rather than looked up, and at the old fixed 190 pt it was a thumbnail
   * of itself — the six lead labels were 10 pt and the reference sector was
   * too small to judge the vector against.
   */
  maxSize?: number;
  /** Defaults to the app's own tokens — what the report has always used. */
  palette?: AxisDialPalette;
  /**
   * Draw the number, the class name and the sector caption under the dial.
   *
   * Off when the caller draws its own readout: the Values screen prints the
   * angle at 54 pt in its section's violet, and two readouts of one
   * measurement stacked on each other is not a layout anyone chose.
   */
  readout?: boolean;
}

/** Every stroke, label and radius is scaled by √(size / this). */
const BASE_SIZE = 190;

/** The six frontal leads and where each one points, in degrees. */
const LEAD_AXES: Array<{ name: string; deg: number }> = [
  { name: 'I', deg: 0 },
  { name: 'II', deg: 60 },
  { name: 'aVF', deg: 90 },
  { name: 'III', deg: 120 },
  { name: 'aVR', deg: -150 },
  { name: 'aVL', deg: -30 },
];

/** The conventional normal sector: −30° to +90°. */
const NORMAL_FROM = -30;
const NORMAL_TO = 90;

export default function AxisDial({
  degrees,
  classLabel,
  normalRangeLabel,
  maxSize = 340,
  palette,
  readout = true,
}: Props) {
  const t = useTheme();
  const [avail, setAvail] = useState(0);

  /* The report's colours, unchanged, when no palette is given. */
  const c0: AxisDialPalette = palette ?? {
    sector: t.accentSoft,
    grid: t.border,
    needle: t.accentLive,
    hub: t.textSecondary,
    leadLabel: t.textTertiary,
  };

  const size = Math.min(maxSize, avail || BASE_SIZE);
  /* Square root, not linear: at 1.8× the diameter, 1.8× stroke weights would
     make the dial look coarse rather than bigger. √ keeps the drawing's
     proportions reading the same at every size. */
  const k = Math.sqrt(size / BASE_SIZE);
  const c = size / 2;
  const r = size / 2 - 24 * k;

  const point = (deg: number, radius: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: c + Math.cos(rad) * radius, y: c + Math.sin(rad) * radius };
  };

  // Shaded normal sector as a pie wedge.
  const a = point(NORMAL_FROM, r);
  const b = point(NORMAL_TO, r);
  const largeArc = NORMAL_TO - NORMAL_FROM > 180 ? 1 : 0;
  const sector = `M${c} ${c} L${a.x.toFixed(2)} ${a.y.toFixed(2)} A${r} ${r} 0 ${largeArc} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`;

  const tip = degrees === null ? null : point(degrees, r - 6 * k);

  return (
    <View style={styles.wrap} onLayout={(e) => setAvail(e.nativeEvent.layout.width)}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityLabel={classLabel}>
        {/* Reference sector */}
        <Path d={sector} fill={c0.sector} />

        {/* Dial face */}
        <Circle cx={c} cy={c} r={r} fill="none" stroke={c0.grid} strokeWidth={1.5 * k} />
        <Circle cx={c} cy={c} r={r * 0.5} fill="none" stroke={c0.grid} strokeWidth={1 * k} />

        {/* Lead axes — each drawn as a full diameter, since a lead axis runs
            both ways (its positive pole is the labelled end). */}
        {LEAD_AXES.map(({ name, deg }) => {
          const p1 = point(deg, r);
          const p2 = point(deg + 180, r);
          const l = point(deg, r + 13 * k);
          return (
            <G key={name}>
              <Line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={c0.grid} strokeWidth={1 * k} />
              <SvgText
                x={l.x}
                y={l.y}
                fill={c0.leadLabel}
                fontSize={10 * k}
                fontWeight="700"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {name}
              </SvgText>
            </G>
          );
        })}

        {/* The measured vector */}
        {tip && (
          <G>
            <Line
              x1={c}
              y1={c}
              x2={tip.x}
              y2={tip.y}
              stroke={c0.needle}
              strokeWidth={3.5 * k}
              strokeLinecap="round"
            />
            <Circle cx={tip.x} cy={tip.y} r={5 * k} fill={c0.needle} />
          </G>
        )}
        <Circle cx={c} cy={c} r={3.5 * k} fill={c0.hub} />
      </Svg>

      {readout && (
      <View style={styles.readout}>
        <Text
          style={[
            styles.value,
            { fontSize: 24 * k, lineHeight: 28 * k },
            { color: degrees === null ? t.textTertiary : t.textPrimary },
          ]}
        >
          {degrees === null ? '—' : `${degrees}°`}
        </Text>
        <Text style={[styles.class, { color: t.textSecondary }]}>{classLabel}</Text>
        <Text style={[styles.hint, { color: t.textTertiary }]}>{normalRangeLabel}</Text>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /* No `width` — the dial measures what it is given and fills it. */
  wrap: { alignItems: 'center', gap: 8 },
  readout: { alignItems: 'center', gap: 2 },
  value: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  class: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 11 },
});

// v0.59.0 — Skinnable (`palette`) and its readout is optional, so the
//           redesigned Values screen can draw the same dial on a coloured
//           glass field without a second copy of the axis convention.
// v1.1.0 — Self-sizing: fills the width it is given (capped), with every
//          stroke, label and radius scaled by √ so it reads the same at any size.
