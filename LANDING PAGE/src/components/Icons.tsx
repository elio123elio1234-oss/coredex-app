/* The page's icons — authored SVG, currentColor. Small UI glyphs at a 1.6
   stroke; the larger "line" icons beside list rows and facts at 1.4 on a
   48 box, in the AliveCor-style navy. */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};
const line = { ...base, width: 48, height: 48, viewBox: "0 0 48 48", strokeWidth: 1.4 };

export const ArrowRight = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </svg>
);

export const ArrowDown = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 4.5v15M6 13.5l6 6 6-6" />
  </svg>
);

export const Chevron = (p: P) => (
  <svg {...base} {...p}>
    <path d="m9 5.5 6.5 6.5L9 18.5" />
  </svg>
);

export const Mail = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

export const Phone = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6.6 3.8h2.6l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 6a2 2 0 0 1 2-2.2Z" />
  </svg>
);

/* the two social marks, drawn as line glyphs in the page's own stroke, not in the brands' colours */
export const Instagram = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="3.9" />
    <circle cx="17.1" cy="6.9" r="0.95" fill="currentColor" stroke="none" />
  </svg>
);

export const LinkedIn = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    <path d="M8.2 10.6v5.9M8.2 7.7v.01M11.6 16.5v-5.9M11.6 13.4c0-1.7 1-2.8 2.4-2.8s2.2 1 2.2 2.8v3.1" />
  </svg>
);

export const Pin = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);

export const Check = (p: P) => (
  <svg {...base} {...p} strokeWidth={2}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const Dash = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7.5 12h9" />
  </svg>
);

/* ---------- line icons (48 box) ---------- */

/** A watch on its strap, a small module on the band. */
export const LineWatch = (p: P) => (
  <svg {...line} {...p}>
    <path d="M18 9.5 19.5 3h9L30 9.5M18 38.5 19.5 45h9l1.5-6.5" />
    <rect x="13" y="9.5" width="22" height="29" rx="6" />
    <path d="M17.5 24h3l2-5 3.5 10 2-5h2.5" />
    <path d="M35 21v6" />
  </svg>
);

/** Record: a finger on the module, a pulse leaving it. */
export const LinePulse = (p: P) => (
  <svg {...line} {...p}>
    <path d="M4 26h8l3-8 5 16 4-12 3 4h7" />
    <circle cx="40" cy="26" r="4" />
  </svg>
);

/** Send: a recording travelling to the clinician. */
export const LineSend = (p: P) => (
  <svg {...line} {...p}>
    <path d="M6 22.5 42 7 30.5 41l-7-13.5L6 22.5Z" />
    <path d="M23.5 27.5 42 7" />
  </svg>
);

export const LinePerson = (p: P) => (
  <svg {...line} {...p}>
    <circle cx="24" cy="16" r="8" />
    <path d="M8 42c1.5-8.5 8-13 16-13s14.5 4.5 16 13" />
  </svg>
);

export const LineStethoscope = (p: P) => (
  <svg {...line} {...p}>
    <path d="M10 5v12a8 8 0 0 0 16 0V5" />
    <path d="M7 5h6M23 5h6" />
    <path d="M18 25v5a9 9 0 0 0 18 0v-3" />
    <circle cx="36" cy="23" r="4" />
  </svg>
);

export const LineClinic = (p: P) => (
  <svg {...line} {...p}>
    <circle cx="24" cy="24" r="19" />
    <path d="M20 13h8v7h7v8h-7v7h-8v-7h-7v-8h7z" />
  </svg>
);

export const LineShield = (p: P) => (
  <svg {...line} {...p}>
    <path d="M24 4 39 9.5v12c0 10-6.5 17.5-15 22.5C15.5 39 9 31.5 9 21.5v-12L24 4Z" />
    <path d="m17 24 5 5 9-10" />
  </svg>
);

// v0.9.0 — line icons for the AliveCor-style rows and facts (watch, pulse, send, person, stethoscope, clinic, shield), chevron
// v0.7.0 — Dash for the comparison's "no" mark
// v0.6.0 — arrow, mail, phone, pin and check icons (authored, one stroke weight)
// v0.28.0 — Instagram and LinkedIn, as line glyphs for the top bar
