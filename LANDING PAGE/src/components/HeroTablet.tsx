import frame from "../assets/img/tablet-frame.webp";
import { WORDMARK_PATH } from "./Logo";
import { AXIS, BPM, GRID, PAPER, STRIPS, WHEEL } from "../lib/tabletScreen";

/* The tablet beside the forearm: the user's empty frame (a transparent screen
   opening) laid over the CYPHIX recording view, which is drawn live as one SVG
   so it is as sharp as the page's own type at any size or zoom. The screen sits
   under the frame, whose bezel covers its edges and rounds its corners. */

const INK = "#1e293b";
const INK_2 = "#475569";
const INK_3 = "#8592a6";
const LINE = "#e3e9f1";

const chevron = (x: number, y: number, s: number) =>
  `M${x + 3.5 * s} ${y + 6 * s}L${x + 8 * s} ${y + 10.5 * s}L${x + 12.5 * s} ${y + 6 * s}`;

function Screen() {
  return (
    <svg
      className="hero-system-screen"
      viewBox="0 0 1330 888"
      role="img"
      aria-label={`The CYPHIX app on a tablet: an illustrative 6-lead recording, leads I, II, III, aVR, aVL and aVF, with the ST segments in II, III and aVF marked in red; beside it the frontal-plane axis, ${AXIS} degrees, and the heart rate, ${BPM} beats per minute.`}
    >
      <rect width="1330" height="888" fill="#fff" />

      {/* header: the wordmark, the recording's date */}
      <path d={WORDMARK_PATH} fill={INK} transform="translate(38 45) scale(0.4444)" />
      <text x="1264" y="61" textAnchor="end" fontSize="19" fontWeight="500" fill={INK}>
        23 Sept 2026, 08:50
      </text>
      <path d={chevron(1276, 53, 1)} fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="38" y="104" width="1254" height="1" fill={LINE} />

      {/* the strip's toolbar */}
      <text x="38" y="150.5" fontSize="15.5" fill={INK_2}>
        Limb leads · 10 s · 320 Hz
      </text>
      {(
        [
          [614.5, 139.8, "12.5 mm/s"],
          [766.3, 145.7, "10 mm/mV"],
        ] as const
      ).map(([x, w, t]) => (
        <g key={t}>
          <rect x={x + 0.5} y="127.5" width={w - 1} height="35" rx="10" fill="#fff" stroke={LINE} />
          <text x={x + 16} y="150.5" fontSize="15.5" fontWeight="500" fill={INK}>
            {t}
          </text>
          <path
            d={chevron(x + w - 30.5, 138, 14 / 16)}
            fill="none"
            stroke={INK}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}
      <rect x="924.5" y="127.5" width="39" height="35" rx="10" fill="#fff" stroke={LINE} />
      <path
        d="M937 142v-4h4M949 138h4v4M953 148v4h-4M941 152h-4v-4"
        fill="none"
        stroke={INK}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* the paper and the six leads */}
      <defs>
        <clipPath id="tablet-paper">
          <rect width={PAPER.w} height={PAPER.h} rx="11" />
        </clipPath>
      </defs>
      <rect x="38.5" y="177.5" width="925" height="680" rx="12" fill="#fbfcfe" stroke={LINE} />
      <g transform={`translate(${PAPER.x} ${PAPER.y})`} clipPath="url(#tablet-paper)">
        <path d={GRID.minor} stroke="#edf2f8" strokeWidth="0.6" />
        <path d={GRID.major} stroke="#d9e3f0" strokeWidth="1" />
        {STRIPS.map((s) => (
          <g key={s.name}>
            <path d={s.d} fill="none" stroke="#13213a" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
            {s.st.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="#e0352b" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" />
            ))}
            <text x="10" y={s.labelY} fontSize="15" fontWeight="600" fill={INK}>
              {s.name}
            </text>
          </g>
        ))}
      </g>

      {/* the frontal-plane axis */}
      <rect x="988.5" y="125.5" width="303" height="413" rx="14" fill="#fff" stroke={LINE} />
      <text x="1009" y="156" fontSize="12.5" fontWeight="600" letterSpacing="1" fill={INK_3}>
        FRONTAL PLANE AXIS
      </text>
      <rect x="1009" y="172" width="262" height="1" fill={LINE} />
      <g transform="translate(1140 298)">
        <path d={WHEEL.sector} fill="#e6ecf5" />
        <circle r={WHEEL.r} fill="none" stroke="#cdd7e4" strokeWidth="1.2" />
        <circle r={WHEEL.r * 0.66} fill="none" stroke={LINE} />
        <circle r={WHEEL.r * 0.33} fill="none" stroke={LINE} />
        <path d={WHEEL.spokes} stroke={LINE} />
        {WHEEL.labels.map((l) => (
          <text key={l.t} x={l.x} y={l.y} textAnchor="middle" fontSize="13.5" fontWeight="500" fill={INK_2}>
            {l.t}
          </text>
        ))}
        <line x1="0" y1="0" x2={WHEEL.needle[0]} y2={WHEEL.needle[1]} stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <circle r="5.5" fill={INK} />
        <circle cx={WHEEL.needle[0]} cy={WHEEL.needle[1]} r="5" fill={INK} />
      </g>
      <text x="1009" y="458" fontSize="52" fontWeight="600" letterSpacing="-1.56" fill={INK}>
        {AXIS}°
      </text>
      <text x="1009" y="492" fontSize="18" fontWeight="600" fill={INK}>
        Normal axis
      </text>
      <text x="1009" y="516" fontSize="13" fill={INK_3}>
        Shaded sector: −30° to +90°
      </text>

      {/* heart rate and rhythm */}
      <rect x="988.5" y="555.5" width="303" height="202" rx="14" fill="#fff" stroke={LINE} />
      <text x="1009" y="586" fontSize="12.5" fontWeight="600" letterSpacing="1" fill={INK_3}>
        HEART RATE
      </text>
      <text x="1009" y="645" fontSize="52" fontWeight="600" letterSpacing="-1.56" fill={INK}>
        {BPM}
        <tspan dx="10" fontSize="19" fontWeight="500" letterSpacing="0" fill={INK_2}>
          BPM
        </tspan>
      </text>
      <rect x="1009" y="670" width="262" height="1" fill={LINE} />
      <text x="1009" y="697" fontSize="12.5" fontWeight="600" letterSpacing="1" fill={INK_3}>
        RHYTHM
      </text>
      <text x="1009" y="732" fontSize="24" fontWeight="600" fill={INK}>
        Regular
      </text>

      <text x="1292" y="854" textAnchor="end" fontSize="12.5" fill={INK_3}>
        Illustrative recording.
      </text>
    </svg>
  );
}

export default function HeroTablet() {
  return (
    <div className="hero-system">
      <Screen />
      <img className="hero-system-frame" src={frame} width={1385} height={955} alt="" decoding="async" />
    </div>
  );
}

// v0.19.0 — the tablet's screen drawn live (vectors) under the user's frame; it shipped as a 1000 px raster in v0.18.0
