/* PrivacyIllustration (atom) — Privacy & security — shield with a padlock.
   Ported VERBATIM from the web atom of the same name: identical viewBox and
   identical path data, only the element names differ (react-native-svg).
   These carry their own pastel palette — they are NOT currentColor icons. */

import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { IllustrationProps } from './IllustrationSvg';

export default function PrivacyIllustration({ size = 40 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
        <Path d="M48 8l32 12v26c0 22-15 36-32 42-17-6-32-20-32-42V20z" fill="#C7A8E8" stroke="#6E5A6B" strokeWidth="2.8" strokeLinejoin="round" />
        <Path d="M24 30a13 13 0 0 1 9-7" fill="none" stroke="#EEE0FA" strokeWidth="4" strokeLinecap="round" />
        <Path d="M39 45v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#6E5A6B" strokeWidth="8.5" strokeLinecap="round" />
        <Path d="M39 45v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#FBE3A2" strokeWidth="4" strokeLinecap="round" />
        <Rect x="31" y="44" width="34" height="26" rx="9" fill="#FFF6E9" stroke="#6E5A6B" strokeWidth="2.6" />
        <Circle cx="48" cy="54" r="4.5" fill="#F7B8C8" stroke="#6E5A6B" strokeWidth="2.2" />
        <Path d="M48 58v6" stroke="#6E5A6B" strokeWidth="3" strokeLinecap="round" />
        <Path d="M84 20l1.4 3.6L89 25l-3.6 1.4L84 30l-1.4-3.6L79 25l3.6-1.4z" fill="#FBE3A2" />
    </Svg>
  );
}

// v1.0.0 — Ported from the web PrivacyIllustration.
