/* NotificationsIllustration (atom) — Notifications — bell with a badge.
   Ported VERBATIM from the web atom of the same name: identical viewBox and
   identical path data, only the element names differ (react-native-svg).
   These carry their own pastel palette — they are NOT currentColor icons. */

import Svg, { Circle, Path } from 'react-native-svg';
import type { IllustrationProps } from './IllustrationSvg';

export default function NotificationsIllustration({ size = 40 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
        <Path d="M48 20c-12 0-19 9-19 21 0 13-4 16-7 21h52c-3-5-7-8-7-21 0-12-7-21-19-21z" fill="#FBE3A2" stroke="#6E5A6B" strokeWidth="2.6" strokeLinejoin="round" />
        <Path d="M36 42a12 12 0 0 1 8-11" fill="none" stroke="#FEF6DC" strokeWidth="3.4" strokeLinecap="round" />
        <Circle cx="48" cy="17" r="4.5" fill="#C7A8E8" stroke="#6E5A6B" strokeWidth="2.4" />
        <Path d="M39 62a9 9 0 0 0 18 0" fill="#FFCBA8" stroke="#6E5A6B" strokeWidth="2.6" strokeLinejoin="round" />
        <Path d="M14 40c0-6 2-11 5-14M82 40c0-6-2-11-5-14" fill="none" stroke="#A8D8F0" strokeWidth="3" strokeLinecap="round" />
        <Circle cx="70" cy="26" r="8" fill="#F7B8C8" stroke="#6E5A6B" strokeWidth="2.4" />
    </Svg>
  );
}

// v1.0.0 — Ported from the web NotificationsIllustration.
