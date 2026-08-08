/* ==================================================================
   IdentityRing (molecule) — how established the ECG ID is, at a glance.

   A ring of `target` segments, filled one per enrolled study, with the
   count in the middle. It is the Face ID enrollment ring, and the
   borrowing is deliberate: the gesture it describes is the same one —
   "keep showing it to me until I know you" — and a shape a user already
   understands beats a novel one that has to be explained.

        ╭───╮      3 of 5 filled = enrolling
       │ 3/5 │     all filled    = established, and the ring turns to
        ╰───╯                      the confidence colour

   ══ SEGMENTS, NOT A SMOOTH ARC ══
   A continuous progress arc says "62 %", which is a percentage of nothing
   — the target is five STUDIES, and five discrete studies is exactly what
   the reader has to supply. Segments make the remaining work countable
   instead of estimable.

   Purely presentational.
   ================================================================== */

import Svg, { Circle, G } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface Props {
  enrolled: number;
  target: number;
  /** 0–100. Drives the ring's colour once enrollment is complete. */
  confidence: number;
  size?: number;
  accessibilityLabel?: string;
}

const STROKE = 6;
/** Gap between segments, in degrees. */
const GAP_DEG = 7;

export default function IdentityRing({
  enrolled,
  target,
  confidence,
  size = 78,
  accessibilityLabel,
}: Props) {
  const t = useTheme();

  const segments = Math.max(1, target);
  const filled = Math.min(segments, Math.max(0, enrolled));
  const complete = filled >= segments;

  const radius = (size - STROKE) / 2;
  const centre = size / 2;
  const circumference = 2 * Math.PI * radius;
  const segArc = circumference / segments;
  const gap = (GAP_DEG / 360) * circumference;
  const dash = Math.max(1, segArc - gap);

  /* Established but low-agreement is a real state and must not look like a
     finished job: the ring only goes to the success colour when the
     baseline is BOTH complete and consistent. */
  const done = complete && confidence >= 60;
  const active = done ? t.success : t.accentLive;

  return (
    <View
      style={[styles.root, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: segments, now: filled }}
    >
      <Svg width={size} height={size}>
        {/* −90° so segment one starts at 12 o'clock, where a ring is read from. */}
        <G rotation={-90} origin={`${centre}, ${centre}`}>
          {Array.from({ length: segments }, (_, i) => (
            <Circle
              key={i}
              cx={centre}
              cy={centre}
              r={radius}
              fill="none"
              stroke={i < filled ? active : t.border}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-i * segArc}
            />
          ))}
        </G>
      </Svg>

      <View style={styles.centre} pointerEvents="none">
        <Text
          style={[styles.count, { color: t.textPrimary, fontSize: size * 0.3 }]}
          allowFontScaling={false}
        >
          {filled}
        </Text>
        <Text
          style={[styles.of, { color: t.textTertiary, fontSize: size * 0.15 }]}
          allowFontScaling={false}
        >
          /{segments}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  centre: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  count: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  of: { fontWeight: '700', fontVariant: ['tabular-nums'], marginBottom: 2 },
});

// v1.0.0 — Segmented enrollment ring: one segment per study still needed, and
//          the success colour withheld until the baseline is both complete and
//          consistent.
