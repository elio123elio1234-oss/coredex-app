/* ==================================================================
   FILTER DESIGN — biquad coefficients COMPUTED, never transcribed.

   ══ WHY THIS FILE EXISTS ══
   The display chain used to carry hand-copied constants with comments
   describing what they were supposed to be. They were measured and the
   comments were wrong:

     • the "50 Hz" notch was actually centred at 47.31 Hz, giving 0.51 dB
       of rejection at the real mains frequency — essentially none, which
       is why live traces were buried in interference;
     • the "0.5 Hz" high-pass was actually at 0.252 Hz and only 2nd order,
       so baseline wander walked straight through and the traces drifted
       off the card.

   A number nobody can re-derive is a number nobody can check. So the
   coefficients are now DESIGNED here from (order, cutoff, sample rate)
   and verified against the frequency response. If the hardware sample
   rate ever changes, the filters follow it automatically instead of
   silently pointing at the wrong frequency.

   ══ REFERENCE ══
   Bilinear transform with frequency pre-warping (`K = tan(π·fc/fs)`), and
   the RBJ Audio EQ Cookbook notch. The Butterworth section damping terms
   are `2·sin((2k+1)π / 2n)`, which reduce to √2 for n = 2 as they must.
   ================================================================== */

/** One biquad section, normalised so a0 = 1. */
export interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/** Damping terms of the analog Butterworth prototype, one per section. */
function butterworthDamping(order: number): number[] {
  if (order % 2 !== 0 || order < 2) {
    throw new Error(`Butterworth order must be even and ≥ 2, got ${order}`);
  }
  const sections = order / 2;
  const out: number[] = [];
  for (let k = 0; k < sections; k++) {
    out.push(2 * Math.sin(((2 * k + 1) * Math.PI) / (2 * order)));
  }
  return out;
}

/**
 * Butterworth low-pass as a cascade of biquads.
 * `fc` is the −3 dB point in Hz; `fs` the sample rate in Hz.
 */
export function designLowpass(order: number, fc: number, fs: number): Biquad[] {
  const K = Math.tan((Math.PI * fc) / fs); // pre-warped
  const K2 = K * K;
  return butterworthDamping(order).map((d) => {
    const D = 1 + d * K + K2;
    return {
      b0: K2 / D,
      b1: (2 * K2) / D,
      b2: K2 / D,
      a1: (2 * (K2 - 1)) / D,
      a2: (1 - d * K + K2) / D,
    };
  });
}

/** Butterworth high-pass as a cascade of biquads. */
export function designHighpass(order: number, fc: number, fs: number): Biquad[] {
  const K = Math.tan((Math.PI * fc) / fs);
  const K2 = K * K;
  return butterworthDamping(order).map((d) => {
    const D = 1 + d * K + K2;
    return {
      b0: 1 / D,
      b1: -2 / D,
      b2: 1 / D,
      a1: (2 * (K2 - 1)) / D,
      a2: (1 - d * K + K2) / D,
    };
  });
}

/**
 * RBJ notch at `f0` with quality factor `Q`.
 * Higher Q = narrower notch. Q = 30 at 50 Hz gives a ~1.7 Hz stop band,
 * deep enough to kill mains without touching ECG content either side.
 */
export function designNotch(f0: number, Q: number, fs: number): Biquad {
  const w0 = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosW0 = Math.cos(w0);
  const a0 = 1 + alpha;
  return {
    b0: 1 / a0,
    b1: (-2 * cosW0) / a0,
    b2: 1 / a0,
    a1: (-2 * cosW0) / a0,
    a2: (1 - alpha) / a0,
  };
}

/** Magnitude response of one biquad at frequency `f`, in dB. */
export function biquadResponseDb(s: Biquad, f: number, fs: number): number {
  const w = (2 * Math.PI * f) / fs;
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const c2w = Math.cos(2 * w);
  const s2w = Math.sin(2 * w);
  const numRe = s.b0 + s.b1 * cw + s.b2 * c2w;
  const numIm = -(s.b1 * sw + s.b2 * s2w);
  const denRe = 1 + s.a1 * cw + s.a2 * c2w;
  const denIm = -(s.a1 * sw + s.a2 * s2w);
  const mag = Math.hypot(numRe, numIm) / Math.hypot(denRe, denIm);
  return 20 * Math.log10(mag);
}

/** Magnitude response of a whole cascade, in dB. */
export function cascadeResponseDb(sections: Biquad[], f: number, fs: number): number {
  return sections.reduce((sum, s) => sum + biquadResponseDb(s, f, fs), 0);
}

/* ================================================================
   Running state for a cascade (Direct Form I, one state per section).
   Each channel needs its OWN state — sharing it across leads
   cross-contaminates the waveforms.
   ================================================================ */

export interface BiquadState {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export function createCascadeState(sections: number): BiquadState[] {
  return Array.from({ length: sections }, () => ({ x1: 0, x2: 0, y1: 0, y2: 0 }));
}

/** Push one sample through a biquad cascade, updating its state in place. */
export function processCascade(
  sections: readonly Biquad[],
  state: BiquadState[],
  x: number,
): number {
  let v = x;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const st = state[i];
    const y = s.b0 * v + s.b1 * st.x1 + s.b2 * st.x2 - s.a1 * st.y1 - s.a2 * st.y2;
    st.x2 = st.x1;
    st.x1 = v;
    st.y2 = st.y1;
    st.y1 = y;
    v = y;
  }
  return v;
}

// v1.0.0 — Runtime biquad design (Butterworth + RBJ notch) so filter cutoffs can be verified, not trusted.
