/* ConditionsIllustration (atom) — Medical conditions — clipboard with a heart + checklist.
   Ported VERBATIM from the web atom of the same name: identical viewBox and
   identical path data, only the element names differ (react-native-svg).
   These carry their own pastel palette — they are NOT currentColor icons. */

import Svg, { Path, Rect } from 'react-native-svg';
import type { IllustrationProps } from './IllustrationSvg';

export default function ConditionsIllustration({ size = 40 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
        <Rect x="14" y="18" width="68" height="70" rx="14" fill="#FFF6E9" stroke="#6E5A6B" strokeWidth="2.6" />
        <Rect x="34" y="8" width="28" height="16" rx="8" fill="#C7A8E8" stroke="#6E5A6B" strokeWidth="2.6" />
        <Path d="M22 32a10 10 0 0 1 7-6" fill="none" stroke="#F1E7D6" strokeWidth="3.2" strokeLinecap="round" />
        <Path d="M32 48c-7-5-10-8-10-12a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 4-3 7-10 12z" fill="#F7B8C8" stroke="#6E5A6B" strokeWidth="2.4" strokeLinejoin="round" />
        <Path d="M48 36h22M48 44h14" stroke="#6E5A6B" strokeWidth="2.6" strokeLinecap="round" opacity=".5" />
        <Rect x="22" y="58" width="12" height="12" rx="4" fill="#A8E0C8" stroke="#6E5A6B" strokeWidth="2.2" />
        <Path d="M25.5 64l2.5 2.5 4.5-5" fill="none" stroke="#6E5A6B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <Rect x="40" y="61" width="32" height="6" rx="3" fill="#A8D8F0" />
        <Rect x="22" y="75" width="12" height="12" rx="4" fill="#FFCBA8" stroke="#6E5A6B" strokeWidth="2.2" />
        <Rect x="40" y="78" width="24" height="6" rx="3" fill="#A8D8F0" />
    </Svg>
  );
}

// v1.0.0 — Ported from the web ConditionsIllustration.
