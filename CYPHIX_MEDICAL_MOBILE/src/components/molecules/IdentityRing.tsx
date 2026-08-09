/* ==================================================================
   IdentityRing (molecule) — how much baseline there is, at a glance.

   TWO STATES, and they are drawn differently because they are different
   quantities:

     enrolling    ╭╴╴╴╮      SEGMENTS — one per study still needed.
                 ╷ 3/5 ╷     The target is five STUDIES, and five discrete
                  ╰╴╴╴╯      studies is exactly what the reader must
                             supply. Countable, so it is counted.

     established  ╭───╮      An ARC — agreement is continuous, so a
                 ╷ 71 ╷      continuous sweep is the honest shape for it,
                  ╰──╴╯      and the ring stops being frozen at 5/5 for
                             the rest of the account's life.

   The segmented state borrows Face ID's enrollment ring on purpose: the
   gesture it describes is the same one — "keep showing it to me until I
   know you" — and a shape a user already understands beats a novel one
   that has to be explained.

   ══ WHY THE NUMBER CHANGES MEANING WITH THE SHAPE ══
   Because a count and a percentage are not the same claim, and one ring
   showing "5/5" forever tells a reader nothing about whether their
   baseline is any good. Once enrollment is done the useful question stops
   being *how many* and becomes *how well do they agree* — so that is what
   the ring reports, with the caption naming it.

   Purely presentational.
   ================================================================== */

import Svg, { Circle, G } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface Props {
  enrolled: number;
  target: number;
  /** 0–100. What the arc reports once enrollment is complete. */
  confidence: number;
  /** True once the baseline is established — switches segments → arc. */
  established: boolean;
  /** Small word under the number, naming what it is. */
  caption: string;
  size?: number;
  accessibilityLabel?: string;
}

const STROKE = 5;
/** Gap between segments, in degrees. */
const GAP_DEG = 8;
/** Below this agreement the arc stays neutral rather than reading as "good". */
const CONFIDENT_AT = 60;

export default function IdentityRing({
  enrolled,
  target,
  confidence,
  established,
  caption,
  size = 82,
  accessibilityLabel,
}: Props) {
  const t = useTheme();

  const radius = (size - STROKE) / 2;
  const centre = size / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = Math.max(1, target);
  const filled = Math.min(segments, Math.max(0, enrolled));

  /* Colour is earned, not given: a complete-but-inconsistent baseline must
     not look like a finished job, so the confident tone waits for the
     agreement as well as the count. */
  const strong = established && confidence >= CONFIDENT_AT;
  const active = strong ? t.success : t.teal;

  const segArc = circumference / segments;
  const gap = (GAP_DEG / 360) * circumference;
  const dash = Math.max(1, segArc - gap);
  const sweep = circumference * Math.min(1, Math.max(0, confidence / 100));

  return (
    <View
      style={[styles.root, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={
        established
          ? { min: 0, max: 100, now: confidence }
          : { min: 0, max: segments, now: filled }
      }
    >
      <Svg width={size} height={size}>
        {/* −90° so the ring starts at 12 o'clock, where a dial is read from. */}
        <G rotation={-90} origin={`${centre}, ${centre}`}>
          {established ? (
            <>
              <Circle
                cx={centre}
                cy={centre}
                r={radius}
                fill="none"
                stroke={t.border}
                strokeWidth={STROKE}
              />
              <Circle
                cx={centre}
                cy={centre}
                r={radius}
                fill="none"
                stroke={active}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={`${sweep} ${circumference - sweep}`}
              />
            </>
          ) : (
            Array.from({ length: segments }, (_, i) => (
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
            ))
          )}
        </G>
      </Svg>

      <View style={styles.centre} pointerEvents="none">
        <Text
          style={[styles.value, { color: t.textPrimary, fontSize: size * 0.29 }]}
          allowFontScaling={false}
        >
          {established ? confidence : `${filled}/${segments}`}
        </Text>
        <Text
          style={[styles.caption, { color: t.textTertiary, fontSize: size * 0.115 }]}
          allowFontScaling={false}
          numberOfLines={1}
        >
          {caption}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  centre: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  value: { fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  caption: { fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase', marginTop: 1 },
});

// v2.0.0 — Two states, drawn as the two different quantities they are: segments
//          while enrolling (a countable target), a continuous arc for agreement
//          once established — which also stops the ring being frozen at 5/5 for
//          the life of the account. The caption names what the number is.
// v1.0.0 — Segmented enrollment ring.
