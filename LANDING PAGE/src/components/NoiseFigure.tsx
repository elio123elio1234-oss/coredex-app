import { useMemo } from "react";

/* Noise, solved in hardware (the user's submission, hardware slide): a single electrode against the
   Cyphix array, the same beats on both, drawn as an ECG printout: black ink on the faint red grid
   of ECG paper. On the single electrode the three noises a wearable meets are bracketed: motion
   (the baseline wanders), loose contact (the signal sinks, its beats fade) and muscle (fast,
   irregular noise). Under the array the same beats come through clean. Drawn here from a synthetic
   heartbeat, seeded, so it is the same on every load: an illustration, labelled so; it reads
   nothing. (v0.38.29 drew it on navy with coloured devices and pills: "childish, colourful, less
   medical", the user; v0.38.30 is the printout.) */

const W = 1000;
const H = 120;
const BASE = 70; // the strip's baseline, in its own box
const AMP = 40; // one unit of the synthetic beat, in px
const BEATS = 7;
const RR = W / BEATS;

/* where the three noises sit along the strip (fractions of its width) */
const ZONES = [
  { key: "motion", label: "Motion", short: "Motion", from: 0.06, to: 0.33 },
  { key: "contact", label: "Loose contact", short: "Contact", from: 0.38, to: 0.62 },
  { key: "muscle", label: "Muscle", short: "Muscle", from: 0.68, to: 0.94 },
] as const;

const g = (x: number, mu: number, s: number) => Math.exp(-((x - mu) ** 2) / (2 * s * s));

/* one beat, phase 0..1: P, Q, R, S, T */
const beat = (t: number) =>
  0.12 * g(t, 0.2, 0.025) -
  0.12 * g(t, 0.385, 0.008) +
  1.0 * g(t, 0.41, 0.0105) -
  0.26 * g(t, 0.44, 0.011) +
  0.3 * g(t, 0.66, 0.045);

/* a small seeded generator, so the drawing is the same everywhere */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const bump = (x: number, a: number, b: number) => {
  if (x <= a || x >= b) return 0;
  return Math.sin(Math.PI * ((x - a) / (b - a))); // 0 at the edges, 1 in the middle
};

function strips() {
  const r = rng(7);
  let noise = 0;
  const clean: string[] = [];
  const noisy: string[] = [];
  for (let x = 0; x <= W; x += 1) {
    const f = x / W;
    const v = beat((x % RR) / RR);
    const motion = bump(f, ZONES[0].from, ZONES[0].to) * (0.62 * Math.sin(f * 38) + 0.28 * Math.sin(f * 91 + 1));
    const c = bump(f, ZONES[1].from, ZONES[1].to);
    const contact = c * (-0.55 + 0.18 * Math.sin(f * 140));
    const keep = 1 - 0.7 * c;
    noise = 0.55 * noise + (r() - 0.5);
    const muscle = bump(f, ZONES[2].from, ZONES[2].to) * 0.62 * noise;
    const n = v * keep + motion + contact + muscle + 0.02 * (r() - 0.5);
    clean.push(`${x ? "L" : "M"}${x} ${(BASE - v * AMP).toFixed(1)}`);
    noisy.push(`${x ? "L" : "M"}${x} ${(BASE - n * AMP).toFixed(1)}`);
  }
  return { clean: clean.join(""), noisy: noisy.join("") };
}

/* ECG paper: small squares, every fifth line heavier */
function Paper() {
  const lines = [];
  for (let x = 0; x <= W; x += 10)
    lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} className={x % 50 ? "nf-grid" : "nf-grid is-major"} />);
  for (let y = 0; y <= H; y += 10)
    lines.push(<line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} className={y % 50 ? "nf-grid" : "nf-grid is-major"} />);
  return <g aria-hidden="true">{lines}</g>;
}

/* the two contacts in cross-section, drawn as an engineering figure: skin hatched, metal grey,
   ink lines, small mono labels; no colour (the user, v0.38.31: without the electrode and the skin
   the comparison was unclear; v0.38.29's cartoon devices were "childish") */
function Skin({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" className="xs-hatch" />
        </pattern>
      </defs>
      <rect x="0" y="100" width="260" height="30" fill={`url(#${id})`} />
      <line x1="0" y1="100" x2="260" y2="100" className="xs-skin-line" />
      <text x="256" y="122" textAnchor="end" className="xs-label">
        SKIN
      </text>
    </g>
  );
}

function SingleSection() {
  return (
    <svg viewBox="0 0 260 130" className="nf-xs" role="img" aria-label="Cross-section: one electrode plate on the skin, one wire, one channel.">
      <Skin id="xs-skin-a" />
      <rect x="80" y="88" width="100" height="12" rx="2" className="xs-metal" />
      <rect x="122" y="78" width="16" height="10" rx="2" className="xs-metal" />
      <path d="M130 78 V44 H196" className="xs-wire" />
      <text x="200" y="47" className="xs-label">
        1 CHANNEL
      </text>
      <path d="M80 94 L52 66 H8" className="xs-leader" />
      <text x="8" y="61" className="xs-label">
        ELECTRODE
      </text>
    </svg>
  );
}

function ArraySection() {
  const xs = [52, 92, 132, 172];
  return (
    <svg viewBox="0 0 260 130" className="nf-xs" role="img" aria-label="Cross-section: the Cyphix contact as four elements on the skin, each read by its own ADC, combined into one lead weighted by contact quality.">
      <Skin id="xs-skin-b" />
      <rect x="44" y="50" width="172" height="50" rx="7" className="xs-housing" />
      {xs.map((x) => (
        <g key={x}>
          <rect x={x} y="88" width="36" height="12" rx="2" className="xs-metal" />
          <line x1={x + 18} y1="88" x2={x + 18} y2="76" className="xs-wire" />
          <rect x={x + 4} y="60" width="28" height="16" rx="2" className="xs-adc" />
          <text x={x + 18} y="71" textAnchor="middle" className="xs-adc-text">
            ADC
          </text>
          <path d={`M${x + 18} 60 L130 31`} className="xs-wire" />
        </g>
      ))}
      <circle cx="130" cy="20" r="11" className="xs-sum" />
      <text x="130" y="23.5" textAnchor="middle" className="xs-sum-text">
        {"\u03a3w"}
      </text>
      <path d="M141 20 H170" className="xs-wire" />
      <text x="174" y="23" className="xs-label">
        1 LEAD
      </text>
      <path d="M52 94 L36 74 H6" className="xs-leader" />
      <text x="6" y="69" className="xs-label">
        ARRAY
      </text>
    </svg>
  );
}

function Row({ kind }: { kind: "noisy" | "clean" }) {
  const paths = useMemo(strips, []);
  const noisy = kind === "noisy";
  return (
    <div className={`nf-row is-${kind}`}>
      <div className="nf-side">
        {noisy ? <SingleSection /> : <ArraySection />}
        <p className="nf-side-title">{noisy ? "Single electrode" : "Cyphix array"}</p>
        <p className="nf-side-sub">{noisy ? "One contact; its noise passes into the trace" : "Each contact an array, weighted by its quality"}</p>
      </div>
      <div className="nf-strip">
        {noisy && (
          <ul className="nf-marks" aria-label="Where the noise enters">
            {ZONES.map((z) => (
              <li key={z.key} style={{ left: `${z.from * 100}%`, width: `${(z.to - z.from) * 100}%` }}>
                <span className="nf-full">{z.label}</span>
                <span className="nf-short" aria-hidden="true">
                  {z.short}
                </span>
              </li>
            ))}
          </ul>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="nf-svg" aria-hidden="true">
          <rect width={W} height={H} className="nf-paper" />
          <Paper />
          <path d={noisy ? paths.noisy : paths.clean} className="nf-trace" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}

export default function NoiseFigure() {
  return (
    <figure className="noise-figure">
      <Row kind="noisy" />
      <Row kind="clean" />
      <figcaption className="nf-cap">
        Illustrative signals: the same beats, with the three noises a wearable ECG meets. Each Cyphix
        contact point is an array of elements, weighted in real time by the quality of its contact.
      </figcaption>
    </figure>
  );
}

// v0.38.31 — the two contacts back, as engineering cross-sections (skin hatched, metal grey, ink lines): without them the comparison was unclear (the user)
// v0.38.30 — an ECG printout: black ink on ECG paper, the noises bracketed in grey; no devices, no colour, no band (the user: "childish, colourful, less medical")
// v0.38.29 — the noisy single electrode against the Cyphix array, the three noises named (the user's submission; the user: "it isn't there")
