import { useMemo } from "react";

/* Noise, solved in hardware (the user's submission, hardware slide): one standard electrode
   against the Cyphix array, the same beats on both. On the single electrode the three noises a
   wearable meets: motion (the baseline wanders), loose contact (the signal drops and steps) and
   muscle (fast, irregular noise). Under the array the beats come through clean. The strips are
   drawn here from a synthetic heartbeat, seeded, so they are the same on every load: an
   illustration of what the weighting does, labelled so, and nothing in it reads an ECG. */

const W = 1000;
const H = 132;
const BASE = 78; // the strip's baseline, in its own box
const AMP = 44; // one unit of the synthetic beat, in px
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

const smooth = (x: number, a: number, b: number) => {
  if (x <= a || x >= b) return 0;
  const t = (x - a) / (b - a);
  return Math.sin(Math.PI * t); // 0 at the edges, 1 in the middle
};

function strips() {
  const r = rng(7);
  let noise = 0;
  const clean: string[] = [];
  const noisy: string[] = [];
  for (let i = 0; i <= W; i += 1) {
    const x = i;
    const f = x / W;
    const v = beat(((x % RR) + RR) % RR / RR);
    // motion: a slow, large wander
    const motion = smooth(f, ZONES[0].from, ZONES[0].to) * (0.62 * Math.sin(f * 38) + 0.28 * Math.sin(f * 91 + 1));
    // loose contact: the signal sinks and steps, its beats faint
    const c = smooth(f, ZONES[1].from, ZONES[1].to);
    const contact = c * (-0.55 + 0.18 * Math.sin(f * 140)) ;
    const keep = 1 - 0.7 * c;
    // muscle: fast irregular noise
    noise = 0.55 * noise + (r() - 0.5);
    const muscle = smooth(f, ZONES[2].from, ZONES[2].to) * 0.62 * noise;
    const n = v * keep + motion + contact + muscle + 0.02 * (r() - 0.5);
    const yc = (BASE - v * AMP).toFixed(1);
    const yn = (BASE - n * AMP).toFixed(1);
    clean.push(`${i ? "L" : "M"}${x} ${yc}`);
    noisy.push(`${i ? "L" : "M"}${x} ${yn}`);
  }
  return { clean: clean.join(""), noisy: noisy.join("") };
}

function Grid() {
  const lines = [];
  for (let x = 0; x <= W; x += 25) lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} className={x % 125 ? "nf-grid" : "nf-grid is-major"} />);
  for (let y = 3; y <= H; y += 25) lines.push(<line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} className={(y - 3) % 125 ? "nf-grid" : "nf-grid is-major"} />);
  return <g aria-hidden="true">{lines}</g>;
}

function OneElectrode() {
  return (
    <svg viewBox="0 0 120 80" className="nf-device" aria-hidden="true">
      <rect x="4" y="56" width="112" height="20" rx="6" className="nf-skin" />
      <rect x="28" y="34" width="64" height="22" rx="7" className="nf-electrode" />
      <rect x="53" y="26" width="14" height="9" rx="2.5" className="nf-electrode" />
    </svg>
  );
}

function Array3() {
  return (
    <svg viewBox="0 0 120 80" className="nf-device" aria-hidden="true">
      <rect x="4" y="56" width="112" height="20" rx="6" className="nf-skin" />
      <rect x="12" y="22" width="96" height="34" rx="6" className="nf-module" />
      <text x="60" y="33" textAnchor="middle" className="nf-module-text">
        CYPHIX
      </text>
      <rect x="18" y="38" width="25" height="13" rx="3" className="nf-el is-a" />
      <rect x="47.5" y="38" width="25" height="13" rx="3" className="nf-el is-b" />
      <rect x="77" y="38" width="25" height="13" rx="3" className="nf-el is-c" />
    </svg>
  );
}

function Row({ kind }: { kind: "noisy" | "clean" }) {
  const paths = useMemo(strips, []);
  const noisy = kind === "noisy";
  return (
    <div className={`nf-row is-${kind}`}>
      <div className="nf-side">
        {noisy ? <OneElectrode /> : <Array3 />}
        <p className="nf-side-label">{noisy ? "A standard electrode" : "The Cyphix array"}</p>
      </div>
      <div className="nf-strip">
        <ul className="nf-pills" aria-label={noisy ? "Noise in the signal" : "Noise handled"}>
          {ZONES.map((z) => (
            <li key={z.key} style={{ left: `${((z.from + z.to) / 2) * 100}%` }}>
              {noisy ? null : <span className="nf-check" aria-hidden="true" />}
              <span className="nf-full">{z.label}</span>
              <span className="nf-short" aria-hidden="true">
                {z.short}
              </span>
              <span className="sr-only">{noisy ? ": noise" : ": handled"}</span>
            </li>
          ))}
        </ul>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="nf-svg" aria-hidden="true">
          <Grid />
          {noisy &&
            ZONES.map((z) => (
              <rect key={z.key} x={z.from * W} y={0} width={(z.to - z.from) * W} height={H} className="nf-zone" />
            ))}
          <path d={noisy ? paths.noisy : paths.clean} className="nf-trace" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <p className="nf-verdict">
        <span className={`nf-mark is-${kind}`} aria-hidden="true" />
        {noisy ? "Noisy signal" : "Clean signal"}
      </p>
    </div>
  );
}

export default function NoiseFigure() {
  return (
    <figure className="noise-figure">
      <Row kind="noisy" />
      <Row kind="clean" />
      <figcaption className="nf-cap">
        Illustrative signals: the same beats under the three noises a wearable meets. Each Cyphix contact
        point is an array of elements, weighted in real time by the quality of its contact.
      </figcaption>
    </figure>
  );
}

// v0.38.29 — the noisy single electrode against the Cyphix array, the three noises named (the user's submission; the user: "it isn't there")
