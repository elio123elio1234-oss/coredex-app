/* EmergencyIllustration (atom) — Emergency — medical cross badge.
   Ported VERBATIM from the web atom of the same name: identical viewBox and
   identical path data, only the element names differ (react-native-svg).
   These carry their own pastel palette — they are NOT currentColor icons. */

import Svg, { G, Path, Rect } from 'react-native-svg';
import type { IllustrationProps } from './IllustrationSvg';

export default function EmergencyIllustration({ size = 40 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
        <G transform="rotate(-7 48 50)">
          <Rect x="16" y="18" width="64" height="64" rx="21" fill="#F7B8C8" stroke="#6E5A6B" strokeWidth="2.8" />
          <Path d="M26 36a14 14 0 0 1 10-10" fill="none" stroke="#FDE6EC" strokeWidth="4" strokeLinecap="round" />
          <Path d="M40 28h16v14h14v16H56v14H40V58H26V42h14z" fill="#FFF6E9" stroke="#6E5A6B" strokeWidth="2.6" strokeLinejoin="round" />
          <Path d="M33 50h6l3-6 4 12 3-6h11" fill="none" stroke="#F7B8C8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <Path d="M8 34c0-6 2-11 5-15M88 34c0-6-2-11-5-15" fill="none" stroke="#A8D8F0" strokeWidth="3.2" strokeLinecap="round" />
        <Path d="M84 76l1.4 3.6 3.6 1.4-3.6 1.4L84 86l-1.4-3.6L79 81l3.6-1.4z" fill="#FBE3A2" />
    </Svg>
  );
}

// v1.0.0 — Ported from the web EmergencyIllustration.
