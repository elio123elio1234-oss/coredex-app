/* AllergiesIllustration (atom) — Allergies — pollen flower with a warning sign.
   Ported VERBATIM from the web atom of the same name: identical viewBox and
   identical path data, only the element names differ (react-native-svg).
   These carry their own pastel palette — they are NOT currentColor icons. */

import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import type { IllustrationProps } from './IllustrationSvg';

export default function AllergiesIllustration({ size = 40 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
        <Path d="M38 88c0-16 0-24 2-32" fill="none" stroke="#8FC98F" strokeWidth="4" strokeLinecap="round" />
        <Path d="M40 70c-9 1-15-4-16-12 9-2 15 3 16 12z" fill="#A8E0C8" stroke="#6E5A6B" strokeWidth="2.4" strokeLinejoin="round" />
        <G stroke="#6E5A6B" strokeWidth="2.4" fill="#F7B8C8">
          <Ellipse cx="38" cy="26" rx="9" ry="13" />
          <Ellipse cx="38" cy="26" rx="9" ry="13" transform="rotate(72 38 40)" />
          <Ellipse cx="38" cy="26" rx="9" ry="13" transform="rotate(144 38 40)" />
          <Ellipse cx="38" cy="26" rx="9" ry="13" transform="rotate(216 38 40)" />
          <Ellipse cx="38" cy="26" rx="9" ry="13" transform="rotate(288 38 40)" />
        </G>
        <Circle cx="38" cy="40" r="8" fill="#FBE3A2" stroke="#6E5A6B" strokeWidth="2.4" />
        <Circle cx="35" cy="38" r="1.8" fill="#E8C979" />
        <Circle cx="41" cy="42" r="1.8" fill="#E8C979" />
        <Circle cx="62" cy="20" r="3" fill="#FBE3A2" />
        <Circle cx="72" cy="34" r="2.2" fill="#FBE3A2" />
        <Circle cx="58" cy="8" r="2" fill="#FBE3A2" />
        <Path d="M74 46l14 24a5 5 0 0 1-4 8H60a5 5 0 0 1-4-8z" fill="#FFCBA8" stroke="#6E5A6B" strokeWidth="2.6" strokeLinejoin="round" />
        <Path d="M72 60v8" stroke="#6E5A6B" strokeWidth="3.4" strokeLinecap="round" />
        <Circle cx="72" cy="73" r="2.4" fill="#6E5A6B" />
    </Svg>
  );
}

// v1.0.0 — Ported from the web AllergiesIllustration.
