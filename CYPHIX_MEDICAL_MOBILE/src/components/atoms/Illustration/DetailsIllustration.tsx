/* DetailsIllustration (atom) — Personal details — ID card with portrait + rows.
   Ported VERBATIM from the web atom of the same name: identical viewBox and
   identical path data, only the element names differ (react-native-svg).
   These carry their own pastel palette — they are NOT currentColor icons. */

import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { IllustrationProps } from './IllustrationSvg';

export default function DetailsIllustration({ size = 40 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
        <Rect x="8" y="18" width="80" height="60" rx="14" fill="#FFF6E9" stroke="#6E5A6B" strokeWidth="2.6" />
        <Path d="M8 34v-2a14 14 0 0 1 14-14h52a14 14 0 0 1 14 14v2z" fill="#A8D8F0" stroke="#6E5A6B" strokeWidth="2.4" strokeLinejoin="round" />
        <Path d="M72 30c-4-3-5-4-5-6a2.6 2.6 0 0 1 5-1 2.6 2.6 0 0 1 5 1c0 2-1 3-5 6z" fill="#F7B8C8" />
        <Circle cx="31" cy="54" r="13" fill="#FFD9B8" stroke="#6E5A6B" strokeWidth="2.4" />
        <Path d="M18 53c-1-9 5-14 13-14s14 5 13 14c-2-4-5-5-8-4-4 1-6 3-11 2-3-1-5 0-7 2z" fill="#C7A8E8" stroke="#6E5A6B" strokeWidth="2.4" strokeLinejoin="round" />
        <Circle cx="26" cy="55" r="1.6" fill="#6E5A6B" />
        <Circle cx="36" cy="55" r="1.6" fill="#6E5A6B" />
        <Path d="M28 60c1.6 1.6 3.4 1.6 5 0" fill="none" stroke="#6E5A6B" strokeWidth="1.9" strokeLinecap="round" />
        <Rect x="51" y="44" width="28" height="6" rx="3" fill="#F7B8C8" />
        <Rect x="51" y="55" width="24" height="6" rx="3" fill="#A8E0C8" />
        <Rect x="51" y="66" width="16" height="6" rx="3" fill="#FBE3A2" />
    </Svg>
  );
}

// v1.0.0 — Ported from the web DetailsIllustration.
