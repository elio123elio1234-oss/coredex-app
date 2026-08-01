/* EcgIllustration (atom) — ECG — a monitor showing a heart trace.
   Ported VERBATIM from the web atom of the same name: identical viewBox and
   identical path data, only the element names differ (react-native-svg).
   These carry their own pastel palette — they are NOT currentColor icons. */

import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { IllustrationProps } from './IllustrationSvg';

export default function EcgIllustration({ size = 40 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
        <Path d="M40 66h16l4 12H36z" fill="#C7A8E8" stroke="#6E5A6B" strokeWidth="2.6" strokeLinejoin="round" />
        <Rect x="28" y="78" width="40" height="10" rx="5" fill="#C7A8E8" stroke="#6E5A6B" strokeWidth="2.6" />
        <Rect x="6" y="12" width="84" height="56" rx="14" fill="#C7A8E8" stroke="#6E5A6B" strokeWidth="2.6" />
        <Rect x="14" y="20" width="68" height="40" rx="10" fill="#FFF6E9" stroke="#6E5A6B" strokeWidth="2.2" />
        <Path d="M20 42h9l4-11 6 22 5-13h7l4 6h19" fill="none" stroke="#F7B8C8" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M20 42h9l4-11 6 22 5-13h7l4 6h19" fill="none" stroke="#6E5A6B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M20 26a7 7 0 0 1 6-4" fill="none" stroke="#F1E7D6" strokeWidth="3" strokeLinecap="round" />
        <Circle cx="12" cy="76" r="4" fill="#A8E0C8" stroke="#6E5A6B" strokeWidth="2.2" />
        <Path d="M76 68c-4-3-6-5-6-7a3 3 0 0 1 6-1.5A3 3 0 0 1 82 61c0 2-2 4-6 7z" fill="#F7B8C8" stroke="#6E5A6B" strokeWidth="2.2" strokeLinejoin="round" />
    </Svg>
  );
}

// v1.0.0 — Ported from the web EcgIllustration.
