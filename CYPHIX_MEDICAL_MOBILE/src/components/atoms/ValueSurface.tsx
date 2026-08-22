/* ==================================================================
   ValueSurface (atom) — one translucent card of the Values screen.

   ══ WHY A GRADIENT AND NOT A BLUR ══
   The handoff draws every card with `backdrop-filter: blur(26px)` over a
   field of soft radial glows. Reproducing that literally would mean a
   `BlurView` per card — eight of them in one scroll view — and a real
   blur is the most expensive thing a phone can be asked to composite
   while a list is moving. Android's `dimezisBlurView` in particular
   re-renders the view behind it every frame.

   What the blur is actually FOR here is that the card should take a hint
   of the colour behind it. Behind it is `ValuesBackdrop`: three wide,
   very soft radial gradients. Blurring a smooth gradient by 26 px does
   almost nothing to it — so a translucent gradient fill over the same
   field is visually the same card at a fraction of the cost. The frosted
   material is kept where it earns itself (the header bar, sheets, the
   dock), where what is behind it is text and photographs.

   ══ THE ANGLE, CONVERTED ONCE ══
   Every surface in the handoff is `linear-gradient(150deg, A, B)`. CSS
   measures from "to top" clockwise, so 150° runs down-and-right; RN takes
   start/end points in unit space instead. The conversion lives here so no
   caller ever writes an angle.
   ================================================================== */

import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';

interface Props {
  /** Two stops, in the handoff's order (top-left → bottom-right). */
  colors: readonly [string, string];
  border: string;
  radius: number;
  style?: ViewStyle | ViewStyle[];
  children?: ReactNode;
}

/* CSS 150deg → down and slightly right. */
const START = { x: 0.15, y: 0 };
const END = { x: 0.85, y: 1 };

export default function ValueSurface({ colors, border, radius, style, children }: Props) {
  return (
    <LinearGradient
      colors={colors as unknown as [string, string]}
      start={START}
      end={END}
      style={[styles.base, { borderRadius: radius, borderColor: border }, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  /* `overflow: hidden` so a child bar's own radius cannot poke past the
     corner — the amplitude rows and the R-R meter both sit flush. */
  base: { borderWidth: 1, overflow: 'hidden' },
});

// v0.59.0 — The Values screen's card material: a translucent gradient over the
//           glow field, which is what the handoff's backdrop-blur amounts to
//           when what is behind it is already a smooth gradient.
