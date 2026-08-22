/* ==================================================================
   ValuesBackdrop (atom) — the coloured field the Values cards float on.

   Three very wide, very soft radial gradients, at the positions and
   opacities the design handoff specifies: red at the top-left, blue off
   the top-right corner, violet rising from below. They are what makes a
   translucent card read as glass rather than as a grey box, and they are
   the reason `ValueSurface` needs no blur.

   ★ It is FIXED, not scrolled. The handoff paints the glow on the phone
   shell and scrolls the page over it; a field that travelled with the
   content would sweep three coloured blooms up the screen on every flick,
   which is a lava lamp, not a background. So it is a sibling of the
   scroll view rather than a child of its content.

   Pure decoration: absolutely positioned, no touches, no state.
   ================================================================== */

import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import type { ValuesPalette } from '@/theme/valuesPalette';

export default function ValuesBackdrop({ palette }: { palette: ValuesPalette }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* A 0–100 box in both axes with `preserveAspectRatio="none"`: the
          gradients are then positioned in PERCENTAGES of the screen, which
          is how the handoff expresses them, and they stretch with the
          phone instead of being cropped on a taller one. */}
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          {palette.glows.map((g, i) => (
            <RadialGradient key={`d${i}`} id={`glow${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={g.color} stopOpacity={g.opacity} />
              {/* 70 % is where the handoff's `transparent 70%` stop sits —
                  the tail is what keeps the bloom from having an edge. */}
              <Stop offset="0.7" stopColor={g.color} stopOpacity="0" />
            </RadialGradient>
          ))}
        </Defs>
        {palette.glows.map((g, i) => (
          <Ellipse
            key={`e${i}`}
            cx={g.cx}
            cy={g.cy}
            rx={g.rx}
            ry={g.ry}
            fill={`url(#glow${i})`}
          />
        ))}
      </Svg>
    </View>
  );
}

// v0.59.0 — The Values tab's background field: three soft radial blooms,
//           fixed behind the scroller rather than riding on its content.
