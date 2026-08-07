/* Solid play triangle — the "watch how" affordance. Path copied verbatim
   from the web atom `components/atoms/Icon/PlayIcon.tsx` so the two apps
   draw the same mark. */

import Svg, { Path } from 'react-native-svg';

interface Props {
  size: number;
  color: string;
}

export default function PlayIcon({ size, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z"
        fill={color}
      />
    </Svg>
  );
}

// v1.0.0 — Play icon (solid), ported from the web PlayIcon.
