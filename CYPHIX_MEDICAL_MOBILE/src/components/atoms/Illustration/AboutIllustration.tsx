/* AboutIllustration (atom) — About — an open book with an info badge.
   Ported VERBATIM from the web atom of the same name: identical viewBox and
   identical path data, only the element names differ (react-native-svg).
   These carry their own pastel palette — they are NOT currentColor icons. */

import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { IllustrationProps } from './IllustrationSvg';

export default function AboutIllustration({ size = 40 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
        <Path d="M8 26c13-7 26-5 40 5v51c-14-10-27-11-40-5z" fill="#FFF6E9" stroke="#6E5A6B" strokeWidth="2.6" strokeLinejoin="round" />
        <Path d="M88 26c-13-7-26-5-40 5v51c14-10 27-11 40-5z" fill="#FFF6E9" stroke="#6E5A6B" strokeWidth="2.6" strokeLinejoin="round" />
        <Path d="M48 31v51" stroke="#6E5A6B" strokeWidth="2.6" strokeLinecap="round" />
        <Path d="M16 44h20M16 54h16M60 54h20M60 64h16" fill="none" stroke="#C7A8E8" strokeWidth="3" strokeLinecap="round" />
        <Path d="M16 64h14" fill="none" stroke="#A8E0C8" strokeWidth="3" strokeLinecap="round" />
        <Circle cx="70" cy="30" r="16" fill="#A8D8F0" stroke="#6E5A6B" strokeWidth="2.6" />
        <Path d="M62 24a9 9 0 0 1 6-5" fill="none" stroke="#EAF6FD" strokeWidth="3.2" strokeLinecap="round" />
        <Circle cx="70" cy="23" r="2.8" fill="#FFF6E9" />
        <Rect x="67.5" y="28" width="5" height="12" rx="2.5" fill="#FFF6E9" />
    </Svg>
  );
}

// v1.0.0 — Ported from the web AboutIllustration.
