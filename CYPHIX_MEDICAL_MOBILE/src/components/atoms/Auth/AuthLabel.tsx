/* ==================================================================
   AuthLabel (atom) — the small tracked-out caps label that sits over
   every input and names every step ("EMAIL", "STEP 2 OF 6").

   In the reference this is IBM Plex Mono. Mobile ships the system font
   (root CLAUDE.md §3.1), so what carries over is the treatment — 10.5 pt,
   caps, `.1em` of tracking — which is what makes it read as an
   instrument's label rather than as body copy. See `theme/authTheme.ts`.

   `allowFontScaling` stays ON here even though the rest of the flow
   turns it off for controls: this is text to READ, and a patient with
   large type set has said they need it.
   ================================================================== */

import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { LABEL_TYPE, type AuthPalette } from '@/theme/authTheme';

interface Props {
  children: string;
  palette: AuthPalette;
  /** Overrides the muted default — the splash uses it on navy. */
  color?: string;
  style?: StyleProp<TextStyle>;
}

export default function AuthLabel({ children, palette, color, style }: Props) {
  return (
    <Text style={[styles.label, { color: color ?? palette.label }, style]} maxFontSizeMultiplier={1.4}>
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: LABEL_TYPE,
});

// v1.0.0 — Tracked-out caps label (the reference's mono label, system font).
