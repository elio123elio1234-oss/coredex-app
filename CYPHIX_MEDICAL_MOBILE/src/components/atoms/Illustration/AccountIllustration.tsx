/* AccountIllustration (atom) — Account — a profile portrait with a check badge.
   Ported VERBATIM from the web atom of the same name: identical viewBox and
   identical path data, only the element names differ (react-native-svg).
   These carry their own pastel palette — they are NOT currentColor icons. */

import Svg, { Circle, Path } from 'react-native-svg';
import type { IllustrationProps } from './IllustrationSvg';

export default function AccountIllustration({ size = 40 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
        <Circle cx="48" cy="46" r="36" fill="#FFCBA8" stroke="#6E5A6B" strokeWidth="2.6" />
        <Circle cx="48" cy="46" r="28" fill="#FFF6E9" stroke="#6E5A6B" strokeWidth="2.4" />
        <Path d="M26 32a24 24 0 0 1 12-11" fill="none" stroke="#FFE6D2" strokeWidth="4" strokeLinecap="round" />
        <Path d="M34 70a14 14 0 0 1 28 0z" fill="#A8D8F0" stroke="#6E5A6B" strokeWidth="2.4" strokeLinejoin="round" />
        <Circle cx="48" cy="42" r="12" fill="#FFD9B8" stroke="#6E5A6B" strokeWidth="2.4" />
        <Path d="M36 41c-1-8 5-13 12-13s13 5 12 13c-2-4-5-5-8-4-3 1-5 3-9 2-3-1-5 0-7 2z" fill="#C7A8E8" stroke="#6E5A6B" strokeWidth="2.4" strokeLinejoin="round" />
        <Circle cx="43.5" cy="43" r="1.7" fill="#6E5A6B" />
        <Circle cx="52.5" cy="43" r="1.7" fill="#6E5A6B" />
        <Path d="M45 47.5c1.6 1.6 3.4 1.6 5 0" fill="none" stroke="#6E5A6B" strokeWidth="1.9" strokeLinecap="round" />
        <Circle cx="76" cy="74" r="12" fill="#A8E0C8" stroke="#6E5A6B" strokeWidth="2.6" />
        <Path d="M70 74l4.5 4.5L82 69" fill="none" stroke="#6E5A6B" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// v1.0.0 — Ported from the web AccountIllustration.
