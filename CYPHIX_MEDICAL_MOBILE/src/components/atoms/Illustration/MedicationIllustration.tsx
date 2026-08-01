/* MedicationIllustration (atom) — Medication — pill bottle + capsule.
   Ported VERBATIM from the web atom of the same name: identical viewBox and
   identical path data, only the element names differ (react-native-svg).
   These carry their own pastel palette — they are NOT currentColor icons. */

import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import type { IllustrationProps } from './IllustrationSvg';

export default function MedicationIllustration({ size = 40 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
        <Rect x="16" y="26" width="30" height="13" rx="5" fill="#C7A8E8" stroke="#6E5A6B" strokeWidth="2.6" />
        <Rect x="10" y="37" width="42" height="48" rx="12" fill="#A8D8F0" stroke="#6E5A6B" strokeWidth="2.6" />
        <Path d="M17 50a9 9 0 0 1 7-6" fill="none" stroke="#EAF6FD" strokeWidth="3.2" strokeLinecap="round" />
        <Rect x="19" y="52" width="24" height="24" rx="8" fill="#FFF6E9" stroke="#6E5A6B" strokeWidth="2.2" />
        <Path d="M31 58v12M25 64h12" stroke="#F7B8C8" strokeWidth="4.5" strokeLinecap="round" />
        <G transform="rotate(-38 68 56)">
          <Path d="M78 42H58a13 13 0 0 0 0 26h20z" fill="#FFCBA8" />
          <Rect x="45" y="42" width="46" height="26" rx="13" fill="none" stroke="#6E5A6B" strokeWidth="2.6" />
          <Path d="M78 42v26" stroke="#6E5A6B" strokeWidth="2.4" />
          <Path d="M52 50a7 7 0 0 1 5-4" fill="none" stroke="#FFE6D2" strokeWidth="3" strokeLinecap="round" />
        </G>
        <Circle cx="72" cy="82" r="7" fill="#A8E0C8" stroke="#6E5A6B" strokeWidth="2.4" />
        <Path d="M67 79a5 5 0 0 1 4-3" fill="none" stroke="#E4F5EC" strokeWidth="2.6" strokeLinecap="round" />
    </Svg>
  );
}

// v1.0.0 — Ported from the web MedicationIllustration.
