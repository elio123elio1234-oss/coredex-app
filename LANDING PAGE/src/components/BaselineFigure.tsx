import { useMemo } from "react";

/* AI Heart ID, in development (the user's Future Health Challenge submission, step 03): the model
   learns each patient's own baseline from every recording, sets each new recording against it, and
   alerts the clinician to a change. Drawn as a schematic in the noise figure's hand: ink lines on
   white, mono labels, no colour. The beats are synthetic and seeded: an illustration of the
   workflow, labelled so. It names no finding and reads nothing; the change shown is a generic
   departure from the baseline, and the clinician reads the recording. */

const W = 300;
const H = 150;
const BASE = 100;
const AMP = 70;

const g = (x: number, mu: number, s: number) => Math.exp(-((x - mu) ** 2) / (2 * s * s));

/* one beat, phase 0..1, with a scale for its T wave (the generic change the figure shows) */
const beat = (t: number, k = 1, tScale = 1) =>
  k *
  (0.12 * g(t, 0.22, 0.03) -
    0.12 * g(t, 0.4, 0.01) +
    1.0 * g(t, 0.43, 0.013) -
    0.24 * g(t, 0.465, 0.013) +
    0.3 * tScale * g(t, 0.7, 0.055));

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

function path(fn: (t: number) => number, shift = 0) {
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 1.5) {
    const t = x / W + shift;
    pts.push(`${x ? "L" : "M"}${x.toFixed(1)} ${(BASE - fn(t) * AMP).toFixed(1)}`);
  }
  return pts.join("");
}

function useBeats() {
  return useMemo(() => {
    const r = rng(11);
    const past = Array.from({ length: 14 }, () => {
      const k = 0.88 + r() * 0.24;
      const s = (r() - 0.5) * 0.03;
      const tw = 0.8 + r() * 0.4;
      return path((t) => beat(t, k, tw), s);
    });
    return {
      past,
      mean: path((t) => beat(t)),
      latest: path((t) => beat(t, 1, 0.25)),
    };
  }, []);
}

export default function BaselineFigure() {
  const b = useBeats();
  return (
    <figure className="bl-figure">
      <div className="bl-panels">
        <div className="bl-panel">
          <p className="bl-step">01 · Learns</p>
          <svg viewBox={`0 0 ${W} ${H}`} className="bl-svg" role="img" aria-label="Many of the patient's earlier beats, overlaid, and their average: the patient's own baseline.">
            <line x1="0" y1={BASE} x2={W} y2={BASE} className="nf-base" />
            {b.past.map((d, i) => (
              <path key={i} d={d} className="bl-past" />
            ))}
            <path d={b.mean} className="bl-mean" />
          </svg>
          <p className="bl-cap">
            <strong>The patient's own baseline</strong>
            Every recording adds to it.
          </p>
        </div>

        <div className="bl-panel">
          <p className="bl-step">02 · Compares</p>
          <svg viewBox={`0 0 ${W} ${H}`} className="bl-svg" role="img" aria-label="A new beat drawn over the baseline; in one stretch it departs from it, and that stretch is bracketed.">
            <line x1="0" y1={BASE} x2={W} y2={BASE} className="nf-base" />
            <path d={b.mean} className="bl-mean is-ghost" />
            <path d={b.latest} className="bl-latest" />
            <path d="M178 26 V20 H246 V26" className="bl-bracket" />
            <text x="212" y="13" textAnchor="middle" className="bl-label">
              CHANGE
            </text>
          </svg>
          <p className="bl-cap">
            <strong>A new recording, against it</strong>
            Beat by beat, against this patient alone.
          </p>
        </div>

        <div className="bl-panel">
          <p className="bl-step">03 · Alerts</p>
          <svg viewBox={`0 0 ${W} ${H}`} className="bl-svg" role="img" aria-label="An alert card in the clinician's portal: the recording and its baseline, for the clinician to review.">
            <rect x="34" y="22" width="232" height="108" rx="6" className="bl-card" />
            <circle cx="58" cy="46" r="9" className="bl-dot" />
            <path d="M58 41 v6" className="bl-dot-mark" />
            <circle cx="58" cy="50.5" r="1" className="bl-dot-fill" />
            <text x="76" y="50" className="bl-card-title">
              For review
            </text>
            <line x1="50" y1="66" x2="250" y2="66" className="bl-rule" />
            <text x="50" y="84" className="bl-label">
              RECORDING
            </text>
            <text x="250" y="84" textAnchor="end" className="bl-label">
              6 LEADS
            </text>
            <text x="50" y="102" className="bl-label">
              BASELINE
            </text>
            <text x="250" y="102" textAnchor="end" className="bl-label">
              ATTACHED
            </text>
            <text x="50" y="120" className="bl-label">
              TO
            </text>
            <text x="250" y="120" textAnchor="end" className="bl-label">
              CLINICIAN
            </text>
          </svg>
          <p className="bl-cap">
            <strong>The clinician is alerted</strong>
            With the recording and the baseline behind it.
          </p>
        </div>
      </div>
      <figcaption className="nf-cap">
        Illustrative. In development: the model supports the clinician's decision and makes none of
        its own.
      </figcaption>
    </figure>
  );
}

// v0.38.33 — AI Heart ID as a schematic: the baseline learned, a new recording against it, the clinician alerted (the user: "add the section on the AI, as in the deck")
