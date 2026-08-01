/* ==================================================================
   HeroBackdrop (atom) — the patient shell's background field.

   Paints whatever the active background style calls for: a flat colour
   (the DEFAULT 'gray'), a gradient, or the wavy teal field whose ribbon
   paths are copied VERBATIM from the web HeroBackdrop.tsx.

   Pure decoration: absolutely positioned behind everything, no touches.
   ================================================================== */

import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { ShellPalette } from '@/theme/shellTheme';

/** Verbatim from the web component — do not re-draw by hand. */
const WAVE_PATHS = [
  'M900,-120 C1080,-10 1180,40 1300,10 C1400,-15 1460,-70 1560,-140 L1560,-200 L900,-200 Z',
  'M-40,470 C300,390 520,560 780,510 C1040,462 1220,340 1480,410 L1480,940 L-40,940 Z',
  'M-40,610 C280,520 560,670 840,610 C1100,555 1300,480 1480,530 L1480,940 L-40,940 Z',
  'M-40,730 C360,655 640,780 920,730 C1160,688 1320,620 1480,660 L1480,940 L-40,940 Z',
  'M-40,840 C380,780 700,880 980,840 C1220,806 1360,760 1480,790 L1480,940 L-40,940 Z',
];

export default function HeroBackdrop({ palette }: { palette: ShellPalette }) {
  const flat = typeof palette.field === 'string';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flat ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.field as string }]} />
      ) : (
        <LinearGradient
          colors={palette.field as [string, string, string]}
          locations={[0, 0.46, 1]}
          // 168deg in CSS ≈ a near-vertical sweep leaning slightly to the start.
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {palette.waves && (
        <Svg
          style={StyleSheet.absoluteFill}
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
        >
          {palette.bloom && (
            <Defs>
              <RadialGradient id="bloom" cx="50%" cy="8%" rx="60%" ry="45%">
                <Stop offset="0" stopColor={palette.bloom} stopOpacity="1" />
                <Stop offset="0.55" stopColor={palette.bloom} stopOpacity="0" />
              </RadialGradient>
            </Defs>
          )}
          {palette.bloom && <Rect x="0" y="0" width="1440" height="900" fill="url(#bloom)" />}
          {WAVE_PATHS.map((d, i) => (
            <Path
              key={d}
              d={d}
              fill={palette.waves![i].color}
              fillOpacity={palette.waves![i].opacity}
            />
          ))}
        </Svg>
      )}
    </View>
  );
}

// v2.0.0 — Handles flat/gradient/wave fields; waves only when the style has them.
