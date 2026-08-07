/* ==================================================================
   SplitLeadCircle (atom) — a circle split down the middle showing two
   photographs, used for the "Full 12 Leads" choice: the limb placement on
   one half, the chest placement on the other. Ported from the web atom of
   the same name (`.split-circle` in tests.css).

   ── Why each half re-crops rather than being squeezed ──
   The web halves are `background-size: cover` on a half-width box, so each
   photograph keeps its aspect ratio and is cropped, never distorted. The
   RN twin is the same thing spelled out: a half-width window with
   `overflow: hidden`, holding a FULL-size image centred inside it. Setting
   the image to half width instead would squash two faces into a letterbox.

   The half order is fixed LTR — the divider is a diagram, not text, and it
   must not mirror under Hebrew (the web pins `direction: ltr` for the same
   reason).
   ================================================================== */

import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

interface Props {
  leftSrc: ImageSourcePropType;
  rightSrc: ImageSourcePropType;
  /** Diameter of the circle this fills — the parent clips it round. */
  size: number;
}

export default function SplitLeadCircle({ leftSrc, rightSrc, size }: Props) {
  /* A full-size square image inside a half-width window, pulled left by a
     quarter so its centre stays centred: `background-position: center`. */
  const half = { width: size / 2, height: size };
  const img = { width: size, height: size, marginLeft: -size / 4 };

  return (
    <View style={[styles.row, { width: size, height: size }]} accessible={false}>
      <View style={[styles.window, half]}>
        <Image source={leftSrc} style={img} resizeMode="cover" accessibilityIgnoresInvertColors />
      </View>
      <View style={[styles.window, half]}>
        <Image source={rightSrc} style={img} resizeMode="cover" accessibilityIgnoresInvertColors />
      </View>
      <View style={[styles.divider, { height: size }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  /* `direction: ltr` — the split is a diagram; it must not mirror in Hebrew. */
  row: { flexDirection: 'row', direction: 'ltr' },
  window: { overflow: 'hidden' },
  /* .split-divider { width: 2px; background: rgba(255,255,255,.85) } */
  divider: {
    position: 'absolute',
    left: '50%',
    top: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
});

// v1.0.0 — Half/half illustration circle (limb | chest) for the 12-lead choice.
