/* ==================================================================
   CountdownRing (atom) — a ring that drains as a timed capture runs.
   Ported from the web atom of the same name.

   WHY A RING, NOT A BAR: during a limb recording the patient's hands are
   occupied and their attention is on holding still, not on reading. A
   draining circle with the seconds in the middle is legible at a glance
   and from across a room, which a 10 px progress bar is not.

   The number AND its caption sit INSIDE the ring (`.countdown-ring-label`
   is `position: absolute; inset: 0`) — the caption is what the number
   means, so putting it outside turns one readout into two things to look
   at.

   ── SMALL RINGS DROP THE CAPTION AND GROW THE NUMBER ──
   At the ~40 pt size that fits inside a phone's status bar there is no
   room for a caption, and the web's 0.29 ratio (tuned for a 132 px ring
   that also carries one) would leave an 11 px digit. With no caption to
   share the middle with, the number takes 0.40 of the diameter instead.
   The caller labels it in the row beside the ring.

   Purely presentational: it is told how much is left and draws it.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from '@/i18n/useTranslation';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** 0–100, how much of the capture is DONE. */
  progress: number;
  /** Whole seconds remaining, shown in the centre. */
  secondsLeft: number;
  /** Small caption under the number (e.g. "seconds left"). */
  caption?: string;
  /** Outer diameter. */
  size?: number;
}

export default function CountdownRing({ progress, secondsLeft, caption, size = 132 }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const stroke = Math.max(6, Math.round(size * 0.075));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const remaining = Math.max(0, Math.min(100, 100 - progress));
  const dashOffset = circumference * (1 - remaining / 100);

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="progressbar"
      accessibilityLabel={tr('countdownA11y', { n: secondsLeft })}
    >
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={t.border}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Remaining time — starts full at 12 o'clock and drains clockwise */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={t.success}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={[StyleSheet.absoluteFill, styles.label]} pointerEvents="none">
        <Text
          allowFontScaling={false}
          style={[
            styles.value,
            { color: t.textPrimary, fontSize: size * (caption != null ? 0.29 : 0.4) },
          ]}
        >
          {secondsLeft}
        </Text>
        {caption != null && (
          <Text allowFontScaling={false} style={[styles.caption, { color: t.textTertiary }]}>
            {caption}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* .countdown-ring-label { inset: 0; column; centred; gap: 2px } */
  label: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  /* .countdown-ring-value { font-size: 38px on a 132px ring } */
  value: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  /* .countdown-ring-caption */
  caption: { fontSize: 11, fontWeight: '600', letterSpacing: 0.44 },
});

// v2.2.0 — The screen-reader label is translated (the visible caption is
//          still supplied by the caller, already translated).
