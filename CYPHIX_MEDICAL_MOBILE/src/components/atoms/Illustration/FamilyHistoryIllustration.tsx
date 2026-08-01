/* FamilyHistoryIllustration (atom) — Family history — a family tree of three faces.
   Ported VERBATIM from the web atom of the same name: identical viewBox and
   identical path data, only the element names differ (react-native-svg).
   These carry their own pastel palette — they are NOT currentColor icons. */

import Svg, { Circle, Path } from 'react-native-svg';
import type { IllustrationProps } from './IllustrationSvg';

export default function FamilyHistoryIllustration({ size = 40 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
        <Path d="M26 40v14h44V40M48 54v12" fill="none" stroke="#C7A8E8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="26" cy="26" r="13" fill="#FFD9B8" stroke="#6E5A6B" strokeWidth="2.5" />
        <Path d="M13 25c-1-9 5-14 13-14s14 5 13 14c-2-4-6-5-9-4-4 1-6 3-10 2-3-1-5 0-7 2z" fill="#A8E0C8" stroke="#6E5A6B" strokeWidth="2.5" strokeLinejoin="round" />
        <Circle cx="21" cy="27" r="1.6" fill="#6E5A6B" />
        <Circle cx="31" cy="27" r="1.6" fill="#6E5A6B" />
        <Path d="M23 32c1.6 1.6 3.4 1.6 5 0" fill="none" stroke="#6E5A6B" strokeWidth="1.9" strokeLinecap="round" />
        <Circle cx="70" cy="26" r="13" fill="#FFD9B8" stroke="#6E5A6B" strokeWidth="2.5" />
        <Path d="M57 27c-2-10 5-16 13-16s15 6 13 16c-1-5-4-8-8-8h-9c-4 1-7 3-9 8z" fill="#FFCBA8" stroke="#6E5A6B" strokeWidth="2.5" strokeLinejoin="round" />
        <Circle cx="65" cy="27" r="1.6" fill="#6E5A6B" />
        <Circle cx="75" cy="27" r="1.6" fill="#6E5A6B" />
        <Path d="M67 32c1.6 1.6 3.4 1.6 5 0" fill="none" stroke="#6E5A6B" strokeWidth="1.9" strokeLinecap="round" />
        <Circle cx="48" cy="78" r="12" fill="#FFD9B8" stroke="#6E5A6B" strokeWidth="2.5" />
        <Path d="M36 77c-1-8 5-13 12-13s13 5 12 13c-2-4-5-5-8-4-3 1-5 3-9 2-3-1-5 0-7 2z" fill="#A8D8F0" stroke="#6E5A6B" strokeWidth="2.5" strokeLinejoin="round" />
        <Circle cx="43.5" cy="79" r="1.6" fill="#6E5A6B" />
        <Circle cx="52.5" cy="79" r="1.6" fill="#6E5A6B" />
        <Path d="M45 83.5c1.5 1.5 3 1.5 4.5 0" fill="none" stroke="#6E5A6B" strokeWidth="1.9" strokeLinecap="round" />
        <Path d="M48 52c-4-3-6-5-6-7a3 3 0 0 1 6-1.5A3 3 0 0 1 54 45c0 2-2 4-6 7z" fill="#F7B8C8" stroke="#6E5A6B" strokeWidth="2.2" strokeLinejoin="round" />
    </Svg>
  );
}

// v1.0.0 — Ported from the web FamilyHistoryIllustration.
