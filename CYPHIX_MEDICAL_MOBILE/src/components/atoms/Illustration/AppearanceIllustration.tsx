/* AppearanceIllustration (atom) — Appearance — artist's palette + brush.
   Ported VERBATIM from the web atom of the same name: identical viewBox and
   identical path data, only the element names differ (react-native-svg).
   These carry their own pastel palette — they are NOT currentColor icons. */

import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import type { IllustrationProps } from './IllustrationSvg';

export default function AppearanceIllustration({ size = 40 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
        <Path d="M46 12c21 0 36 13 36 30 0 11-8 16-16 16h-7a6 6 0 0 0-4 11c1 3-3 5-9 5-19 0-36-14-36-31S27 12 46 12z" fill="#FFF6E9" stroke="#6E5A6B" strokeWidth="2.6" strokeLinejoin="round" />
        <Circle cx="34" cy="58" r="7" fill="#fff" stroke="#6E5A6B" strokeWidth="2.4" />
        <Circle cx="26" cy="36" r="6.5" fill="#C7A8E8" stroke="#6E5A6B" strokeWidth="2.2" />
        <Circle cx="44" cy="26" r="6.5" fill="#F7B8C8" stroke="#6E5A6B" strokeWidth="2.2" />
        <Circle cx="62" cy="32" r="6.5" fill="#A8D8F0" stroke="#6E5A6B" strokeWidth="2.2" />
        <Circle cx="68" cy="48" r="6.5" fill="#A8E0C8" stroke="#6E5A6B" strokeWidth="2.2" />
        <G transform="rotate(35 74 62)">
          <Rect x="67" y="30" width="13" height="34" rx="6.5" fill="#FFCBA8" stroke="#6E5A6B" strokeWidth="2.4" />
          <Rect x="67" y="62" width="13" height="9" fill="#A8D8F0" stroke="#6E5A6B" strokeWidth="2.2" />
          <Path d="M67 71h13l-3 13h-7z" fill="#C7A8E8" stroke="#6E5A6B" strokeWidth="2.2" strokeLinejoin="round" />
        </G>
    </Svg>
  );
}

// v1.0.0 — Ported from the web AppearanceIllustration.
