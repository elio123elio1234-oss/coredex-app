import { useEffect, useId, useRef } from "react";
import frame from "../assets/img/tablet-frame.webp";
import { WORDMARK_PATH } from "./Logo";
import { AXIS, BEATS, BPM, GRID, PAPER, STRIPS, TRACE, WHEEL } from "../lib/tabletScreen";

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

/* live: the screen writes like a monitor, in real time on the strip's own time base (10 s across,
   75 beats a minute): a pen at the head of each lead, riding the trace, and a heart beside the rate
   that beats on every R peak. After the first pass the last strip stays ahead of the pen, past a
   small gap, and the loop goes on. It starts from an empty strip each time the screen comes into
   view and stops when it leaves. The recording stays the same illustrative one, labelled. */
const GAP = 26; // units of the paper

function useMonitor(live: boolean, svg: React.RefObject<SVGSVGElement>) {
  useEffect(() => {
    const el = svg.current;
    if (!live || !el) return;
    const now = el.querySelector<SVGRectElement>(".tm-now")!;
    const old = el.querySelector<SVGRectElement>(".tm-old")!;
    const pens = Array.from(el.querySelectorAll<SVGGElement>(".tm-pen"));
    const heart = el.querySelector<SVGGElement>(".tm-heart")!;
    const { x0, x1, seconds, fs } = TRACE;
    let raf = 0;
    let t0 = 0;
    const frame = (ms: number) => {
      const t = (ms - t0) / 1000;
      const pass = Math.floor(t / seconds);
      const s = t - pass * seconds; // seconds into this strip
      const x = x0 + (s / seconds) * (x1 - x0); // the pen
      now.setAttribute("width", x.toFixed(1));
      const ahead = x + GAP;
      old.setAttribute("x", ahead.toFixed(1));
      old.setAttribute("width", pass > 0 ? Math.max(0, PAPER.w - ahead).toFixed(1) : "0");
      const k = Math.min(STRIPS[0].ys.length - 1, Math.round(s * fs));
      pens.forEach((g, i) => g.setAttribute("transform", `translate(${x.toFixed(1)} ${STRIPS[i].ys[k]})`));
      // the heart: a beat on every R peak, settling over a quarter second
      let since = Infinity;
      for (const b of BEATS) if (b <= s) since = s - b;
      const beat = since < 2 ? Math.exp(-since / 0.09) : 0;
      heart.setAttribute("transform", `translate(1252 627) scale(${(1 + 0.3 * beat).toFixed(3)})`);
      heart.style.opacity = String(0.55 + 0.45 * beat);
      raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(
      (es) => {
        const visible = es.some((e) => e.isIntersecting);
        if (visible && !raf) {
          t0 = performance.now(); // from an empty strip
          raf = requestAnimationFrame(frame);
        } else if (!visible && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [live, svg]);
}

function Screen({ live }: { live: boolean }) {
  // the tablet appears twice on the page (the hero, the closing section): one clip id each
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clip = `tablet-paper-${uid}`;
  const sweep = `tablet-sweep-${uid}`;
  const ref = useRef<SVGSVGElement>(null);
  useMonitor(live, ref);
  return (
    <svg
      ref={ref}
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
        <clipPath id={clip}>
          <rect width={PAPER.w} height={PAPER.h} rx="11" />
        </clipPath>
        {live && (
          <clipPath id={sweep}>
            {/* this pass, up to the pen; the last pass, ahead of it past the gap */}
            <rect className="tm-now" y="0" height={PAPER.h} x="0" width="0" />
            <rect className="tm-old" y="0" height={PAPER.h} x="0" width="0" />
          </clipPath>
        )}
      </defs>
      <rect x="38.5" y="177.5" width="925" height="680" rx="12" fill="#fbfcfe" stroke={LINE} />
      <g transform={`translate(${PAPER.x} ${PAPER.y})`} clipPath={`url(#${clip})`}>
        <path d={GRID.minor} stroke="#edf2f8" strokeWidth="0.6" />
        <path d={GRID.major} stroke="#d9e3f0" strokeWidth="1" />
        <g clipPath={live ? `url(#${sweep})` : undefined}>
          {STRIPS.map((s) => (
            <g key={s.name}>
              <path d={s.d} fill="none" stroke="#13213a" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
              {s.st.map((d, i) => (
                <path key={i} d={d} fill="none" stroke="#e0352b" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" />
              ))}
            </g>
          ))}
        </g>
        {STRIPS.map((s) => (
          <text key={s.name} x="10" y={s.labelY} fontSize="15" fontWeight="600" fill={INK}>
            {s.name}
          </text>
        ))}
        {/* the pens, one at the head of each lead */}
        {live &&
          STRIPS.map((s) => (
            <g key={s.name} className="tm-pen" transform="translate(-40 0)">
              <circle r="11" fill="#13213a" opacity="0.1" />
              <circle r="4.2" fill="#13213a" />
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
      {live && (
        <g className="tm-heart" transform="translate(1252 627)" opacity="0.55">
          <path
            d="M0 9.5C-6.5 4.6-11 1-11-4.2-11-8 -8.1-10.6-4.8-10.6c2.1 0 3.8 1.1 4.8 2.7 1-1.6 2.7-2.7 4.8-2.7 3.3 0 6.2 2.6 6.2 6.4 0 5.2-4.5 8.8-11 13.7Z"
            fill="#e0352b"
          />
        </g>
      )}
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

export default function HeroTablet({ live = false }: { live?: boolean }) {
  return (
    <div className="hero-system">
      <Screen live={live} />
      <img className="hero-system-frame" src={frame} width={1385} height={955} alt="" decoding="async" />
    </div>
  );
}

// v0.30.0 — `live` writes like a monitor: a pen per lead riding the trace in real time, a heart on every R peak, from an empty strip each time it comes into view (script, not SMIL)
// v0.28.0 — `live`: the traces write themselves in a gentle 10 s loop (the journey's last chapter only)
// v0.27.0 — a unique clip id per instance (the journey's last chapter shows the tablet too)
// v0.19.0 — the tablet's screen drawn live (vectors) under the user's frame; it shipped as a 1000 px raster in v0.18.0
