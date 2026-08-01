/* CareConnectionIllustration (atom) — Care connection — two people linked by a heart.
   Ported VERBATIM from the web atom of the same name: identical viewBox and
   identical path data, only the element names differ (react-native-svg).
   These carry their own pastel palette — they are NOT currentColor icons. */

import Svg, { Circle, Path } from 'react-native-svg';
import type { IllustrationProps } from './IllustrationSvg';

export default function CareConnectionIllustration({ size = 40 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
        <Path d="M26 50q22-30 44 0" fill="none" stroke="#C7A8E8" strokeWidth="3.4" strokeLinecap="round" strokeDasharray="1 8" />
        <Circle cx="19" cy="52" r="11" fill="#FFD9B8" stroke="#6E5A6B" strokeWidth="2.5" />
        <Path d="M8 51c-1-8 4-12 11-12s12 4 11 12c-2-4-4-5-7-4-3 1-5 2-8 1-3-1-5 1-7 3z" fill="#A8E0C8" stroke="#6E5A6B" strokeWidth="2.5" strokeLinejoin="round" />
        <Path d="M3 88c0-12 7-19 16-19s16 7 16 19z" fill="#A8E0C8" stroke="#6E5A6B" strokeWidth="2.5" strokeLinejoin="round" />
        <Circle cx="77" cy="52" r="11" fill="#FFD9B8" stroke="#6E5A6B" strokeWidth="2.5" />
        <Path d="M66 53c-2-9 4-14 11-14s13 5 11 14c-1-5-4-6-7-6h-8c-3 1-6 2-7 6z" fill="#A8D8F0" stroke="#6E5A6B" strokeWidth="2.5" strokeLinejoin="round" />
        <Path d="M61 88c0-12 7-19 16-19s16 7 16 19z" fill="#A8D8F0" stroke="#6E5A6B" strokeWidth="2.5" strokeLinejoin="round" />
        <Path d="M48 44c-11-8-15-12-15-18a7.5 7.5 0 0 1 15-3 7.5 7.5 0 0 1 15 3c0 6-4 10-15 18z" fill="#F7B8C8" stroke="#6E5A6B" strokeWidth="2.6" strokeLinejoin="round" />
        <Path d="M39 24a7 7 0 0 1 5-3" fill="none" stroke="#FDE6EC" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

// v1.0.0 — Ported from the web CareConnectionIllustration.
