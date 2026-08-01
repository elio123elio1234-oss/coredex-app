/* CountdownRing (atom) — the capture progress ring with the seconds left
   in its centre, ported from the web atom of the same name. */

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** 0–100. */
  progress: number;
  secondsLeft: number;
  caption?: string;
  size?: number;
}

export default function CountdownRing({ progress, secondsLeft, caption, size = 104 }: Props) {
  const t = useTheme();
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * (1 - Math.min(1, Math.max(0, progress / 100)));

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={t.border}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={t.accentLive}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dash}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text
            allowFontScaling={false}
            style={[styles.value, { color: t.textPrimary }]}
          >
            {secondsLeft}
          </Text>
        </View>
      </View>
      {caption != null && (
        <Text style={[styles.caption, { color: t.textSecondary }]}>{caption}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] },
  caption: { fontSize: 13, fontWeight: '600' },
});

// v1.0.0 — SVG progress ring with the seconds-left readout.
