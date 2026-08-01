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

import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** Measured axis in degrees (−180…+180), or null when indeterminate. */
  degrees: number | null;
  /** Name of the axis class, shown under the dial. */
  classLabel: string;
  /** Caption for the shaded reference sector. */
  normalRangeLabel: string;
  size?: number;
}

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

export default function AxisDial({ degrees, classLabel, normalRangeLabel, size = 190 }: Props) {
  const t = useTheme();
  const c = size / 2;
  const r = size / 2 - 24;

  const point = (deg: number, radius: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: c + Math.cos(rad) * radius, y: c + Math.sin(rad) * radius };
  };

  // Shaded normal sector as a pie wedge.
  const a = point(NORMAL_FROM, r);
  const b = point(NORMAL_TO, r);
  const largeArc = NORMAL_TO - NORMAL_FROM > 180 ? 1 : 0;
  const sector = `M${c} ${c} L${a.x.toFixed(2)} ${a.y.toFixed(2)} A${r} ${r} 0 ${largeArc} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`;

  const tip = degrees === null ? null : point(degrees, r - 6);

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityLabel={classLabel}>
        {/* Reference sector */}
        <Path d={sector} fill={t.accentSoft} />

        {/* Dial face */}
        <Circle cx={c} cy={c} r={r} fill="none" stroke={t.border} strokeWidth={1.5} />
        <Circle cx={c} cy={c} r={r * 0.5} fill="none" stroke={t.border} strokeWidth={1} />

        {/* Lead axes — each drawn as a full diameter, since a lead axis runs
            both ways (its positive pole is the labelled end). */}
        {LEAD_AXES.map(({ name, deg }) => {
          const p1 = point(deg, r);
          const p2 = point(deg + 180, r);
          const l = point(deg, r + 13);
          return (
            <G key={name}>
              <Line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={t.border} strokeWidth={1} />
              <SvgText
                x={l.x}
                y={l.y}
                fill={t.textTertiary}
                fontSize={10}
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
              stroke={t.accentLive}
              strokeWidth={3.5}
              strokeLinecap="round"
            />
            <Circle cx={tip.x} cy={tip.y} r={5} fill={t.accentLive} />
          </G>
        )}
        <Circle cx={c} cy={c} r={3.5} fill={t.textSecondary} />
      </Svg>

      <View style={styles.readout}>
        <Text
          style={[styles.value, { color: degrees === null ? t.textTertiary : t.textPrimary }]}
        >
          {degrees === null ? '—' : `${degrees}°`}
        </Text>
        <Text style={[styles.class, { color: t.textSecondary }]}>{classLabel}</Text>
        <Text style={[styles.hint, { color: t.textTertiary }]}>{normalRangeLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  readout: { alignItems: 'center', gap: 1 },
  value: { fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  class: { fontSize: 13, fontWeight: '700' },
  hint: { fontSize: 10.5 },
});

// v1.0.0 — Hexaxial QRS-axis dial (ECG sign convention: +90° is down / aVF).
