/* ==================================================================
   ecgModel — an ILLUSTRATIVE limb-lead signal for the page's traces.
   Not patient data, and the page says so wherever a trace is drawn.

   One synthetic cardiac dipole per wave (P, Q, R, S, T), each with an
   amplitude, a frontal-plane axis and a Gaussian in time. Leads I and
   II are its projections on 0° and 60°; the other four limb leads are
   then DERIVED with Einthoven's / Goldberger's equations — the same
   arithmetic the product does with two measured leads:

     III = II − I        aVR = −(I + II) / 2
     aVL = I − II / 2    aVF = II − I / 2
   ================================================================== */

export type LeadId = "I" | "II" | "III" | "aVR" | "aVL" | "aVF";
export const LEADS: readonly LeadId[] = ["I", "II", "III", "aVR", "aVL", "aVF"];

interface Wave {
  amp: number; // mV
  axis: number; // degrees, frontal plane (0° = lead I)
  at: number; // centre, fraction of the beat
  width: number; // Gaussian sigma, fraction of the beat
}

// A calm sinus beat with a normal axis (~60°).
const WAVES: readonly Wave[] = [
  { amp: 0.16, axis: 52, at: 0.13, width: 0.024 }, // P
  { amp: 0.12, axis: 215, at: 0.236, width: 0.007 }, // Q (septal)
  { amp: 1.35, axis: 58, at: 0.258, width: 0.0105 }, // R
  { amp: 0.34, axis: 245, at: 0.283, width: 0.0095 }, // S
  { amp: 0.34, axis: 44, at: 0.545, width: 0.052 }, // T
];

const RAD = Math.PI / 180;

/** Leads I and II (mV) at a phase inside one beat, 0 ≤ phase < 1. */
export function measured(phase: number): { I: number; II: number } {
  let I = 0;
  let II = 0;
  for (const w of WAVES) {
    const d = (phase - w.at) / w.width;
    const g = w.amp * Math.exp(-0.5 * d * d);
    I += g * Math.cos(w.axis * RAD);
    II += g * Math.cos((w.axis - 60) * RAD);
  }
  return { I, II };
}

/** All six limb leads from the two measured ones. */
export function limbLeads(I: number, II: number): Record<LeadId, number> {
  return {
    I,
    II,
    III: II - I,
    aVR: -(I + II) / 2,
    aVL: I - II / 2,
    aVF: II - I / 2,
  };
}

/**
 * A continuous signal over time (seconds) for one lead: beat-to-beat
 * variation in rate (a gentle respiratory sinus arrhythmia) and a slow,
 * small baseline drift, so the trace never looks like a copy-paste loop.
 */
export function leadAt(lead: LeadId, seconds: number, bpm = 72): number {
  const base = 60 / bpm;
  // A slow ±4 % rate swing (~0.2 Hz, like breathing).
  const t = seconds + (base * 0.04 * Math.sin(seconds * 1.25)) / 1.25;
  const phase = (t / base) % 1;
  const { I, II } = measured(phase < 0 ? phase + 1 : phase);
  const v = limbLeads(I, II)[lead];
  return v + 0.025 * Math.sin(seconds * 0.9 + LEADS.indexOf(lead));
}

// v0.6.0 — illustrative dipole model + Einthoven/Goldberger derivation for the page's traces
