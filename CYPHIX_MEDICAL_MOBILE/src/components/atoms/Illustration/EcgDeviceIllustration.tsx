/* EcgDeviceIllustration (atom) — ECG device — handheld monitor streaming a signal.
   Ported VERBATIM from the web atom of the same name: identical viewBox and
   identical path data, only the element names differ (react-native-svg).
   These carry their own pastel palette — they are NOT currentColor icons. */

import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { IllustrationProps } from './IllustrationSvg';

export default function EcgDeviceIllustration({ size = 40 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
        <Rect x="20" y="10" width="50" height="76" rx="17" fill="#A8D8F0" stroke="#6E5A6B" strokeWidth="2.6" />
        <Path d="M27 26a10 10 0 0 1 8-7" fill="none" stroke="#EAF6FD" strokeWidth="3.4" strokeLinecap="round" />
        <Rect x="27" y="19" width="36" height="28" rx="9" fill="#FFF6E9" stroke="#6E5A6B" strokeWidth="2.2" />
        <Path d="M32 34h5l3-8 4 15 3-9h5l2 2h4" fill="none" stroke="#F7B8C8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M32 34h5l3-8 4 15 3-9h5l2 2h4" fill="none" stroke="#6E5A6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Rect x="27" y="54" width="16" height="16" rx="6" fill="#C7A8E8" stroke="#6E5A6B" strokeWidth="2.4" />
        <Rect x="47" y="54" width="16" height="16" rx="6" fill="#C7A8E8" stroke="#6E5A6B" strokeWidth="2.4" />
        <Circle cx="35" cy="78" r="4" fill="#FFF6E9" stroke="#6E5A6B" strokeWidth="2.2" />
        <Path d="M76 44a12 12 0 0 0 0-16M84 50a20 20 0 0 0 0-28" fill="none" stroke="#A8E0C8" strokeWidth="3.4" strokeLinecap="round" />
    </Svg>
  );
}

// v1.0.0 — Ported from the web EcgDeviceIllustration.
