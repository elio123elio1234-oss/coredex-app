/* CareTeamIllustration (atom) — Care team — a clinician between two people, with a plus.
   Ported VERBATIM from the web atom of the same name: identical viewBox and
   identical path data, only the element names differ (react-native-svg).
   These carry their own pastel palette — they are NOT currentColor icons. */

import Svg, { Circle, Path } from 'react-native-svg';
import type { IllustrationProps } from './IllustrationSvg';

export default function CareTeamIllustration({ size = 40 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
        <Circle cx="21" cy="38" r="11" fill="#FFD9B8" stroke="#6E5A6B" strokeWidth="2.4" />
        <Path d="M10 37c-1-8 4-12 11-12s12 4 11 12c-2-4-4-5-7-4-3 1-5 2-8 1-3-1-5 1-7 3z" fill="#A8E0C8" stroke="#6E5A6B" strokeWidth="2.4" strokeLinejoin="round" />
        <Path d="M4 78c0-13 7-20 17-20s17 7 17 20z" fill="#A8E0C8" stroke="#6E5A6B" strokeWidth="2.4" strokeLinejoin="round" />
        <Circle cx="75" cy="38" r="11" fill="#FFD9B8" stroke="#6E5A6B" strokeWidth="2.4" />
        <Path d="M64 37c-1-8 4-12 11-12s12 4 11 12c-2-4-4-5-7-4-3 1-5 2-8 1-3-1-5 1-7 3z" fill="#C7A8E8" stroke="#6E5A6B" strokeWidth="2.4" strokeLinejoin="round" />
        <Path d="M58 78c0-13 7-20 17-20s17 7 17 20z" fill="#C7A8E8" stroke="#6E5A6B" strokeWidth="2.4" strokeLinejoin="round" />
        <Circle cx="48" cy="34" r="14" fill="#FFD9B8" stroke="#6E5A6B" strokeWidth="2.6" />
        <Path d="M34 33c-1-10 6-15 14-15s15 5 14 15c-2-5-5-6-9-5-4 1-6 3-11 2-3-1-6 0-8 3z" fill="#7E6A9E" stroke="#6E5A6B" strokeWidth="2.6" strokeLinejoin="round" />
        <Circle cx="43" cy="35" r="1.7" fill="#6E5A6B" />
        <Circle cx="53" cy="35" r="1.7" fill="#6E5A6B" />
        <Path d="M45 40c1.7 1.7 3.6 1.7 5.4 0" fill="none" stroke="#6E5A6B" strokeWidth="2" strokeLinecap="round" />
        <Path d="M26 88c0-16 9-24 22-24s22 8 22 24z" fill="#FFF6E9" stroke="#6E5A6B" strokeWidth="2.6" strokeLinejoin="round" />
        <Path d="M41 66l7 8 7-8" fill="#A8D8F0" stroke="#6E5A6B" strokeWidth="2.4" strokeLinejoin="round" />
        <Path d="M60 74h5v5h5v5h-5v5h-5v-5h-5v-5h5z" fill="#F7B8C8" stroke="#6E5A6B" strokeWidth="2" strokeLinejoin="round" />
    </Svg>
  );
}

// v1.0.0 — Ported from the web CareTeamIllustration.
