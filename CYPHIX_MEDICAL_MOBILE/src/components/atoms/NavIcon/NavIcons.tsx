/* ==================================================================
   Bottom-nav icon set — path data copied VERBATIM from the web app's
   components/atoms/NavIcon/*.tsx (icon set v4). Each destination has an
   OUTLINE (inactive) and a FILLED (active) form; on the active tab the
   filled shape's inner details are cut out in the pill colour so they
   read against it — the same `.nav-shape` / `.nav-inner` / `.nav-dot`
   behaviour the web drives from CSS, expressed here as props because RN
   has no cascading stylesheet.

   Each icon keeps its own inner <G transform> and strokeWidth, which is
   how the web set normalizes optical size across the five shapes. Do not
   "simplify" those numbers — they are a fitted set.
   ================================================================== */

import Svg, { Circle, G, Path, type SvgProps } from 'react-native-svg';

export interface NavIconProps {
  size: number;
  /** Outline + label colour (the dock drives this). */
  color: string;
  /** Filled when the sliding pill is behind this tab. */
  active: boolean;
  /** Colour the filled shape's inner details are cut out in. */
  cutout: string;
  /** Right-to-left interface — only the directional history icon uses it. */
  rtl?: boolean;
}

function Frame({ size, color, strokeWidth, children }: SvgProps & {
  size: number;
  color: string;
  strokeWidth: number;
  children: React.ReactNode;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

/** Home — house with a door. */
export function HomeNavIcon({ size, color, active, cutout }: NavIconProps) {
  return (
    <Frame size={size} color={color} strokeWidth={1.762}>
      <G transform="translate(-1.25 -0.86) scale(1.0780)">
        <Path
          d="M4.8 13.8 14.3 5.4a2.6 2.6 0 0 1 3.4 0l9.5 8.4V22a4.5 4.5 0 0 1-4.5 4.5h-13A4.5 4.5 0 0 1 4.8 22z"
          fill={active ? color : 'none'}
        />
        <Path d="M13 26.5v-4.6a3 3 0 0 1 6 0v4.6" stroke={active ? cutout : color} />
      </G>
    </Frame>
  );
}

/** Tests — a report card with an ECG trace. */
export function TestsNavIcon({ size, color, active, cutout }: NavIconProps) {
  return (
    <Frame size={size} color={color} strokeWidth={1.831}>
      <G transform="translate(-0.60 -0.60) scale(1.0375)">
        <Path
          d="M5.5 25.5A2.5 2.5 0 0 0 8 28h16a2.5 2.5 0 0 0 2.5-2.5v-19A2.5 2.5 0 0 0 24 4H8a2.5 2.5 0 0 0-2.5 2.5z"
          fill={active ? color : 'none'}
        />
        <Path
          d="M9.5 16h2.4l1.8-3.4 2.2 6.6 1.6-4.4h1.2l1 1.6h2.8"
          stroke={active ? cutout : color}
        />
        <Path d="M11 23h10" stroke={active ? cutout : color} />
      </G>
    </Frame>
  );
}

/** History — a timeline/list. Mirrors in RTL so the nodes sit on the start edge. */
export function HistoryNavIcon({ size, color, active, rtl }: NavIconProps) {
  const inner = (
    <G transform="translate(-1.67 -1.67) scale(1.1041)">
      <Path
        d="M6.6 6.4h4.8a1.9 1.9 0 0 1 1.9 1.9v0a1.9 1.9 0 0 1-1.9 1.9H6.6a1.9 1.9 0 0 1-1.9-1.9v0a1.9 1.9 0 0 1 1.9-1.9z"
        fill={active ? color : 'none'}
      />
      <Path
        d="M6.6 14.1h4.8a1.9 1.9 0 0 1 1.9 1.9v0a1.9 1.9 0 0 1-1.9 1.9H6.6a1.9 1.9 0 0 1-1.9-1.9v0a1.9 1.9 0 0 1 1.9-1.9z"
        fill={active ? color : 'none'}
      />
      <Path
        d="M6.6 21.8h4.8a1.9 1.9 0 0 1 1.9 1.9v0a1.9 1.9 0 0 1-1.9 1.9H6.6a1.9 1.9 0 0 1-1.9-1.9v0a1.9 1.9 0 0 1 1.9-1.9z"
        fill={active ? color : 'none'}
      />
      <Path d="M17.5 8.3h9.8" />
      <Path d="M17.5 16h6.6" />
      <Path d="M17.5 23.7h9.8" />
    </G>
  );
  return (
    <Frame size={size} color={color} strokeWidth={1.721}>
      {rtl ? <G transform="translate(32 0) scale(-1 1)">{inner}</G> : inner}
    </Frame>
  );
}

/** Chat — a speech bubble with three dots. */
export function ChatNavIcon({ size, color, active, cutout }: NavIconProps) {
  const dotFill = active ? cutout : color;
  return (
    <Frame size={size} color={color} strokeWidth={1.593}>
      <G transform="translate(-3.07 -4.03) scale(1.1925)">
        <Path
          d="M6 12.5A5.5 5.5 0 0 1 11.5 7h9A5.5 5.5 0 0 1 26 12.5v4A5.5 5.5 0 0 1 20.5 22h-6L9 26.6V21.9A5.5 5.5 0 0 1 6 16.5z"
          fill={active ? color : 'none'}
        />
        <Circle cx={12} cy={14.5} r={1.5} fill={dotFill} stroke="none" />
        <Circle cx={16} cy={14.5} r={1.5} fill={dotFill} stroke="none" />
        <Circle cx={20} cy={14.5} r={1.5} fill={dotFill} stroke="none" />
      </G>
    </Frame>
  );
}

/** Profile — a person bust. */
export function ProfileNavIcon({ size, color, active }: NavIconProps) {
  return (
    <Frame size={size} color={color} strokeWidth={1.662}>
      <G transform="translate(-2.29 -2.31) scale(1.1433)">
        <Path
          d="M6 26.6c0-4.7 3.5-8.5 8-9.1a6.2 6.2 0 1 1 4 0c4.5.6 8 4.4 8 9.1"
          fill={active ? color : 'none'}
        />
      </G>
    </Frame>
  );
}

// v1.0.0 — Nav icon set v4, path data verbatim from the web NavIcon atoms.
